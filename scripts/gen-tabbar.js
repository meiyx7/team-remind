// scripts/gen-tabbar.js 生成 TabBar 组件（SVG 模板内置 __COLOR__ 占位符，选中色由主题运行时注入）
const fs = require('fs')
const path = require('path')

function svg(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="__COLOR__" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`
}

const icons = {
  home: '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z"/>',
  team: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M17.5 14.9c2.4.6 4 2.6 4 5.1"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>'
}

function b64(str) {
  return Buffer.from(str, 'utf-8').toString('base64')
}

const list = [
  { key: 'home', text: '首页', pagePath: '/pages/home/home' },
  { key: 'team', text: '团队', pagePath: '/pages/team-list/team-list' },
  { key: 'profile', text: '我的', pagePath: '/pages/profile/profile' }
].map(item => ({
  pagePath: item.pagePath,
  text: item.text,
  icon: 'data:image/svg+xml;base64,' + b64(svg(icons[item.key]).replace('__COLOR__', '#94a3b8')),
  svgTemplate: svg(icons[item.key])   // 保留模板，选中态颜色运行时注入
}))

const js = `// 自动生成于 scripts/gen-tabbar.js，请勿手改。3 Tab：首页/团队/我的
Component({
  data: {
    selected: 0,
    themeClass: '',
    list: ${JSON.stringify(list, null, 2).replace(/^/gm, '    ').trim()}
  },
  lifetimes: {
    attached() {
      this.updateTheme()
    }
  },
  methods: {
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset
      if (this.data.selected === index) return
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    },
    // 同步深色模式与皮肤（TabBar 是页面同级组件，CSS 变量不会从 .page-container 级联进来）
    // 选中图标颜色由当前皮肤品牌色运行时注入
    updateTheme() {
      const app = getApp()
      const themeClass = app && app.getThemeClass ? app.getThemeClass() : ''
      const brandHex = app && app.getSkinBrandHex ? app.getSkinBrandHex() : '#10b981'
      if (this._lastBrand === brandHex && this._lastTheme === themeClass) return
      this._lastBrand = brandHex
      this._lastTheme = themeClass
      const list = this.data.list.map(item => ({
        ...item,
        activeIcon: 'data:image/svg+xml;base64,' + wx.arrayBufferToBase64(
          this._str2ab(item.svgTemplate.replace('__COLOR__', brandHex))
        )
      }))
      this.setData({ themeClass, list })
    },
    _str2ab(str) {
      const buf = new Uint8Array(str.length)
      for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i) & 0xff
      return buf.buffer
    }
  }
})
`

const outPath = path.join(__dirname, '..', 'miniprogram', 'custom-tab-bar', 'index.js')
fs.writeFileSync(outPath, js, 'utf-8')
console.log('written:', outPath)
console.log('tabs:', list.map(l => l.text).join(' / '))
