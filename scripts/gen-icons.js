// scripts/gen-icons.js 生成全站 SVG 图标 base64，写入 miniprogram/utils/icons.js
const fs = require('fs')
const path = require('path')

function svg(inner, opts = {}) {
  const color = opts.color || '#94a3b8'
  const sw = opts.sw || 2
  const fill = opts.fill || 'none'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
}

function b64(str) {
  return 'data:image/svg+xml;base64,' + Buffer.from(str, 'utf-8').toString('base64')
}

// 灰色（默认）/ 品牌色 / 警告色 / 红色 版本
const GRAY = '#94a3b8'
const BRAND = '#10b981'
const WARN = '#f59e0b'
const RED = '#ef4444'
const WHITE = '#ffffff'

const defs = {
  // 右箭头 chevron（列表行）
  chevron: svg('<polyline points="9 6 15 12 9 18"/>', { color: GRAY, sw: 2 }),
  chevronBrand: svg('<polyline points="9 6 15 12 9 18"/>', { color: BRAND, sw: 2 }),
  // 加号（FAB，白底品牌色按钮用）
  plus: svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', { color: WHITE, sw: 2.5 }),
  // 加号（品牌色描边，用于描边按钮内）
  plusBrand: svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', { color: BRAND, sw: 2.4 }),
  // 勾选（已完成 check）
  check: svg('<polyline points="5 12 10 17 19 8"/>', { color: WHITE, sw: 3 }),
  // 日历
  calendar: svg('<rect x="3" y="4.5" width="18" height="17" rx="2"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/>', { color: GRAY, sw: 1.8 }),
  // 搜索
  search: svg('<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>', { color: GRAY, sw: 2 }),
  // 返回
  back: svg('<polyline points="15 6 9 12 15 18"/>', { color: '#0f172a', sw: 2.4 }),
  // 清除 ×
  clear: svg('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>', { color: GRAY, sw: 2 }),
  // 空态（空收件箱）
  empty: svg('<path d="M22 12H2"/><path d="M5.5 5.5L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5a2 2 0 0 0-1.8-1H7.3a2 2 0 0 0-1.8 1z"/><path d="M6 16h4"/><path d="M14 16h4"/>', { color: '#cbd5e1', sw: 1.5 }),
  // 错误（警告三角）
  error: svg('<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13.5"/><circle cx="12" cy="17" r="0.5" fill="#f59e0b"/>', { color: WARN, sw: 1.5 }),
  // 铃铛（通知）
  bell: svg('<path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2.5h16z"/><path d="M10 21a2 2 0 0 0 4 0"/>', { color: GRAY, sw: 1.8 }),
  // 调色板（主题）
  palette: svg('<circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r="1.2" fill="#94a3b8"/><circle cx="12" cy="7" r="1.2" fill="#94a3b8"/><circle cx="16" cy="9" r="1.2" fill="#94a3b8"/><path d="M7 14a5 5 0 0 0 10 0"/>', { color: GRAY, sw: 1.6 }),
  // 帮助（问号圆）
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5"/><circle cx="12" cy="17" r="0.6" fill="#94a3b8"/>', { color: GRAY, sw: 1.8 }),
  // 信息（关于）
  info: svg('<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.6" fill="#94a3b8"/>', { color: GRAY, sw: 1.8 }),
  // 盾牌（隐私）
  shield: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', { color: GRAY, sw: 1.8 }),
  // 文档（协议）
  fileText: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 3 14 9 20 9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>', { color: GRAY, sw: 1.8 }),
  // 月亮（深色）
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', { color: GRAY, sw: 1.8 }),
  // 团队（人群）
  team: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M17.5 14.9c2.4.6 4 2.6 4 5.1"/>', { color: GRAY, sw: 1.8 })
}

const obj = Object.fromEntries(Object.entries(defs).map(([k, v]) => [k, b64(v)]))

const js = `// 自动生成于 scripts/gen-icons.js，请勿手改。全站 SVG 图标 base64 集合
module.exports = ${JSON.stringify(obj, null, 2)}
`

const outPath = path.join(__dirname, '..', 'miniprogram', 'utils', 'icons.js')
fs.writeFileSync(outPath, js, 'utf-8')
console.log('written:', outPath, 'icons:', Object.keys(obj).length)
