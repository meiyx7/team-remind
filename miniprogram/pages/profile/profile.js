// pages/profile/profile.js
const store = require('../../utils/store')
const auth = require('../../utils/auth')

Page({
  data: {
    user: null,
    teamCount: 0,
    darkMode: false
  },

  onShow() {
    const app = getApp()
    if (!app.ensureLogin('/pages/profile/profile')) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    this.loadData()
  },

  loadData() {
    this.setData({
      user: store.getUser(),
      teamCount: store.getTeams().length
    })
  },

  onToggleDark(e) {
    const darkMode = e.detail.value
    this.setData({ darkMode })
    wx.showToast({
      title: darkMode ? '深色模式（演示）' : '已切换浅色',
      icon: 'none'
    })
  },

  goMyTeams() {
    wx.switchTab({ url: '/pages/team-list/team-list' })
  },

  onNotification() {
    wx.showToast({ title: '消息通知设置开发中', icon: 'none' })
  },

  onTheme() {
    wx.showToast({ title: '主题换肤开发中', icon: 'none' })
  },

  onHelp() {
    wx.showToast({ title: '帮助与反馈开发中', icon: 'none' })
  },

  onAbout() {
    wx.showModal({
      title: '关于团队待办',
      content: '团队待办 v1.0.0\n高效团队协作，从此开始',
      showCancel: false,
      confirmText: '知道了'
    })
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
