// pages/my-stats/my-stats.js 个人贡献档案
const store = require('../../utils/store')

Page({
  data: {
    themeClass: '',
    stats: null
  },

  onLoad() {
    this.setData({ themeClass: getApp().getThemeClass() })
  },

  onShow() {
    const app = getApp()
    if (!app.ensureLogin('/pages/my-stats/my-stats')) return
    this.setData({ stats: store.getMyContribution() })
  },

  onPullDownRefresh() {
    this.setData({ stats: store.getMyContribution() })
    wx.stopPullDownRefresh()
  },

  onTapRecent(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: '/pages/todo-detail/todo-detail?id=' + id })
  },

  goTeam(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: '/pages/team-detail/team-detail?id=' + id })
  }
})
