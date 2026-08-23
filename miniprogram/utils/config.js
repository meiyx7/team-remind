// utils/config.js 环境配置（Supabase 对接入口）
// 云端模式已启用：2026-08-23 对接 team-remind Project（ap-northeast-2）
//
// 剩余运维项：
// 1. 微信公众平台「开发设置-服务器域名」添加 https://nkjtksvxfguzefslcuyb.supabase.co
// 2. Edge Function 密钥：WX_APPID / WX_APP_SECRET（真实登录与订阅消息推送依赖）
// 3. 订阅消息模板 ID（可选，到期提醒推送用）

const SUPABASE_URL = 'https://nkjtksvxfguzefslcuyb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ranRrc3Z4Zmd1emVmc2xjdXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjM5MDgsImV4cCI6MjEwMjk5OTkwOH0.w-hWNU9DlEFgqow8afNJJvHWk_IMWT-WcHFrwwDX108'

// 订阅消息模板 ID（微信公众平台申请后填入，留空则不拉起订阅授权）
const SUBSCRIBE_TMPL_IDS = []

function cloudEnabled() {
  return /^https:\/\/.+\.supabase\.co/.test(SUPABASE_URL) &&
    !!SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.startsWith('YOUR_')
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUBSCRIBE_TMPL_IDS,
  cloudEnabled
}
