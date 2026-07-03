// pages/home/home.js
const store = require('../../utils/store')

Page({
  data: {
    stats: { mine: 0, inProgress: 0, completed: 0 },
    teams: [],
    recentTodos: []
  },

  onShow() {
    // 检查登录态
    const app = getApp()
    if (!app.ensureLogin('/pages/home/home')) return

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }

    this.loadData()
  },

  loadData() {
    const teams = store.getTeams().slice(0, 5).map(t => {
      const teamTodos = store.getTeamTodos(t.id, 'all')
      const inProgress = teamTodos.filter(x => x.displayStatus === 'in_progress').length
      return { ...t, inProgressCount: inProgress, todoCount: teamTodos.length }
    })
    this.setData({
      stats: store.getMyStats(),
      teams,
      recentTodos: store.getRecentTodos(5)
    })
  },

  goTeamList() {
    wx.switchTab({ url: '/pages/team-list/team-list' })
  },

  goTodoList() {
    wx.switchTab({ url: '/pages/todo-list/todo-list' })
  },

  goCreateTodo() {
    wx.navigateTo({ url: '/pages/create-todo/create-todo' })
  },

  goTeamDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: '/pages/team-detail/team-detail?id=' + id })
  },

  onToggleTodo(e) {
    const { id } = e.currentTarget.dataset
    store.toggleTodoComplete(id)
    this.loadData()
    wx.showToast({ title: '已完成', icon: 'success', duration: 800 })
  }
})
