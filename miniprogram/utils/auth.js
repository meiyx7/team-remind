// utils/auth.js 登录态管理
// 云端模式：wx.login -> Edge Function 换取 Supabase 会话
// 本地模式：模拟一键登录（未配置 Supabase 时自动降级）
const store = require('./store')
const config = require('./config')
const api = require('./api')
const sync = require('./sync')

// 登录（自动选择云端 / 本地模式）
async function login() {
  if (config.cloudEnabled()) {
    return loginViaWx()
  }
  return mockWechatLogin()
}

// 真实微信登录：code 换会话，确保本地 profile 存在后同步
async function loginViaWx() {
  const code = await new Promise((resolve, reject) => {
    wx.login({
      success: res => resolve(res.code),
      fail: () => reject(new Error('wx.login 调用失败'))
    })
  })
  const session = await api.wxCodeToSession(code)
  if (!session || !session.access_token) throw new Error('会话换取失败')
  api.setSession(session)

  // 用云端身份初始化本地用户（id 使用 supabase user id，保证跨端一致）
  const u = session.user || {}
  const user = {
    id: u.id,
    name: (u.user_metadata && u.user_metadata.name) || '微信用户',
    email: u.email || '',
    avatarChar: ((u.user_metadata && u.user_metadata.name) || '我').charAt(0),
    avatarColor: '#10b981'
  }
  store.setUser(user)
  sync.syncNow()
  return user
}

// 模拟微信一键登录（本地模式 / 演示）
function mockWechatLogin() {
  return new Promise((resolve, reject) => {
    // 模拟网络延迟
    setTimeout(() => {
      try {
        const { seedUser } = require('./mock')
        store.setUser(seedUser)
        resolve(seedUser)
      } catch (e) {
        reject(e)
      }
    }, 600)
  })
}

// 兼容旧调用名
const mockWechatLoginCompat = mockWechatLogin

// 是否已登录
function isLoggedIn() {
  return !!store.getUser()
}

// 退出登录（云端模式同时清除会话令牌）
function logout() {
  store.logout()
  if (config.cloudEnabled()) api.setSession(null)
}

module.exports = {
  login,
  loginViaWx,
  mockWechatLogin,
  mockWechatLoginCompat,
  isLoggedIn,
  logout
}
