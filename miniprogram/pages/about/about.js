// pages/about/about.js
const version = require('../../utils/version')
const icons = require('../../utils/icons')

Page({
  data: {
    themeClass: '',
    version,
    checkIcon: icons.check,
    chevronIcon: icons.chevron
  },
  onLoad() {
    this.setData({ themeClass: getApp().getThemeClass() })
  },
  goAgreement(e) {
    const { type } = e.currentTarget.dataset
    wx.navigateTo({ url: '/pages/agreement/agreement?type=' + type })
  }
})
