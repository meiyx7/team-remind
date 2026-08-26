// utils/store.js 数据 CRUD + Storage 持久化 + 云同步挂点
// 持久化设计：内存缓存写穿透 + 读写异常保护 + 结构版本迁移 + 软删除墓碑（供云同步）
// 身份模型：user.id 即成员 id，同一人多团队共享同一 id
const { seedTeams, seedMembers, seedTodos } = require('./mock')
const dateUtil = require('./date')
const sync = require('./sync')

// 存储结构版本：模型变化时 +1，旧数据启动自动重置为最新种子
const SCHEMA_VERSION = 3

const KEYS = {
  SCHEMA: 'schemaVersion',
  USER: 'user',
  TEAMS: 'teams',
  MEMBERS: 'members',
  TODOS: 'todos',
  COMMENTS: 'comments',
  EVENTS: 'events',
  PROFILES: 'profiles',
  NOTIF_READ_AT: 'notifReadAt'
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

/* ============ 基础工具 ============ */

// 碰撞安全的 id：uuid v4 格式 + 可读前缀
function uid(prefix) {
  return (prefix ? prefix + '_' : '') + uuid()
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function nowIso() {
  return new Date().toISOString()
}

// 变更打标：统一 updatedAt + 同步脏标记
function stamp(row) {
  return { ...row, updatedAt: nowIso(), _dirty: true }
}

// 给种子行补齐同步字段（updatedAt / deleted），保持 mock.js 可读性
function hydrate(row) {
  return { deleted: false, updatedAt: nowIso(), ...row }
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

// 日期规范化：仅接受 YYYY-MM-DD，其余视为空
function normalizeDate(str) {
  return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : ''
}

// 时间规范化：仅接受 HH:mm
function normalizeTime(str) {
  return typeof str === 'string' && /^\d{2}:\d{2}$/.test(str) ? str : ''
}

// 简易相对时间（消息/动态用）：N分钟前 / N小时前 / N天前 / 日期
function timeAgoLabel(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const diffMin = Math.max(0, Math.floor((Date.now() - t) / 60000))
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}小时前`
  if (diffMin < 60 * 24 * 7) return `${Math.floor(diffMin / 24)}天前`
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/* ============ 初始化 / 重置 ============ */

function init() {
  const ver = Number(sGet(KEYS.SCHEMA, 0))
  if (ver !== SCHEMA_VERSION) {
    seedAll()
    return
  }
  // 完整性兜底：任一集合损坏（非数组）时重置
  const broken = [KEYS.TEAMS, KEYS.MEMBERS, KEYS.TODOS, KEYS.COMMENTS, KEYS.EVENTS, KEYS.PROFILES]
    .some(k => !Array.isArray(sGet(k, [])))
  if (broken) seedAll()
}

// 写入种子数据并清掉登录态（init 与 reset 共用同一条管线）
function seedAll() {
  sRemove(KEYS.USER)
  sSet(KEYS.TEAMS, seedTeams.map(hydrate))
  sSet(KEYS.MEMBERS, seedMembers.map(hydrate))
  // 待办日期占位符替换为相对今天的真实日期（演示永远贴近当前时间）
  sSet(KEYS.TODOS, seedTodos.map(t => hydrate(resolveDate(t))))
  sSet(KEYS.COMMENTS, [])
  sSet(KEYS.EVENTS, [])
  sSet(KEYS.PROFILES, [])
  sSet(KEYS.SCHEMA, SCHEMA_VERSION)
}

// 占位符 -> 真实日期
function resolveDate(t) {
  const map = {
    '__TODAY__': 0, '__TODAY_PLUS_1__': 1, '__TODAY_PLUS_2__': 2, '__TODAY_PLUS_3__': 3,
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

/* ============ 云同步挂点（供 utils/sync.js 调用） ============ */

// 表访问器：读取集合 + 提供清理脏标记 / 合并远端行两个钩子
const tableAccessor = function tableAccessor(key, fallback) {
  return sGet(key, fallback)
}

tableAccessor.__markClean = function (key, ids) {
  const rows = sGet(key, [])
  let changed = false
  rows.forEach(r => {
    if (ids.indexOf(r.id) !== -1 && r._dirty) {
      delete r._dirty
      changed = true
    }
  })
  if (changed) sSet(key, rows)
}

tableAccessor.__mergeRemote = function (key, remoteRows) {
  const local = sGet(key, [])
  const map = {}
  local.forEach(r => { map[r.id] = r })
  let changed = false
  remoteRows.forEach(rr => {
    if (!rr || !rr.id) return
    const lr = map[rr.id]
    // LWW：本地无 或 本地不脏且远端更新 -> 采用远端；本地脏且更新 -> 保留待下次 push
    if (!lr || ((lr.updatedAt || '') < (rr.updatedAt || ''))) {
      map[rr.id] = rr
      changed = true
    }
  })
  if (changed) sSet(key, Object.keys(map).map(k => map[k]))
}

// 墓碑清理：删除超过 keepMs 的软删除行从本地移除（云端仍在，可再拉回）
tableAccessor.__purgeDeleted = function (key, keepMs) {
  const rows = sGet(key, [])
  const keep = Date.now() - keepMs
  const kept = rows.filter(r => {
    if (!r.deleted) return true
    const t = new Date(r.updatedAt || 0).getTime()
    return !(t > 0 && t < keep)
  })
  if (kept.length !== rows.length) sSet(key, kept)
}

sync.bindStore(tableAccessor)

/* ============ 团队 ============ */

function getTeams() {
  return sGet(KEYS.TEAMS, []).filter(t => !t.deleted && !t.archived)
}

function getArchivedTeams() {
  return sGet(KEYS.TEAMS, []).filter(t => !t.deleted && t.archived)
}

function getTeamById(id) {
  return sGet(KEYS.TEAMS, []).find(t => t.id === id && !t.deleted) || null
}

function searchTeams(keyword) {
  if (!keyword) return getTeams()
  const kw = keyword.trim().toLowerCase()
  return getTeams().filter(t => t.name.toLowerCase().includes(kw))
}

// 创建团队：建团 + 创建者入队一步完成
const TEAM_PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

function createTeam(data) {
  const user = getUser()
  if (!user) return { ok: false, reason: 'no_login' }
  const name = (data.name || '').trim()
  if (!name) return { ok: false, reason: 'empty_name' }

  const teams = sGet(KEYS.TEAMS, [])
  const color = data.avatarColor || TEAM_PALETTE[teams.length % TEAM_PALETTE.length]
  const newTeam = hydrate({
    id: uid('t'),
    name,
    description: (data.description || '').trim(),
    avatarChar: name.charAt(0).toUpperCase(),
    avatarColor: color,
    accentColor: color,
    memberCount: 1,
    creatorId: user.id,
    archived: false,
    createdAt: getTodayStr()
  })
  teams.push(newTeam)
  sSet(KEYS.TEAMS, teams)

  // 创建者以 creator 角色写入成员表（身份即成员 id）
  addMember(newTeam.id, {
    id: user.id,
    name: user.name,
    avatarChar: user.avatarChar,
    avatarColor: user.avatarColor,
    role: 'creator'
  })
  queueSync()
  return { ok: true, team: newTeam }
}

// 设置/撤销管理员（仅创建者；不能操作创建者本人）
function setMemberRole(teamId, memberId, role) {
  const user = getUser()
  if (!user) return { ok: false, reason: 'no_login' }
  if (memberRole(teamId, user.id) !== 'creator') return { ok: false, reason: 'forbidden' }
  if (role !== 'admin' && role !== 'member') return { ok: false, reason: 'bad_role' }
  if (memberId === user.id || memberRole(teamId, memberId) === 'creator') {
    return { ok: false, reason: 'cannot_touch_creator' }
  }
  const members = sGet(KEYS.MEMBERS, [])
  const idx = members.findIndex(m => m.teamId === teamId && m.id === memberId && !m.deleted)
  if (idx === -1) return { ok: false, reason: 'not_found' }
  members[idx] = stamp({ ...members[idx], role })
  sSet(KEYS.MEMBERS, members)
  queueSync()
  return { ok: true, member: members[idx] }
}

// 解散团队（仅创建者）：团队 + 全部成员行 + 全部队内待办 级联软删除
function dissolveTeam(teamId) {
  const user = getUser()
  const team = getTeamById(teamId)
  if (!team) return { ok: false, reason: 'not_found' }
  if (!user || team.creatorId !== user.id) return { ok: false, reason: 'forbidden' }

  const teams = sGet(KEYS.TEAMS, [])
  const tIdx = teams.findIndex(t => t.id === teamId)
  if (tIdx !== -1) teams[tIdx] = stamp({ ...teams[tIdx], deleted: true })
  sSet(KEYS.TEAMS, teams)

  const members = sGet(KEYS.MEMBERS, [])
  members.forEach((m, i) => {
    if (m.teamId === teamId && !m.deleted) members[i] = stamp({ ...m, deleted: true })
  })
  sSet(KEYS.MEMBERS, members)

  const todos = rawTodos()
  todos.forEach((t, i) => {
    if (t.teamId === teamId && !t.deleted) todos[i] = stamp({ ...t, deleted: true })
  })
  sSet(KEYS.TODOS, todos)

  emitEvent('join', { teamId, content: '团队已解散' })
  queueSync()
  return { ok: true }
}

// 归档 / 取消归档（仅创建者）
function archiveTeam(teamId, archived) {
  const user = getUser()
  const teams = sGet(KEYS.TEAMS, [])
  const idx = teams.findIndex(t => t.id === teamId && !t.deleted)
  if (idx === -1) return { ok: false, reason: 'not_found' }
  if (!user || teams[idx].creatorId !== user.id) return { ok: false, reason: 'forbidden' }
  teams[idx] = stamp({ ...teams[idx], archived: !!archived })
  sSet(KEYS.TEAMS, teams)
  queueSync()
  return { ok: true, team: teams[idx] }
}

/* ============ 成员 ============ */

function getMembersByTeamId(teamId) {
  return sGet(KEYS.MEMBERS, []).filter(m => m.teamId === teamId && !m.deleted)
}

// 成员角色：creator > admin > member；非成员返回 ''
function memberRole(teamId, userId) {
  if (!userId) return ''
  const m = sGet(KEYS.MEMBERS, []).find(x => x.teamId === teamId && x.id === userId && !x.deleted)
  return m ? m.role : ''
}

function isTeamAdmin(teamId, userId) {
  const role = memberRole(teamId, userId)
  return role === 'creator' || role === 'admin'
}

// 同步团队 memberCount（成员增删后调用）
function syncTeamMemberCount(teamId) {
  const teams = sGet(KEYS.TEAMS, [])
  const tIdx = teams.findIndex(t => t.id === teamId)
  if (tIdx === -1) return
  const count = getMembersByTeamId(teamId).length
  if (teams[tIdx].memberCount === count) return
  teams[tIdx] = stamp({ ...teams[tIdx], memberCount: count })
  sSet(KEYS.TEAMS, teams)
}

// 移除成员（管理员；不可移除创建者）
function removeMember(teamId, memberId) {
  const user = getUser()
  if (!isTeamAdmin(teamId, user && user.id)) return { ok: false, reason: 'forbidden' }
  if (memberRole(teamId, memberId) === 'creator') return { ok: false, reason: 'cannot_remove_creator' }
  const members = sGet(KEYS.MEMBERS, [])
  const idx = members.findIndex(m => m.teamId === teamId && m.id === memberId && !m.deleted)
  if (idx === -1) return { ok: false, reason: 'not_found' }
  members[idx] = stamp({ ...members[idx], deleted: true })
  sSet(KEYS.MEMBERS, members)
  syncTeamMemberCount(teamId)
  queueSync()
  return { ok: true }
}

// 退出团队（创建者需先转让/解散，暂不支持直接退出）
function quitTeam(teamId) {
  const user = getUser()
  if (!user) return { ok: false, reason: 'no_login' }
  if (memberRole(teamId, user.id) === 'creator') return { ok: false, reason: 'creator_cannot_quit' }
  const members = sGet(KEYS.MEMBERS, [])
  const idx = members.findIndex(m => m.teamId === teamId && m.id === user.id && !m.deleted)
  if (idx === -1) return { ok: false, reason: 'not_member' }
  members[idx] = stamp({ ...members[idx], deleted: true })
  sSet(KEYS.MEMBERS, members)
  syncTeamMemberCount(teamId)
  queueSync()
  return { ok: true }
}

// 添加成员到团队（创建者手动加 / 通过分享加入）
// member: { id?, name, avatarChar, avatarColor, role? }；带 id 则复用（同一人多团队共享身份）
function addMember(teamId, member) {
  const members = sGet(KEYS.MEMBERS, [])
  // 同团队内按 id 去重，无 id 时退化为按姓名去重
  const exists = member.id
    ? members.find(m => m.teamId === teamId && m.id === member.id && !m.deleted)
    : members.find(m => m.teamId === teamId && m.name === member.name && !m.deleted)
  if (exists) return { ok: false, reason: 'duplicate', member: exists }
  const newMember = hydrate({
    id: member.id || uid('m'),
    teamId,
    name: member.name,
    avatarChar: member.avatarChar || member.name.charAt(0),
    avatarColor: member.avatarColor || '#10b981',
    role: member.role || 'member'
  })
  members.push(newMember)
  sSet(KEYS.MEMBERS, members)
  syncTeamMemberCount(teamId)
  queueSync()
  return { ok: true, member: newMember }
}

// 当前用户加入团队（通过分享进入）
function joinTeamByShare(teamId) {
  const user = getUser()
  if (!user) return { ok: false, reason: 'no_login' }
  const team = getTeamById(teamId)
  if (!team) return { ok: false, reason: 'team_not_found' }
  const result = addMember(teamId, {
    id: user.id,
    name: user.name,
    avatarChar: user.avatarChar,
    avatarColor: user.avatarColor,
    role: 'member'
  })
  if (result.ok) emitEvent('join', { teamId, content: '加入了团队' })
  return result
}

/* ============ 待办 ============ */

// 计算实际展示状态（已逾期由 dueDate 推断）
function computeDisplayStatus(todo, today) {
  if (todo.status === 'completed') return 'completed'
  if (todo.dueDate && todo.dueDate < today) return 'overdue'
  return todo.status
}

// 给 todo 附加展示状态 + 截止标签（相对日期+可选时间）+ 多人完成进度 + 认领池空位
function decorate(todo, today) {
  const ds = computeDisplayStatus(todo, today)
  let dueLabel = ''
  if (todo.dueDate) {
    dueLabel = dateUtil.relativeLabel(todo.dueDate) || dateUtil.toChineseShort(todo.dueDate)
    if (todo.dueTime) dueLabel += ' ' + todo.dueTime
  }
  const result = { ...todo, displayStatus: ds, dueLabel }
  const assigns = Array.isArray(result.assignments) ? result.assignments : []
  result.unclaimed = assigns.filter(a => !a.memberId).length
  if (assigns.length > 0) {
    const total = assigns.length
    const done = assigns.filter(a => a.done).length
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

function rawTodos() {
  return sGet(KEYS.TODOS, [])
}

function getTodos() {
  return rawTodos().filter(t => !t.deleted)
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

// 获取最近待办（未完成优先，取前 N 条）
function getRecentTodos(limit = 5) {
  return getMyTodos('all').filter(t => t.displayStatus !== 'completed').slice(0, limit)
}

// 获取单个待办（带展示状态 + 完成进度）
function getTodoById(id) {
  const today = getTodayStr()
  const todo = getTodos().find(t => t.id === id)
  if (!todo) return null
  return decorate(todo, today)
}

// 编辑待办（创建者或管理员）；团队与成员指派创建后锁定，仅改内容字段
function updateTodo(id, patch) {
  const user = getUser()
  if (!user) return { ok: false, reason: 'no_login' }
  const todos = rawTodos()
  const idx = todos.findIndex(t => t.id === id && !t.deleted)
  if (idx === -1) return { ok: false, reason: 'not_found' }
  const todo = todos[idx]
  const allowed = todo.createdBy === user.id || isTeamAdmin(todo.teamId, user.id)
  if (!allowed) return { ok: false, reason: 'forbidden' }

  if (patch.title !== undefined) {
    const title = String(patch.title).trim()
    if (!title) return { ok: false, reason: 'empty_title' }
    todo.title = title
  }
  if (patch.description !== undefined) todo.description = String(patch.description || '').trim()
  if (patch.dueDate !== undefined) todo.dueDate = normalizeDate(patch.dueDate)
  if (patch.dueTime !== undefined) todo.dueTime = normalizeTime(patch.dueTime)
  if (patch.priority !== undefined && ['urgent', 'normal'].indexOf(patch.priority) !== -1) {
    todo.priority = patch.priority
  }
  if (patch.repeat !== undefined) {
    todo.repeat = ['daily', 'weekly'].indexOf(patch.repeat) !== -1 ? patch.repeat : 'none'
  }

  todos[idx] = stamp(todo)
  sSet(KEYS.TODOS, todos)
  emitEvent('update', {
    teamId: todo.teamId,
    todoId: todo.id,
    todoTitle: todo.title,
    content: '更新了「' + todo.title + '」'
  })
  queueSync()
  return { ok: true, todo: decorate(todo, getTodayStr()) }
}

// 删除待办（创建者或管理员；软删除保留同步墓碑）
function deleteTodo(id) {
  const user = getUser()
  if (!user) return { ok: false, reason: 'no_login' }
  const todos = rawTodos()
  const idx = todos.findIndex(t => t.id === id && !t.deleted)
  if (idx === -1) return { ok: false, reason: 'not_found' }
  const todo = todos[idx]
  const allowed = todo.createdBy === user.id || isTeamAdmin(todo.teamId, user.id)
  if (!allowed) return { ok: false, reason: 'forbidden' }
  todos[idx] = stamp({ ...todo, deleted: true })
  sSet(KEYS.TODOS, todos)
  queueSync()
  return { ok: true }
}

// 认领池：当前用户认领一个空位
function claimSlot(todoId) {
  const user = getUser()
  if (!user) return { ok: false, reason: 'no_login' }
  const todos = rawTodos()
  const idx = todos.findIndex(t => t.id === todoId && !t.deleted)
  if (idx === -1) return { ok: false, reason: 'not_found' }
  const todo = todos[idx]
  if (todo.mode !== 'claim') return { ok: false, reason: 'not_claim_mode' }
  if (findMyAssignment(todo)) return { ok: false, reason: 'already_claimed' }
  const slot = todo.assignments.find(a => !a.memberId)
  if (!slot) return { ok: false, reason: 'full' }
  slot.memberId = user.id
  slot.memberName = user.name
  slot.avatarChar = user.avatarChar
  slot.avatarColor = user.avatarColor
  slot.open = false
  if (todo.status === 'pending') todo.status = 'in_progress'
  todos[idx] = stamp(todo)
  sSet(KEYS.TODOS, todos)
  emitEvent('claim', {
    teamId: todo.teamId,
    todoId,
    todoTitle: todo.title,
    // 定向通知发起人（认领者本人除外）
    targetId: todo.createdBy && todo.createdBy !== user.id ? todo.createdBy : '',
    content: '认领了「' + todo.title + '」的名额'
  })
  queueSync()
  return { ok: true, todo: decorate(todo, getTodayStr()) }
}

// 催办：给所有未完成的已认领成员发定向通知，返回提醒人数
function nudgeTodo(todoId) {
  const user = getUser()
  const todo = getTodos().find(t => t.id === todoId)
  if (!todo || !user) return 0
  const targets = (todo.assignments || []).filter(a => a.memberId && a.memberId !== user.id && !a.done)
  targets.forEach(a => {
    emitEvent('nudge', {
      teamId: todo.teamId,
      todoId: todo.id,
      todoTitle: todo.title,
      targetId: a.memberId,
      content: '催你完成「' + todo.title + '」'
    })
  })
  queueSync()
  return targets.length
}

// 切换某成员在待办上的完成状态（多人指派模型）
// 整单状态联动：全部完成 -> completed；重复任务在完成时自动生成下一期
function toggleAssignment(todoId, memberId) {
  const todos = rawTodos()
  const idx = todos.findIndex(t => t.id === todoId && !t.deleted)
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
  const wasCompleted = todo.status === 'completed'
  todo.status = allDone ? 'completed' : (wasCompleted ? 'in_progress' : todo.status)
  todos[idx] = stamp(todo)
  sSet(KEYS.TODOS, todos)
  if (allDone && !wasCompleted) {
    emitEvent('complete', {
      teamId: todo.teamId,
      todoId: todo.id,
      todoTitle: todo.title,
      content: '完成了「' + todo.title + '」'
    })
    // 重复任务：完成即生成下一期（同内容、日期顺延、完成态清零）
    if (todo.repeat === 'daily' || todo.repeat === 'weekly') spawnNextOccurrence(todo)
  }
  queueSync()
  return decorate(todo, getTodayStr())
}

// 重复任务生成下一期
function spawnNextOccurrence(todo) {
  const step = todo.repeat === 'daily' ? 1 : 7
  const next = stamp({
    ...todo,
    id: uid('todo'),
    dueDate: advanceDate(todo.dueDate || getTodayStr(), step),
    status: 'pending',
    createdAt: getTodayStr(),
    assignments: todo.assignments.map(a => ({ ...a, done: false }))
  })
  const todos = rawTodos()
  todos.unshift(next)
  sSet(KEYS.TODOS, todos)
}

function advanceDate(dateStr, days) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr + 'T00:00:00') : new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 创建待办（支持 指派/认领 两种模式 + 截止时间 + 重复规则）
function createTodo(data) {
  const user = getUser()
  const todos = rawTodos()
  const team = getTeamById(data.teamId)

  let assignments = []
  if (data.mode === 'claim') {
    // 认领模式：生成 N 个空名额（1-10）
    const slots = Math.max(1, Math.min(10, Number(data.slotCount) || 1))
    for (let i = 0; i < slots; i++) {
      assignments.push({
        memberId: '', memberName: '', avatarChar: '',
        avatarColor: '#94a3b8', done: false, open: true
      })
    }
  } else if (Array.isArray(data.selectedMembers) && data.selectedMembers.length > 0) {
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
  const newTodo = hydrate({
    id: uid('todo'),
    title: data.title,
    description: data.description || '',
    teamId: data.teamId,
    teamName: team ? team.name : '',
    assigneeId: firstAssign.memberId || (user ? user.id : ''),
    assigneeName: firstAssign.memberName || (user ? user.name : '未指派'),
    dueDate: normalizeDate(data.dueDate),
    dueTime: normalizeTime(data.dueTime),
    priority: data.priority || 'normal',   // urgent | normal
    mode: data.mode === 'claim' ? 'claim' : 'assign',
    repeat: ['daily', 'weekly'].indexOf(data.repeat) !== -1 ? data.repeat : 'none',
    status: 'pending',
    createdAt: getTodayStr(),
    createdBy: user ? user.id : '',
    assignments
  })
  todos.unshift(newTodo)
  sSet(KEYS.TODOS, todos)
  emitEvent('create', {
    teamId: newTodo.teamId,
    todoId: newTodo.id,
    todoTitle: newTodo.title,
    content: '创建了「' + newTodo.title + '」'
  })
  queueSync()
  return newTodo
}

// 切换待办完成状态（旧数据兜底路径）
function toggleTodoComplete(id) {
  const todos = rawTodos()
  const idx = todos.findIndex(t => t.id === id && !t.deleted)
  if (idx === -1) return null
  const todo = todos[idx]
  const wasCompleted = todo.status === 'completed'
  todo.status = wasCompleted ? 'in_progress' : 'completed'
  todos[idx] = stamp(todo)
  sSet(KEYS.TODOS, todos)
  if (!wasCompleted && (todo.repeat === 'daily' || todo.repeat === 'weekly')) {
    spawnNextOccurrence(todo)
  }
  queueSync()
  return todo
}

// 开始待办（pending -> in_progress）
function startTodo(id) {
  const todos = rawTodos()
  const idx = todos.findIndex(t => t.id === id && !t.deleted)
  if (idx === -1) return null
  todos[idx].status = 'in_progress'
  todos[idx] = stamp(todos[idx])
  sSet(KEYS.TODOS, todos)
  queueSync()
  return todos[idx]
}

/* ============ 个人资料 ============ */

// 更新昵称/标识色：登录态 + 全部团队成员行 + 云端 profiles 行三处联动
function updateUserProfile(patch) {
  const user = getUser()
  if (!user) return { ok: false, reason: 'no_login' }
  const name = String(patch.name || '').trim()
  if (!name) return { ok: false, reason: 'empty_name' }

  const next = {
    ...user,
    name,
    avatarChar: name.charAt(0).toUpperCase(),
    avatarColor: patch.avatarColor || user.avatarColor
  }
  setUser(next)

  // 同一 id 的成员行遍布多个团队，全部同步更新
  const members = sGet(KEYS.MEMBERS, [])
  let changed = false
  members.forEach((m, i) => {
    if (m.id === next.id && !m.deleted) {
      members[i] = stamp({ ...m, name: next.name, avatarChar: next.avatarChar, avatarColor: next.avatarColor })
      changed = true
    }
  })
  if (changed) sSet(KEYS.MEMBERS, members)

  markOwnProfileDirty(next)
  queueSync()
  return { ok: true, user: next }
}

// 把当前用户写入/打脏 profiles 集合，随同步上行到云端
function markOwnProfileDirty(user) {
  if (!user || !user.id) return
  const rows = sGet(KEYS.PROFILES, [])
  const prev = rows.find(p => p.id === user.id) || {}
  const row = stamp({
    ...prev,
    id: user.id,
    name: user.name,
    avatarChar: user.avatarChar || '',
    avatarColor: user.avatarColor || '#10b981'
  })
  const idx = rows.findIndex(p => p.id === user.id)
  if (idx === -1) rows.push(row)
  else rows[idx] = row
  sSet(KEYS.PROFILES, rows)
}

/* ============ 评论 / 动态 / 消息 ============ */

// 添加评论；内容中 @成员名 会自动识别为提及（生成定向通知）
function addComment(todoId, content) {
  const user = getUser()
  const todo = getTodoById(todoId)
  if (!user || !todo) return { ok: false, reason: 'not_found' }
  const text = (content || '').trim()
  if (!text) return { ok: false, reason: 'empty' }

  // 识别 @提及（匹配团队成员名）
  const members = getMembersByTeamId(todo.teamId)
  const mentions = []
  members.forEach(m => {
    if (m.id !== user.id && text.indexOf('@' + m.name) !== -1) mentions.push(m.id)
  })

  const comment = hydrate({
    id: uid('c'),
    todoId,
    teamId: todo.teamId,
    authorId: user.id,
    authorName: user.name,
    authorAvatarChar: user.avatarChar,
    authorAvatarColor: user.avatarColor,
    content: text,
    mentions
  })
  const comments = sGet(KEYS.COMMENTS, [])
  comments.push(comment)
  sSet(KEYS.COMMENTS, comments)

  emitEvent('comment', {
    teamId: todo.teamId,
    todoId,
    todoTitle: todo.title,
    content: '评论了「' + todo.title + '」'
  })
  mentions.forEach(mid => {
    emitEvent('mention', {
      teamId: todo.teamId,
      todoId,
      todoTitle: todo.title,
      targetId: mid,
      content: '在「' + todo.title + '」中提到了你'
    })
  })
  queueSync()
  return { ok: true, comment }
}

function getComments(todoId) {
  return sGet(KEYS.COMMENTS, [])
    .filter(c => c.todoId === todoId && !c.deleted)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
}

// 事件类型：create | complete | claim | nudge | comment | mention | join
function emitEvent(type, payload) {
  const user = getUser()
  const event = hydrate({
    id: uid('e'),
    type,
    actorId: user ? user.id : '',
    actorName: user ? user.name : '',
    actorAvatarChar: user ? user.avatarChar : '',
    actorAvatarColor: user ? user.avatarColor : '#10b981',
    targetId: payload.targetId || '',
    teamId: payload.teamId || '',
    todoId: payload.todoId || '',
    todoTitle: payload.todoTitle || '',
    content: payload.content || '',
    createdAt: nowIso()
  })
  const events = sGet(KEYS.EVENTS, [])
  events.push(event)
  sSet(KEYS.EVENTS, events)
  return event
}

// 团队动态流（最新在前）
function getTeamEvents(teamId, limit = 30) {
  return sGet(KEYS.EVENTS, [])
    .filter(e => e.teamId === teamId && !e.deleted)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, limit)
    .map(e => ({ ...e, timeLabel: timeAgoLabel(e.createdAt) }))
}

// 我的消息（定向：催办/提及等），最新在前
function getMyNotifications(limit = 50) {
  const user = getUser()
  if (!user) return []
  return sGet(KEYS.EVENTS, [])
    .filter(e => !e.deleted && e.targetId === user.id)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, limit)
    .map(e => ({ ...e, timeLabel: timeAgoLabel(e.createdAt) }))
}

function unreadNotificationCount() {
  const user = getUser()
  if (!user) return 0
  let readAt = ''
  try {
    readAt = wx.getStorageSync(KEYS.NOTIF_READ_AT) || ''
  } catch {
    readAt = ''
  }
  return sGet(KEYS.EVENTS, [])
    .filter(e => !e.deleted && e.targetId === user.id && (e.createdAt || '') > readAt)
    .length
}

function markNotificationsRead() {
  try {
    wx.setStorageSync(KEYS.NOTIF_READ_AT, nowIso())
  } catch (e) {
    console.error('[store] 已读标记失败', e)
  }
}

/* ============ 团队周报 ============ */

// 近 7 天团队完成情况：总量/完成率/逾期存量/成员贡献/按日趋势
function getTeamWeeklyReport(teamId) {
  const today = getTodayStr()
  const weekStart = getDateStrOffset(-6)
  const todos = getTodos().filter(t => t.teamId === teamId)

  const weekTodos = todos.filter(t => t.createdAt >= weekStart && t.createdAt <= today)
  const completedCount = weekTodos.filter(t => t.status === 'completed').length
  const overdueOpen = todos.filter(t => computeDisplayStatus(t, today) === 'overdue').length

  // 成员贡献（基于近 7 天待办的 assignments，认领/指派均计入）
  const memberMap = {}
  weekTodos.forEach(t => {
    ;(t.assignments || []).forEach(a => {
      if (!a.memberId) return
      if (!memberMap[a.memberId]) {
        memberMap[a.memberId] = {
          memberId: a.memberId,
          name: a.memberName,
          avatarChar: a.avatarChar,
          avatarColor: a.avatarColor,
          total: 0,
          completed: 0
        }
      }
      memberMap[a.memberId].total++
      if (a.done) memberMap[a.memberId].completed++
    })
  })
  const perMember = Object.keys(memberMap).map(k => memberMap[k])
  perMember.sort((a, b) => b.completed - a.completed)

  // 近 7 天按日趋势（旧->新）
  const trend = []
  for (let i = 6; i >= 0; i--) {
    const date = getDateStrOffset(-i)
    const dayTodos = todos.filter(t => t.createdAt === date)
    trend.push({
      date,
      label: date.slice(5).replace('-', '/'),
      total: dayTodos.length,
      completed: dayTodos.filter(t => t.status === 'completed').length
    })
  }

  return {
    weekStart,
    today,
    createdTotal: weekTodos.length,
    completedCount,
    completionRate: weekTodos.length === 0 ? 0 : Math.round(completedCount / weekTodos.length * 100),
    overdueOpen,
    openTotal: todos.filter(t => t.status !== 'completed').length,
    perMember,
    trend,
    maxTrend: Math.max(1, ...trend.map(x => x.total))
  }
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

/* ============ 云同步触发（防抖） ============ */
const config = require('./config')

let syncTimer = null

function queueSync() {
  if (!config.cloudEnabled()) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    sync.syncNow()
  }, 2000)
}

module.exports = {
  init,
  reset,
  getUser,
  setUser,
  logout,
  // 团队
  createTeam,
  getTeams,
  getArchivedTeams,
  getTeamById,
  searchTeams,
  archiveTeam,
  // 成员
  getMembersByTeamId,
  memberRole,
  isTeamAdmin,
  addMember,
  removeMember,
  setMemberRole,
  quitTeam,
  dissolveTeam,
  joinTeamByShare,
  // 待办
  findMyAssignment,
  getTodos,
  getMyTodos,
  getTeamTodos,
  getRecentTodos,
  getMyStats,
  getMyStatusCounts,
  getTodayStats,
  getMyTodosByRange,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleAssignment,
  toggleTodoComplete,
  startTodo,
  claimSlot,
  nudgeTodo,
  // 评论 / 动态 / 消息
  addComment,
  getComments,
  getTeamEvents,
  getMyNotifications,
  unreadNotificationCount,
  markNotificationsRead,
  // 周报
  getTeamWeeklyReport,
  // 个人资料
  updateUserProfile,
  markOwnProfileDirty,
  // 工具
  getGreeting,
  getTodayLabel,
  timeAgoLabel,
  getTodayStr,
  // 测试钩子（勿在业务中使用）
  __internal: { KEYS, sGet, sSet, sRemove, tableAccessor }
}
