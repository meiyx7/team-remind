// utils/auth.js 登录态管理
const store = require('./store')

// 模拟微信一键登录（后续接真实 wx.login 时替换此实现）
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

// 是否已登录
function isLoggedIn() {
  return !!store.getUser()
}

// 退出登录
function logout() {
  store.logout()
}

module.exports = {
  mockWechatLogin,
  isLoggedIn,
  logout
}
