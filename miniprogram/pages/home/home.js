// pages/home/home.js 首页 = 待办（问候+进度+视图切换+统计筛选）
const store = require('../../utils/store')
const icons = require('../../utils/icons')

// 时间维度视图
const RANGE_DEFS = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'all', label: '全部' }
]

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
    greeting: '',
    userName: '',
    todayLabel: '',
    todayStats: { total: 0, completed: 0, rate: 0 },
    rangeFilter: 'today',       // today | week | all
    statFilter: 'all',          // 'all' = 全部；其余为具体状态
    rangeDefs: RANGE_DEFS,
    stats: [],
    todos: [],
    listTitle: '',
    emptyText: '',
    emptyHint: '',
    emptyAction: '',
    plusIcon: icons.plus
  },

  onShow() {
    const app = getApp()
    if (!app.ensureLogin('/pages/home/home')) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
      this.getTabBar().updateTheme()
    }
    const user = store.getUser()
    this.setData({
      themeClass: app.getThemeClass(),
      greeting: store.getGreeting(),
      userName: user ? user.name : '',
      todayLabel: store.getTodayLabel()
    })
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  loadData() {
    const counts = store.getMyStatusCounts()
    const todayStats = store.getTodayStats()
    // 已完成卡用完成率展示
    const stats = STAT_DEFS.map(d => ({
      ...d,
      count: counts[d.key] || 0,
      rate: d.key === 'completed' ? todayStats.rate : 0
    }))
    const todos = this.fetchTodos(this.data.rangeFilter, this.data.statFilter)
    this.setData({ stats, todayStats, todos })
    this.refreshListMeta()
  },

  // 双重过滤：时间维度 + 状态维度
  fetchTodos(range, stat) {
    let list = store.getMyTodosByRange(range)
    if (stat === 'all') {
      // 状态「全部」时：今日/本周视图显示该范围内所有项（含已完成），
      // 全部视图仅显示未完成（避免已完成历史项堆积）
      if (range === 'all') {
        list = list.filter(t => t.displayStatus !== 'completed')
      }
    } else {
      list = list.filter(t => t.displayStatus === stat)
    }
    return list
  },

  refreshListMeta() {
    const { rangeFilter, statFilter } = this.data
    const rangeLabel = RANGE_DEFS.find(r => r.key === rangeFilter).label
    const statLabel = statFilter === 'all' ? '' : (STAT_DEFS.find(s => s.key === statFilter) || {}).label
    const title = statLabel ? `${rangeLabel}·${statLabel}` : rangeLabel
    // 空态文案
    let emptyText = '暂无待办', emptyHint = '', emptyAction = ''
    if (statFilter === 'all') {
      emptyText = rangeFilter === 'today' ? '今天暂无待办' : (rangeFilter === 'week' ? '本周暂无待办' : '暂无待办')
      emptyHint = '点击右下角按钮创建'
      emptyAction = '创建待办'
    } else {
      emptyText = '该状态下暂无待办'
    }
    this.setData({ listTitle: title, emptyText, emptyHint, emptyAction })
  },

  onRangeTap(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.rangeFilter) return
    this.setData({ rangeFilter: key, statFilter: 'all' })
    this.loadData()
    wx.vibrateShort({ type: 'light' })
  },

  onStatTap(e) {
    const { key } = e.currentTarget.dataset
    const next = this.data.statFilter === key ? 'all' : key
    this.setData({ statFilter: next })
    this.loadData()
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
