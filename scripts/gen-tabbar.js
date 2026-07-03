// scripts/gen-tabbar.js 生成 TabBar SVG 图标 base64 并写入 custom-tab-bar/index.js
const fs = require('fs')
const path = require('path')

function svg(content, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`
}

const INACTIVE = '#94a3b8'
const ACTIVE = '#10b981'

const icons = {
  home: '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z"/>',
  team: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M17.5 14.9c2.4.6 4 2.6 4 5.1"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>'
}

function b64(str) {
  return Buffer.from(str, 'utf-8').toString('base64')
}

const dataUri = (name, color) => 'data:image/svg+xml;base64,' + b64(svg(icons[name], color))

const list = [
  { key: 'home', text: '首页', pagePath: '/pages/home/home' },
  { key: 'team', text: '团队', pagePath: '/pages/team-list/team-list' },
  { key: 'profile', text: '我的', pagePath: '/pages/profile/profile' }
].map(item => ({
  pagePath: item.pagePath,
  text: item.text,
  icon: dataUri(item.key, INACTIVE),
  activeIcon: dataUri(item.key, ACTIVE)
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
    // 同步深色模式（TabBar 是页面同级组件，CSS 变量不会从 .page-container 级联进来）
    updateTheme() {
      const app = getApp()
      this.setData({ themeClass: app && app.getThemeClass ? app.getThemeClass() : '' })
    }
  }
})
`

const outPath = path.join(__dirname, '..', 'miniprogram', 'custom-tab-bar', 'index.js')
fs.writeFileSync(outPath, js, 'utf-8')
console.log('written:', outPath)
console.log('tabs:', list.map(l => l.text).join(' / '))
