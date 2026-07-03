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
        if (this.data.from) {
          // 来自 Tab 页的请求，使用 switchTab
          wx.switchTab({ url: this.data.from, fail: () => wx.switchTab({ url: '/pages/home/home' }) })
        } else {
          wx.switchTab({ url: '/pages/home/home' })
        }
      }, 800)
    } catch (e) {
      wx.showToast({ title: '登录失败', icon: 'error' })
      this.setData({ loading: false })
    }
  },

  onAgreement() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=user' })
  },

  onPrivacy() {
    wx.navigateTo({ url: '/pages/agreement/agreement?type=privacy' })
  }
})
