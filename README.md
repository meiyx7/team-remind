# team-remind

团队待办小程序 - 微信原生 + Supabase

## 技术栈

- **前端**: 微信小程序原生开发 (WXML / WXSS / JS)
- **后端**: Supabase (PostgreSQL + Auth + Realtime)

## 项目结构

```
team-remind/
├── miniprogram/              # 小程序代码
│   ├── app.js                # 应用入口
│   ├── app.json              # 全局配置
│   ├── app.wxss              # 全局样式
│   ├── sitemap.json          # 搜索配置
│   ├── pages/
│   │   ├── index/            # 待办列表页
│   │   ├── create/           # 新建待办页
│   │   ├── detail/           # 待办详情页
│   │   └── profile/          # 个人中心页
│   └── utils/
│       └── supabase.js       # Supabase 客户端封装
├── package.json              # npm 依赖
├── project.config.json       # 微信开发者工具配置
└── .gitignore
```

## 快速开始

### 1. 配置 Supabase

1. 在 [supabase.com](https://supabase.com) 创建项目
2. 在 SQL Editor 中创建 `todos` 表：

```sql
create table todos (
  id bigint generated always as identity primary key,
  title text not null,
  description text default '',
  assignee text default '',
  due_date date,
  priority text default 'normal',
  done boolean default false,
  created_at timestamptz default now()
);
```

3. 在 `miniprogram/utils/supabase.js` 中填入你的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`

### 2. 运行小程序

1. 用微信开发者工具打开本项目目录
2. 在工具菜单中选择「构建 npm」
3. 填入你的小程序 AppID（或使用测试号）
4. 编译运行

## 功能规划

- [x] 待办列表（全部 / 未完成 / 已完成）
- [x] 创建待办（标题、描述、指派、截止日期、优先级）
- [x] 待办详情查看
- [x] 完成 / 取消完成
- [x] 删除待办
- [ ] 团队成员管理
- [ ] 实时同步 (Supabase Realtime)
- [ ] 微信登录集成
- [ ] 消息通知提醒
