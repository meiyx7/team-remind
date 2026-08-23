// utils/sync.js 离线优先的云同步引擎
// 设计：本地缓存始终是读写入口（页面无感知），后台异步双向同步
// - push：把 _dirty 行 upsert 到云端，成功后清除脏标记
// - pull：按 updated_at 游标增量拉取，远端新数据覆盖本地（LWW），墓碑（软删除）随行下发
const config = require('./config')
const api = require('./api')

const CURSOR_KEY = 'syncCursor'

// 表清单：name = 云端表名，key = 本地存储 key（经 store 缓存层）
let getTableRows = null   // 由 store 注入，避免循环依赖

function bindStore(fn) {
  getTableRows = fn
}

function tables() {
  return [
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

function stripLocal(row) {
  const clean = { ...row }
  delete clean._dirty
  return clean
}

async function pushDirty() {
  for (const t of tables()) {
    const rows = (getTableRows(t.key, []) || []).filter(r => r._dirty)
    if (rows.length === 0) continue
    await api.upsert(t.name, rows.map(stripLocal))
    getTableRows.__markClean(t.key, rows.map(r => r.id))
  }
}

async function pullRemote() {
  const cursors = readCursors()
  for (const t of tables()) {
    const since = cursors[t.name] || '1970-01-01T00:00:00.000Z'
    // 分页拉取（默认单页 1000，演示规模足够）
    const remote = await api.select(
      t.name,
      '*',
      `updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc&limit=1000`
    )
    if (!Array.isArray(remote) || remote.length === 0) continue
    getTableRows.__mergeRemote(t.key, remote)
    cursors[t.name] = remote[remote.length - 1].updated_at
  }
  saveCursors(cursors)
}

// 触发一次完整同步；任何失败静默降级（本地模式 / 弱网都不影响 UI）
async function syncNow() {
  if (!config.cloudEnabled() || !getTableRows) {
    return { ok: false, reason: 'local_mode' }
  }
  try {
    await pushDirty()
    await pullRemote()
    return { ok: true }
  } catch (e) {
    console.warn('[sync] 同步失败（稍后重试）:', e.message)
    return { ok: false, reason: e.message }
  }
}

module.exports = {
  bindStore,
  syncNow
}
