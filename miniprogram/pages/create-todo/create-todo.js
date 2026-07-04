// pages/create-todo/create-todo.js
const store = require('../../utils/store')
const icons = require('../../utils/icons')

Page({
  data: {
    title: '',
    description: '',
    dueDate: '',
    priority: 'normal',          // urgent | normal
    priorityDefs: [
      { key: 'normal', label: '普通' },
      { key: 'urgent', label: '紧急' }
    ],
    teams: [],
    selectedTeamId: '',
    members: [],
    selectedMembers: [],
    today: '',
    submitting: false,
    themeClass: '',
    calendarIcon: icons.calendar,
    chevronIcon: icons.chevron
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
    // 默认选中当前用户（若存在于该团队）
    const me = members.find(m => m.name === (user ? user.name : ''))
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

  selectTeam(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ selectedTeamId: id })
    this.loadMembers()
  },

  selectPriority(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.priority) return
    this.setData({ priority: key })
    wx.vibrateShort({ type: 'light' })
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
    const { title, description, dueDate, selectedTeamId, selectedMembers, priority } = this.data
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
      priority: this.data.priority,
      teamId: selectedTeamId,
      selectedMembers: selectedMembers   // 多人指派，store 内生成 assignments
    })
    wx.vibrateShort({ type: 'medium' })

    wx.showToast({ title: '创建成功', icon: 'success', duration: 800 })
    setTimeout(() => {
      this.setData({ submitting: false })
      wx.navigateBack({
        fail: () => wx.switchTab({ url: '/pages/home/home' })
      })
    }, 800)
  }
})
