// pages/help/help.js
Page({
  data: {
    themeClass: '',
    feedback: '',
    faqs: [
      { q: '如何创建待办？', a: '在首页点击右下角「+」按钮，填写标题、截止日期、关联团队与指派成员后提交即可。' },
      { q: '如何标记待办完成？', a: '在待办卡片左侧点击圆形勾选框即可标记为已完成，再次点击可恢复。' },
      { q: '已逾期是什么意思？', a: '截止日期已过且未完成的待办会自动标记为「已逾期」，便于你优先处理。' },
      { q: '数据会丢失吗？', a: '所有数据均保存在本机，卸载小程序或清理缓存后数据将重置为示例数据。' }
    ]
  },
  onLoad() {
    this.setData({ themeClass: getApp().getThemeClass() })
  },
  onFeedbackInput(e) {
    this.setData({ feedback: e.detail.value })
  },
  onSubmitFeedback() {
    const content = this.data.feedback.trim()
    if (!content) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' })
      return
    }
    // 保存到本地（演示）
    const list = wx.getStorageSync('feedbacks') || []
    list.unshift({ content, time: Date.now() })
    wx.setStorageSync('feedbacks', list)
    wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: '感谢你的反馈', icon: 'success' })
    this.setData({ feedback: '' })
  }
})
