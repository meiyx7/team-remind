# 更新日志

版本规则（正式上线前）：
- 不使用 1.x.x，全部以 0.x.x 起步
- patch（0.x.P）：bug 修复、小调整
- minor（0.M.0）：功能新增、较大改动

## 0.8.0

0.5-0.8 四个主题合并交付：后端地基 + 提醒闭环 + 协作深度 + 团队治理。

### 后端地基（Supabase，0.5）

- 双轨架构：`utils/config.js` 填入 Supabase 项目信息即切云端模式；未配置自动运行本地模式，功能完整可演示
- `utils/api.js`：基于 wx.request 的 Supabase REST 客户端（PostgREST 数据表 / GoTrue 认证 / Edge Functions），零 SDK 依赖
- `utils/sync.js`：离线优先同步引擎——本地缓存始终是读写入口，后台 push 脏行 upsert + pull 按 updated_at 游标增量拉取，LWW 冲突策略，软删除墓碑随行下发
- 真实登录：wx.login → Edge Function（supabase/functions/wx-login）code2session 换 openid → magiclink token 换 Supabase 会话；本地模式降级为模拟登录
- 数据库：supabase/migrations/0001_init.sql 六张表（profiles/teams/members/todos/comments/events）+ updated_at 触发器 + RLS 行级权限
- 到期提醒推送：supabase/functions/remind-cron 扫描 24h 内到期待办发微信订阅消息（pg_cron 定时触发）
- 接入指南：supabase/README.md（建库、部署函数、订阅消息模板、域名白名单全流程）

### 提醒闭环（0.6，配得上「remind」这个名字）

- 待办支持**截止时间**（日期 + 可选 HH:mm 时间选择器）
- 创建待办成功后自动拉起订阅消息授权（云端模式 + 已配模板时生效）
- **催办**：待办详情页「催一下」一键提醒所有未完成成员，生成定向通知
- **消息中心**新页：催办/提及等定向通知列表，首页铃铛入口带未读角标，「我的」页同步显示未读数

### 协作深度（0.7）

- **评论**：待办详情评论区，@成员名 自动识别为提及并通知对方（@ 按钮从团队成员快速选人）
- **认领池**：创建待办可选「认领池」模式，发布 N 个空名额团队成员抢单；详情页/卡片显示空位与认领按钮
- **重复任务**：每天/每周规则，完成后自动生成下一期（同内容、日期顺延、完成态清零）
- **团队动态流**：团队详情新增「动态」Tab，创建/完成/认领/评论/加入全记录，可跳转对应待办

### 团队治理（0.8）

- 角色权限体系：creator / admin / member 三级，管理员可移除成员（创建者受保护）、删除任意待办
- 成员管理：成员行内移除按钮、退出团队（创建者暂不可退出，引导归档）
- **团队归档**：创建者可归档团队（列表隐藏、随时恢复），团队列表底部折叠分组展示已归档团队
- **团队周报**：近 7 天新建/完成率/逾期存量概览、每日新建趋势图、成员贡献排行（按已完成排序）

### 其他

- 种子数据新增认领池示例待办；全部实体补齐 updatedAt/deleted 同步字段
- 新增图标：clock（时间选择）；ESLint 忽略 supabase/ 目录

## 0.4.1

持久化层加固 + 数据一致性全量修复：

- P0 修复 `reset()` 未做日期占位符解析的 Bug：重置后 `__TODAY__` 字面量导致排序/逾期判断失效；reset 与 init 共用同一条播种管线，行为完全一致
- P0 统一身份体系：用户 id 即成员 id（同一人多团队共享同 id），移除全部「按姓名匹配身份」的兜底逻辑（同名成员不再错乱）；种子数据、assignments、createdBy 全部对齐
- P0 持久化层加固：所有 Storage 读写包异常保护（配额满/损坏不再抛未捕获错误）；新增内存缓存写穿透层，消除高频重复读盘；启动时校验集合完整性，任一集合损坏自动重新播种
- P0 存储结构版本号（schemaVersion）：旧结构数据升级时自动迁移重置，避免新旧字段模型混用
- P1 id 生成改为 时间戳+自增序列+随机数，杜绝同毫秒撞车
- P1 种子数据一致性：t2/t3 成员表补齐实际记录（16 条成员记录），memberCount 与详情页真实一致；张明同时是产品设计组创建者与运营推广组成员
- P1 收敛三处重复的 memberId 解析逻辑为 `store.findMyAssignment(todo)`；完成/取消完成的 toast 文案按操作结果区分
- P1 登录 loading 状态在成功跳转前复位，不再依赖页面跳走掩盖；auth.js 异常路径可真正 reject
- P2 首页 RANGE_DEFS 取 label 增加空值保护；createTodo 对 dueDate 做 YYYY-MM-DD 规范化
- 工程化：CI 接入 ESLint 质量门禁 + 提交 package-lock.json 改用 `npm ci` 可复现构建；移除 CI 日志中的私钥头行打印

## 0.4.0

多人协作 + 待办详情 + 团队邀请：

- 待办详情页：新增独立页面 `todo-detail`，点击首页/团队详情任意待办卡进入；展示标题/描述/优先级/截止/状态、所属团队入口、整体进度条与完成率、团队内每个成员的完成状态
- 多人指派数据模型：待办由单 assignee 改为 `assignments: [{ memberId, memberName, avatarChar, avatarColor, done }]`；`decorate()` 计算 `assignTotal/assignDone/assignRate`；`toggleAssignment(todoId, memberId)` 切换单人完成状态并自动同步整单状态（全完成→已完成，否则→进行中）
- 创建待办支持多选成员：create-todo 改为多选 chip 列表，默认选中当前用户，提交时传 `selectedMembers` 数组由 store 生成 assignments
- todo-card 多人进度展示：多人指派的待办卡片右下角显示 N/M 进度徽标，全员完成时高亮品牌色；副标题由「X 指派」改为「N 人指派」
- 团队邀请（微信分享）：team-detail 接入 `onShareAppMessage`，分享卡片带 `?from=share` 参数；对方打开后弹窗确认加入，调用 `joinTeamByShare` 自动加入团队并同步 memberCount
- 邀请入口：成员 Tab 底部「邀请成员」按钮改为可用态，点击弹窗引导使用右上角转发/分享按钮
- 数据层：store 新增 `getTodoById / toggleAssignment / addMember / joinTeamByShare`；mock.js 6 条种子待办全部接入 assignments 数组

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

UIUX 框架重构首版 + 全站统一收口，分两批处理评估出的 P0/P1/P2 问题：

- P1 设计令牌补齐：新增间距令牌（space-xs~2xl）、字号令牌（fs-xs~2xl）、暗色模式变量集（.theme-dark）
- P1 抽出 5 个公共组件：state-view（loading/error/empty 三态）、todo-card、filter-tabs、empty-state、avatar，全站替换
- P1 Tab 结构 4→3：首页吸收待办，统计卡同时作为筛选条件，点击联动下方列表；移除独立待办 Tab
- P1 TabBar 改用 SVG 图标，修复 CSS 伪元素绘制图标在真机异常问题
- P1 内容区 / FAB 安全区 calc 修正
- P0 设置页「假按钮」统一处理：深色模式真生效；主题换肤/消息通知/帮助反馈标注「即将上线」灰态；关于读真实版本号
- P0 team-detail 团队为空时接入 state-view，修复整页空白
- P0 create-todo 提交按钮加 loading + disabled，防重复提交
- P0 移除「AI 感」：team-detail 渐变 wash、profile 顶部渐变条、卡片左边色条统一收口；login logo 渐变光晕、FAB 品牌色发光阴影、团队卡/待办卡左侧色条全部移除；shadow-elevated 改为中性高度阴影
- P1 CSS 手绘图标统一换 SVG：team-list（search/clear/chevron）、login（check-mark）、create-todo（calendar/chevron）全部替换为 utils/icons 中的 base64 SVG；新增 plusBrand 图标
- P1 themeClass 全站级联：9 个页面根容器接入；新增 --nav-bg token，nav-bar 随主题切换
- P1 关键修复：TabBar 是页面同级组件，CSS 变量不会从 .page-container 级联进来 → 给 TabBar 加 updateTheme() 方法，三个 Tab 页 onShow + profile 切换时即时同步深色模式
- P1 组件接入：team-list 接入 avatar + empty-state；create-todo 接入 SVG 图标
- P0 profile 设置页全部功能打通：深色模式真实切换+持久化+TabBar同步、我的团队跳转、帮助与反馈、关于（真实版本号）、用户协议、隐私政策（原生全文页）
- P2 接入 utils/date.js 相对时间格式化（今天/明天/N天后/已逾期）全站替换原始 ISO
- P2 全站下拉刷新校验：home/team-list/team-detail 启用，create-todo 表单页显式关闭；关键操作触觉反馈统一
- P2 暗色模式真正实现：变量集 + 根类切换 + 持久化
- 工程化：gen-icons.js / gen-tabbar.js 脚本同步更新，支持 plusBrand 与 TabBar 主题方法
