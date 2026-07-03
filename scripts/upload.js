// scripts/upload.js
// 使用 miniprogram-ci 构建并上传微信小程序
const ci = require('miniprogram-ci')
const path = require('path')

async function main() {
  const version = process.env.VERSION || '0.0.0'
  const desc = process.env.DESC || '团队待办小程序代码上传'

  const project = new ci.Project({
    appid: process.env.WX_APPID,
    type: 'miniProgram',
    projectPath: path.resolve(__dirname, '..'),
    privateKeyPath: path.resolve(__dirname, '..', 'private.key'),
    ignores: ['node_modules/**/*', '.git/**/*', 'scripts/**/*'],
  })

  // 构建 npm（将 node_modules 编译为 miniprogram_npm）
  console.log('正在构建 npm...')
  try {
    await ci.packNpm(project, {
      reporter: (info) => console.log(JSON.stringify(info)),
    })
    console.log('npm 构建完成')
  } catch (err) {
    console.warn('npm 构建跳过:', err.message)
  }

  // 上传代码
  console.log(`正在上传版本 ${version} ...`)
  const uploadResult = await ci.upload({
    project,
    version,
    desc,
    setting: {
      es6: true,
      es7: true,
      minify: true,
      autoPrefixWXSS: true,
      minifyWXML: true,
      minifyWXSS: true,
    },
    onProgressUpdate: console.log,
  })

  console.log('上传成功！', JSON.stringify(uploadResult))
}

main().catch((err) => {
  console.error('上传失败:', err.message || err)
  process.exit(1)
})
