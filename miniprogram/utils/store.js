// utils/store.js 数据 CRUD + Storage 持久化
// 持久化设计：内存缓存写穿透（避免每次同步读盘）+ 读写异常保护 + 结构版本迁移
const { seedTeams, seedMembers, seedTodos } = require('./mock')
const dateUtil = require('./date')

// 存储结构版本：种子数据或字段模型变化时 +1，旧数据启动时自动重置为最新种子
const SCHEMA_VERSION = 2

const KEYS = {
  SCHEMA: 'schemaVersion',
  USER: 'user',
  TEAMS: 'teams',
  MEMBERS: 'members',
  TODOS: 'todos'
}

/* ============ 存储底层：内存缓存 + 异常保护 ============ */
const cache = {}

function sGet(key, fallback) {
  if (key in cache) return cache[key]
  let val = fallback
  try {
    const raw = wx.getStorageSync(key)
    if (raw !== '' && raw !== undefined && raw !== null) val = raw
  } catch (e) {
    console.error('[store] 读取存储失败:', key, e)
  }
  cache[key] = val
  return val
}

function sSet(key, value) {
  cache[key] = value
  try {
    wx.setStorageSync(key, value)
  } catch (e) {
    console.error('[store] 写入存储失败:', key, e)
  }
}

function sRemove(key) {
  delete cache[key]
  try {
    wx.removeStorageSync(key)
  } catch (e) {
    console.error('[store] 删除存储失败:', key, e)
  }
}

/* ============ 初始化 / 重置 ============ */
function init() {
  const ver = Number(sGet(KEYS.SCHEMA, 0))
  if (ver !== SCHEMA_VERSION) {
    // 首次启动或旧结构数据：重新播种（迁移策略为演示应用的最优解）
    seedAll()
    return
  }
  // 完整性兜底：任一集合损坏（非数组）时重置
  const broken = [KEYS.TEAMS, KEYS.MEMBERS, KEYS.TODOS].some(k => !Array.isArray(sGet(k, [])))
  if (broken) seedAll()
}

// 写入种子数据并清掉登录态（init 与 reset 共用同一条管线）
function seedAll() {
  sRemove(KEYS.USER)
  sSet(KEYS.TEAMS, seedTeams)
  sSet(KEYS.MEMBERS, seedMembers)
  // 待办日期占位符替换为相对今天的真实日期（让演示永远贴近当前时间）
  sSet(KEYS.TODOS, seedTodos.map(resolveDate))
  sSet(KEYS.SCHEMA, SCHEMA_VERSION)
}

// 占位符 -> 真实日期
function resolveDate(t) {
  const map = {
    '__TODAY__': 0, '__TODAY_PLUS_1__': 1, '__TODAY_PLUS_2__': 2,
    '__TODAY_PLUS_5__': 5, '__TODAY_MINUS_1__': -1, '__TODAY_MINUS_2__': -2
  }
  const due = map[t.dueDate]
  const created = map[t.createdAt]
  return {
    ...t,
    dueDate: due !== undefined ? getDateStrOffset(due) : t.dueDate,
    createdAt: created !== undefined ? getDateStrOffset(created) : t.createdAt
  }
}

// 重置数据（用于调试）：与首次启动完全一致
function reset() {
  seedAll()
}

/* ============ 用户 ============ */
function getUser() {
  return sGet(KEYS.USER, null)
}

function setUser(user) {
  sSet(KEYS.USER, user)
  syncGlobalUser(user)
}

function logout() {
  sRemove(KEYS.USER)
  syncGlobalUser(null)
}

function syncGlobalUser(user) {
  const app = typeof getApp === 'function' ? getApp() : null
  if (app) app.globalData.userInfo = user
}

/* ============ 团队 ============ */
function getTeams() {
  return sGet(KEYS.TEAMS, [])
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
  return sGet(KEYS.MEMBERS, []).filter(m => m.teamId === teamId)
}

// 添加成员到团队（创建者手动加 / 通过分享加入）
// member: { id?, name, avatarChar, avatarColor, role? }；带 id 则复用（同一人多团队共享身份）
function addMember(teamId, member) {
  const members = sGet(KEYS.MEMBERS, [])
  // 同团队内按 id 去重，无 id 时退化为按姓名去重
  const exists = member.id
    ? members.find(m => m.teamId === teamId && m.id === member.id)
    : members.find(m => m.teamId === teamId && m.name === member.name)
  if (exists) return { ok: false, reason: 'duplicate', member: exists }
  const newMember = {
    id: member.id || uid('m'),
    teamId,
    name: member.name,
    avatarChar: member.avatarChar || member.name.charAt(0),
    avatarColor: member.avatarColor || '#10b981',
    role: member.role || 'member'
  }
  members.push(newMember)
  sSet(KEYS.MEMBERS, members)
  // 同步团队 memberCount
  const teams = getTeams()
  const tIdx = teams.findIndex(t => t.id === teamId)
  if (tIdx !== -1) {
    teams[tIdx].memberCount = members.filter(m => m.teamId === teamId).length
    sSet(KEYS.TEAMS, teams)
  }
  return { ok: true, member: newMember }
}

// 当前用户加入团队（通过分享进入）
function joinTeamByShare(teamId) {
  const user = getUser()
  if (!user) return { ok: false, reason: 'no_login' }
  const team = getTeamById(teamId)
  if (!team) return { ok: false, reason: 'team_not_found' }
  return addMember(teamId, {
    id: user.id,
    name: user.name,
    avatarChar: user.avatarChar,
    avatarColor: user.avatarColor,
    role: 'member'
  })
}

/* ============ 待办 ============ */

// 计算实际展示状态（已逾期由 dueDate 推断）
function computeDisplayStatus(todo, today) {
  if (todo.status === 'completed') return 'completed'
  if (todo.dueDate && todo.dueDate < today) return 'overdue'
  return todo.status
}

// 给 todo 附加展示状态 + 截止日期相对标签 + 多人完成进度
function decorate(todo, today) {
  const ds = computeDisplayStatus(todo, today)
  let dueLabel = ''
  if (todo.dueDate) {
    dueLabel = dateUtil.relativeLabel(todo.dueDate) || dateUtil.toChineseShort(todo.dueDate)
  }
  const result = { ...todo, displayStatus: ds, dueLabel }
  // 多人指派：计算完成进度
  if (Array.isArray(todo.assignments) && todo.assignments.length > 0) {
    const total = todo.assignments.length
    const done = todo.assignments.filter(a => a.done).length
    result.assignTotal = total
    result.assignDone = done
    result.assignRate = Math.round(done / total * 100)
  } else {
    // 兼容旧数据：单指派按 status 推导
    result.assignments = []
    result.assignTotal = 1
    result.assignDone = ds === 'completed' ? 1 : 0
    result.assignRate = ds === 'completed' ? 100 : 0
  }
  return result
}

function getTodos() {
  return sGet(KEYS.TODOS, [])
}

// 定位当前用户在某待办 assignments 中的指派记录（身份即成员 id，全库统一）
function findMyAssignment(todo) {
  const user = getUser()
  if (!user || !Array.isArray(todo.assignments)) return null
  return todo.assignments.find(a => a.memberId === user.id) || null
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
  const counts = { ...empty }
  getTodos().forEach(t => {
    if (t.assigneeId !== user.id) return
    const ds = computeDisplayStatus(t, today)
    if (counts[ds] !== undefined) counts[ds]++
  })
  return counts
}

// 获取最近待办（未完成优先，取前 N 条）
function getRecentTodos(limit = 5) {
  const list = getMyTodos('all').filter(t => t.displayStatus !== 'completed')
  return list.slice(0, limit)
}

// 统计：我的待办数 / 进行中数 / 已完成数
function getMyStats() {
  const user = getUser()
  if (!user) return { mine: 0, inProgress: 0, completed: 0 }
  const today = getTodayStr()
  let inProgress = 0
  let completed = 0
  let mine = 0
  getTodos().forEach(t => {
    if (t.assigneeId !== user.id) return
    const ds = computeDisplayStatus(t, today)
    if (ds === 'completed') completed++
    else {
      mine++
      if (ds === 'in_progress') inProgress++
    }
  })
  return { mine, inProgress, completed }
}

// 今日待办统计（供首页顶部进度条 + 完成率卡用）
function getTodayStats() {
  const user = getUser()
  const empty = { total: 0, completed: 0, rate: 0 }
  if (!user) return empty
  const today = getTodayStr()
  let total = 0
  let completed = 0
  getTodos().forEach(t => {
    if (t.assigneeId !== user.id || t.dueDate !== today) return
    total++
    if (t.status === 'completed') completed++
  })
  return { total, completed, rate: total === 0 ? 0 : Math.round(completed / total * 100) }
}

// 按时间维度过滤我的待办：today | week | all
function getMyTodosByRange(range) {
  const all = getMyTodos('all')
  if (range === 'all') return all
  const today = getTodayStr()
  const weekEnd = getDateStrOffset(6)
  if (range === 'today') return all.filter(t => t.dueDate === today)
  if (range === 'week') return all.filter(t => t.dueDate >= today && t.dueDate <= weekEnd)
  return all
}

// 问候语（按当前小时段）
function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

// 获取今天日期的中文长格式（7月3日 周四）
function getTodayLabel() {
  const d = new Date()
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`
}

// 获取单个待办（带展示状态 + 完成进度）
function getTodoById(id) {
  const today = getTodayStr()
  const todo = getTodos().find(t => t.id === id)
  if (!todo) return null
  return decorate(todo, today)
}

// 切换某成员在待办上的完成状态（多人指派模型）
// 同时同步待办整体 status：全部完成 -> completed；否则 -> in_progress
function toggleAssignment(todoId, memberId) {
  const todos = getTodos()
  const idx = todos.findIndex(t => t.id === todoId)
  if (idx === -1) return null
  const todo = todos[idx]
  if (!Array.isArray(todo.assignments) || todo.assignments.length === 0) {
    // 旧数据兜底：无 assignments 直接走整体切换
    return toggleTodoComplete(todoId)
  }
  const assign = todo.assignments.find(a => a.memberId === memberId)
  if (!assign) return null
  assign.done = !assign.done
  const allDone = todo.assignments.every(a => a.done)
  todo.status = allDone ? 'completed' : 'in_progress'
  todos[idx] = todo
  sSet(KEYS.TODOS, todos)
  return decorate(todo, getTodayStr())
}

// 创建待办
function createTodo(data) {
  const user = getUser()
  const todos = getTodos()
  const team = getTeamById(data.teamId)
  // 多人指派：从 selectedMembers 生成 assignments
  let assignments = []
  if (Array.isArray(data.selectedMembers) && data.selectedMembers.length > 0) {
    assignments = data.selectedMembers.map(m => ({
      memberId: m.id,
      memberName: m.name,
      avatarChar: m.avatarChar,
      avatarColor: m.avatarColor,
      done: false
    }))
  } else if (data.assigneeId) {
    // 兼容单指派入参
    assignments = [{
      memberId: data.assigneeId,
      memberName: data.assigneeName || '未指派',
      avatarChar: data.avatarChar || '',
      avatarColor: data.avatarColor || '#10b981',
      done: false
    }]
  }
  const firstAssign = assignments[0] || {}
  const newTodo = {
    id: uid('todo'),
    title: data.title,
    description: data.description || '',
    teamId: data.teamId,
    teamName: team ? team.name : '',
    assigneeId: firstAssign.memberId || (user ? user.id : ''),
    assigneeName: firstAssign.memberName || (user ? user.name : '未指派'),
    dueDate: normalizeDate(data.dueDate),
    priority: data.priority || 'normal',   // urgent | normal
    status: 'pending',
    createdAt: getTodayStr(),
    createdBy: user ? user.id : '',
    assignments
  }
  todos.unshift(newTodo)
  sSet(KEYS.TODOS, todos)
  return newTodo
}

// 切换待办完成状态
function toggleTodoComplete(id) {
  const todos = getTodos()
  const idx = todos.findIndex(t => t.id === id)
  if (idx === -1) return null
  const todo = todos[idx]
  todo.status = todo.status === 'completed' ? 'in_progress' : 'completed'
  todos[idx] = todo
  sSet(KEYS.TODOS, todos)
  return todo
}

// 开始待办（pending -> in_progress）
function startTodo(id) {
  const todos = getTodos()
  const idx = todos.findIndex(t => t.id === id)
  if (idx === -1) return null
  todos[idx].status = 'in_progress'
  sSet(KEYS.TODOS, todos)
  return todos[idx]
}

/* ============ 工具 ============ */

// 碰撞安全的 id 生成：毫秒时间戳 + 自增序列 + 随机数
let uidSeq = 0
function uid(prefix) {
  uidSeq += 1
  const rand = Math.floor(Math.random() * 1296).toString(36)
  return `${prefix}_${Date.now().toString(36)}${uidSeq.toString(36)}${rand}`
}

// 日期规范化：仅接受 YYYY-MM-DD，其余视为空
function normalizeDate(str) {
  return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : ''
}

function getTodayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 今天 + offset 天的 ISO 日期
function getDateStrOffset(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
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
  addMember,
  joinTeamByShare,
  findMyAssignment,
  getTodos,
  getMyTodos,
  getTeamTodos,
  getRecentTodos,
  getMyStats,
  getMyStatusCounts,
  getTodayStats,
  getMyTodosByRange,
  getGreeting,
  getTodayLabel,
  getTodoById,
  toggleAssignment,
  createTodo,
  toggleTodoComplete,
  startTodo,
  getTodayStr
}
