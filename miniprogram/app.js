// app.js
const store = require('./utils/store')

App({
  globalData: {
    userInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButton: null,
    darkMode: false
  },

  onLaunch() {
    // 初始化本地数据（首次启动写入种子数据）
    store.init()

    // 读取登录用户
    this.globalData.userInfo = wx.getStorageSync('user') || null

    // 读取深色模式偏好
    this.globalData.darkMode = !!wx.getStorageSync('darkMode')

    // 计算导航栏相关尺寸
    this.initLayout()
  },

  initLayout() {
    try {
      const sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const menuButton = wx.getMenuButtonBoundingClientRect()
      this.globalData.statusBarHeight = sysInfo.statusBarHeight || 20
      // 导航栏高度 = 胶囊上下边距 + 胶囊高度，并居中对齐
      this.globalData.navBarHeight =
        (menuButton.top - this.globalData.statusBarHeight) * 2 + menuButton.height
      this.globalData.menuButton = menuButton
    } catch (e) {
      this.globalData.statusBarHeight = 20
      this.globalData.navBarHeight = 44
    }
  },

  // 检查登录态，未登录则跳转登录页
  ensureLogin(redirectBack) {
    if (!this.globalData.userInfo) {
      wx.redirectTo({
        url: '/pages/login/login' + (redirectBack ? '?from=' + encodeURIComponent(redirectBack) : '')
      })
      return false
    }
    return true
  },

  // 深色模式：切换并持久化
  toggleDark() {
    const next = !this.globalData.darkMode
    this.globalData.darkMode = next
    wx.setStorageSync('darkMode', next)
    return next
  },

  // 供页面绑定根容器 class
  getThemeClass() {
    return this.globalData.darkMode ? 'theme-dark' : ''
  }
})
