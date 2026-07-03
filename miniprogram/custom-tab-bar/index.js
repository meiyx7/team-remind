// custom-tab-bar/index.js 自定义底部 TabBar
Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/home/home',
        text: '首页',
        iconPath: 'home',
        activeIconPath: 'home-active'
      },
      {
        pagePath: '/pages/team-list/team-list',
        text: '团队',
        iconPath: 'team',
        activeIconPath: 'team-active'
      },
      {
        pagePath: '/pages/todo-list/todo-list',
        text: '待办',
        iconPath: 'todo',
        activeIconPath: 'todo-active'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        iconPath: 'profile',
        activeIconPath: 'profile-active'
      }
    ]
  },

  methods: {
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    }
  }
})
