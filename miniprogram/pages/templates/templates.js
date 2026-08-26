// pages/templates/templates.js 场景模板库：选模板 → 选团队/成员 → 一键生成整组待办
const store = require('../../utils/store')
const templates = require('../../utils/templates')

Page({
  data: {
    themeClass: '',
    list: [],
    activeId: '',            // 展开配置的模板
    activeTasks: [],
    teams: [],
    selectedTeamId: '',
    members: [],
    memberViews: [],
    selectedMembers: [],
    startDate: '',           // 任务组起始日期，offset 由此起算
    today: '',
    minSlots: 1,
    generating: false
  },

  onLoad() {
    const teams = store.getTeams()
    this.setData({
      themeClass: getApp().getThemeClass(),
      list: templates.TEMPLATES.map(t => ({
        ...t,
        taskCount: t.tasks.length,
        modeLabel: t.mode === 'claim' ? '认领池' : '指派'
      })),
      teams,
      today: store.getTodayStr(),
      startDate: store.getTodayStr()
    })
    if (teams.length > 0) {
      this.setData({ selectedTeamId: teams[0].id })
      this.loadMembers()
    }
  },

  onShow() {
    // 从首页进入后若新建了团队，返回时刷新
    const teams = store.getTeams()
    if (teams.length !== this.data.teams.length) {
      this.setData({ teams })
    }
  },

  loadMembers() {
    const members = store.getMembersByTeamId(this.data.selectedTeamId)
    const user = store.getUser()
    const me = user ? members.find(m => m.id === user.id) : null
    const selectedIds = (me ? [me] : []).map(m => m.id)
    this.setData({
      members,
      selectedMembers: me ? [me] : [],
      memberViews: members.map(m => ({ id: m.id, name: m.name, selected: selectedIds.indexOf(m.id) !== -1 }))
    })
  },

  toggleTemplate(e) {
    const { id } = e.currentTarget.dataset
    const tpl = templates.getTemplate(id)
    if (!tpl) return
    if (this.data.activeId === id) {
      this.setData({ activeId: '', activeTasks: [] })
      return
    }
    this.setData({
      activeId: id,
      activeTasks: tpl.tasks.map(t => ({
        title: t.title,
        offset: t.offset,
        dueDate: store.getDateStrOffset(t.offset)
      }))
    })
    wx.vibrateShort({ type: 'light' })
  },

  selectTeam(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ selectedTeamId: id })
    this.loadMembers()
  },

  onDateChange(e) {
    this.setData({ startDate: e.detail.value })
    // 重算任务预览日期
    const tpl = templates.getTemplate(this.data.activeId)
    if (!tpl) return
    this.setData({
      activeTasks: tpl.tasks.map(t => ({
        title: t.title,
        offset: t.offset,
        dueDate: this.offsetFrom(e.detail.value, t.offset)
      }))
    })
  },

  offsetFrom(startIso, offset) {
    const d = new Date(startIso + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  toggleMember(e) {
    const { id } = e.currentTarget.dataset
    const views = this.data.memberViews.map(v =>
      v.id !== id ? v : { ...v, selected: !v.selected })
    const selectedMembers = this.data.members.filter(m =>
      views.some(v => v.id === m.id && v.selected))
    this.setData({ memberViews: views, selectedMembers })
  },

  async onGenerate() {
    if (this.data.generating) return
    const { activeId, selectedTeamId, selectedMembers, startDate } = this.data
    const tpl = templates.getTemplate(activeId)
    if (!tpl) {
      wx.showToast({ title: '请先选择模板', icon: 'none' })
      return
    }
    if (!selectedTeamId) {
      wx.showToast({ title: '请选择关联团队', icon: 'none' })
      return
    }
    if (tpl.mode !== 'claim' && selectedMembers.length === 0) {
      wx.showToast({ title: '请至少选择一位成员', icon: 'none' })
      return
    }

    this.setData({ generating: true })
    let created = 0
    tpl.tasks.forEach(task => {
      store.createTodo({
        title: task.title,
        description: task.description || '',
        dueDate: this.offsetFrom(startDate, task.offset),
        dueTime: '',
        priority: task.priority || 'normal',
        teamId: selectedTeamId,
        mode: tpl.mode === 'claim' ? 'claim' : 'assign',
        slotCount: tpl.slotCount || 1,
        repeat: 'none',
        selectedMembers: tpl.mode === 'claim' ? [] : selectedMembers
      })
      created++
    })

    wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: `已创建 ${created} 项待办`, icon: 'success', duration: 1000 })
    setTimeout(() => {
      this.setData({ generating: false })
      wx.navigateBack({
        fail: () => wx.switchTab({ url: '/pages/home/home' })
      })
    }, 1000)
  }
})
