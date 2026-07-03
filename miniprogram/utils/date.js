// utils/date.js 日期格式化工具

// ISO 日期 -> 中文短日期（7月5日）
function toChineseShort(iso) {
  if (!iso) return ''
  const parts = iso.split('-')
  if (parts.length < 3) return iso
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  return `${month}月${day}日`
}

// 获取今天 ISO
function today() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 距今天数（正数为未来，负数为过去）
function daysFromToday(iso) {
  if (!iso) return null
  const target = new Date(iso + 'T00:00:00')
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return Math.round((target - t) / (24 * 60 * 60 * 1000))
}

// 相对描述（今天/明天/后天/N天后/已逾期N天）
function relativeLabel(iso) {
  const diff = daysFromToday(iso)
  if (diff === null) return ''
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  if (diff > 0) return `${diff}天后`
  if (diff === -1) return '已逾期1天'
  return `已逾期${-diff}天`
}

module.exports = {
  toChineseShort,
  today,
  daysFromToday,
  relativeLabel
}
