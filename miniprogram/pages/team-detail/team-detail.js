// pages/team-detail/team-detail.js
const store = require('../../utils/store')
const icons = require('../../utils/icons')

Page({
  data: {
    themeClass: '',
    team: null,
    members: [],
    todos: [],
    completedCount: 0,
    activeTab: 'members',
    todoFilter: 'all',
    todoFilters: [
      { key: 'all', label: '全部' },
      { key: 'in_progress', label: '进行中' },
      { key: 'pending', label: '待开始' },
      { key: 'overdue', label: '已逾期' },
      { key: 'completed', label: '已完成' }
    ],
    filteredTodos: [],
    plusIcon: icons.plus,
    isMember: false        // 当前用户是否已在团队中（用于显示「加入团队」）
  },

  onLoad(options) {
    this.setData({ themeClass: getApp().getThemeClass() })
    if (options.id) {
      this.teamId = options.id
      this.loadData()
      // 通过分享进入：提示可加入
      if (options.from === 'share') {
        this.checkAndPromptJoin()
      }
    }
  },

  onShow() {
    if (this.teamId) this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  loadData() {
    const team = store.getTeamById(this.teamId)
    if (!team) {
      this.setData({ team: null })
      return
    }
    const members = store.getMembersByTeamId(this.teamId)
    const todos = store.getTeamTodos(this.teamId, 'all')
    // 当前用户是否已是成员
    const user = store.getUser()
    const isMember = user ? members.some(m => m.name === user.name) : false
    this.setData({
      team,
      members,
      todos,
      completedCount: todos.filter(t => t.displayStatus === 'completed').length,
      filteredTodos: this.applyFilter(todos, this.data.todoFilter),
      isMember
    })
  },

  applyFilter(todos, filter) {
    if (filter === 'all') return todos
    return todos.filter(t => t.displayStatus === filter)
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    wx.vibrateShort({ type: 'light' })
  },

  switchTodoFilter(e) {
    const { key } = e.detail
    this.setData({
      todoFilter: key,
      filteredTodos: this.applyFilter(this.data.todos, key)
    })
    wx.vibrateShort({ type: 'light' })
  },

  // 邀请成员：拉起微信分享
  onInvite() {
    const team = this.data.team
    if (!team) return
    wx.showModal({
      title: '邀请成员',
      content: '点击右上角「···」→「转发」或使用下方「分享给好友」按钮，将团队卡片发给微信好友，对方打开即可加入。',
      confirmText: '我知道了',
      showCancel: false
    })
  },

  // 微信分享卡片
  onShareAppMessage() {
    const team = this.data.team
    return {
      title: `邀请你加入「${team ? team.name : '团队待办'}」`,
      path: `/pages/team-detail/team-detail?id=${this.teamId}&from=share`,
      imageUrl: ''  // 用默认截图
    }
  },

  // 通过分享进入：若未加入则弹窗确认
  checkAndPromptJoin() {
    const team = this.data.team
    if (!team) return
    if (this.data.isMember) {
      wx.showToast({ title: '你已在团队中', icon: 'none' })
      return
    }
    wx.showModal({
      title: '加入团队',
      content: `是否加入「${team.name}」？`,
      confirmText: '加入',
      success: (res) => {
        if (res.confirm) {
          const result = store.joinTeamByShare(this.teamId)
          if (result.ok) {
            wx.showToast({ title: '加入成功', icon: 'success' })
            this.loadData()
          } else if (result.reason === 'duplicate') {
            wx.showToast({ title: '你已在团队中', icon: 'none' })
          } else if (result.reason === 'no_login') {
            wx.showToast({ title: '请先登录', icon: 'none' })
          } else {
            wx.showToast({ title: '加入失败', icon: 'none' })
          }
        }
      }
    })
  },

  onToggleTodo(e) {
    const { id } = e.detail
    // 多人指派模型：切换当前用户完成状态
    const todo = store.getTodoById(id)
    if (!todo) return
    const user = store.getUser()
    let memberId = ''
    if (user) {
      const direct = (todo.assignments || []).find(a => a.memberId === user.id)
      if (direct) {
        memberId = direct.memberId
      } else {
        const members = store.getMembersByTeamId(todo.teamId)
        const me = members.find(m => m.name === user.name)
        const assign = me && (todo.assignments || []).find(a => a.memberId === me.id)
        if (assign) memberId = assign.memberId
      }
    }
    if (memberId) {
      store.toggleAssignment(id, memberId)
    } else {
      store.toggleTodoComplete(id)
    }
    this.loadData()
    wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: '已完成', icon: 'success', duration: 800 })
  },

  onTapTodo(e) {
    const { id } = e.detail
    wx.navigateTo({ url: '/pages/todo-detail/todo-detail?id=' + id })
  }
})
