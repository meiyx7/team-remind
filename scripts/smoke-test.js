// 冒烟测试：stub wx 存储，验证 store v3 核心逻辑（0.8 全量特性）
const assert = require('assert')

// ---- wx / getApp stub ----
const mem = {}
global.wx = {
  getStorageSync: k => (k in mem ? mem[k] : ''),
  setStorageSync: (k, v) => { mem[k] = v },
  removeStorageSync: k => { delete mem[k] }
}
global.getApp = () => ({ globalData: { userInfo: null } })

const path = require('path')
const BASE = path.join(__dirname, '..', 'miniprogram', 'utils')

// 重新加载 store（模拟冷启动，清空内存缓存）
function fresh() {
  delete require.cache[require.resolve(BASE + '/store')]
  delete require.cache[require.resolve(BASE + '/auth')]
  return {
    store: require(BASE + '/store'),
    auth: require(BASE + '/auth')
  }
}

let passed = 0
function t(name, fn) {
  fn()
  passed++
  console.log('ok -', name)
}

async function main() {
  // ========== 场景一：全新启动 ==========
  const boot = fresh()
  let store = boot.store
  const auth = boot.auth
  store.init()

  t('播种：占位符解析 + schema 版本 + 认领池示例', () => {
    const todos = store.getTodos()
    assert.strictEqual(todos.length, 7) // 6 指派 + 1 认领池
    assert.ok(!todos.some(x => String(x.dueDate).includes('__')))
    assert.strictEqual(mem.schemaVersion, 3)
    const claimTodo = store.getTodoById('todo7')
    assert.ok(claimTodo && claimTodo.mode === 'claim' && claimTodo.unclaimed === 3)
  })

  const user = await auth.login()
  t('登录：统一身份 user.id 即成员 id', () => {
    assert.strictEqual(user.id, 'm1')
    const todo = store.getTodoById('todo1')
    assert.ok(store.findMyAssignment(todo).memberId === 'm1')
  })

  t('认领池：认领/重复认领/他人认领/满员', () => {
    let r = store.claimSlot('todo7')
    assert.ok(r.ok && r.todo.unclaimed === 2)
    r = store.claimSlot('todo7')
    assert.strictEqual(r.reason, 'already_claimed')
    // 模拟两名其他成员认领剩余名额（直接构造存储态）
    const raw = mem.todos
    const todo7 = raw.find(x => x.id === 'todo7')
    todo7.assignments.filter(a => a.open).forEach((slot, i) => {
      slot.memberId = 'other' + i
      slot.memberName = '成员' + i
      slot.open = false
    })
    assert.strictEqual(store.claimSlot('todo7').reason, 'already_claimed') // 我已占位
  })

  t('认领可见性：认领后待办出现在我的首页列表与统计', () => {
    // 张明创建认领池 → 李华认领 → 李华的首页应可见
    const created = store.createTodo({ title: '认领可见性验证', teamId: 't1', mode: 'claim', slotCount: 2, dueDate: store.getTodayStr() })
    mem.user = { id: 'm2', name: '李华', avatarChar: '李', avatarColor: '#3b82f6' }
    store = fresh().store
    assert.ok(store.claimSlot(created.id).ok)
    const mine = store.getMyTodos('all')
    assert.ok(mine.some(x => x.id === created.id), '认领后应出现在我的待办')
    assert.ok(store.getMyStatusCounts().pending + store.getMyStatusCounts().in_progress >= 1)
    // isMyTodo 双通道判定
    const raw = store.getTodos().find(x => x.id === created.id)
    assert.ok(store.isMyTodo(raw, 'm2'))
    assert.ok(!store.isMyTodo(raw, 'm3'))
    // 恢复张明身份，避免污染后续用例
    mem.user = { id: 'm1', name: '张明', avatarChar: '张', avatarColor: '#10b981' }
    store = fresh().store
  })

  t('催办：只提醒其他未完成成员', () => {
    // todo7 中我已 done=false，另有 other0/other1 未完成 -> 应提醒 2 人（不含自己）
    const n = store.nudgeTodo('todo7')
    assert.strictEqual(n, 2)
    const myNotifs = store.getMyNotifications()
    assert.ok(!myNotifs.some(e => e.actorId === 'm1' && e.type === 'nudge')) // 不给自己发
  })

  t('评论 + @提及：生成动态与定向通知', () => {
    const result = store.addComment('todo7', '@李华 请对接场地细节')
    assert.ok(result.ok)
    // 李华不在 t1？在（t1 成员 m2 李华）-> mention 事件 target=m2
    const comments = store.getComments('todo7')
    assert.strictEqual(comments.length, 1)
    assert.deepStrictEqual(comments[0].mentions, ['m2'])
    const events = store.getTeamEvents('t1')
    assert.ok(events.some(e => e.type === 'comment'))
    assert.ok(events.some(e => e.type === 'claim'))
    // 切换身份到李华验证收到提及通知
    mem.user = { id: 'm2', name: '李华', avatarChar: '李', avatarColor: '#3b82f6' }
    store = fresh().store
    assert.ok(store.getMyNotifications().some(e => e.type === 'mention' && e.targetId === 'm2'))
    assert.ok(store.unreadNotificationCount() >= 1)
    store.markNotificationsRead()
    assert.strictEqual(store.unreadNotificationCount(), 0)
  })

  t('权限：管理员可移除成员，普通成员不可，创建者受保护', () => {
    // 当前用户是 m2（member）-> 无权移除
    let r = store.removeMember('t1', 'm3')
    assert.strictEqual(r.reason, 'forbidden')
    // 张明（creator）
    mem.user = { id: 'm1', name: '张明', avatarChar: '张', avatarColor: '#10b981' }
    store = fresh().store
    r = store.removeMember('t1', 'm1')
    assert.strictEqual(r.reason, 'cannot_remove_creator')
    r = store.removeMember('t1', 'm4')
    assert.ok(r.ok)
    assert.ok(!store.getMembersByTeamId('t1').some(m => m.id === 'm4'))
    assert.strictEqual(store.getTeamById('t1').memberCount, 5)
  })

  t('退出团队：创建者不可退，成员可退', () => {
    assert.strictEqual(store.quitTeam('t1').reason, 'creator_cannot_quit')
    mem.user = { id: 'm5', name: '陈丽', avatarChar: '陈', avatarColor: '#ec4899' }
    store = fresh().store
    assert.ok(store.quitTeam('t1').ok)
    assert.ok(!store.getMembersByTeamId('t1').some(m => m.id === 'm5'))
  })

  t('归档团队：仅创建者；列表与归档分组隔离', () => {
    mem.user = { id: 'n2', name: '周杰', avatarChar: '周', avatarColor: '#f59e0b' }
    store = fresh().store
    assert.strictEqual(store.archiveTeam('t2', true).reason, 'forbidden')
    mem.user = { id: 'n1', name: '孙倩', avatarChar: '孙', avatarColor: '#3b82f6' }
    store = fresh().store
    assert.ok(store.archiveTeam('t2', true).ok)
    assert.ok(!store.getTeams().some(t => t.id === 't2'))
    assert.ok(store.getArchivedTeams().some(t => t.id === 't2'))
  })

  t('重复任务：完成自动生成下一期', () => {
    mem.user = { id: 'm1', name: '张明', avatarChar: '张', avatarColor: '#10b981' }
    store = fresh().store
    const before = store.getTodos().length
    const created = store.createTodo({
      title: '每日站会记录',
      teamId: 't1',
      mode: 'assign',
      repeat: 'daily',
      dueDate: store.getTodayStr(),
      selectedMembers: [{ id: 'm1', name: '张明', avatarChar: '张', avatarColor: '#10b981' }]
    })
    const afterCreate = store.getTodos().length
    store.toggleAssignment(created.id, 'm1') // 完成全部指派
    const afterDone = store.getTodos().length
    assert.strictEqual(afterCreate, before + 1)
    assert.strictEqual(afterDone, before + 2)
    // 新一期日期顺延一天、状态 pending、完成态清零
    const d = new Date(); d.setDate(d.getDate() + 1)
    const expectDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    const next = store.getTodos().find(x => x.title === '每日站会记录' && x.status !== 'completed' && x.id !== created.id)
    assert.ok(next)
    assert.strictEqual(next.dueDate, expectDate)
    assert.ok(next.assignments.every(a => !a.done))
  })

  t('完成时间戳：完成打 completedAt，重开清除', () => {
    const created = store.createTodo({
      title: '时间戳验证', teamId: 't1', mode: 'assign',
      selectedMembers: [{ id: 'm1', name: '张明', avatarChar: '张', avatarColor: '#10b981' }]
    })
    assert.ok(!created.completedAt)
    store.toggleAssignment(created.id, 'm1')
    const done = store.getTodoById(created.id)
    assert.ok(done.completedAt && !isNaN(new Date(done.completedAt).getTime()))
    // 重开清除
    store.toggleAssignment(created.id, 'm1')
    assert.strictEqual(store.getTodoById(created.id).completedAt, '')
  })

  t('删除待办：创建者可删，软删除墓碑保留', () => {
    const mine = store.getTodos().find(x => x.createdBy === 'm1' && x.id.startsWith('todo_'))
    assert.ok(mine, '应有我创建的待办')
    assert.ok(store.deleteTodo(mine.id).ok)
    assert.ok(!store.getTodoById(mine.id))
    // 墓碑仍在底层存储中
    assert.ok(mem.todos.some(x => x.id === mine.id && x.deleted))
  })

  t('周报：统计口径正确', () => {
    const report = store.getTeamWeeklyReport('t1')
    assert.ok(report.trend.length === 7)
    assert.ok(report.createdTotal >= 1) // 至少含「每日站会记录」两期中的本期创建
    assert.ok(report.perMember.length > 0)
    assert.strictEqual(report.maxTrend, Math.max(1, ...report.trend.map(x => x.total)))
  })

  t('创建团队：建团 + 创建者入队 + 校验', () => {
    const r = store.createTeam({ name: '产品新组', description: '新组建的组' })
    assert.ok(r.ok)
    assert.strictEqual(r.team.creatorId, 'm1')
    assert.strictEqual(r.team.memberCount, 1)
    const members = store.getMembersByTeamId(r.team.id)
    assert.ok(members.some(m => m.id === 'm1' && m.role === 'creator'))
    assert.ok(store.getTeams().some(t => t.id === r.team.id))
    assert.strictEqual(store.createTeam({ name: '   ' }).reason, 'empty_name')
  })

  t('认领通知发起人：targetId 定向到 createdBy', () => {
    const created = store.createTodo({ title: '池子任务X', teamId: 't1', mode: 'claim', slotCount: 1 })
    // 切换为李华认领
    mem.user = { id: 'm2', name: '李华', avatarChar: '李', avatarColor: '#3b82f6' }
    store = fresh().store
    assert.ok(store.claimSlot(created.id).ok)
    // 切回张明验证收到定向认领通知
    mem.user = { id: 'm1', name: '张明', avatarChar: '张', avatarColor: '#10b981' }
    store = fresh().store
    const hit = store.getMyNotifications()
      .find(e => e.type === 'claim' && e.targetId === 'm1' && e.todoTitle === '池子任务X')
    assert.ok(hit, '发起人应收到认领通知')
  })

  t('认领后待办进入我的首页视图（isMyTodo）', () => {
    // 张明认领一个全新认领池任务后，首页/统计应可见
    const created = store.createTodo({ title: '可见性验证', teamId: 't1', mode: 'claim', slotCount: 2 })
    assert.strictEqual(store.getMyTodos('all').some(x => x.id === created.id), false) // 未认领不可见
    assert.ok(store.claimSlot(created.id).ok)
    assert.ok(store.getMyTodos('all').some(x => x.id === created.id))
    assert.ok(store.getMyStatusCounts().pending + store.getMyStatusCounts().in_progress >= 1)
    // 他人（李华）认领第二个名额后同样可见
    mem.user = { id: 'm2', name: '李华', avatarChar: '李', avatarColor: '#3b82f6' }
    store = fresh().store
    assert.ok(store.claimSlot(created.id).ok)
    assert.ok(store.getMyTodos('all').some(x => x.id === created.id))
    mem.user = { id: 'm1', name: '张明', avatarChar: '张', avatarColor: '#10b981' }
    store = fresh().store
  })

  t('待办编辑：权限/字段规范化/空标题拒绝', () => {
    // 当前用户是张明（creator），编辑自己创建的
    const mine = store.getTodos().find(x => x.createdBy === 'm1' && x.mode !== 'claim')
    assert.ok(mine)
    let r = store.updateTodo(mine.id, { title: '  ' })
    assert.strictEqual(r.reason, 'empty_title')
    r = store.updateTodo(mine.id, { title: '改后的标题', dueTime: '14:30', dueDate: 'bad-date', priority: 'urgent' })
    assert.ok(r.ok)
    assert.strictEqual(r.todo.title, '改后的标题')
    assert.strictEqual(r.todo.dueTime, '14:30')
    assert.strictEqual(r.todo.dueDate, '')        // 非法日期被清空
    assert.strictEqual(r.todo.priority, 'urgent')
    // 普通成员无权编辑他人创建的
    mem.user = { id: 'm2', name: '李华', avatarChar: '李', avatarColor: '#3b82f6' }
    store = fresh().store
    const others = store.getTodos().find(x => x.createdBy === 'm1')
    assert.strictEqual(store.updateTodo(others.id, { title: 'x' }).reason, 'forbidden')
    mem.user = { id: 'm1', name: '张明', avatarChar: '张', avatarColor: '#10b981' }
    store = fresh().store
  })

  t('资料更新：昵称传播到全部团队成员行 + profiles 打脏', () => {
    // 张明在 t1/t2 都有成员行
    const r = store.updateUserProfile({ name: '张小明', avatarColor: '#8b5cf6' })
    assert.ok(r.ok)
    assert.strictEqual(r.user.avatarChar, '张')
    assert.ok(store.getMembersByTeamId('t1').some(m => m.id === 'm1' && m.name === '张小明' && m.avatarColor === '#8b5cf6'))
    assert.ok(store.getMembersByTeamId('t2').some(m => m.id === 'm1' && m.name === '张小明'))
    const profiles = mem.profiles
    assert.ok(profiles.some(p => p.id === 'm1' && p.name === '张小明' && p._dirty))
    assert.strictEqual(store.updateUserProfile({ name: ' ' }).reason, 'empty_name')
  })

  t('同步字段映射：本地↔云端往返无损', () => {
    const sync = require(BASE + '/sync')
    const { toRemote, toLocal } = sync.__test
    const localTodo = {
      id: 'todo_x', title: 'T', teamId: 't1', teamName: '产品',
      assigneeId: 'm1', assigneeName: '张', dueDate: '2026-08-30', dueTime: '09:30',
      priority: 'urgent', mode: 'claim', repeat: 'daily', status: 'pending',
      createdAt: '2026-08-23', createdBy: 'm1', assignments: [{ memberId: 'm1' }],
      deleted: false, updatedAt: '2026-08-23T00:00:00.000Z', _dirty: true
    }
    const remote = toRemote('todos', localTodo)
    assert.strictEqual(remote.team_id, 't1')
    assert.strictEqual(remote.due_date, '2026-08-30')
    assert.strictEqual(remote.updated_at, '2026-08-23T00:00:00.000Z')
    assert.strictEqual(remote._dirty, undefined)          // 本地标记不上行
    const back = toLocal('todos', remote)
    assert.strictEqual(back.teamId, 't1')
    assert.strictEqual(back.updatedAt, '2026-08-23T00:00:00.000Z')
    assert.deepStrictEqual(back.assignments, [{ memberId: 'm1' }])
    // events / members 抽查
    const ev = toRemote('events', { actorId: 'm1', targetId: 'm2', todoTitle: 'x', createdAt: '2026-01-01T00:00:00Z' })
    assert.strictEqual(ev.actor_id, 'm1')
    const mb = toLocal('members', toRemote('members', { id: 'm1', teamId: 't1', avatarChar: '张', avatarColor: '#10b981' }))
    assert.strictEqual(mb.teamId, 't1')
    assert.strictEqual(mb.avatarChar, '张')
  })

  t('角色管理：creator 可设/撤 admin，他人不可', () => {
    // 当前是张明（creator）
    let r = store.setMemberRole('t1', 'm2', 'admin')
    assert.ok(r.ok)
    assert.strictEqual(store.memberRole('t1', 'm2'), 'admin')
    assert.strictEqual(store.isTeamAdmin('t1', 'm2'), true)
    r = store.setMemberRole('t1', 'm2', 'member')
    assert.ok(r.ok && store.memberRole('t1', 'm2') === 'member')
    // 非 creator 被拒
    mem.user = { id: 'm2', name: '李华', avatarChar: '李', avatarColor: '#3b82f6' }
    store = fresh().store
    assert.strictEqual(store.setMemberRole('t1', 'm3', 'admin').reason, 'forbidden')
    // creator 自身不可被操作
    mem.user = { id: 'm1', name: '张明', avatarChar: '张', avatarColor: '#10b981' }
    store = fresh().store
    assert.strictEqual(store.setMemberRole('t1', 'm1', 'admin').reason, 'cannot_touch_creator')
  })

  t('解散团队：级联软删除 team/members/todos', () => {
    // 张明建一个新队再解散
    const t = store.createTeam({ name: '短命小队' })
    const tid = t.team.id
    assert.ok(store.dissolveTeam(tid).ok)
    assert.ok(!store.getTeamById(tid))
    assert.ok(!store.getTeams().some(x => x.id === tid))
    // 非 creator 不能解散别人的队（切到李华）
    mem.user = { id: 'm2', name: '李华', avatarChar: '李', avatarColor: '#3b82f6' }
    store = fresh().store
    assert.strictEqual(store.dissolveTeam('t1').reason, 'forbidden')
    mem.user = { id: 'm1', name: '张明', avatarChar: '张', avatarColor: '#10b981' }
    store = fresh().store
  })

  t('墓碑清理：30 天前的软删除行被移除', () => {
    // 造一新一旧两个墓碑（直接写 mem，模拟已落盘数据）
    const rows = [
      { id: 'dead_old', deleted: true, updatedAt: new Date(Date.now() - 40 * 864e5).toISOString() },
      { id: 'dead_new', deleted: true, updatedAt: new Date().toISOString() }
    ]
    mem.purge_test = rows
    delete require.cache[require.resolve(BASE + '/store')]
    const freshStore = require(BASE + '/store')
    freshStore.__internal.tableAccessor.__purgeDeleted('purge_test', 30 * 864e5)
    const after = mem.purge_test
    assert.strictEqual(after.length, 1)
    assert.strictEqual(after[0].id, 'dead_new')
    delete mem.purge_test
  })

  t('贡献档案：跨团队个人统计与按团队分解', () => {
    // 张明：t1 有多个指派（含已完成 todo3），t2 认领了池子任务
    const c = store.getMyContribution()
    assert.ok(c.total >= 5, '张明应有多条参与记录')
    assert.ok(c.done >= 1)
    assert.strictEqual(c.rate, Math.round(c.done / c.total * 100))
    assert.ok(c.teamCount >= 2, '应横跨至少 2 个团队')
    const t1 = c.teams.find(x => x.teamId === 't1')
    assert.ok(t1 && t1.done >= 1 && t1.total >= t1.done)
    assert.ok(c.recent.length > 0 && c.recent[0].title)
  })

  t('旧数据迁移与损坏自愈（模拟重启）', () => {
    mem.user = { id: 'legacy' }
    mem.todos = [{ id: 'old', dueDate: '__TODAY__' }]
    delete mem.schemaVersion
    store = fresh().store
    store.init()
    assert.strictEqual(mem.schemaVersion, 3)
    assert.strictEqual(store.getTodos().length, 7)

    mem.todos = 'corrupted'
    store = fresh().store
    store.init()
    assert.ok(Array.isArray(store.getTodos()))
  })

  console.log(`\n${passed} 组冒烟测试全部通过 ✓`)
}

main().catch(e => { console.error('FAIL:', e); process.exit(1) })
