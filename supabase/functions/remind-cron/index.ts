// supabase/functions/remind-cron/index.ts
// 到期提醒定时任务：扫描即将到期/已到期的未完成待办，给成员发微信订阅消息
// 部署：supabase functions deploy remind-cron --no-verify-jwt
// Secrets：
//   supabase secrets set WX_APPID=... WX_APP_SECRET=... WX_TEMPLATE_ID=...
// 触发方式（二选一）：
//   a) Supabase Dashboard -> Database -> Cron（pg_cron 每 5 分钟 fetch 该函数）
//   b) 外部监控平台（uptimerobot 等）每 5 分钟 GET 本函数 URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  try {
    const appid = Deno.env.get('WX_APPID')!
    const secret = Deno.env.get('WX_APP_SECRET')!
    const templateId = Deno.env.get('WX_TEMPLATE_ID')!

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. 获取 access_token（生产环境建议缓存 2 小时）
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
    )
    const { access_token } = await tokenRes.json()
    if (!access_token) return json({ error: 'get wx token failed' }, 500)

    // 2. 找 24h 内到期且未完成的待办
    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 3600 * 1000)
    const iso = (d: Date) => d.toISOString().slice(0, 10)

    const { data: todos, error } = await admin
      .from('todos')
      .select('id, title, due_date, due_time, team_id, assignments')
      .eq('deleted', false)
      .neq('status', 'completed')
      .gte('due_date', iso(now))
      .lte('due_date', iso(in24h))
    if (error) return json({ error: String(error) }, 500)

    let sent = 0
    for (const todo of todos ?? []) {
      // 已过当天截止时间的不推（简化：日期在窗口内即提醒）
      const assigns = (todo.assignments ?? []) as Array<{
        memberId: string
        memberName: string
        done: boolean
      }>
      for (const a of assigns) {
        if (!a.memberId || a.done) continue

        // openid：members.id = profiles.id = auth.users.id
        const { data: profile } = await admin
          .from('profiles')
          .select('openid')
          .eq('id', a.memberId)
          .maybeSingle()
        if (!profile?.openid) continue

        // 发送订阅消息（用户需先在小程序内授权订阅）
        const sendRes = await fetch(
          `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${access_token}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              touser: profile.openid,
              template_id: templateId,
              page: `pages/todo-detail/todo-detail?id=${todo.id}`,
              data: {
                thing1: { value: truncate(todo.title, 20) },        // 待办标题
                time2: { value: formatDue(todo.due_date, todo.due_time) }, // 截止时间
                thing3: { value: '记得完成并勾选哦' },               // 备注
              },
            }),
          }
        )
        const sendJson = await sendRes.json()
        if (sendJson.errcode === 0) sent++
      }
    }

    return json({ ok: true, scanned: todos?.length ?? 0, sent })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function truncate(s: string, n: number) {
  s = s || ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function formatDue(date: string, time: string) {
  const [, m, d] = date.split('-')
  return `${Number(m)}月${Number(d)}日${time ? ' ' + time : ''}`
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
