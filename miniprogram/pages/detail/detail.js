// pages/detail/detail.js
const { getTodoById, deleteTodo } = require('../../utils/supabase')

Page({
  data: {
    todo: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.loadTodo(options.id)
    }
  },

  async loadTodo(id) {
    try {
      const todo = await getTodoById(id)
      this.setData({ todo })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'error' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定删除？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          try {
            await deleteTodo(this.data.todo.id)
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1000)
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  }
})
