// pages/team-list/team-list.js
const store = require('../../utils/store')

Page({
  data: {
    keyword: '',
    teams: []
  },

  onShow() {
    const app = getApp()
    if (!app.ensureLogin('/pages/team-list/team-list')) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this.loadData()
  },

  loadData() {
    const teams = store.searchTeams(this.data.keyword).map(t => {
      const teamTodos = store.getTeamTodos(t.id, 'all')
      const inProgress = teamTodos.filter(x => x.displayStatus === 'in_progress').length
      return { ...t, inProgressCount: inProgress }
    })
    this.setData({ teams })
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value })
    this.loadData()
  },

  onClear() {
    this.setData({ keyword: '' })
    this.loadData()
  },

  goTeamDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: '/pages/team-detail/team-detail?id=' + id })
  },

  onCreateTeam() {
    wx.showToast({ title: '创建团队功能开发中', icon: 'none' })
  }
})
