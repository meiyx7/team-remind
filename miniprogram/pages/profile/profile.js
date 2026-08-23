// pages/profile/profile.js
const store = require('../../utils/store')
const auth = require('../../utils/auth')
const version = require('../../utils/version')
const icons = require('../../utils/icons')
const themes = require('../../utils/themes')

Page({
  data: {
    themeClass: '',
    user: null,
    darkMode: false,
    version,
    icons,
    unreadCount: 0,
    // 换肤 + 界面风格
    showSkins: false,
    skins: [],
    currentSkin: themes.DEFAULT_SKIN,
    skinLabel: '翡翠绿',
    uiStyle: 'classic'
  },

  onShow() {
    const app = getApp()
    if (!app.ensureLogin('/pages/profile/profile')) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
      this.getTabBar().updateTheme()
    }
    this.setData({
      themeClass: app.getThemeClass(),
      darkMode: app.globalData.darkMode,
      user: store.getUser(),
      unreadCount: store.unreadNotificationCount(),
      currentSkin: app.globalData.skin,
      skinLabel: themes.getSkin(app.globalData.skin).label,
      skins: themes.SKINS.map(s => ({ key: s.key, label: s.label, brand: s.light.brand })),
      uiStyle: app.globalData.uiStyle
    })
  },

  // 深色模式：真实切换 + 持久化
  onToggleDark(e) {
    const app = getApp()
    const darkMode = e.detail.value
    // 与全局状态对齐（防止与全局不一致）
    if (app.globalData.darkMode !== darkMode) {
      app.toggleDark()
    }
    this.setData({ darkMode, themeClass: app.getThemeClass() })
    // 立即同步 TabBar 主题（无需切 Tab 即可生效）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTheme()
    }
  },

  onComingSoon() {
    wx.showToast({ title: '该功能即将上线', icon: 'none' })
  },

  // 换肤：展开/收起面板
  toggleSkinPanel() {
    this.setData({ showSkins: !this.data.showSkins })
    wx.vibrateShort({ type: 'light' })
  },

  // 选择皮肤：全局生效（页面主题类 + TabBar 同步刷新）并持久化
  onPickSkin(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.currentSkin) return
    const app = getApp()
    const themeClass = app.applySkin(key)
    this.setData({
      themeClass,
      currentSkin: key,
      skinLabel: themes.getSkin(key).label
    })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTheme()
    }
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '已切换', icon: 'success', duration: 800 })
  },

  // 切换界面风格（经典 / 液态玻璃）
  onPickUiStyle(e) {
    const { mode } = e.currentTarget.dataset
    if (mode === this.data.uiStyle) return
    const app = getApp()
    const themeClass = app.applyUiStyle(mode)
    this.setData({ themeClass, uiStyle: mode })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTheme()
    }
    wx.vibrateShort({ type: 'light' })
    wx.showToast({
      title: mode === 'glass' ? '已切换液态玻璃' : '已切换经典风格',
      icon: 'none',
      duration: 800
    })
  },

  goNotifications() {
    wx.navigateTo({ url: '/pages/notifications/notifications' })
  },

  goProfileEdit() {
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' })
  },

  goHelp() {
    wx.navigateTo({ url: '/pages/help/help' })
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  },

  goAgreement(e) {
    const { type } = e.currentTarget.dataset
    wx.navigateTo({ url: '/pages/agreement/agreement?type=' + type })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          auth.logout()
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
