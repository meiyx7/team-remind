// pages/profile-edit/profile-edit.js 个人资料设置
const store = require('../../utils/store')

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

Page({
  data: {
    themeClass: '',
    name: '',
    colorIndex: 0,
    palette: PALETTE,
    saving: false
  },

  onLoad() {
    const user = store.getUser()
    if (!user) {
      wx.navigateBack()
      return
    }
    this.setData({
      themeClass: getApp().getThemeClass(),
      name: user.name || '',
      colorIndex: Math.max(0, PALETTE.indexOf(user.avatarColor))
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  selectColor(e) {
    const { index } = e.currentTarget.dataset
    if (index === this.data.colorIndex) return
    this.setData({ colorIndex: index })
    wx.vibrateShort({ type: 'light' })
  },

  onSave() {
    if (this.data.saving) return
    const name = this.data.name.trim()
    if (!name) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    const result = store.updateUserProfile({
      name,
      avatarColor: this.data.palette[this.data.colorIndex]
    })
    if (!result.ok) {
      const tips = { no_login: '请先登录' }
      wx.showToast({ title: tips[result.reason] || '保存失败', icon: 'none' })
      this.setData({ saving: false })
      return
    }
    // profiles 云端上行由 store.updateUserProfile 内部的 queueSync 处理
    wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: '已保存', icon: 'success', duration: 800 })
    setTimeout(() => {
      this.setData({ saving: false })
      wx.navigateBack({
        fail: () => wx.switchTab({ url: '/pages/profile/profile' })
      })
    }, 800)
  }
})
