// 自动生成于 scripts/gen-tabbar.js，请勿手改。3 Tab：首页/团队/我的
Component({
  data: {
    selected: 0,
    themeClass: '',
    list: [
      {
        "pagePath": "/pages/home/home",
        "text": "首页",
        "icon": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgOS41TDEyIDNsOSA2LjVWMjBhMSAxIDAgMCAxLTEgMWgtNXYtNmgtNnY2SDRhMSAxIDAgMCAxLTEtMVY5LjV6Ii8+PC9zdmc+",
        "activeIcon": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgOS41TDEyIDNsOSA2LjVWMjBhMSAxIDAgMCAxLTEgMWgtNXYtNmgtNnY2SDRhMSAxIDAgMCAxLTEtMVY5LjV6Ii8+PC9zdmc+"
      },
      {
        "pagePath": "/pages/team-list/team-list",
        "text": "团队",
        "icon": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iOSIgY3k9IjgiIHI9IjMuMiIvPjxwYXRoIGQ9Ik0zLjUgMjBjMC0zIDIuNS01LjIgNS41LTUuMnM1LjUgMi4yIDUuNSA1LjIiLz48cGF0aCBkPSJNMTYgNS4yYTMgMyAwIDAgMSAwIDUuNiIvPjxwYXRoIGQ9Ik0xNy41IDE0LjljMi40LjYgNCAyLjYgNCA1LjEiLz48L3N2Zz4=",
        "activeIcon": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iOSIgY3k9IjgiIHI9IjMuMiIvPjxwYXRoIGQ9Ik0zLjUgMjBjMC0zIDIuNS01LjIgNS41LTUuMnM1LjUgMi4yIDUuNSA1LjIiLz48cGF0aCBkPSJNMTYgNS4yYTMgMyAwIDAgMSAwIDUuNiIvPjxwYXRoIGQ9Ik0xNy41IDE0LjljMi40LjYgNCAyLjYgNCA1LjEiLz48L3N2Zz4="
      },
      {
        "pagePath": "/pages/profile/profile",
        "text": "我的",
        "icon": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTQuNSAyMC41YzAtNCAzLjQtNi41IDcuNS02LjVzNy41IDIuNSA3LjUgNi41Ii8+PC9zdmc+",
        "activeIcon": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTQuNSAyMC41YzAtNCAzLjQtNi41IDcuNS02LjVzNy41IDIuNSA3LjUgNi41Ii8+PC9zdmc+"
      }
    ]
  },
  lifetimes: {
    attached() {
      this.updateTheme()
    }
  },
  methods: {
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset
      if (this.data.selected === index) return
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    },
    // 同步深色模式（TabBar 是页面同级组件，CSS 变量不会从 .page-container 级联进来）
    updateTheme() {
      const app = getApp()
      this.setData({ themeClass: app && app.getThemeClass ? app.getThemeClass() : '' })
    }
  }
})
