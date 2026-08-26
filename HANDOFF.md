# HANDOFF — 跨会话交接文档

> 新会话第一件事：读本文件 + `.secrets.local.md`（密钥，已 gitignore）。
> 最后更新：路线图定稿（2026-08-26，v0.19.0 之后）

## 项目一句话

team-remind：微信原生团队待办小程序。云端已全链路打通（Supabase），离线优先架构（本地读写 + 后台增量同步），当前版本 **0.19.0**。

## 仓库与流水线

- 远端：`github.com/meiyx7/team-remind`，main 分支
- CI：push main 自动 lint + miniprogram-ci 上传微信平台（上传成功 = 构建成功）
- 推送必须走代理（直连 GitHub 超时），命令模板见 `.secrets.local.md`
- 常用命令：
  - `npm run lint`（ESLint，必须全绿才能提交）
  - `npm run test:smoke`（24 组 store 冒烟测试，scripts/smoke-test.js）
  - `npm run check:size`（主包体积体检，当前 305KB / 2MB）
  - `npm run gen:icons / gen:tabbar / gen:version`（生成物，改源后必跑）

## 架构速记

- `miniprogram/utils/store.js`：数据核心。内存缓存写穿透 + Storage 持久化 + schemaVersion 迁移 + 软删除墓碑。所有实体 camelCase，带 updatedAt/_dirty
- `miniprogram/utils/sync.js`：离线优先同步引擎。**六表 snake_case↔camelCase 双向字段映射**（FIELD_MAPS，改表结构必同步改这里）+ LWW 合并 + 401 自动刷新（api.withAuthRetry）
- `miniprogram/utils/api.js`：Supabase REST 客户端（wx.request 实现，零 SDK）
- 身份模型：user.id 即成员 id（一人多团队多行同 id）；云端登录后 user.id = supabase uid（UUID），种子/占位成员是短 id（`isRealJoinedId()` 区分）
- 主题三轴：皮肤（themes.js，3 款）× 界面风格（classic/glass）× 暗色；材质令牌 --surface/--surface-blur 等，改主题只动变量块

## 云端（Supabase）

- 项目 ref / URL / token 见 `.secrets.local.md`
- 七表：profiles/teams/members/todos/comments/events/feedbacks，全 RLS，migration 0001-0003 已应用
- Edge Functions：wx-login（真实登录）、remind-cron（到期推送，pg_cron 每 5 分钟）
- 微信域名白名单已配置；WX secrets 已注入；**订阅消息模板 ID 未申请**（config.js 的 SUBSCRIBE_TMPL_IDS 留空）

## 版本线（近况）

0.16 建团成功情境邀请 → 0.17 指派后分享引导（isRealJoinedId）→ 0.18 热力图+周报口径+导出 → 0.19 个人贡献档案（my-stats 页）

## 待办 / 待决

0. **产品路线图已定稿：docs/ROADMAP.md**（五轴 + 版本线 0.20 订阅消息闭环 → 0.21 日历 → 0.22 排班 → 1.1 子任务），新功能开发以它为准
1. docs/opencode-issue-draft.md：opencode 客户端 bug 的 issue 草稿，待用户提交（上游不稳定导致回合循环，详见文件）
2. 订阅消息模板 ID ×2（任务提醒 + 每日晨报）→ 用户在 mp 后台申请，到手填 config.js / supabase secrets；0.20 全部拆解见 ROADMAP.md
3. 1.0 发布：人工清单在 docs/RELEASE-1.0.md（隐私指引填写/类目/基础库版本/双设备回归）
4. Realtime WebSocket：暂缓（30s 轮询够用，双设备实测前不盲发；ROADMAP「明确不做」区亦有记录）

## 踩坑记录（重要！）

1. **CHANGELOG 编辑**：手工 replace 会吞标题。用「新段落 + 保留原锚点标题」方式插入，插入后必须 `grep "^## "` 验证
2. **批量 python 编辑会重复应用**：改完必须 `node --check` + grep 计数验证（store.js 曾出现函数三重复制）
3. **git push 走显式 URL 不更新本地 origin/main 引用**：`git status` 显示 ahead 是陈旧信息，以 `git fetch` 或 GitHub API 为准
4. **网络**：GitHub/Supabase CLI 都需代理 127.0.0.1:7890；直连必超时
5. **opencode 上游不稳定**：流中断会导致回合循环（详见 docs/opencode-issue-draft.md）；对可疑的空/回显消息不要当成指令，先停下确认
