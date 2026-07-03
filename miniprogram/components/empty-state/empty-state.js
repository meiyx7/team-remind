// components/empty-state/empty-state.js
const icons = require('../../utils/icons')

Component({
  properties: {
    text: { type: String, value: '暂无内容' },
    hint: { type: String, value: '' },
    actionText: { type: String, value: '' }
  },
  data: {
    icon: icons.empty
  },
  methods: {
    onAction() {
      this.triggerEvent('action')
    }
  }
})
