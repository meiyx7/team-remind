// pages/home/home.js 首页 = 待办（统计卡作为筛选条件）
const store = require('../../utils/store')
const icons = require('../../utils/icons')

// 统计卡定义（顺序即展示顺序）
const STAT_DEFS = [
  { key: 'in_progress', label: '进行中' },
  { key: 'pending', label: '待开始' },
  { key: 'overdue', label: '已逾期' },
  { key: 'completed', label: '已完成' }
]

Page({
  data: {
    themeClass: '',
    statFilter: 'all',           // 'all' = 全部未完成；其余为具体状态
    stats: [],                   // 统计卡数据
    currentLabel: '',
    todos: [],
    plusIcon: icons.plus
  },

  onShow() {
    const app = getApp()
    if (!app.ensureLogin('/pages/home/home')) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
      this.getTabBar().updateTheme()
    }
    this.setData({ themeClass: app.getThemeClass() })
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  loadData() {
    const counts = store.getMyStatusCounts()
    const stats = STAT_DEFS.map(d => ({ ...d, count: counts[d.key] || 0 }))
    const todos = this.fetchTodos(this.data.statFilter)
    this.setData({ stats, todos, currentLabel: this.labelOf(this.data.statFilter) })
  },

  fetchTodos(filter) {
    let list = store.getMyTodos('all')
    if (filter === 'all') {
      // 全部 = 所有未完成
      list = list.filter(t => t.displayStatus !== 'completed')
    } else {
      list = list.filter(t => t.displayStatus === filter)
    }
    return list
  },

  labelOf(key) {
    const d = STAT_DEFS.find(x => x.key === key)
    return d ? d.label : ''
  },

  onStatTap(e) {
    const { key } = e.currentTarget.dataset
    // 再次点击当前卡 → 回到「全部未完成」
    const next = this.data.statFilter === key ? 'all' : key
    this.setData({
      statFilter: next,
      todos: this.fetchTodos(next),
      currentLabel: this.labelOf(next)
    })
    wx.vibrateShort({ type: 'light' })
  },

  onToggleTodo(e) {
    const { id } = e.detail
    store.toggleTodoComplete(id)
    this.loadData()
    wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: '已完成', icon: 'success', duration: 800 })
  },

  goCreateTodo() {
    wx.navigateTo({ url: '/pages/create-todo/create-todo' })
  }
})
