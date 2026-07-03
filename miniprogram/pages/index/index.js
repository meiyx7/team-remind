// pages/index/index.js
const { getTodos, toggleTodo } = require('../../utils/supabase')

Page({
  data: {
    todos: [],
    loading: true,
    activeTab: 'all'
  },

  onShow() {
    this.loadTodos()
  },

  async loadTodos() {
    this.setData({ loading: true })
    try {
      const todos = await getTodos(this.data.activeTab)
      this.setData({ todos })
    } catch (err) {
      console.error('加载待办失败:', err)
      wx.showToast({ title: '加载失败', icon: 'error' })
    } finally {
      this.setData({ loading: false })
    }
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this.loadTodos()
  },

  async onToggle(e) {
    const { id, index } = e.currentTarget.dataset
    try {
      await toggleTodo(id, !this.data.todos[index].done)
      this.setData({
        [`todos[${index}].done`]: !this.data.todos[index].done
      })
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/create/create' })
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})
