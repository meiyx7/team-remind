// pages/team-detail/team-detail.js
const store = require('../../utils/store')
const icons = require('../../utils/icons')

Page({
  data: {
    themeClass: '',
    team: null,
    members: [],
    todos: [],
    events: [],
    completedCount: 0,
    activeTab: 'members',     // members | todos | events
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
    isMember: false,
    isAdmin: false,           // 创建者或管理员：可移除成员
    isCreator: false,         // 创建者：可归档团队
    myRole: ''
  },

  onLoad(options) {
    this.setData({ themeClass: getApp().getThemeClass() })
    if (options.id) {
      this.teamId = options.id
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
    const user = store.getUser()
    const members = store.getMembersByTeamId(this.teamId)
    const todos = store.getTeamTodos(this.teamId, 'all')

    // 权限信息（身份即成员 id）
    const myRole = store.memberRole(this.teamId, user && user.id)
    const isAdmin = myRole === 'creator' || myRole === 'admin'
    const isCreator = myRole === 'creator'

    // 成员列表附加管理标记（管理员不可见移除按钮的对象：创建者与自己）
    const memberViews = members.map(m => ({
      ...m,
      roleLabel: m.role === 'creator' ? '创建者' : (m.role === 'admin' ? '管理员' : '成员'),
      canRemove: isAdmin && m.role !== 'creator' && m.id !== (user && user.id)
    }))

    this.setData({
      team,
      members: memberViews,
      todos,
      events: store.getTeamEvents(this.teamId),
      completedCount: todos.filter(t => t.displayStatus === 'completed').length,
      filteredTodos: this.applyFilter(todos, this.data.todoFilter),
      isMember: !!myRole,
      isAdmin,
      isCreator,
      myRole
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

  /* ---- 团队治理 ---- */

  goReport() {
    wx.navigateTo({ url: '/pages/team-report/team-report?id=' + this.teamId })
  },

  // 归档 / 取消归档（仅创建者）
  onToggleArchive() {
    const team = this.data.team
    if (!team) return
    const archiving = !team.archived
    wx.showModal({
      title: archiving ? '归档团队' : '取消归档',
      content: archiving
        ? `归档后「${team.name}」将从团队列表隐藏，随时可以恢复。`
        : `恢复「${team.name}」到团队列表？`,
      success: (res) => {
        if (!res.confirm) return
        const result = store.archiveTeam(this.teamId, archiving)
        if (result.ok) {
          wx.showToast({ title: archiving ? '已归档' : '已恢复', icon: 'success' })
          if (archiving) {
            setTimeout(() => wx.navigateBack(), 600)
          } else {
            this.loadData()
          }
        } else {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  // 移除成员（管理员）
  onRemoveMember(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '移除成员',
      content: `确定将「${name}」移出团队吗？`,
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return
        const result = store.removeMember(this.teamId, id)
        if (result.ok) {
          wx.showToast({ title: '已移除', icon: 'success' })
          this.loadData()
        } else {
          const tips = {
            forbidden: '需要管理员权限',
            cannot_remove_creator: '不能移除创建者',
            not_found: '成员不存在'
          }
          wx.showToast({ title: tips[result.reason] || '移除失败', icon: 'none' })
        }
      }
    })
  },

  // 退出团队（创建者不支持）
  onQuitTeam() {
    wx.showModal({
      title: '退出团队',
      content: '退出后将不再接收该团队的任务，确定退出吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return
        const result = store.quitTeam(this.teamId)
        if (result.ok) {
          wx.showToast({ title: '已退出', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 600)
        } else {
          const tips = {
            creator_cannot_quit: '创建者暂不能退出，可先归档团队',
            not_member: '你不在该团队中'
          }
          wx.showToast({ title: tips[result.reason] || '退出失败', icon: 'none' })
        }
      }
    })
  },

  /* ---- 邀请 / 分享 ---- */

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
    // loadData 在 onLoad 后执行，这里延迟到数据就绪后判断
    setTimeout(() => {
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
    }, 300)
  },

  /* ---- 待办 ---- */

  onToggleTodo(e) {
    const { id } = e.detail
    // 多人指派模型：切换当前用户完成状态（身份即成员 id）
    const todo = store.getTodoById(id)
    if (!todo) return
    const assign = store.findMyAssignment(todo)
    if (assign) {
      store.toggleAssignment(id, assign.memberId)
      wx.showToast({
        title: assign.done ? '已取消完成' : '已完成',
        icon: 'success',
        duration: 800
      })
    } else if (todo.mode === 'claim' && todo.unclaimed > 0) {
      // 认领池待办：点击进入详情页认领
      wx.navigateTo({ url: '/pages/todo-detail/todo-detail?id=' + id })
      return
    } else {
      store.toggleTodoComplete(id)
      wx.showToast({ title: '已完成', icon: 'success', duration: 800 })
    }
    this.loadData()
    wx.vibrateShort({ type: 'medium' })
  },

  onTapTodo(e) {
    const { id } = e.detail
    wx.navigateTo({ url: '/pages/todo-detail/todo-detail?id=' + id })
  },

  // 动态流中的「查看」入口（data-id 传参）
  onTapTodoFromEvent(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: '/pages/todo-detail/todo-detail?id=' + id })
  }
})
