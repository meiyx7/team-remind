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
    // 当前用户(张明)在成员里是 m1，按 name 匹配 assignments 里的 memberId
    // 注意：用户 id 是 u1，但 members 里张明是 m1，assignments.memberId 用的是 m1
    const user = store.getUser()
    let myMemberId = ''
    let myDone = false
    if (user && Array.isArray(todo.assignments)) {
      // 先精确匹配 memberId = user.id；再回退按 name 匹配 member 表
      const direct = todo.assignments.find(a => a.memberId === user.id)
      if (direct) {
        myMemberId = direct.memberId
        myDone = direct.done
      } else {
        // 通过 name 在团队成员表里找 memberId
        const members = store.getMembersByTeamId(todo.teamId)
        const me = members.find(m => m.name === user.name)
        if (me) {
          const assign = todo.assignments.find(a => a.memberId === me.id)
          if (assign) {
            myMemberId = assign.memberId
            myDone = assign.done
          }
        }
      }
    }
    this.setData({
      todo,
      statusLabel: STATUS_LABEL[todo.displayStatus] || '',
      myMemberId,
      myDone
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
