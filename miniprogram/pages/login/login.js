// pages/login/login.js
const auth = require('../../utils/auth')

Page({
  data: {
    loading: false,
    from: ''
  },

  onLoad(options) {
    if (options.from) {
      this.setData({ from: decodeURIComponent(options.from) })
    }
  },

  async onLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      await auth.mockWechatLogin()
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
    wx.showToast({ title: '用户协议', icon: 'none' })
  },

  onPrivacy() {
    wx.showToast({ title: '隐私政策', icon: 'none' })
  }
})
