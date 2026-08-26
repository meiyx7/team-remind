// pages/create-team/create-team.js
const store = require('../../utils/store')
const icons = require('../../utils/icons')

Page({
  data: {
    themeClass: '',
    name: '',
    description: '',
    colorIndex: 0,
    palette: [],
    submitting: false,
    createdTeam: null,         // 建团成功后进入情境引导态
    shareIcon: icons.shareWhite
  },

  onLoad() {
    this.setData({
      themeClass: getApp().getThemeClass(),
      // 色板与 store 建团轮换色保持一致
      palette: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  selectColor(e) {
    const { index } = e.currentTarget.dataset
    if (index === this.data.colorIndex) return
    this.setData({ colorIndex: index })
    wx.vibrateShort({ type: 'light' })
  },

  onSubmit() {
    if (this.data.submitting) return
    const { name, description, colorIndex, palette } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请输入团队名称', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    const result = store.createTeam({
      name,
      description,
      avatarColor: palette[colorIndex]
    })
    if (!result.ok) {
      const tips = { no_login: '请先登录' }
      wx.showToast({ title: tips[result.reason] || '创建失败', icon: 'none' })
      this.setData({ submitting: false })
      return
    }
    wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: '创建成功', icon: 'success', duration: 800 })
    // 情境化邀请：创建成功即切换为成功态，主按钮引导拉人（团队冷启动最强时机）
    setTimeout(() => {
      this.setData({ submitting: false, createdTeam: result.team })
    }, 800)
  },

  // 成功态「完成」：返回列表
  goBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/team-list/team-list' })
    })
  },

  // 成功态分享按钮拉起的转发卡片
  onShareAppMessage() {
    const t = this.data.createdTeam
    if (!t) return { title: '团队待办', path: '/pages/home/home' }
    return {
      title: `邀请你加入「${t.name}」`,
      path: `/pages/team-detail/team-detail?id=${t.id}&from=share`,
      imageUrl: ''
    }
  }
})
