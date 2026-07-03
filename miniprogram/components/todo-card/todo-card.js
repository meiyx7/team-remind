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
    dueText: ''
  },
  lifetimes: {
    attached() { this._compute() }
  },
  methods: {
    _compute() {
      const t = this.data.todo
      if (!t) {
        this.setData({ subText: '', dueText: '' })
        return
      }
      const subText = this.data.showTeam && t.teamName
        ? `${t.teamName} · ${t.assigneeName || '未指派'} 指派`
        : `${t.assigneeName || '未指派'} 指派`
      const dueText = t.dueLabel || t.dueDate || ''
      this.setData({ subText, dueText })
    },
    onToggle(e) {
      this.triggerEvent('toggle', { id: e.currentTarget.dataset.id })
    },
    onTap(e) {
      this.triggerEvent('tap', { id: e.currentTarget.dataset.id })
    }
  }
})
