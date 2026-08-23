// pages/create-todo/create-todo.js
const store = require('../../utils/store')
const icons = require('../../utils/icons')
const notify = require('../../utils/notify')

Page({
  data: {
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
    calendarIcon: icons.calendar,
    chevronIcon: icons.chevron,
    clockIcon: icons.clock || icons.calendar
  },

  onLoad() {
    const app = getApp()
    const today = store.getTodayStr()
    const teams = store.getTeams()
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
    store.createTodo({
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

    wx.showToast({ title: '创建成功', icon: 'success', duration: 800 })
    // 云端模式下顺带请求订阅消息授权（到期提醒），静默失败不打扰
    notify.requestRemindPermission()
    setTimeout(() => {
      this.setData({ submitting: false })
      wx.navigateBack({
        fail: () => wx.switchTab({ url: '/pages/home/home' })
      })
    }, 800)
  }
})
