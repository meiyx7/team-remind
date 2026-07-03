// pages/team-detail/team-detail.js
const store = require('../../utils/store')

Page({
  data: {
    team: null,
    members: [],
    todos: [],
    completedCount: 0,
    activeTab: 'members', // members | todos
    todoFilter: 'all',
    filteredTodos: []
  },

  onLoad(options) {
    if (options.id) {
      this.teamId = options.id
      this.loadData()
    }
  },

  onShow() {
    if (this.teamId) this.loadData()
  },

  loadData() {
    const team = store.getTeamById(this.teamId)
    const members = store.getMembersByTeamId(this.teamId)
    const todos = store.getTeamTodos(this.teamId, 'all')
    this.setData({
      team,
      members,
      todos,
      completedCount: todos.filter(t => t.displayStatus === 'completed').length,
      filteredTodos: this.applyFilter(todos, this.data.todoFilter)
    })
  },

  applyFilter(todos, filter) {
    if (filter === 'all') return todos
    return todos.filter(t => t.displayStatus === filter)
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  switchTodoFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({
      todoFilter: filter,
      filteredTodos: this.applyFilter(this.data.todos, filter)
    })
  },

  onInvite() {
    wx.showToast({ title: '邀请成员功能开发中', icon: 'none' })
  },

  onToggleTodo(e) {
    const { id } = e.currentTarget.dataset
    store.toggleTodoComplete(id)
    this.loadData()
    wx.showToast({ title: '已完成', icon: 'success', duration: 800 })
  }
})
