// pages/todo-detail/todo-detail.js 待办详情
const store = require('../../utils/store')

const STATUS_LABEL = {
  pending: '待开始',
  in_progress: '进行中',
  overdue: '已逾期',
  completed: '已完成'
}

Page({
  data: {
    themeClass: '',
    todo: null,
    statusLabel: '',
    myMemberId: '',   // 当前用户在该待办 assignments 里的 memberId
    myDone: false
  },

  onLoad(options) {
    if (options.id) {
      this.todoId = options.id
    }
    const app = getApp()
    this.setData({ themeClass: app.getThemeClass() })
  },

  onShow() {
    if (this.todoId) this.loadData()
  },

  loadData() {
    const todo = store.getTodoById(this.todoId)
    if (!todo) {
      wx.showToast({ title: '待办不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    // 当前用户在 assignments 中的指派记录（身份即成员 id，全库统一）
    const myAssign = store.findMyAssignment(todo)
    this.setData({
      todo,
      statusLabel: STATUS_LABEL[todo.displayStatus] || '',
      myMemberId: myAssign ? myAssign.memberId : '',
      myDone: myAssign ? myAssign.done : false
    })
  },

  onToggleMember(e) {
    const { memberId } = e.currentTarget.dataset
    this._toggle(memberId)
  },

  onToggleMe() {
    if (!this.data.myMemberId) return
    this._toggle(this.data.myMemberId)
  },

  _toggle(memberId) {
    const updated = store.toggleAssignment(this.todoId, memberId)
    if (!updated) return
    // 重新读取以同步 myDone
    this.loadData()
    wx.vibrateShort({ type: 'medium' })
    const assign = (updated.assignments || []).find(a => a.memberId === memberId)
    wx.showToast({
      title: assign && assign.done ? '已完成' : '已取消完成',
      icon: 'success',
      duration: 800
    })
  },

  goTeam() {
    if (!this.data.todo || !this.data.todo.teamId) return
    wx.navigateTo({ url: '/pages/team-detail/team-detail?id=' + this.data.todo.teamId })
  }
})
