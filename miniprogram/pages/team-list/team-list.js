// pages/team-list/team-list.js
const store = require('../../utils/store')
const icons = require('../../utils/icons')

Page({
  data: {
    themeClass: '',
    keyword: '',
    teams: [],
    searchIcon: icons.search,
    clearIcon: icons.clear,
    chevronIcon: icons.chevron,
    plusIcon: icons.plusBrand || icons.plus
  },

  onShow() {
    const app = getApp()
    if (!app.ensureLogin('/pages/team-list/team-list')) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
      this.getTabBar().updateTheme()
    }
    this.setData({ themeClass: app.getThemeClass() })
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
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
    wx.vibrateShort({ type: 'light' })
  },

  goTeamDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.vibrateShort({ type: 'light' })
    wx.navigateTo({ url: '/pages/team-detail/team-detail?id=' + id })
  },

  onCreateTeam() {
    wx.showToast({ title: '创建团队功能即将上线', icon: 'none' })
  }
})
