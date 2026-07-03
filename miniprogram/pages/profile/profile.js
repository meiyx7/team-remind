// pages/profile/profile.js
Page({
  data: {
    userInfo: null,
    menuList: [
      { icon: '👥', text: '我的团队', key: 'team' },
      { icon: '✅', text: '已完成任务', key: 'done' },
      { icon: '⚙️', text: '设置', key: 'settings' },
      { icon: 'ℹ️', text: '关于', key: 'about' }
    ]
  },

  onShow() {
    const app = getApp()
    this.setData({ userInfo: app.globalData.userInfo })
  },

  onMenuTap(e) {
    const { key } = e.currentTarget.dataset
    wx.showToast({ title: '功能开发中', icon: 'none' })
  }
})
