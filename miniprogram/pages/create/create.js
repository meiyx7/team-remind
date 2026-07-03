// pages/create/create.js
const { createTodo } = require('../../utils/supabase')

Page({
  data: {
    title: '',
    description: '',
    assignee: '',
    dueDate: '',
    priority: 'normal'
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  onAssigneeInput(e) {
    this.setData({ assignee: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ dueDate: e.detail.value })
  },

  onPriorityChange(e) {
    this.setData({ priority: e.detail.value })
  },

  async onSubmit() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }

    wx.showLoading({ title: '创建中...' })

    try {
      await createTodo({
        title: this.data.title,
        description: this.data.description,
        assignee: this.data.assignee,
        dueDate: this.data.dueDate,
        priority: this.data.priority
      })
      wx.hideLoading()
      wx.showToast({ title: '创建成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '创建失败', icon: 'error' })
    }
  }
})
