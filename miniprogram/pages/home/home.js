// pages/home/home.js 首页 = 待办（问候+进度+视图切换+统计筛选）
const store = require('../../utils/store')
const icons = require('../../utils/icons')
const themes = require('../../utils/themes')
const sync = require('../../utils/sync')

// 同步状态展示文案
const SYNC_LABEL = {
  ok: '已同步',
  syncing: '同步中',
  error: '同步异常',
  local: '本地模式',
  idle: '待同步'
}

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

// 环形进度 SVG（皮肤品牌色 + 暗色适配轨道）
function buildRingUri(rate, brandHex, trackHex) {
  const r = 30
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, rate))
  const off = c * (1 - clamped / 100)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">` +
    `<circle cx="36" cy="36" r="${r}" fill="none" stroke="${trackHex}" stroke-width="8"/>` +
    (clamped > 0
      ? `<circle cx="36" cy="36" r="${r}" fill="none" stroke="${brandHex}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 36 36)"/>`
      : '') +
    `</svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

Page({
  data: {
    themeClass: '',
    greeting: '',
    userName: '',
    todayLabel: '',
    todayStats: { total: 0, completed: 0, rate: 0 },
    overdueCount: 0,
    ringUri: '',
    rangeFilter: 'today',       // today | week | all（记忆用户上次选择）
    statFilter: 'all',          // 'all' = 全部；其余为具体状态
    rangeDefs: RANGE_DEFS,
    stats: [],
    todos: [],
    listTitle: '',
    emptyText: '',
    emptyHint: '',
    emptyAction: '',
    plusIcon: icons.plus,
    bellIcon: icons.bellBrand || icons.bell,
    searchIcon: icons.search,
    clearIcon: icons.clear,
    tplIcon: icons.grid,
    unreadCount: 0,
    searchVisible: false,
    searchKeyword: '',
    syncState: 'idle',
    syncLabel: '待同步',
    bellTop: 50,                // px，胶囊左侧对齐
    bellRight: 110              // px
  },

  onLoad() {
    // 恢复上次的筛选状态
    try {
      const range = wx.getStorageSync('homeRangeFilter')
      const stat = wx.getStorageSync('homeStatFilter')
      if (range) this.setData({ rangeFilter: range })
      if (stat) this.setData({ statFilter: stat })
    } catch {
      // 忽略恢复失败，走默认值
    }
  },

  onShow() {
    const app = getApp()
    if (!app.ensureLogin('/pages/home/home')) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
      this.getTabBar().updateTheme()
    }
    // 铃铛玻璃圆钮：垂直居中对齐系统胶囊、右缘与胶囊保持 8px 间距
    const g = app.globalData || {}
    let bellTop = 50
    let bellRight = 110
    if (g.menuButton && g.windowWidth) {
      const mb = g.menuButton
      const circlePx = Math.round(76 * g.windowWidth / 750)   // 76rpx -> px
      bellRight = Math.round(g.windowWidth - mb.left + 8)
      bellTop = Math.round(mb.top + (mb.height - circlePx) / 2)
    }
    const user = store.getUser()
    const syncStatus = sync.getStatus()
    this.setData({
      themeClass: app.getThemeClass(),
      greeting: store.getGreeting(),
      userName: user ? user.name : '',
      todayLabel: store.getTodayLabel(),
      unreadCount: store.unreadNotificationCount(),
      syncState: syncStatus.state,
      syncLabel: SYNC_LABEL[syncStatus.state] || '',
      bellTop,
      bellRight
    })
    this.loadData()
  },

  onPullDownRefresh() {
    // 云端模式下先同步再渲染（本地模式静默跳过）
    sync.syncNow().finally(() => {
      this.refreshThemeAndData()
      wx.stopPullDownRefresh()
    })
  },

  refreshThemeAndData() {
    const app = getApp()
    this.setData({ themeClass: app.getThemeClass() })
    this.loadData()
  },

  loadData() {
    const app = getApp()
    const counts = store.getMyStatusCounts()
    const todayStats = store.getTodayStats()
    // 已完成卡用完成率展示
    const stats = STAT_DEFS.map(d => ({
      ...d,
      count: counts[d.key] || 0,
      rate: d.key === 'completed' ? todayStats.rate : 0
    }))
    // 环形进度：颜色跟随皮肤与暗色模式
    const skin = themes.getSkin(app.globalData.skin)
    const palette = app.globalData.darkMode ? skin.dark : skin.light
    const trackHex = app.globalData.darkMode ? '#334155' : '#e5e7eb'
    const ringUri = buildRingUri(todayStats.rate, palette.brand, trackHex)

    const todos = this.fetchTodos(this.data.rangeFilter, this.data.statFilter)
    this.setData({ stats, todayStats, todos, overdueCount: counts.overdue || 0, ringUri })
    this.refreshListMeta()
  },

  // 双重过滤：时间维度 + 状态维度 + 关键词
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
    // 搜索过滤（标题，忽略大小写）
    const kw = this.data.searchKeyword.trim().toLowerCase()
    if (kw) {
      list = list.filter(t => (t.title || '').toLowerCase().includes(kw))
    }
    return list
  },

  /* ---- 搜索 ---- */
  toggleSearch() {
    this.setData({ searchVisible: !this.data.searchVisible, searchKeyword: '' })
    this.loadData()
    wx.vibrateShort({ type: 'light' })
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.loadData()
  },

  onClearSearch() {
    this.setData({ searchKeyword: '' })
    this.loadData()
  },

  refreshListMeta() {
    const { rangeFilter, statFilter, searchKeyword } = this.data
    const rangeLabel = (RANGE_DEFS.find(r => r.key === rangeFilter) || {}).label || ''
    const statLabel = statFilter === 'all' ? '' : (STAT_DEFS.find(s => s.key === statFilter) || {}).label
    const title = statLabel ? `${rangeLabel}·${statLabel}` : rangeLabel
    // 空态文案（搜索中的文案优先）
    let emptyText = '暂无待办', emptyHint = '', emptyAction = ''
    if (searchKeyword.trim()) {
      emptyText = '未找到匹配的待办'
      emptyHint = '换个关键词试试'
    } else if (statFilter === 'all') {
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
    this.saveFilters()
    this.loadData()
    wx.vibrateShort({ type: 'light' })
  },

  onStatTap(e) {
    const { key } = e.currentTarget.dataset
    const next = this.data.statFilter === key ? 'all' : key
    this.setData({ statFilter: next })
    this.saveFilters()
    this.loadData()
    wx.vibrateShort({ type: 'light' })
  },

  saveFilters() {
    try {
      wx.setStorageSync('homeRangeFilter', this.data.rangeFilter)
      wx.setStorageSync('homeStatFilter', this.data.statFilter)
    } catch {
      // 存储失败不影响功能
    }
  },

  // 逾期警示条点击：切到全部+已逾期视图
  goOverdueFilter() {
    this.setData({ rangeFilter: 'all', statFilter: 'overdue' })
    this.saveFilters()
    this.loadData()
    wx.vibrateShort({ type: 'light' })
  },

  onToggleTodo(e) {
    const { id } = e.detail
    // 多人指派模型：切换当前用户在该待办的完成状态（身份即成员 id）
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
  },

  goNotifications() {
    wx.navigateTo({ url: '/pages/notifications/notifications' })
  },

  goTemplates() {
    wx.navigateTo({ url: '/pages/templates/templates' })
  },

  goCreateTodo() {
    wx.navigateTo({ url: '/pages/create-todo/create-todo' })
  }
})
