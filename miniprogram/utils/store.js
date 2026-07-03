// utils/store.js 数据 CRUD + Storage 持久化
const { seedUser, seedTeams, seedMembers, seedTodos } = require('./mock')
const dateUtil = require('./date')

// 给 todo 附加展示状态 + 截止日期相对标签（今天/明天/N天后/已逾期N天）
function decorate(todo, today) {
  const ds = computeDisplayStatus(todo, today)
  let dueLabel = ''
  if (todo.dueDate) {
    dueLabel = dateUtil.relativeLabel(todo.dueDate) || dateUtil.toChineseShort(todo.dueDate)
  }
  return { ...todo, displayStatus: ds, dueLabel }
}

const KEYS = {
  USER: 'user',
  TEAMS: 'teams',
  MEMBERS: 'members',
  TODOS: 'todos'
}

// 初始化：首次启动写入种子数据
function init() {
  if (!wx.getStorageSync(KEYS.TEAMS)) {
    wx.setStorageSync(KEYS.TEAMS, seedTeams)
  }
  if (!wx.getStorageSync(KEYS.MEMBERS)) {
    wx.setStorageSync(KEYS.MEMBERS, seedMembers)
  }
  if (!wx.getStorageSync(KEYS.TODOS)) {
    wx.setStorageSync(KEYS.TODOS, seedTodos)
  }
}

// 重置数据（用于调试）
function reset() {
  wx.setStorageSync(KEYS.USER, null)
  wx.setStorageSync(KEYS.TEAMS, seedTeams)
  wx.setStorageSync(KEYS.MEMBERS, seedMembers)
  wx.setStorageSync(KEYS.TODOS, seedTodos)
}

/* ============ 用户 ============ */
function getUser() {
  return wx.getStorageSync(KEYS.USER) || null
}

function setUser(user) {
  wx.setStorageSync(KEYS.USER, user)
  const app = getApp()
  if (app) app.globalData.userInfo = user
}

function logout() {
  wx.removeStorageSync(KEYS.USER)
  const app = getApp()
  if (app) app.globalData.userInfo = null
}

/* ============ 团队 ============ */
function getTeams() {
  return wx.getStorageSync(KEYS.TEAMS) || []
}

function getTeamById(id) {
  return getTeams().find(t => t.id === id) || null
}

function searchTeams(keyword) {
  if (!keyword) return getTeams()
  const kw = keyword.trim().toLowerCase()
  return getTeams().filter(t => t.name.toLowerCase().includes(kw))
}

/* ============ 成员 ============ */
function getMembersByTeamId(teamId) {
  return (wx.getStorageSync(KEYS.MEMBERS) || []).filter(m => m.teamId === teamId)
}

/* ============ 待办 ============ */
function getTodos() {
  return wx.getStorageSync(KEYS.TODOS) || []
}

// 计算实际展示状态（已逾期由 dueDate 推断）
function computeDisplayStatus(todo, today) {
  if (todo.status === 'completed') return 'completed'
  if (todo.dueDate && todo.dueDate < today) return 'overdue'
  return todo.status
}

// 获取当前用户的待办（带展示状态 + 相对日期）
function getMyTodos(filter) {
  const user = getUser()
  if (!user) return []
  const today = getTodayStr()
  let list = getTodos()
    .filter(t => t.assigneeId === user.id)
    .map(t => decorate(t, today))

  if (filter && filter !== 'all') {
    list = list.filter(t => t.displayStatus === filter)
  }
  // 按截止日期升序
  list.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
  return list
}

// 获取团队待办
function getTeamTodos(teamId, filter) {
  const today = getTodayStr()
  let list = getTodos()
    .filter(t => t.teamId === teamId)
    .map(t => decorate(t, today))

  if (filter && filter !== 'all') {
    list = list.filter(t => t.displayStatus === filter)
  }
  list.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
  return list
}

// 统计当前用户各状态待办数（供首页统计卡使用）
function getMyStatusCounts() {
  const user = getUser()
  const empty = { pending: 0, in_progress: 0, overdue: 0, completed: 0 }
  if (!user) return empty
  const today = getTodayStr()
  const list = getTodos().filter(t => t.assigneeId === user.id)
  const counts = { ...empty }
  list.forEach(t => {
    const ds = computeDisplayStatus(t, today)
    if (counts[ds] !== undefined) counts[ds]++
  })
  return counts
}

// 获取最近待办（未完成优先，取前 N 条）
function getRecentTodos(limit = 5) {
  const today = getTodayStr()
  const list = getMyTodos('all').filter(t => t.displayStatus !== 'completed')
  return list.slice(0, limit)
}

// 统计：我的待办数 / 进行中数 / 已完成数
function getMyStats() {
  const user = getUser()
  if (!user) return { mine: 0, inProgress: 0, completed: 0 }
  const today = getTodayStr()
  const list = getTodos().filter(t => t.assigneeId === user.id)
  let inProgress = 0
  let completed = 0
  let mine = 0
  list.forEach(t => {
    const ds = computeDisplayStatus(t, today)
    if (ds === 'completed') completed++
    else {
      mine++
      if (ds === 'in_progress') inProgress++
    }
  })
  return { mine, inProgress, completed }
}

// 创建待办
function createTodo(data) {
  const user = getUser()
  const todos = getTodos()
  const team = getTeamById(data.teamId)
  const newTodo = {
    id: 'todo_' + Date.now(),
    title: data.title,
    description: data.description || '',
    teamId: data.teamId,
    teamName: team ? team.name : '',
    assigneeId: data.assigneeId || (user ? user.id : ''),
    assigneeName: data.assigneeName || (user ? user.name : '未指派'),
    dueDate: data.dueDate || '',
    status: 'pending',
    createdAt: getTodayStr(),
    createdBy: user ? user.id : ''
  }
  todos.unshift(newTodo)
  wx.setStorageSync(KEYS.TODOS, todos)
  return newTodo
}

// 切换待办完成状态
function toggleTodoComplete(id) {
  const todos = getTodos()
  const idx = todos.findIndex(t => t.id === id)
  if (idx === -1) return null
  const todo = todos[idx]
  if (todo.status === 'completed') {
    // 已完成 -> 恢复为进行中
    todo.status = 'in_progress'
  } else {
    // 未完成 -> 已完成
    todo.status = 'completed'
  }
  todos[idx] = todo
  wx.setStorageSync(KEYS.TODOS, todos)
  return todo
}

// 开始待办（pending -> in_progress）
function startTodo(id) {
  const todos = getTodos()
  const idx = todos.findIndex(t => t.id === id)
  if (idx === -1) return null
  todos[idx].status = 'in_progress'
  wx.setStorageSync(KEYS.TODOS, todos)
  return todos[idx]
}

/* ============ 工具 ============ */
function getTodayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

module.exports = {
  init,
  reset,
  getUser,
  setUser,
  logout,
  getTeams,
  getTeamById,
  searchTeams,
  getMembersByTeamId,
  getMyTodos,
  getTeamTodos,
  getRecentTodos,
  getMyStats,
  getMyStatusCounts,
  createTodo,
  toggleTodoComplete,
  startTodo,
  getTodayStr
}
