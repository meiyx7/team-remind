// utils/sync.js 离线优先的云同步引擎
// 设计：本地缓存始终是读写入口（页面无感知），后台异步双向同步
// - push：把 _dirty 行经字段映射后 upsert 到云端，成功后清除脏标记
// - pull：按 updated_at 游标增量拉取，反向映射回本地形态后 LWW 合并
// 字段映射：云端列名 snake_case，本地实体 camelCase
const config = require('./config')
const api = require('./api')

const CURSOR_KEY = 'syncCursor'

// 本地 -> 云端 列名映射（id/name/description/priority/mode/repeat/status/
// role/assignments/mentions/archived/open/deleted/updatedAt 等两侧同名不列）
const FIELD_MAPS = {
  profiles: { avatarChar: 'avatar_char', avatarColor: 'avatar_color', updatedAt: 'updated_at' },
  teams: {
    avatarChar: 'avatar_char', accentColor: 'accent_color', memberCount: 'member_count',
    creatorId: 'creator_id', createdAt: 'created_at', updatedAt: 'updated_at'
  },
  members: {
    teamId: 'team_id', avatarChar: 'avatar_char', avatarColor: 'avatar_color',
    createdAt: 'created_at', updatedAt: 'updated_at'
  },
  todos: {
    teamId: 'team_id', teamName: 'team_name', assigneeId: 'assignee_id',
    assigneeName: 'assignee_name', dueDate: 'due_date', dueTime: 'due_time',
    createdBy: 'created_by', createdAt: 'created_at', updatedAt: 'updated_at',
    completedAt: 'completed_at'
  },
  comments: {
    todoId: 'todo_id', teamId: 'team_id', authorId: 'author_id', authorName: 'author_name',
    authorAvatarChar: 'author_avatar_char', authorAvatarColor: 'author_avatar_color',
    createdAt: 'created_at', updatedAt: 'updated_at'
  },
  events: {
    actorId: 'actor_id', actorName: 'actor_name', actorAvatarChar: 'actor_avatar_char',
    actorAvatarColor: 'actor_avatar_color', targetId: 'target_id', teamId: 'team_id',
    todoId: 'todo_id', todoTitle: 'todo_title', createdAt: 'created_at', updatedAt: 'updated_at'
  }
}

function invert(map) {
  const out = {}
  Object.keys(map).forEach(k => { out[map[k]] = k })
  return out
}

// 本地行 -> 云端行（剥离 _dirty 等本地标记）
function toRemote(table, row) {
  const map = FIELD_MAPS[table]
  const out = {}
  Object.keys(row || {}).forEach(k => {
    if (k === '_dirty') return
    out[(map && map[k]) || k] = row[k]
  })
  return out
}

// 云端行 -> 本地行
function toLocal(table, row) {
  const map = FIELD_MAPS[table]
  if (!map) return row
  const inv = invert(map)
  const out = {}
  Object.keys(row || {}).forEach(k => {
    out[inv[k] || k] = row[k]
  })
  return out
}

// 表清单：name = 云端表名，key = 本地存储 key（经 store 缓存层）
let getTableRows = null   // 由 store 注入，避免循环依赖

function bindStore(fn) {
  getTableRows = fn
}

function tables() {
  return [
    { name: 'profiles', key: 'profiles' },
    { name: 'teams', key: 'teams' },
    { name: 'members', key: 'members' },
    { name: 'todos', key: 'todos' },
    { name: 'comments', key: 'comments' },
    { name: 'events', key: 'events' }
  ]
}

function readCursors() {
  try {
    return wx.getStorageSync(CURSOR_KEY) || {}
  } catch {
    return {}
  }
}

function saveCursors(c) {
  try {
    wx.setStorageSync(CURSOR_KEY, c)
  } catch (e) {
    console.error('[sync] 游标保存失败', e)
  }
}

async function pushDirty() {
  for (const t of tables()) {
    const rows = (getTableRows(t.key, []) || []).filter(r => r._dirty)
    if (rows.length === 0) continue
    await api.upsert(t.name, rows.map(r => toRemote(t.name, r)))
    getTableRows.__markClean(t.key, rows.map(r => r.id))
  }
}

async function pullRemote() {
  const cursors = readCursors()
  for (const t of tables()) {
    const since = cursors[t.name] || '1970-01-01T00:00:00.000Z'
    // 分页拉取（默认单页 1000，当前规模足够）
    const remote = await api.select(
      t.name,
      '*',
      `updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc&limit=1000`
    )
    if (!Array.isArray(remote) || remote.length === 0) continue
    // 记录原始最大游标后再转本地形态合并
    cursors[t.name] = remote[remote.length - 1].updated_at
    getTableRows.__mergeRemote(t.key, remote.map(r => toLocal(t.name, r)))
  }
  saveCursors(cursors)
}

// 同步状态：idle | syncing | ok | error | local（页面轮询 getStatus 展示）
const status = {
  state: 'idle',
  lastOkAt: '',
  lastError: ''
}

function getStatus() {
  if (!config.cloudEnabled()) return { state: 'local', lastOkAt: status.lastOkAt, lastError: '' }
  return { ...status }
}

const TOMBSTONE_KEEP_MS = 30 * 24 * 3600 * 1000   // 软删除墓碑本地保留 30 天

// 触发一次完整同步；任何失败静默降级（本地模式 / 弱网都不影响 UI）
async function syncNow() {
  if (!config.cloudEnabled() || !getTableRows) {
    return { ok: false, reason: 'local_mode' }
  }
  status.state = 'syncing'
  try {
    await pushDirty()
    await pullRemote()
    status.state = 'ok'
    status.lastOkAt = new Date().toISOString()
    status.lastError = ''
    // 墓碑清理：30 天前的软删除行不再占用本地空间
    for (const t of tables()) {
      getTableRows.__purgeDeleted(t.key, TOMBSTONE_KEEP_MS)
    }
    return { ok: true }
  } catch (e) {
    status.state = 'error'
    status.lastError = e.message
    console.warn('[sync] 同步失败（稍后重试）:', e.message)
    return { ok: false, reason: e.message }
  }
}

module.exports = {
  bindStore,
  syncNow,
  getStatus,
  // 供测试使用
  __test: { FIELD_MAPS, toRemote, toLocal }
}
