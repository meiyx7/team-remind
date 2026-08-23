// utils/notify.js 消息与提醒
// - 本地消息中心：未读角标、已读游标
// - 订阅消息：创建待办/被指派时拉起授权（云端模式 + 已配置模板 ID 时生效）
const store = require('./store')
const config = require('./config')

function unreadCount() {
  return store.unreadNotificationCount()
}

// 进入消息中心时调用：把已读游标推到当前时间
function markAllRead() {
  store.markNotificationsRead()
}

// 拉起订阅消息授权（静默失败：模板未配置/用户拒绝都不打扰主流程）
function requestRemindPermission() {
  const ids = (config.SUBSCRIBE_TMPL_IDS || []).filter(Boolean)
  if (!ids.length) return Promise.resolve(false)
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: ids,
      complete: () => resolve(true)
    })
  })
}

module.exports = {
  unreadCount,
  markAllRead,
  requestRemindPermission
}
