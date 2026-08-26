// supabase/functions/_shared/wx.ts
// 微信 API 公共封装：access_token 内存缓存 + 订阅消息发送 + 文案工具
// 被 remind-cron 等定时函数复用

let cachedToken: { token: string; expiresAt: number } | null = null

/** 获取全局 access_token，内存缓存（提前 5 分钟过期） */
export async function getAccessToken(appid: string, secret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
  )
  const data = await res.json()
  if (!data.access_token) throw new Error(`get wx token failed: ${JSON.stringify(data)}`)
  const expiresInSec = Number(data.expires_in) || 7200
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (expiresInSec - 300) * 1000 }
  return cachedToken.token
}

export interface SubscribePayload {
  touser: string
  template_id: string
  page: string
  data: Record<string, { value: string }>
}

export interface SendResult {
  ok: boolean
  errcode?: number
  errmsg?: string
}

/**
 * 发送订阅消息。
 * 常见 errcode：
 *   0     成功
 *   43101 用户未订阅/授权次数耗尽（终态，调用方应记 blocked 不再重试）
 *   40001 token 失效（本函数会自动刷新重试一次）
 */
export async function sendSubscribe(
  appid: string,
  secret: string,
  payload: SubscribePayload,
  retryOnBadToken = true
): Promise<SendResult> {
  const token = await getAccessToken(appid, secret)
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )
  const j = await res.json()
  if (j.errcode === 40001 && retryOnBadToken) {
    cachedToken = null // 强制刷新后再试一次
    return sendSubscribe(appid, secret, payload, false)
  }
  return { ok: j.errcode === 0, errcode: j.errcode, errmsg: j.errmsg }
}

/** 用户是否「无订阅额度」（终态失败：重试无意义，只会白烧请求） */
export function isQuotaError(errcode?: number): boolean {
  return errcode === 43101
}

/** thing 字段截断（微信限 20 字符） */
export function truncate(s: string, n = 20): string {
  s = s || ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/** 截止时间文案：2026年8月30日 09:30（time 字段需符合微信日期格式规范） */
export function formatDue(date: string, time: string): string {
  const [y, m, d] = (date || '').split('-')
  if (!m || !d) return ''
  return `${y}年${Number(m)}月${Number(d)}日${time ? ' ' + time : ''}`
}
