// pages/team-report/team-report.js 团队周报（近 7 天完成情况）
const store = require('../../utils/store')

Page({
  data: {
    themeClass: '',
    teamName: '',
    report: null,
    heatWeeks: []
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
      report: store.getTeamWeeklyReport(this.teamId),
      heatWeeks: store.getTeamHeatmap(this.teamId).cols
    })
  },

  onPullDownRefresh() {
    if (this.teamId) {
      this.setData({
        report: store.getTeamWeeklyReport(this.teamId),
        heatWeeks: store.getTeamHeatmap(this.teamId).cols
      })
    }
    wx.stopPullDownRefresh()
  },

  // 导出待办清单为 Markdown（剪贴板）
  onExport() {
    const todos = store.getTeamTodos(this.teamId, 'all')
    const r = this.data.report
    if (!r) return
    const lines = []
    lines.push(`# ${this.data.teamName} 待办清单`)
    lines.push('')
    lines.push(`> 导出日期 ${r.today} · 近 7 天新建 ${r.createdTotal} 项 / 本周完成 ${r.completedThisWeek} 项 / 逾期未清 ${r.overdueOpen} 项`)
    lines.push('')
    todos.forEach(t => {
      const mark = t.status === 'completed' ? 'x' : ' '
      const who = (t.assignments || []).filter(a => a.memberId).map(a => a.memberName).join('、') || '待认领'
      const due = t.dueDate ? `${t.dueDate}${t.dueTime ? ' ' + t.dueTime : ''}` : '无截止'
      lines.push(`- [${mark}] ${t.title} ｜ ${due} ｜ ${who}`)
    })
    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
    })
  }
})
