# team-remind

团队待办小程序 - 微信原生开发，翡翠绿设计风格，7 个页面完整可运行 Demo。

## 技术栈

- **前端**: 微信小程序原生开发 (WXML / WXSS / JS)
- **数据**: 本地 Mock 种子数据 + wx.Storage 持久化（不依赖后端，开箱即用）

## 持久化设计

- **内存缓存写穿透**: 集合数据读一次常驻内存，写入同时更新缓存与 Storage，避免高频同步读盘
- **异常保护**: 所有 Storage 读写包裹 try/catch，配额满或存储异常不会导致未捕获错误
- **结构版本迁移**: `schemaVersion` 标记存储结构版本，旧结构数据启动时自动重置为最新种子数据
- **完整性兜底**: 启动时校验集合类型，任一集合损坏自动重新播种
- **统一身份**: 用户 id 即成员 id，同一人在多个团队共享同一 id，杜绝按姓名匹配身份

## 项目结构

```
team-remind/
├── miniprogram/                  # 小程序代码
│   ├── app.js                    # 应用入口，登录态检测
│   ├── app.json                  # 全局配置（10 页面 + 自定义 tabBar）
│   ├── app.wxss                  # 全局样式 + 设计令牌 (CSS 变量)
│   ├── sitemap.json
│   ├── components/               # 自定义组件
│   │   ├── nav-bar/              # 自定义导航栏（标题 + 返回 + 胶囊占位）
│   │   ├── state-view/           # 三态视图（loading/error/empty）
│   │   ├── todo-card/            # 待办卡片（优先级、多人进度）
│   │   ├── filter-tabs/          # 筛选 Tab
│   │   ├── empty-state/          # 空态
│   │   ├── avatar/               # 头像
│   │   └── status-badge/         # 待办状态徽章
│   ├── custom-tab-bar/           # 自定义底部 TabBar（3 Tab）
│   ├── pages/
│   │   ├── home/                 # 首页（仪表盘）
│   │   ├── team-list/            # 团队列表
│   │   ├── team-detail/          # 团队详情
│   │   ├── todo-list/            # 待办列表
│   │   ├── todo-detail/          # 待办详情（多人完成状态）
│   │   ├── create-todo/          # 创建待办
│   │   ├── profile/              # 我的
│   │   ├── login/                # 登录
│   │   ├── agreement/            # 协议全文页
│   │   ├── help/                 # 帮助反馈
│   │   └── about/                # 关于
│   └── utils/
│       ├── store.js              # 数据 CRUD + 持久化（内存缓存 + 异常保护 + 版本迁移）
│       ├── mock.js               # 种子数据
│       ├── auth.js               # 登录态管理
│       ├── date.js               # 日期工具
│       ├── icons.js              # base64 SVG 图标（脚本生成）
│       └── version.js            # 版本号（脚本生成，来源 VERSION 文件）
├── package.json
├── project.config.json           # 微信开发者工具配置
└── .github/workflows/upload.yml  # push main 自动上传微信平台
```

## 设计规范

- **品牌主色**: 翡翠绿 `#10b981`
- **状态色**: 成功 `#10b981` / 警告 `#f59e0b` / 错误 `#ef4444` / 信息 `#3b82f6`
- **字体**: PingFang SC / Noto Sans SC / 系统默认
- **圆角**: 8/16/24/32rpx，胶囊与头像使用 9999rpx
- **单位**: 全量使用 rpx 自动适配不同机型

## 快速开始

### 运行小程序

1. 用微信开发者工具打开本项目根目录
2. AppID 已配置在 `project.config.json`（也可使用测试号）
3. 编译运行即可预览

### 登录说明

Demo 采用「模拟微信一键登录」，点击登录按钮即写入本地用户数据并跳转首页，无需真实微信授权。

### 数据说明

- 首次启动会自动写入种子数据（3 个团队、16 条成员记录、6 条待办）
- 所有 CRUD 操作实时同步到 `wx.Storage`，并经内存缓存层加速
- 存储结构升级时（schemaVersion 变化）旧数据自动重置为最新种子
- 如需重置数据，可在 `utils/store.js` 调用 `reset()`

## 功能清单

- [x] 模拟微信一键登录
- [x] 首页仪表盘（待办统计、团队快捷入口、最近待办）
- [x] 团队列表（搜索、卡片列表、创建入口）
- [x] 团队详情（团队信息、成员/待办 Tab 切换、邀请入口）
- [x] 待办列表（5 种状态筛选、勾选完成、FAB 新建）
- [x] 创建待办（标题、描述、截止日期、关联团队、指派成员）
- [x] 个人中心（用户卡、偏好设置、团队管理、退出登录）
- [x] 自定义导航栏（适配状态栏与胶囊按钮）
- [x] 自定义 TabBar（4 Tab 切换）
- [x] rpx 多端屏幕适配
