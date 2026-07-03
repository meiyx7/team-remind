// utils/mock.js 种子数据

const seedUser = {
  id: 'u1',
  name: '张明',
  email: 'zhangming@email.com',
  avatarChar: '我',
  avatarColor: '#10b981'
}

const seedTeams = [
  {
    id: 't1',
    name: '产品设计组',
    description: '负责产品UI/UX设计和原型制作',
    avatarChar: '产',
    avatarColor: '#10b981',
    accentColor: '#10b981',
    memberCount: 8,
    creatorId: 'u1',
    createdAt: '2025-07-01'
  },
  {
    id: 't2',
    name: '运营推广组',
    description: '负责市场推广与用户增长',
    avatarChar: '运',
    avatarColor: '#3b82f6',
    accentColor: '#3b82f6',
    memberCount: 5,
    creatorId: 'u2',
    createdAt: '2025-06-20'
  },
  {
    id: 't3',
    name: '技术研发组',
    description: '负责产品架构与功能开发',
    avatarChar: '研',
    avatarColor: '#f59e0b',
    accentColor: '#f59e0b',
    memberCount: 12,
    creatorId: 'u3',
    createdAt: '2025-05-15'
  }
]

const seedMembers = [
  // 产品设计组
  { id: 'm1', teamId: 't1', name: '张明', avatarChar: '张', avatarColor: '#10b981', role: 'creator' },
  { id: 'm2', teamId: 't1', name: '李华', avatarChar: '李', avatarColor: '#3b82f6', role: 'member' },
  { id: 'm3', teamId: 't1', name: '王芳', avatarChar: '王', avatarColor: '#f59e0b', role: 'member' },
  { id: 'm4', teamId: 't1', name: '赵强', avatarChar: '赵', avatarColor: '#8b5cf6', role: 'member' },
  { id: 'm5', teamId: 't1', name: '陈丽', avatarChar: '陈', avatarColor: '#ec4899', role: 'member' },
  { id: 'm6', teamId: 't1', name: '刘伟', avatarChar: '刘', avatarColor: '#14b8a6', role: 'member' }
]

const seedTodos = [
  {
    id: 'todo1',
    title: '完成首页设计稿',
    description: '根据产品需求完成首页视觉设计稿',
    teamId: 't1',
    teamName: '产品设计组',
    assigneeId: 'u1',
    assigneeName: '张明',
    dueDate: '__TODAY__',
    priority: 'urgent',
    status: 'in_progress',
    createdAt: '__TODAY__',
    createdBy: 'u1'
  },
  {
    id: 'todo2',
    title: '提交本周工作周报',
    description: '',
    teamId: 't1',
    teamName: '产品设计组',
    assigneeId: 'u1',
    assigneeName: '张明',
    dueDate: '__TODAY__',
    priority: 'normal',
    status: 'pending',
    createdAt: '__TODAY__',
    createdBy: 'u2'
  },
  {
    id: 'todo3',
    title: '更新产品需求文档',
    description: '将最新评审意见同步到 PRD',
    teamId: 't1',
    teamName: '产品设计组',
    assigneeId: 'u1',
    assigneeName: '张明',
    dueDate: '__TODAY__',
    priority: 'normal',
    status: 'completed',
    createdAt: '__TODAY__',
    createdBy: 'u3'
  },
  {
    id: 'todo4',
    title: '设计用户反馈收集表',
    description: '',
    teamId: 't2',
    teamName: '运营推广组',
    assigneeId: 'u1',
    assigneeName: '张明',
    dueDate: '__TODAY_PLUS_2__',
    priority: 'urgent',
    status: 'in_progress',
    createdAt: '__TODAY__',
    createdBy: 'u4'
  },
  {
    id: 'todo5',
    title: '整理竞品分析报告',
    description: '梳理 5 家竞品的核心功能差异',
    teamId: 't1',
    teamName: '产品设计组',
    assigneeId: 'u1',
    assigneeName: '张明',
    dueDate: '__TODAY_PLUS_5__',
    priority: 'normal',
    status: 'pending',
    createdAt: '__TODAY__',
    createdBy: 'u1'
  },
  {
    id: 'todo6',
    title: '客户访谈记录整理',
    description: '上周三位重点客户的访谈纪要',
    teamId: 't1',
    teamName: '产品设计组',
    assigneeId: 'u1',
    assigneeName: '张明',
    dueDate: '__TODAY_MINUS_1__',
    priority: 'urgent',
    status: 'in_progress',
    createdAt: '__TODAY_MINUS_2__',
    createdBy: 'u2'
  }
]

module.exports = {
  seedUser,
  seedTeams,
  seedMembers,
  seedTodos
}
