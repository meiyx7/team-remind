// pages/create-todo/create-todo.js
const store = require('../../utils/store')
const icons = require('../../utils/icons')
const notify = require('../../utils/notify')
const config = require('../../utils/config')

Page({
  data: {
    pageTitle: '创建待办',
    locked: false,               // 编辑模式：团队与成员锁定
    lockTeamName: '',
    createdInfo: null,           // 情境化邀请：指派了未加入伙伴时进入成功态
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',                 // HH:mm，可选
    priority: 'normal',          // urgent | normal
    priorityDefs: [
      { key: 'normal', label: '普通' },
      { key: 'urgent', label: '紧急' }
    ],
    // 指派方式：assign=指派成员；claim=认领池（发 N 个名额大家抢）
    mode: 'assign',
    modeDefs: [
      { key: 'assign', label: '指派成员' },
      { key: 'claim', label: '认领池' }
    ],
    slotCount: 3,
    // 重复：none | daily | weekly（完成后自动生成下一期）
    repeat: 'none',
    repeatDefs: [
      { key: 'none', label: '不重复' },
      { key: 'daily', label: '每天' },
      { key: 'weekly', label: '每周' }
    ],
    teams: [],
    selectedTeamId: '',
    members: [],
    selectedMembers: [],
    today: '',
    submitting: false,
    themeClass: '',
    shareIcon: icons.shareWhite,
    calendarIcon: icons.calendar,
    chevronIcon: icons.chevron,
    clockIcon: icons.clock || icons.calendar
  },

  onLoad(options) {
    const app = getApp()
    const today = store.getTodayStr()
    const teams = store.getTeams()

    // 编辑模式：?id=xxx 载入既有待办（团队与成员不可改）
    if (options && options.id) {
      const todo = store.getTodoById(options.id)
      if (!todo) {
        wx.showToast({ title: '待办不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      this.editId = todo.id
      this.setData({
        themeClass: app.getThemeClass(),
        today,
        teams,
        pageTitle: '编辑待办',
        locked: true,
        lockTeamName: todo.teamName || '',
        title: todo.title,
        description: todo.description || '',
        dueDate: todo.dueDate || '',
        dueTime: todo.dueTime || '',
        priority: todo.priority === 'urgent' ? 'urgent' : 'normal',
        mode: todo.mode === 'claim' ? 'claim' : 'assign',
        repeat: ['daily', 'weekly'].indexOf(todo.repeat) !== -1 ? todo.repeat : 'none',
        slotCount: Math.max(1, Math.min(10, todo.assignTotal || 1)),
        selectedTeamId: todo.teamId
      })
      return
    }

    this.setData({
      themeClass: app.getThemeClass(),
      today,
      teams,
      selectedTeamId: teams.length > 0 ? teams[0].id : ''
    })
    this.loadMembers()
  },

  loadMembers() {
    if (!this.data.selectedTeamId) {
      this.setData({ members: [], selectedMembers: [] })
      return
    }
    const members = store.getMembersByTeamId(this.data.selectedTeamId)
    const user = store.getUser()
    // 默认选中当前用户（若存在于该团队，身份即成员 id）
    const me = user ? members.find(m => m.id === user.id) : null
    this.setData({
      members,
      selectedMembers: me ? [me] : []
    })
  },

  onShow() {
    // 从建团页返回：刷新团队列表并补选默认团队
    if (!this.editId) {
      const teams = store.getTeams()
      if (teams.length !== this.data.teams.length) {
        this.setData({
          teams,
          selectedTeamId: this.data.selectedTeamId || (teams.length > 0 ? teams[0].id : '')
        })
        this.loadMembers()
      }
    }
  },

  goCreateTeam() {
    wx.navigateTo({ url: '/pages/create-team/create-team' })
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ dueDate: e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ dueTime: e.detail.value })
  },

  onClearTime() {
    this.setData({ dueTime: '' })
  },

  selectPriority(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.priority) return
    this.setData({ priority: key })
    wx.vibrateShort({ type: 'light' })
  },

  selectMode(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.mode) return
    this.setData({ mode: key })
    wx.vibrateShort({ type: 'light' })
  },

  onSlotMinus() {
    if (this.data.slotCount <= 1) return
    this.setData({ slotCount: this.data.slotCount - 1 })
  },

  onSlotPlus() {
    if (this.data.slotCount >= 10) return
    this.setData({ slotCount: this.data.slotCount + 1 })
  },

  selectRepeat(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.repeat) return
    this.setData({ repeat: key })
    wx.vibrateShort({ type: 'light' })
  },

  selectTeam(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ selectedTeamId: id })
    this.loadMembers()
  },

  toggleMember(e) {
    const { id } = e.currentTarget.dataset
    const members = this.data.selectedMembers
    const idx = members.findIndex(m => m.id === id)
    if (idx >= 0) {
      members.splice(idx, 1)
    } else {
      const member = this.data.members.find(m => m.id === id)
      if (member) members.push(member)
    }
    this.setData({ selectedMembers: members })
  },

  removeMember(e) {
    const { id } = e.currentTarget.dataset
    const members = this.data.selectedMembers.filter(m => m.id !== id)
    this.setData({ selectedMembers: members })
  },

  onSubmit() {
    if (this.data.submitting) return
    const { title, description, dueDate, dueTime, selectedTeamId, selectedMembers, mode, slotCount, repeat } = this.data
    if (!title.trim()) {
      wx.showToast({ title: '请输入待办标题', icon: 'none' })
      return
    }
    if (!selectedTeamId) {
      wx.showToast({ title: '请选择关联团队', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    // 编辑模式：仅更新内容字段
    if (this.editId) {
      const result = store.updateTodo(this.editId, {
        title: title.trim(),
        description: description.trim(),
        dueDate,
        dueTime,
        priority: this.data.priority,
        repeat
      })
      if (!result.ok) {
        const tips = { forbidden: '没有编辑权限', not_found: '待办不存在', no_login: '请先登录' }
        wx.showToast({ title: tips[result.reason] || '保存失败', icon: 'none' })
        this.setData({ submitting: false })
        return
      }
      wx.vibrateShort({ type: 'medium' })
      wx.showToast({ title: '已保存', icon: 'success', duration: 800 })
      setTimeout(() => {
        this.setData({ submitting: false })
        wx.navigateBack({
          fail: () => wx.switchTab({ url: '/pages/home/home' })
        })
      }, 800)
      return
    }

    const created = store.createTodo({
      title: title.trim(),
      description: description.trim(),
      dueDate,
      dueTime,
      priority: this.data.priority,
      teamId: selectedTeamId,
      mode,
      slotCount,
      repeat,
      selectedMembers: mode === 'assign' ? selectedMembers : []   // 认领池由 store 生成空名额
    })
    wx.vibrateShort({ type: 'medium' })
    // 云端模式下顺带请求订阅消息授权（到期提醒），静默失败不打扰
    notify.requestRemindPermission()

    // 情境化邀请第二棒：指派了尚未真实加入的伙伴 → 引导分享团队卡片
    const unjoined = (mode === 'assign' ? selectedMembers : [])
      .filter(m => !store.isRealJoinedId(m.id))
    if (config.cloudEnabled() && unjoined.length > 0) {
      this.setData({
        submitting: false,
        createdInfo: {
          todoTitle: created.title,
          teamId: selectedTeamId,
          teamName: (store.getTeamById(selectedTeamId) || {}).name || '',
          unjoinedNames: unjoined.map(m => m.name).slice(0, 3).join('、'),
          unjoinedCount: unjoined.length
        }
      })
      return
    }

    wx.showToast({ title: '创建成功', icon: 'success', duration: 800 })
    setTimeout(() => {
      this.setData({ submitting: false })
      wx.navigateBack({
        fail: () => wx.switchTab({ url: '/pages/home/home' })
      })
    }, 800)
  },

  // 成功态「完成」
  onDone() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/home/home' })
    })
  },

  // 成功态分享：拉新团队卡片给被指派伙伴
  onShareAppMessage() {
    const info = this.data.createdInfo
    const teamId = info ? info.teamId : this.data.selectedTeamId
    const team = store.getTeamById(teamId)
    return {
      title: `邀请你加入「${team ? team.name : '团队待办'}」`,
      path: `/pages/team-detail/team-detail?id=${teamId}&from=share`,
      imageUrl: ''
    }
  }
})
