// utils/templates.js 场景模板库
// 每套模板 = 一组任务定义；dueDate 由开始日期 + offset 天计算
// mode: assign（指派给选中成员）| claim（认领池，slotCount 个名额）

const TEMPLATES = [
  {
    id: 'course',
    name: '课程作业',
    description: '小组作业四步走：选题、资料、初稿、定稿',
    accent: '#3b82f6',
    tasks: [
      { title: '确定选题与分工', offset: 0, priority: 'urgent', description: '开会确定题目，明确每人负责的模块' },
      { title: '收集整理资料', offset: 2, priority: 'normal', description: '按分工收集文献/数据并汇总到共享文档' },
      { title: '完成初稿', offset: 5, priority: 'urgent', description: '' },
      { title: '审阅修改并定稿', offset: 7, priority: 'normal', description: '交叉审阅，统一格式后提交' }
    ]
  },
  {
    id: 'event',
    name: '活动筹备',
    description: '从策划到复盘的活动全流程',
    accent: '#f59e0b',
    tasks: [
      { title: '确定活动方案与预算', offset: 0, priority: 'urgent', description: '目标、形式、时间、预算一次定清' },
      { title: '场地与物料预订', offset: 3, priority: 'urgent', description: '场地的确认与物料采购到位' },
      { title: '宣传推文与邀请', offset: 5, priority: 'normal', description: '推文发布，发出邀请并统计人数' },
      { title: '现场执行分工确认', offset: 7, priority: 'normal', description: '签到/引导/摄影/应急 各就各位' },
      { title: '活动复盘总结', offset: 10, priority: 'normal', description: '数据复盘 + 经验沉淀' }
    ]
  },
  {
    id: 'duty',
    name: '值班排班',
    description: '生成 5 个工作日值班任务（认领制，每名额 1 人）',
    accent: '#10b981',
    mode: 'claim',
    slotCount: 1,
    tasks: [
      { title: '值班 · 第 1 天', offset: 0, priority: 'normal', description: '开门/检查设备/填写值班记录' },
      { title: '值班 · 第 2 天', offset: 1, priority: 'normal', description: '' },
      { title: '值班 · 第 3 天', offset: 2, priority: 'normal', description: '' },
      { title: '值班 · 第 4 天', offset: 3, priority: 'normal', description: '' },
      { title: '值班 · 第 5 天', offset: 4, priority: 'normal', description: '交接与钥匙归还' }
    ]
  },
  {
    id: 'content',
    name: '内容排期',
    description: '公众号/短视频从选题到发布的流水线',
    accent: '#8b5cf6',
    tasks: [
      { title: '选题会：确定本期主题', offset: 0, priority: 'normal', description: '过选题池，定标题与角度' },
      { title: '初稿撰写', offset: 2, priority: 'urgent', description: '' },
      { title: '配图与排版', offset: 4, priority: 'normal', description: '封面图、内文配图、样式排版' },
      { title: '审核与发布', offset: 5, priority: 'urgent', description: '错别字/事实核查/合规检查后发布' }
    ]
  }
]

function getTemplate(id) {
  return TEMPLATES.find(t => t.id === id) || null
}

module.exports = {
  TEMPLATES,
  getTemplate
}
