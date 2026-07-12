# oMLX 前缀缓存（Prefix Cache）注入设计方案

> ⚠️ **放置约定提醒**：按你的要求本文件放在 `docs/`，但 `AGENTS.md` 规定 `docs/` 是对外（外部用户）确定性文档，
> 内部探索/参考文档应放 `.openxenon/docs/`（对内-沉淀）或 `.openxenon/pools/drafts/`（对内-探索）。
> 本文是给你个人决策参考用的内部设计稿，**建议后续移到 `.openxenon/docs/` 或 `pools/drafts/`**，避免被 VitePress 当对外页构建或触发 `check-doc-boundary`。

---

## 0. 目标
在本地 oMLX（M1 Max / 64GB）上跑 `Qwen3.5-9B-8bit` 时，通过**稳定前缀 + 前缀缓存**，
把每次请求的 prefill 成本从"全量重算"降到"只算新增的几句"，显著缩短 TTFT、降低内存压力。

本文是**参考文档**，不动 `AGENTS.md` / `SKILL.md` 实际内容，供你决策如何修改。

---

## 1. 实测事实（本机已验证）

### 1.1 oMLX 的前缀缓存已开启
来自 `~/.omlx/logs/server.log` 与 `settings.json`：
- `omlx.cache.prefix_cache` → **BlockAwarePrefixCache**（块级前缀缓存，按 token 块哈希命中）
- `preserve_mid_system_cache: true` → **system 消息的 KV 边界被保留复用**
- paged **SSD 缓存**已启用：`/Users/issac/.omlx/cache`，当前 ~7.07GB / 上限 92.64GB
  → **重启 oMLX / 重开会话后前缀 KV 仍在**，首次 prefill 是真正的一次性成本
- 缓存按层签名绑定（9B = 32 层 / 8 KV heads / 16 Q heads / 256 head_dim）→ **切换模型（如回 27B）会使前缀缓存失效、需重 prefill 一次**

### 1.2 chat_template 无动态日期注入
读取 `Qwen3.5-9B-8bit/chat_template.jinja`（154 行）：只插入固定特殊 token
（`<|im_start|>` / `<|im_end|>` / `<|vision_start|>` 等）与消息原文；**没有任何 `datetime` / `now` / 当前日期注入**。
→ 只要 system 提示文本逐字节不变，前缀 KV 稳定可命中，不会因"换天"失效。

### 1.3 精确 token 数（用 Qwen3.5 真分词器测得）
| 文件 | tokens | 字节 |
|---|---:|---:|
| `AGENTS.md` | **6,439** | 20,189 |
| `oxn-asset/SKILL.md` | 1,166 | 3,730 |
| `oxn-work/SKILL.md` | 1,027 | 3,204 |
| **三文件合计** | **8,632** | — |

> 经 chat_template 包成 system 还会多 ~10–20 个固定边界 token，实际前缀 ≈ 8,642–8,652 tok。

---

## 2. 原理一页（给懂训练、不懂 serving 的人）

- **一次推理 = Prefill + Decode**。
  - **Prefill**：把整段输入 prompt 算一遍，得到每个输入 token 的 K/V 投影，建成 **KV cache**，并吐出第一个 token（这就是 TTFT）。
  - **Decode**：之后逐 token 生成，每步只需读**已建好的 KV cache** + 当前 token，不再重算历史（这就是生成速度 tgTPS）。
- **KV cache 是什么**：就是"历史每个 token 的 Key/Value 向量"的缓存。本质和 CPU 缓存 / memoization 一样——避免重复计算。
- **前缀缓存（Prefix Caching）**：把"**多个请求共享的提示前缀**"的 KV 也缓存下来，跨请求复用。
  - 类比：CDN 缓存静态资源。这里缓存的是"共享前缀的 KV 张量"，按 token 块哈希做 key。
  - 只有**前缀（leading tokens）逐字节完全一致**的块才命中；中间或末尾变化不影响前面已命中的块（块级）。
- **为什么本地也重要**：本机是 400GB/s 统一内存带宽瓶颈。27B 的 prefill ~64 tok/s、9B ~220 tok/s。
  把固定的几 KB 系统提示从"每请求全量 prefill"变成"只算一次"，直接省掉每次几十秒的等待。

---

## 3. 前缀缓存命中规则（设计约束）

1. **精确匹配**：前缀块只在 token 序列完全一致时命中。前缀里哪怕改 1 个词，该块及之后所有块全部 miss。
2. **只认前缀**：缓存对"输入开头的连续 token"最有效。把稳定内容放最前。
3. **块级（block_size=2048 tok）**：稳定的大前缀会被切成多个块分别缓存；共享前缀的块跨请求命中。
4. **模型相关**：缓存绑定层结构签名，换模型即失效（一次性重 prefill）。
5. **持久化**：SSD 缓存跨重启/重开会话保留，首次成本真正一次性。
6. **system 角色优先**：`preserve_mid_system_cache: true` 会保留 system 消息的 KV 边界 → **把稳定内容放进 system 提示最稳**。

---

## 4. 当前 prompt 流向（你这套栈）

```
OpenCode（agent 框架，组装 prompt）
   ├─ AGENTS.md            → 通常作为 system 提示（自动加载）
   ├─ 激活的 Skill 内容     → 注入上下文（位置取决于 OpenCode 的 skill 机制）
   └─ 对话历史 + 工具结果    → user / assistant / tool 消息
        │  (HTTP API: messages[].role/content)
        ▼
oMLX（模型服务，Qwen3.5-9B-8bit）
   └─ 收到 messages → 对"开头连续的稳定 token"做 Prefix Cache 命中
```

**关键认知**：oMLX 本身**未发现可让用户设置的全局 system_prompt 字段**（settings.json 里只有缓存开关，无 system 文本键）。
system 提示由客户端（OpenCode）提供。因此**真正可配置的是 OpenCode 侧**——确保它送出的 system 前缀稳定；oMLX 只负责缓存。

---

## 5. 设计方案：静态前缀 + 动态区

### 5.1 切分原则
| 区域 | 内容 | 是否进前缀 | 是否缓存 |
|---|---|---|---|
| **静态前缀（system）** | AGENTS.md、Skill 的固定指令、命令语法、错误码、禁止项 | ✅ 最前、每请求一致 | ✅ 命中 |
| **动态区（user/tool）** | 本次 goal/问题、CLI 命令与输出、当前在编的 asset、任务状态 | ❌ 在前缀之后 | ❌ 不缓存（但每次只算这几句） |

### 5.2 本仓库具体映射
- **`AGENTS.md`（6,439 tok）**：整体静态 → 全部进前缀。
- **`oxn-asset/SKILL.md`（1,166 tok）**：整篇都是固定指令（目标/硬规则/范式/执行步骤/模板表/错误码/禁止项）。
  文中 `oxn ...` 是**示例命令文本（静态）**；真实 CLI 输出是运行时 tool 消息（动态）。→ 整篇进前缀。
- **`oxn-work/SKILL.md`（1,027 tok）**：同理，整篇固定指令 + 示例 bash 块（静态）。→ 整篇进前缀。
- **"动态注入 / CLI 交互"**：不写在 SKILL.md 里，而是 OpenCode 执行 bash 工具后，把命令+输出作为 **tool 消息** 追加在前缀之后。
  → 天然落在动态区，**不会破坏前缀缓存**。

> 结论：你这两个 Skill 文件本身就是"纯静态指令"，无需大改，直接整体进前缀即可；
> 真正动态的部分（CLI I/O）本来就由工具机制隔离在前缀之外。

### 5.3 推荐注入结构
```
[system]  ← 稳定前缀，oMLX 缓存，每请求完全一致
  <AGENTS.md 全文>                     6439 tok
  <技能索引/路由（可选，极短，静态）>
  <oxn-asset SKILL.md 全文>           1166 tok
  <oxn-work SKILL.md 全文>            1027 tok
[end system]

[user]    ← 动态，不进前缀
  <本次 goal / 问题>
[assistant] ...
[tool]    ← 动态：CLI 命令与输出，在前缀之后
  $ oxn asset list
  <输出...>
```

### 5.4 两种策略（权衡）
| 策略 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| **A. 预载（推荐）** | 会话开始就把两 Skill 静态文本都放进 system 前缀 | 前缀永不随 skill 激活而变，缓存最热 | 常驻 8.6k tok；16k 窗口剩 ~7.4k 给对话（够用） |
| **B. 按需** | 仅激活 skill 时才把其文本注入 | 基础上下文更小 | skill 激活时前缀变长 → 该次需重 prefill 新增块（仅一次，共享 AGENTS 块仍命中） |

> 鉴于 9B 在 32k+ 上下文内存宽裕，**推荐 A（预载）**，换取最大化、最稳定的前缀命中。
> 若你常用 16k 窗口且对话很长，可退到 B。

---

## 6. oMLX / OpenCode 实操配置

### 6.1 oMLX 侧
- 前缀缓存**已经开启**（`preserve_mid_system_cache` + `prefix_cache` + SSD 缓存均已生效），**无需额外开关**。
- 未发现独立"全局 system prompt"设置项；system 提示由客户端送入。
- 若 oMLX UI 确有"系统提示/System Prompt"输入框：**只设一个来源**，不要与 OpenCode 的 AGENTS.md 重复——
  否则两份 system 拼接会导致前缀错位、缓存失效。建议**以 OpenCode 送出的 system 为准**，oMLX 侧保持默认。

### 6.2 OpenCode 侧（真正可配置点）
- 确保 `AGENTS.md` 作为**稳定 system 提示**送出（OpenCode 默认行为，通常已是）。
- **Skill 注入位置**：确认 OpenCode 把 Skill 静态文本放进 **system 前缀**（或作为稳定的 system 消息），
  **不要**把 Skill 文本作为 mid-conversation 的 user 消息注入（那会离开 leading 前缀，无法被前缀缓存命中）。
  - 若 OpenCode 默认把 skill 放进对话中部：查看其 skill/context 配置，改为注入到 system 前缀；
    或接受"skill 激活时前缀变长、新增块一次性重 prefill"（共享 AGENTS 块仍命中，影响很小）。
- **禁止在前缀里出现任何逐请求变化的内容**：时间戳、session id、随机 uuid、"第 N 轮"等。
  - 已由 §1.2 验证 chat_template 不注入日期；但需同步确认 **OpenCode 自身**是否往 system 提示加日期/会话信息。

---

## 7. 风险与校验清单
- [ ] OpenCode 是否往 system 提示注入**日期 / 时间 / 会话 id**？（若有 → 前缀每日/每会话失效）
- [ ] Skill 文本注入位置是否在 **system 前缀**（而非对话中部 user 消息）？
- [ ] AGENTS.md / SKILL.md 是否被**无意改动**（改 1 词 → 该块及之后全 miss，需一次重 prefill ~39s）
- [ ] 切换模型（9B ↔ 27B）后前缀缓存失效属正常，首次会重 prefill
- [ ] 不要把 CLI 输出塞进 system（会让 `preserve_mid_system_cache` 缓存变动内容、打乱边界）

---

## 8. 预期收益（量化）
- 静态前缀 8,632 tok，按 ~220 prefill tok/s **仅 prefill 一次 ≈ 39s**，之后跨请求/跨重启命中。
- 对比"每请求全量重 prefill 16k（实测 75.7s）"：后续每轮只需 prefill 你新说的几百 token（~1–2s）。
- 内存：前缀 KV 缓存一次后常驻，但 SSD 缓存机制下热点在内存、冷块落盘，配合 9B 的 11–17GB 峰值余量充足。
- 多轮对话：除前缀缓存外，进行中会话的 KV 也被 stateful 保留 → 第 2 轮起只 prefill 新增 user 内容。

---

## 9. 后续决策选项（等你拍板）
1. **保持现状**：OpenCode 默认把 AGENTS.md 作 system、Skill 按需注入 → 已能命中 AGENTS 前缀块，收益中等。
2. **采用策略 A（预载两 Skill 进 system 前缀）**：最大化命中，需确认 OpenCode 能把 Skill 放进 system 前缀。
3. **改 AGENTS.md 结构**：把"最稳定、最长命"的内容（架构宪法、路由入口）放最前，易变内容（v0.3 RFC 待拍板、路线图分支表）后置或外链，进一步稳定前缀、缩小易失效面。
4. **校验 OpenCode 行为**：确认其 system 提示无动态 token、Skill 注入位置符合前缀缓存要求。

---
*生成依据：本机 oMLX 日志/设置实测 + Qwen3.5 真分词器 token 计数 + chat_template.jinja 源码审阅。*
