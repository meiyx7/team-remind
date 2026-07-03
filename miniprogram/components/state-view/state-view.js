// components/state-view/state-view.js 统一三态组件
const icons = require('../../utils/icons')

Component({
  properties: {
    state: { type: String, value: '' },          // '' | loading | error | empty
    title: { type: String, value: '' },
    desc: { type: String, value: '' },
    showRetry: { type: Boolean, value: true },
    retryText: { type: String, value: '重试' },
    actionText: { type: String, value: '' }
  },
  data: {
    emptyIcon: icons.empty,
    errorIcon: icons.error
  },
  methods: {
    onRetry() {
      this.triggerEvent('retry')
    },
    onAction() {
      this.triggerEvent('action')
    }
  }
})
