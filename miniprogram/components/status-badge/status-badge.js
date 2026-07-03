// components/status-badge/status-badge.js
Component({
  properties: {
    status: { type: String, value: 'pending' }
  },
  data: {
    label: '',
    cls: ''
  },
  observers: {
    'status': function (status) {
      const map = {
        pending: { label: '待开始', cls: 'pending' },
        in_progress: { label: '进行中', cls: 'in_progress' },
        completed: { label: '已完成', cls: 'completed' },
        overdue: { label: '已逾期', cls: 'overdue' }
      }
      const item = map[status] || map.pending
      this.setData({ label: item.label, cls: item.cls })
    }
  }
})
