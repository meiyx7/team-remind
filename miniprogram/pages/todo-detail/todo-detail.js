// pages/todo-detail/todo-detail.js 待办详情（多人指派/认领池 + 评论 + 催办）
const store = require('../../utils/store')
const sync = require('../../utils/sync')
const config = require('../../utils/config')

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
    myDone: false,
    isClaimMode: false,
    canClaim: false,          // 认领池还有空位且我未认领
    canNudge: false,
    canDelete: false,
    comments: [],
    commentInput: '',
    commentCount: 0
  },

  onLoad(options) {
    if (options.id) {
      this.todoId = options.id
    }
    this.setData({ themeClass: getApp().getThemeClass() })
  },

  onShow() {
    if (this.todoId) this.loadData()
    this._startPolling()
  },

  onHide() {
    this._stopPolling()
  },

  onUnload() {
    this._stopPolling()
  },

  // 前台轮询：详情页停留时每 30s 轻量同步（队友完成/评论准实时可见）
  _startPolling() {
    if (!config.cloudEnabled()) return
    this._stopPolling()
    this._pollTimer = setInterval(() => {
      sync.syncNow().then(res => {
        if (res && res.ok) this.loadData()
      })
    }, 30000)
  },

  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
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
    const user = store.getUser()

    // 催办：存在其他未完成成员时可催
    const nudgeTargets = (todo.assignments || [])
      .filter(a => a.memberId && a.memberId !== (user && user.id) && !a.done).length
    const isTeamAdmin = store.isTeamAdmin(todo.teamId, user && user.id)
    const isCreator = todo.createdBy === (user && user.id)

    const comments = store.getComments(this.todoId).map(c => ({
      ...c,
      timeLabel: store.timeAgoLabel(c.createdAt)
    }))

    this.setData({
      todo,
      statusLabel: STATUS_LABEL[todo.displayStatus] || '',
      myMemberId: myAssign ? myAssign.memberId : '',
      myDone: myAssign ? myAssign.done : false,
      isClaimMode: todo.mode === 'claim',
      canClaim: todo.mode === 'claim' && !myAssign && todo.unclaimed > 0,
      canNudge: todo.displayStatus !== 'completed' && nudgeTargets > 0,
      canDelete: !!(user && (isCreator || isTeamAdmin)),
      canEdit: !!(user && (isCreator || isTeamAdmin)),
      comments,
      commentCount: comments.length
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

  // 认领一个空位
  onClaim() {
    const result = store.claimSlot(this.todoId)
    if (result.ok) {
      wx.vibrateShort({ type: 'medium' })
      wx.showToast({ title: '认领成功', icon: 'success' })
      this.loadData()
      return
    }
    const tips = {
      already_claimed: '你已认领过该任务',
      full: '名额已被抢完',
      not_claim_mode: '该任务不支持认领',
      no_login: '请先登录'
    }
    wx.showToast({ title: tips[result.reason] || '认领失败', icon: 'none' })
  },

  // 催办未完成的成员
  onNudge() {
    const count = store.nudgeTodo(this.todoId)
    wx.vibrateShort({ type: 'light' })
    wx.showToast({
      title: count > 0 ? `已提醒 ${count} 位成员` : '暂无可提醒的成员',
      icon: 'none'
    })
  },

  /* ---- 评论 ---- */
  onCommentInput(e) {
    this.setData({ commentInput: e.detail.value })
  },

  onAddComment() {
    const content = this.data.commentInput.trim()
    if (!content) return
    const result = store.addComment(this.todoId, content)
    if (!result.ok) {
      wx.showToast({ title: '评论失败', icon: 'none' })
      return
    }
    this.setData({ commentInput: '' })
    this.loadData()
    wx.vibrateShort({ type: 'light' })
  },

  // @ 提及：从团队成员中选择插入
  onMention() {
    const user = store.getUser()
    const todo = this.data.todo
    if (!todo || !user) return
    const members = store.getMembersByTeamId(todo.teamId).filter(m => m.id !== user.id)
    if (members.length === 0) {
      wx.showToast({ title: '暂无其他成员', icon: 'none' })
      return
    }
    // showActionSheet 最多 6 项
    const names = members.slice(0, 6).map(m => m.name)
    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        const name = names[res.tapIndex]
        this.setData({ commentInput: this.data.commentInput + '@' + name + ' ' })
      }
    })
  },

  // 编辑待办（复用创建页，?id= 进入编辑模式）
  goEdit() {
    wx.navigateTo({ url: '/pages/create-todo/create-todo?id=' + this.todoId })
  },

  // 删除待办（创建者/管理员）
  onDeleteTodo() {
    wx.showModal({
      title: '删除待办',
      content: '删除后所有成员将不可见，确定删除吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return
        const result = store.deleteTodo(this.todoId)
        if (result.ok) {
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            wx.navigateBack({
              fail: () => wx.switchTab({ url: '/pages/home/home' })
            })
          }, 600)
        } else {
          const tips = { forbidden: '没有删除权限', not_found: '待办不存在' }
          wx.showToast({ title: tips[result.reason] || '删除失败', icon: 'none' })
        }
      }
    })
  },

  goTeam() {
    if (!this.data.todo || !this.data.todo.teamId) return
    wx.navigateTo({ url: '/pages/team-detail/team-detail?id=' + this.data.todo.teamId })
  }
})
