// pages/notifications/notifications.js 消息中心（催办 / 提及等定向通知）
const store = require('../../utils/store')
const notify = require('../../utils/notify')
const icons = require('../../utils/icons')

// 事件类型 -> 展示标签
const TYPE_LABEL = {
  nudge: '催办',
  mention: '提及',
  comment: '评论',
  claim: '认领',
  complete: '完成',
  create: '创建',
  join: '加入'
}

Page({
  data: {
    themeClass: '',
    list: [],
    emptyIcon: icons.bell
  },

  onLoad() {
    this.setData({ themeClass: getApp().getThemeClass() })
  },

  onShow() {
    const app = getApp()
    if (!app.ensureLogin('/pages/notifications/notifications')) return
    this.loadData()
    // 延迟标记已读：给用户一点时间看到未读状态
    if (this._readTimer) clearTimeout(this._readTimer)
    this._readTimer = setTimeout(() => notify.markAllRead(), 1500)
  },

  onHide() {
    // 离开前确保已读落盘
    if (this._readTimer) {
      clearTimeout(this._readTimer)
      notify.markAllRead()
      this._readTimer = null
    }
  },

  onUnload() {
    if (this._readTimer) clearTimeout(this._readTimer)
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  loadData() {
    const list = store.getMyNotifications().map(n => ({
      ...n,
      typeLabel: TYPE_LABEL[n.type] || '通知'
    }))
    this.setData({ list })
  },

  onTapItem(e) {
    const { todoId } = e.currentTarget.dataset
    if (!todoId) return
    wx.navigateTo({ url: '/pages/todo-detail/todo-detail?id=' + todoId })
  }
})
