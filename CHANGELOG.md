# 更新日志

版本规则（正式上线前）：
- 不使用 1.x.x，全部以 0.x.x 起步
- patch（0.x.P）：bug 修复、小调整
- minor（0.M.0）：功能新增、较大改动

## 0.1.0

UIUX 框架重构首版，统一处理评估出的 P0/P1/P2 问题：

- P1 设计令牌补齐：新增间距令牌（space-xs~2xl）、字号令牌（fs-xs~2xl）、暗色模式变量集（.theme-dark）
- P1 抽出 5 个公共组件：state-view（loading/error/empty 三态）、todo-card、filter-tabs、empty-state、avatar，全站替换
- P1 Tab 结构 4→3：首页吸收待办，统计卡同时作为筛选条件，点击联动下方列表；移除独立待办 Tab
- P1 TabBar 改用 SVG 图标，修复 CSS 伪元素绘制图标在真机异常问题
- P1 内容区 / FAB 安全区 calc 修正
- P0 设置页「假按钮」统一处理：深色模式真生效；主题换肤/消息通知/帮助反馈标注「即将上线」灰态；关于读真实版本号
- P0 team-detail 团队为空时接入 state-view，修复整页空白
- P0 create-todo 提交按钮加 loading + disabled，防重复提交
- P0 移除「AI 感」：team-detail 渐变 wash、profile 顶部渐变条、卡片左边色条统一收口
- P2 接入 utils/date.js 相对时间格式化（今天/明天/N天后/已逾期）全站替换原始 ISO
- P2 全站下拉刷新 + 关键操作触觉反馈
- P2 暗色模式真正实现：变量集 + 根类切换 + 持久化
- P2 设置页功能完善：关于页、帮助反馈、消息通知、用户协议、隐私政策
