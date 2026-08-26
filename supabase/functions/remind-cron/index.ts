// supabase/functions/remind-cron/index.ts
// 到期提醒 + 每日晨报 定时任务（pg_cron 每 5 分钟触发本函数）
// 部署：supabase functions deploy remind-cron --no-verify-jwt
//
// Secrets：
//   WX_APPID / WX_APP_SECRET                     必填
//   WX_TEMPLATE_ID                               任务提醒模板；缺省则到期提醒跳过
//   WX_MORNING_TEMPLATE_ID                       每日晨报模板；缺省则晨报跳过
// 字段名以实际申请到的模板为准，改下方 DUE_FIELDS / MORNING_FIELDS 即可。
//
// 去重：notification_log 表 (kind, ref_id, member_id) 唯一键
//   kind='due'     ref_id=todo.id   同一待办同一人只推一次（授权次数宝贵，不重复烧）
//   kind='morning' ref_id=日期      每天每人最多一条
// status：'sent' 成功；'blocked' 终态失败（用户未订阅 43101），两者都不再重试

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  formatDue,
  isQuotaError,
  sendSubscribe,
  truncate,
} from '../_shared/wx.ts'

// ---------- 可调参数 ----------
const MORNING_HOUR_BJ = 8 // 晨报窗口：北京时间 08:00 - 08:29
const MORNING_WINDOW_MIN = 30 // 窗口放宽到半小时容忍 pg_cron 抖动，去重兜底防重发
const LOG_RETENTION_DAYS = 60 // notification_log 清理阈值

// 模板字段映射（微信订阅消息的字段名随模板而变，到手后对照 mp 后台改这里）
const DUE_FIELDS = { title: 'thing1', due: 'time2', note: 'thing3' }
const MORNING_FIELDS = { summary: 'thing1', count: 'number2', date: 'time3' }
// ------------------------------

interface Assignment {
  memberId?: string
  done?: boolean
}
interface TodoRow {
  id: string
  title: string
  due_date: string
  due_time: string | null
  assignments: unknown
}

type Admin = SupabaseClient

Deno.serve(async () => {
  try {
    const appid = Deno.env.get('WX_APPID')
    const secret = Deno.env.get('WX_APP_SECRET')
    if (!appid || !secret) return json({ ok: false, error: 'missing WX_APPID / WX_APP_SECRET' }, 500)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date()
    const today = bjDateStr(now)
    const tomorrow = bjDateStr(new Date(now.getTime() + 24 * 3600 * 1000))
    const bj = beijingParts(now)

    const summary: Record<string, unknown> = { ok: true, date: today }

    await purgeOldLogs(admin)

    const dueTemplateId = Deno.env.get('WX_TEMPLATE_ID') || ''
    summary.due = dueTemplateId
      ? await runDueReminders(admin, appid, secret, dueTemplateId, today, tomorrow)
      : { skipped: 'no_template' }

    const inMorningWindow = bj.hour === MORNING_HOUR_BJ && bj.minute < MORNING_WINDOW_MIN
    const morningTemplateId = Deno.env.get('WX_MORNING_TEMPLATE_ID') || ''
    summary.morning = !inMorningWindow
      ? { skipped: 'not_in_window' }
      : morningTemplateId
        ? await runMorningReports(admin, appid, secret, morningTemplateId, today)
        : { skipped: 'no_template' }

    return json(summary)
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
})

// ---------- 到期提醒：24h 内到期且未完成的待办 ----------
async function runDueReminders(
  admin: Admin,
  appid: string,
  secret: string,
  templateId: string,
  today: string,
  tomorrow: string
) {
  const { data: todos, error } = await admin
    .from('todos')
    .select('id, title, due_date, due_time, assignments')
    .eq('deleted', false)
    .neq('status', 'completed')
    .gte('due_date', today)
    .lte('due_date', tomorrow)
  if (error) throw new Error(`query todos: ${errText(error)}`)

  const stats = { scanned: todos?.length ?? 0, sent: 0, blocked: 0, dedup_skipped: 0, failed: 0 }

  for (const todo of (todos ?? []) as TodoRow[]) {
    for (const a of assignmentsOf(todo)) {
      if (!a.memberId || a.done) continue
      const profile = await getOpenid(admin, a.memberId)
      if (!profile) continue
      if (await alreadyLogged(admin, 'due', todo.id, a.memberId)) {
        stats.dedup_skipped++
        continue
      }

      const r = await sendSubscribe(appid, secret, {
        touser: profile.openid,
        template_id: templateId,
        page: `pages/todo-detail/todo-detail?id=${todo.id}`,
        data: {
          [DUE_FIELDS.title]: { value: truncate(todo.title) },
          [DUE_FIELDS.due]: { value: formatDue(todo.due_date, todo.due_time ?? '') },
          [DUE_FIELDS.note]: { value: '记得完成并勾选哦' },
        },
      })
      applyResult(stats, r)
      await recordLog(admin, 'due', todo.id, a.memberId, r)
    }
  }
  return stats
}

// ---------- 晨报：今日到期任务的按人聚合汇总 ----------
async function runMorningReports(
  admin: Admin,
  appid: string,
  secret: string,
  templateId: string,
  today: string
) {
  const { data: todos, error } = await admin
    .from('todos')
    .select('id, title, due_time, assignments')
    .eq('deleted', false)
    .neq('status', 'completed')
    .eq('due_date', today)
    .order('due_time', { ascending: true })
  if (error) throw new Error(`query todos: ${errText(error)}`)

  // 按成员聚合：件数 + 首个待办标题（作为概要）
  interface Agg {
    count: number
    firstTitle: string
  }
  const byMember = new Map<string, Agg>()
  for (const todo of (todos ?? []) as TodoRow[]) {
    for (const a of assignmentsOf(todo)) {
      if (!a.memberId || a.done) continue
      const agg = byMember.get(a.memberId) ?? { count: 0, firstTitle: todo.title }
      agg.count++
      byMember.set(a.memberId, agg)
    }
  }

  const stats = { members: byMember.size, sent: 0, blocked: 0, dedup_skipped: 0, failed: 0 }

  for (const [memberId, agg] of byMember) {
    const profile = await getOpenid(admin, memberId)
    if (!profile) continue
    if (await alreadyLogged(admin, 'morning', today, memberId)) {
      stats.dedup_skipped++
      continue
    }

    const r = await sendSubscribe(appid, secret, {
      touser: profile.openid,
      template_id: templateId,
      page: 'pages/home/home',
      data: {
        [MORNING_FIELDS.summary]: { value: truncate(agg.firstTitle) },
        [MORNING_FIELDS.count]: { value: String(agg.count) },
        [MORNING_FIELDS.date]: { value: formatDateCn(today) },
      },
    })
    applyResult(stats, r)
    await recordLog(admin, 'morning', today, memberId, r)
  }
  return stats
}

// ---------- 公共小件 ----------

function assignmentsOf(todo: TodoRow): Assignment[] {
  return Array.isArray(todo.assignments) ? (todo.assignments as Assignment[]) : []
}

async function getOpenid(
  admin: Admin,
  memberId: string
): Promise<{ openid: string } | null> {
  const { data } = await admin
    .from('profiles')
    .select('openid')
    .eq('id', memberId)
    .maybeSingle()
  return data?.openid ? { openid: data.openid } : null
}

async function alreadyLogged(
  admin: Admin,
  kind: string,
  refId: string,
  memberId: string
): Promise<boolean> {
  const { count } = await admin
    .from('notification_log')
    .select('id', { count: 'exact', head: true })
    .eq('kind', kind)
    .eq('ref_id', refId)
    .eq('member_id', memberId)
  return (count ?? 0) > 0
}

/** 只记录终态：成功 sent / 无额度 blocked；临时失败不记，下轮重试 */
async function recordLog(
  admin: Admin,
  kind: string,
  refId: string,
  memberId: string,
  r: { ok: boolean; errcode?: number }
) {
  const status = r.ok ? 'sent' : isQuotaError(r.errcode) ? 'blocked' : null
  if (!status) return
  await admin
    .from('notification_log')
    .upsert(
      { kind, ref_id: refId, member_id: memberId, status },
      { onConflict: 'kind,ref_id,member_id', ignoreDuplicates: true }
    )
}

function applyResult(
  stats: { sent: number; blocked: number; failed: number },
  r: { ok: boolean; errcode?: number }
) {
  if (r.ok) stats.sent++
  else if (isQuotaError(r.errcode)) stats.blocked++
  else stats.failed++
}

/** 清理过期日志（每次顺带执行，量小） */
async function purgeOldLogs(admin: Admin) {
  const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 864e5).toISOString()
  await admin.from('notification_log').delete().lt('created_at', cutoff)
}

// 北京时间（UTC+8）部件与日期串，避免依赖 Intl 时区库
function beijingParts(d: Date) {
  const t = new Date(d.getTime() + 8 * 3600_000)
  return { hour: t.getUTCHours(), minute: t.getUTCMinutes() }
}

function bjDateStr(d: Date): string {
  const t = new Date(d.getTime() + 8 * 3600_000)
  const m = String(t.getUTCMonth() + 1).padStart(2, '0')
  const day = String(t.getUTCDate()).padStart(2, '0')
  return `${t.getUTCFullYear()}-${m}-${day}`
}

function formatDateCn(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

function errText(e: unknown): string {
  return typeof e === 'object' && e !== null ? JSON.stringify(e) : String(e)
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
