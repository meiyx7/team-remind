# Issue 草稿：助手回合无法正常终止，输出被循环重新注入为用户消息

> 复制以下内容提交到 https://github.com/anomalyco/opencode/issues

---

**标题**：Upstream stream failures cause agent loop restart that re-injects previous assistant output as user message (self-sustaining loop)

**环境**：
- OpenCode 桌面版（macOS，Electron /Applications/OpenCode.app）
- 模型：opencode / x-preview-f-free
- 网络：中国大陆，需本地代理访问国外服务（网络不稳定，已证实 GitHub 直连超时）
- 会话：长会话（agent loop 已达 96+ 步）

**现象**：
1. 助手回复渲染完成后，UI 不回到空闲态，持续显示「处理中」
2. 数十秒后助手自动「再次响应」，响应内容是把上一条自己的回复当作用户消息来回应（如「收到空消息，等待用户指示」）
3. 循环可重复多轮；期间会话中还会出现空白用户消息

**日志证据**（`~/.local/share/opencode/log/opencode.log`，795 条 ERROR）：
- 422× `AI_APICallError: Upstream request failed: Endpoint is unavailable`
- 36× `AI_APICallError: [1210] Invalid API parameter ... invalid zstd request body`（疑似压缩请求体在不稳定链路中损坏）
- 35× Service Unavailable / 23× Internal server error / 21× rate-limited / 17× Connect Timeout (opencode.ai:443)
- 24× `message=cancel`，19× `Aborted`（AbortError: Aborted，来自 DOMException）
- 关键片段：同一 session 上出现两个并发 run（不同 run id），loop step 达 96/97，cancel 后新 run 从 step=0 重启

**推断的机制**：
上游流式响应中途失败 → opencode 取消当前 run 并在同一 session 重启 agent loop → 重建上下文时，上一条助手回复被以 user 角色重新注入 → 模型将其视为用户输入并回应 → 形成自持循环（每次回应又成为可被注入的素材）。

**期望行为**：
- 流失败后回合应干净终止并回到空闲态，提示用户重试，而不是自动重启 loop 并错位注入历史消息
- 或：loop 重启时对「内容与上一条助手消息完全一致的 user 消息」做去重/过滤

**复现条件**：不稳定的上游 + 长会话（高 loop step）时较易触发；本次会话在约 1 小时内循环了 4+ 轮。

**临时规避**：重启应用/新开会话可打断循环；减少单会话长度可降低触发概率。
