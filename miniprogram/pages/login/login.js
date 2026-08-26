// pages/login/login.js
const auth = require('../../utils/auth')
const icons = require('../../utils/icons')

Page({
  data: {
    loading: false,
    from: '',
    themeClass: '',
    checkIcon: icons.check
  },

  onLoad(options) {
    const app = getApp()
    this.setData({ themeClass: app.getThemeClass() })
    if (options.from) {
      this.setData({ from: decodeURIComponent(options.from) })
    }
  },

  async onLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      await auth.mockWechatLogin()
      wx.vibrateShort({ type: 'light' })
      wx.showToast({ title: '登录成功', icon: 'success', duration: 800 })
      setTimeout(() => {
        this.setData({ loading: false })
        this._navigateBackTo()
      }, 800)
    } catch {
      wx.showToast({ title: '登录失败', icon: 'error' })
      this.setData({ loading: false })
    }
  },

  // 登录后回跳：Tab 页用 switchTab，普通页用 redirectTo（替换登录页，避免返回栈残留）
  _navigateBackTo() {
    const TABS = ['/pages/home/home', '/pages/team-list/team-list', '/pages/profile/profile']
    const from = this.data.from
    if (from && TABS.indexOf(from) !== -1) {
      wx.switchTab({ url: from, fail: () => wx.switchTab({ url: '/pages/home/home' }) })
    } else if (from) {
      wx.redirectTo({ url: from, fail: () => wx.switchTab({ url: '/pages/home/home' }) })
    } else {
      wx.switchTab({ url: '/pages/home/home' })
    }
  },

  onAgreement() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=user' })
  },

  onPrivacy() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=privacy' })
  }
})
