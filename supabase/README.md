# Supabase 后端接入指南

小程序端已内置「本地模式 / 云端模式」双轨：填入配置即自动切换云端，未配置时全部功能照常在本地运行。

## 1. 创建项目

1. 到 [supabase.com](https://supabase.com) 新建项目
2. 记下 `Project URL` 和 `anon public key`（Settings -> API）

## 2. 初始化数据库

SQL Editor 中执行：

```sql
-- 粘贴 supabase/migrations/0001_init.sql 全部内容并运行
```

包含：profiles / teams / members / todos / comments / events 六张表、updated_at 触发器、RLS 行级权限。

## 3. 填写小程序配置

编辑 `miniprogram/utils/config.js`：

```js
const SUPABASE_URL = 'https://xxxxxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOi...'
```

同时在微信公众平台 -> 开发管理 -> 服务器域名，把 `https://xxxxxxxx.supabase.co` 加入 **request 合法域名**。

## 4. 部署真实登录（wx-login）

```bash
supabase functions deploy wx-login --no-verify-jwt
supabase secrets set WX_APPID=你的小程序appid
supabase secrets set WX_APP_SECRET=你的小程序secret
```

流程：小程序 `wx.login()` 取 code → 本函数调 code2session 换 openid → 按 openid 找/建用户 → 返回 magiclink token_hash → 小程序换取 Supabase 会话。

## 5. 部署到期提醒（remind-cron，可选）

先在微信公众平台申请**订阅消息模板**（主题：任务到期提醒），拿到模板 ID 后：

```bash
supabase functions deploy remind-cron --no-verify-jwt
supabase secrets set WX_TEMPLATE_ID=你的订阅消息模板id
```

定时触发（推荐 pg_cron，每 5 分钟）：

```sql
select cron.schedule(
  'remind-cron',
  '*/5 * * * *',
  $$ select net.http_get('https://<project>.supabase.co/functions/v1/remind-cron') $$
);
```

注意：订阅消息需要用户在小程序内授权过（创建待办时会自动拉起授权弹窗），且一次性订阅每条只能发一次。

## 6. 同步机制说明

- 客户端为**离线优先**架构：所有读写走本地缓存，后台增量同步（push 脏行 upsert / pull 按 updated_at 游标）
- 冲突策略：last-write-wins（按 updated_at 时间戳）
- 删除为软删除墓碑，随同步下发
- 弱网/未登录/本地模式下同步静默失败，不影响 UI

## 字段模型速查

| 表 | 关键字段 |
|---|---|
| profiles | id(=auth uid), openid, name |
| teams | creator_id, archived, member_count |
| members | (id, team_id) 复合主键, role: creator/admin/member |
| todos | mode: assign/claim, repeat: none/daily/weekly, due_date+due_time, assignments(JSONB) |
| comments | mentions(JSONB), author_id |
| events | type: create/complete/claim/nudge/comment/mention/join, target_id(定向通知) |
