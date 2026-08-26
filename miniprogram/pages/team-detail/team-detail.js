// pages/team-detail/team-detail.js
const store = require('../../utils/store')
const icons = require('../../utils/icons')
const sync = require('../../utils/sync')
const config = require('../../utils/config')

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
      // 通过分享进入：数据就绪后提示可加入
      if (options.from === 'share') {
        this._pendingShareJoin = true
      }
    }
  },

  onShow() {
    if (this.teamId) this.loadData()
    this._startPolling()
  },

  onHide() {
    this._stopPolling()
  },

  onUnload() {
    this._stopPolling()
  },

  // 前台轮询：详情页停留时每 30s 轻量同步，队友的变更准实时可见
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

  onPullDownRefresh() {
    sync.syncNow().finally(() => {
      this.loadData()
      wx.stopPullDownRefresh()
    })
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
      canRemove: isAdmin && m.role !== 'creator' && m.id !== (user && user.id),
      // 创建者可点选普通成员/管理员进行角色管理与移除
      canManage: myRole === 'creator' && m.role !== 'creator' && m.id !== (user && user.id)
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

    // 分享进入：数据就绪后再弹加入确认（替代不可靠的 setTimeout）
    if (this._pendingShareJoin) {
      this._pendingShareJoin = false
      this.promptJoinIfGuest()
    }

    // 预生成分享封面（异步，失败静默回退默认截图）
    this._generateShareCard()
  },

  // 分享直达页返回兜底：页面栈可能只有当前页
  safeBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/team-list/team-list' })
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
            setTimeout(() => this.safeBack(), 600)
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

  // 点选成员：创建者可进行角色管理与移除
  onMemberTap(e) {
    const { id, name, manageable } = e.currentTarget.dataset
    if (!manageable) return
    const target = this.data.members.find(m => m.id === id)
    if (!target) return
    const actions = []
    const handlers = []
    if (target.role === 'admin') {
      actions.push('撤销管理员')
      handlers.push(() => this._applyRole(id, 'member'))
    } else {
      actions.push('设为管理员')
      handlers.push(() => this._applyRole(id, 'admin'))
    }
    actions.push('移出团队')
    handlers.push(() => this._confirmRemove(id, name))

    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        const fn = handlers[res.tapIndex]
        if (fn) fn()
      }
    })
  },

  _applyRole(memberId, role) {
    const result = store.setMemberRole(this.teamId, memberId, role)
    if (result.ok) {
      wx.showToast({ title: role === 'admin' ? '已设为管理员' : '已撤销管理员', icon: 'success' })
      this.loadData()
    } else {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  _confirmRemove(id, name) {
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

  // 解散团队（仅创建者）：级联移除全部成员与待办
  onDissolveTeam() {
    const team = this.data.team
    if (!team) return
    wx.showModal({
      title: '解散团队',
      content: `解散后「${team.name}」的所有待办与成员关系将永久移除，此操作不可撤销。确定解散吗？`,
      confirmText: '解散',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return
        const result = store.dissolveTeam(this.teamId)
        if (result.ok) {
          wx.showToast({ title: '已解散', icon: 'success' })
          setTimeout(() => this.safeBack(), 600)
        } else {
          wx.showToast({ title: '操作失败', icon: 'none' })
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
          setTimeout(() => this.safeBack(), 600)
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

  // 分享卡片（成员 Tab 的「分享给好友」按钮 open-type=share 直接触发）

  onReady() {
    // 首次 loadData 发生在渲染完成前，Canvas 未挂载时在此补一次封面生成
    if (this.teamId && !this._shareImagePath) {
      this._generateShareCard()
    }
  },

  // 微信分享卡片
  onShareAppMessage() {
    const team = this.data.team
    return {
      title: `邀请你加入「${team ? team.name : '团队待办'}」`,
      path: `/pages/team-detail/team-detail?id=${this.teamId}&from=share`,
      imageUrl: this._shareImagePath || ''  // 品牌封面，生成失败回退默认截图
    }
  },

  // Canvas 绘制品牌分享封面：团队色渐变 + 名称 + 成员/待办数
  _generateShareCard() {
    const team = this.data.team
    if (!team || this._shareImagePath || this._shareCardBusy) return
    this._shareCardBusy = true

    const query = this.createSelectorQuery()
    query.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
      const item = res && res[0]
      if (!item || !item.node) {
        this._shareCardBusy = false
        return
      }
      try {
        const canvas = item.node
        const W = 500
        const H = 400
        const dpr = Math.min(2, (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2) || 2)
        canvas.width = W * dpr
        canvas.height = H * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)

        // 背景：团队色 -> 白 渐变
        const grad = ctx.createLinearGradient(0, 0, W, H)
        grad.addColorStop(0, team.avatarColor || '#10b981')
        grad.addColorStop(1, '#ffffff')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, W, H)

        // 中央半透明圆角卡
        this._roundRect(ctx, 24, 24, W - 48, H - 48, 24)
        ctx.fillStyle = 'rgba(255,255,255,0.88)'
        ctx.fill()

        // 团队头像圆 + 字
        ctx.beginPath()
        ctx.arc(78, 100, 34, 0, Math.PI * 2)
        ctx.fillStyle = team.avatarColor || '#10b981'
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 30px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(team.avatarChar || (team.name || '队')[0], 78, 101)

        // 团队名
        ctx.textAlign = 'left'
        ctx.fillStyle = '#0f172a'
        ctx.font = 'bold 30px sans-serif'
        const name = (team.name || '').length > 10 ? team.name.slice(0, 10) + '…' : (team.name || '')
        ctx.fillText(name, 126, 101)

        // 成员/待办信息
        ctx.font = '22px sans-serif'
        ctx.fillStyle = '#475569'
        ctx.fillText(`${team.memberCount} 位成员 · ${this.data.todos.length} 个待办`, 44, 172)

        // 分割线
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(44, 204)
        ctx.lineTo(W - 44, 204)
        ctx.stroke()

        // 邀请文案
        ctx.font = 'bold 26px sans-serif'
        ctx.fillStyle = team.avatarColor || '#10b981'
        ctx.fillText(`我在「${name}」等你，点击加入`, 44, 248)
        ctx.font = '20px sans-serif'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText('团队待办 · 微信里轻量协作', 44, 296)

        wx.canvasToTempFilePath({
          canvas,
          success: (r) => {
            this._shareImagePath = r.tempFilePath
            this._shareCardBusy = false
          },
          fail: () => {
            this._shareCardBusy = false
          }
        })
      } catch {
        this._shareCardBusy = false
      }
    })
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  },

  // 通过分享进入：若未加入则弹窗确认（由 loadData 数据就绪后调用）
  promptJoinIfGuest() {
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
  },

  // 卡片长按快捷操作：催办 / 删除
  onTodoLongPress(e) {
    const { id } = e.detail
    const todo = store.getTodoById(id)
    const user = store.getUser()
    if (!todo || !user) return

    const nudgeTargets = (todo.assignments || [])
      .filter(a => a.memberId && a.memberId !== user.id && !a.done).length
    const canDelete = todo.createdBy === user.id || store.isTeamAdmin(todo.teamId, user.id)

    const actions = []
    const handlers = []
    if (todo.displayStatus !== 'completed' && nudgeTargets > 0) {
      actions.push(`催办 ${nudgeTargets} 位未完成成员`)
      handlers.push(() => {
        const n = store.nudgeTodo(id)
        wx.showToast({ title: `已提醒 ${n} 位成员`, icon: 'none' })
      })
    }
    if (canDelete) {
      actions.push('编辑待办')
      handlers.push(() => wx.navigateTo({ url: '/pages/create-todo/create-todo?id=' + id }))
      actions.push('删除待办')
      handlers.push(() => this._confirmDelete(todo))
    }
    if (actions.length === 0) return

    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        const fn = handlers[res.tapIndex]
        if (fn) fn()
        this.loadData()
      }
    })
  },

  _confirmDelete(todo) {
    wx.showModal({
      title: '删除待办',
      content: `确定删除「${todo.title}」吗？`,
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return
        const result = store.deleteTodo(todo.id)
        if (result.ok) {
          wx.showToast({ title: '已删除', icon: 'success' })
        } else {
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
        this.loadData()
      }
    })
  }
})
