// app.js
const store = require('./utils/store')
const sync = require('./utils/sync')
const themes = require('./utils/themes')

App({
  globalData: {
    userInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButton: null,
    windowWidth: 375,
    darkMode: false,
    skin: themes.DEFAULT_SKIN,
    uiStyle: 'classic'   // classic=经典扁平 | glass=液态玻璃(iOS 风格)
  },

  onLaunch() {
    // 初始化本地数据（首次启动写入种子数据）
    store.init()

    // 读取登录用户（经 store 缓存层，避免绕过内存缓存）
    this.globalData.userInfo = store.getUser()

    // 云端模式下启动即触发一次增量同步（本地模式静默跳过）
    sync.syncNow()

    // 读取深色模式偏好 + 皮肤 + 界面风格
    this.globalData.darkMode = !!wx.getStorageSync('darkMode')
    const savedSkin = wx.getStorageSync('skin')
    if (savedSkin && themes.getSkin(savedSkin).key === savedSkin) {
      this.globalData.skin = savedSkin
    }
    const savedUiStyle = wx.getStorageSync('uiStyle')
    if (savedUiStyle === 'glass' || savedUiStyle === 'classic') {
      this.globalData.uiStyle = savedUiStyle
    }

    // 计算导航栏相关尺寸
    this.initLayout()
  },

  initLayout() {
    try {
      const sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const menuButton = wx.getMenuButtonBoundingClientRect()
      this.globalData.statusBarHeight = sysInfo.statusBarHeight || 20
      this.globalData.windowWidth = sysInfo.windowWidth || 375
      // 导航栏高度 = 胶囊上下边距 + 胶囊高度，并居中对齐
      this.globalData.navBarHeight =
        (menuButton.top - this.globalData.statusBarHeight) * 2 + menuButton.height
      this.globalData.menuButton = menuButton
    } catch {
      this.globalData.statusBarHeight = 20
      this.globalData.navBarHeight = 44
    }
  },

  // 检查登录态，未登录则跳转登录页（reLaunch：从 Tab 页发起 redirectTo 不可靠）
  ensureLogin(redirectBack) {
    if (!this.globalData.userInfo) {
      wx.reLaunch({
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

  // 换肤：切换并持久化，返回新的主题类
  applySkin(key) {
    const skin = themes.getSkin(key)
    this.globalData.skin = skin.key
    wx.setStorageSync('skin', skin.key)
    return this.getThemeClass()
  },

  // 切换界面风格（经典 / 液态玻璃），返回新的主题类
  applyUiStyle(mode) {
    this.globalData.uiStyle = mode === 'glass' ? 'glass' : 'classic'
    wx.setStorageSync('uiStyle', this.globalData.uiStyle)
    return this.getThemeClass()
  },

  // 当前皮肤的选中态品牌色（供 TabBar 图标着色）
  getSkinBrandHex() {
    const skin = themes.getSkin(this.globalData.skin)
    return this.globalData.darkMode ? skin.dark.brand : skin.light.brand
  },

  // 供页面绑定根容器 class（暗色 + 皮肤 + 界面风格组合）
  getThemeClass() {
    const dark = this.globalData.darkMode ? 'theme-dark' : ''
    const skinClass = this.globalData.skin !== themes.DEFAULT_SKIN ? 'skin-' + this.globalData.skin : ''
    const styleClass = this.globalData.uiStyle === 'glass' ? 'style-glass' : ''
    return [dark, skinClass, styleClass].filter(Boolean).join(' ')
  }
})
