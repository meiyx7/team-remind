// scripts/gen-version.js 读取 VERSION 文件写入 miniprogram/utils/version.js（单一来源）
const fs = require('fs')
const path = require('path')

const version = fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf-8').trim()

const js = `// 自动生成于 scripts/gen-version.js，请勿手改。来源：根目录 VERSION 文件
module.exports = ${JSON.stringify(version)}
`

const outPath = path.join(__dirname, '..', 'miniprogram', 'utils', 'version.js')
fs.writeFileSync(outPath, js, 'utf-8')
console.log('written:', outPath, 'version:', version)
