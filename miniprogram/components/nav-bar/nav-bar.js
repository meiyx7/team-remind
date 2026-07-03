// components/nav-bar/nav-bar.js 自定义导航栏
Component({
  properties: {
    title: { type: String, value: '' },
    showBack: { type: Boolean, value: false },
    bgTransparent: { type: Boolean, value: false },
    // 右侧自定义内容（slot）
    showRightSlot: { type: Boolean, value: false }
  },

  data: {
    statusBarHeight: 0,
    navBarHeight: 44,
    menuWidth: 0
  },

  lifetimes: {
    attached() {
      const app = getApp()
      const statusBarHeight = app.globalData.statusBarHeight || 20
      const navBarHeight = app.globalData.navBarHeight || 44
      const menuButton = app.globalData.menuButton
      this.setData({
        statusBarHeight,
        navBarHeight,
        menuWidth: menuButton ? menuButton.width : 87
      })
    }
  },

  methods: {
    onBack() {
      this.triggerEvent('back')
      wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/home/home' }) })
    }
  }
})
