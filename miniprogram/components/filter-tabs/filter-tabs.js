// components/filter-tabs/filter-tabs.js
Component({
  properties: {
    filters: { type: Array, value: [] },   // [{ key, label }]
    active: { type: String, value: 'all' }
  },
  methods: {
    onSelect(e) {
      const { key } = e.currentTarget.dataset
      if (key === this.data.active) return
      this.triggerEvent('change', { key })
    }
  }
})
