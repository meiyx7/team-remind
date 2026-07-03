// pages/team-detail/team-detail.js
const store = require('../../utils/store')
const icons = require('../../utils/icons')

Page({
  data: {
    themeClass: '',
    team: null,
    members: [],
    todos: [],
    completedCount: 0,
    activeTab: 'members',
    todoFilter: 'all',
    todoFilters: [
      { key: 'all', label: '全部' },
      { key: 'in_progress', label: '进行中' },
      { key: 'pending', label: '待开始' },
      { key: 'overdue', label: '已逾期' },
      { key: 'completed', label: '已完成' }
    ],
    filteredTodos: [],
    plusIcon: icons.plus
  },

  onLoad(options) {
    this.setData({ themeClass: getApp().getThemeClass() })
    if (options.id) {
      this.teamId = options.id
      this.loadData()
    }
  },

  onShow() {
    if (this.teamId) this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  loadData() {
    const team = store.getTeamById(this.teamId)
    if (!team) {
      this.setData({ team: null })
      return
    }
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
    wx.vibrateShort({ type: 'light' })
  },

  switchTodoFilter(e) {
    const { key } = e.detail
    this.setData({
      todoFilter: key,
      filteredTodos: this.applyFilter(this.data.todos, key)
    })
    wx.vibrateShort({ type: 'light' })
  },

  onInvite() {
    wx.showToast({ title: '邀请成员功能即将上线', icon: 'none' })
  },

  onToggleTodo(e) {
    const { id } = e.detail
    store.toggleTodoComplete(id)
    this.loadData()
    wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: '已完成', icon: 'success', duration: 800 })
  }
})
