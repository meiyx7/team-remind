// components/todo-card/todo-card.js
const icons = require('../../utils/icons')

Component({
  properties: {
    todo: { type: Object, value: null, observer: '_compute' },
    showCheck: { type: Boolean, value: true },
    showTeam: { type: Boolean, value: true, observer: '_compute' }
  },
  data: {
    checkIcon: icons.check,
    subText: '',
    dueText: '',
    assignText: '',     // 多人指派时的完成进度文案，如 "2/3"
    showAssign: false
  },
  lifetimes: {
    attached() { this._compute() }
  },
  methods: {
    _compute() {
      const t = this.data.todo
      if (!t) {
        this.setData({ subText: '', dueText: '', assignText: '', showAssign: false })
        return
      }
      // 多人指派：显示 N/M 完成进度
      const total = t.assignTotal || 0
      const done = t.assignDone || 0
      const showAssign = total > 1
      const assignText = showAssign ? `${done}/${total}` : ''

      // 单人指派时使用 assigneeName；多人时显示「N 人指派」；认领池显示空位
      let assigneeLabel = t.assigneeName || '未指派'
      if (t.mode === 'claim') {
        const unclaimed = t.unclaimed || 0
        assigneeLabel = unclaimed > 0 ? `认领池 · 剩 ${unclaimed} 个名额` : '认领池 · 已满员'
      } else if (total > 1) {
        assigneeLabel = `${total} 人指派`
      }
      const subText = this.data.showTeam && t.teamName
        ? `${t.teamName} · ${assigneeLabel}`
        : assigneeLabel
      const dueText = t.dueLabel || t.dueDate || ''
      this.setData({ subText, dueText, assignText, showAssign })
    },
    onToggle(e) {
      this.triggerEvent('toggle', { id: e.currentTarget.dataset.id })
    },
    onTap(e) {
      this.triggerEvent('tap', { id: e.currentTarget.dataset.id })
    }
  }
})
