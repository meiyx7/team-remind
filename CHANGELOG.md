# 更新日志

版本规则（正式上线前）：
- 不使用 1.x.x，全部以 0.x.x 起步
- patch（0.x.P）：bug 修复、小调整
- minor（0.M.0）：功能新增、较大改动

## 0.3.0

首页体验升级 + 待办优先级 + 入口去重：

- 首页顶部新增问候卡：按时段问候（早上好/下午好…）+ 今日日期 + 今日完成进度条（N/M + 百分比），打开即知今天状态
- 首页新增时间维度视图切换：今日 / 本周 / 全部 三段式 Tab，默认聚焦「今日」，符合「今天做什么」心智
- 首页统计卡升级：已完成卡显示今日完成率（百分比），其余卡保持数量；与时间维度、状态维度形成双重筛选
- 待办优先级：create-todo 新增紧急/普通选择；todo-card 紧急项标题左侧红点标识；store.createTodo 支持 priority 字段
- 种子数据动态化：mock.js 待办日期用占位符，init 时替换为相对今天的真实日期，确保演示永远贴近当前时间；新增逾期样例
- 设置页去重：移除「我的团队」入口（团队归 Tab 2 独立管理），消息通知归入偏好设置组
- 数据层：store 新增 getTodayStats / getMyTodosByRange / getGreeting / getTodayLabel / getDateStrOffset

## 0.2.0

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

## 0.2.0

P1 几类问题全站统一处理收口 + 设置页功能逐个完善 + 关键 bug 修复：

- P1 去「AI 感」装饰元素全站收口：login logo 渐变光晕、FAB 品牌色发光阴影、team-list 团队卡左侧色条、todo-card 左侧色条全部移除；shadow-elevated 改为中性高度阴影
- P1 CSS 手绘图标统一换 SVG：team-list（search/clear/chevron）、login（check-mark）、create-todo（calendar/chevron）全部替换为 utils/icons 中的 base64 SVG；新增 plusBrand 图标
- P1 themeClass 全站级联：9 个页面根容器接入；新增 --nav-bg token，nav-bar 随主题切换
- P1 关键修复：TabBar 是页面同级组件，CSS 变量不会从 .page-container 级联进来 → 给 TabBar 加 updateTheme() 方法，三个 Tab 页 onShow + profile 切换时即时同步深色模式
- P1 组件接入：team-list 接入 avatar + empty-state；create-todo 接入 SVG 图标
- P0 create-todo 防双击：submitting 守卫 + loading/disabled 双绑定 + 失败兜底回首页
- P0 team-detail 空态：state-view 显示「团队不存在」
- P0 profile 设置页全部功能打通：深色模式真实切换+持久化+TabBar同步、我的团队跳转、帮助与反馈、关于（真实版本号）、用户协议、隐私政策（原生全文页）
- P2 全站下拉刷新校验：home/team-list/team-detail 启用，create-todo 表单页显式关闭
- P2 触觉反馈统一：筛选切换/完成/创建/登录/清空搜索 vibrateShort；补齐 team-detail switchTab/switchTodoFilter
- 工程化：gen-icons.js / gen-tabbar.js 脚本同步更新，支持 plusBrand 与 TabBar 主题方法
