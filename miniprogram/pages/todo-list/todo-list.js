// pages/todo-list/todo-list.js
const store = require('../../utils/store')

Page({
  data: {
    filter: 'all',
    filters: [
      { key: 'all', label: '全部' },
      { key: 'in_progress', label: '进行中' },
      { key: 'pending', label: '待开始' },
      { key: 'completed', label: '已完成' },
      { key: 'overdue', label: '已逾期' }
    ],
    todos: []
  },

  onShow() {
    const app = getApp()
    if (!app.ensureLogin('/pages/todo-list/todo-list')) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.loadData()
  },

  loadData() {
    this.setData({ todos: store.getMyTodos(this.data.filter) })
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ filter })
    this.loadData()
  },

  onToggle(e) {
    const { id } = e.currentTarget.dataset
    store.toggleTodoComplete(id)
    this.loadData()
    wx.showToast({ title: '已完成', icon: 'success', duration: 800 })
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/create-todo/create-todo' })
  }
})
