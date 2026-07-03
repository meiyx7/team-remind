// pages/profile/profile.js
const store = require('../../utils/store')
const auth = require('../../utils/auth')
const version = require('../../utils/version')
const icons = require('../../utils/icons')

Page({
  data: {
    themeClass: '',
    user: null,
    teamCount: 0,
    darkMode: false,
    version,
    icons
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
      darkMode: app.globalData.darkMode
    })
    this.loadData()
  },

  loadData() {
    this.setData({
      user: store.getUser(),
      teamCount: store.getTeams().length
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

  goMyTeams() {
    wx.switchTab({ url: '/pages/team-list/team-list' })
  },

  onComingSoon() {
    wx.showToast({ title: '该功能即将上线', icon: 'none' })
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
