// scripts/check-size.js 主包体积体检（微信主包上限 2MB）
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'miniprogram')
const LIMIT = 2 * 1024 * 1024

function walk(dir, files = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(ent => {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walk(p, files)
    } else {
      files.push(p)
    }
  })
  return files
}

const files = walk(ROOT)
let total = 0
const rows = files.map(f => {
  const size = fs.statSync(f).size
  total += size
  return { file: path.relative(ROOT, f), size }
}).sort((a, b) => b.size - a.size)

const kb = n => (n / 1024).toFixed(1) + 'KB'
console.log('文件数:', files.length)
console.log('主包体积:', kb(total), '/', kb(LIMIT), '(' + (total / LIMIT * 100).toFixed(1) + '%)')
console.log('Top 10:')
rows.slice(0, 10).forEach(r => console.log('  ', kb(r.size).padStart(9), r.file))

if (total > LIMIT) {
  console.error('超出主包上限！需要分包或瘦身。')
  process.exit(1)
}
