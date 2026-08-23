// utils/config.js 环境配置（Supabase 对接入口）
// 使用方法：填入 Supabase 项目信息后，小程序自动切换为云端模式；
// 留空则运行在本地模式（数据存 wx.Storage，功能完整可演示）。
//
// 还需要：
// 1. 在 supabase/migrations/0001_init.sql 中初始化数据库
// 2. 部署 supabase/functions/ 下的两个 Edge Function（wx-login / remind-cron）
// 3. 微信公众平台「开发设置-服务器域名」添加你的 supabase.co 域名
// 详细步骤见 supabase/README.md

const SUPABASE_URL = ''          // 例：https://xxxxxxxxxxxx.supabase.co
const SUPABASE_ANON_KEY = ''     // Project Settings -> API -> anon public key

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
