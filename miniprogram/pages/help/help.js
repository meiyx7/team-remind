// pages/help/help.js
const store = require('../../utils/store')
const config = require('../../utils/config')
const api = require('../../utils/api')

Page({
  data: {
    themeClass: '',
    feedback: '',
    faqs: [
      { q: '如何创建待办？', a: '在首页点击右下角「+」按钮，填写标题、截止日期、关联团队与指派成员后提交即可。' },
      { q: '如何标记待办完成？', a: '在待办卡片左侧点击圆形勾选框即可标记为已完成，再次点击可恢复。' },
      { q: '已逾期是什么意思？', a: '截止日期已过且未完成的待办会自动标记为「已逾期」，便于你优先处理。' },
      { q: '数据会丢失吗？', a: '已接入云端同步（Supabase），登录后数据实时上传；未登录/离线时数据保存在本机。' }
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
    // 本地留底
    const list = wx.getStorageSync('feedbacks') || []
    list.unshift({ content, time: Date.now() })
    wx.setStorageSync('feedbacks', list)

    // 云端上行（登录态下；失败静默不影响体验）
    const user = store.getUser()
    if (config.cloudEnabled() && user && api.getToken()) {
      const row = {
        id: 'fb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        user_id: user.id,
        user_name: user.name,
        content,
        page: 'help',
        deleted: false,
        updatedAt: new Date().toISOString()
      }
      api.upsert('feedbacks', [row]).catch(err => {
        console.warn('[help] 反馈上云失败（已留本地）:', err.message)
      })
    }

    wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: '感谢你的反馈', icon: 'success' })
    this.setData({ feedback: '' })
  }
})
