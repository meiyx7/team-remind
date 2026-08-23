// pages/team-report/team-report.js 团队周报（近 7 天完成情况）
const store = require('../../utils/store')

Page({
  data: {
    themeClass: '',
    teamName: '',
    report: null
  },

  onLoad(options) {
    this.setData({ themeClass: getApp().getThemeClass() })
    if (options.id) {
      this.teamId = options.id
    }
  },

  onShow() {
    if (!this.teamId) return
    const team = store.getTeamById(this.teamId)
    if (!team) {
      wx.showToast({ title: '团队不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({
      teamName: team.name,
      report: store.getTeamWeeklyReport(this.teamId)
    })
  },

  onPullDownRefresh() {
    if (this.teamId) {
      this.setData({ report: store.getTeamWeeklyReport(this.teamId) })
    }
    wx.stopPullDownRefresh()
  }
})
