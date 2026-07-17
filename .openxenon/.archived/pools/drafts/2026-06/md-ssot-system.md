# MD-SSOT 系统架构（路线 C v3.2）

> **日期**：2026-06-20（v3.2 = v3 + 4 风险协议 + v0.3 范围收窄）
> **状态**：路线 C v3.2
> - v1 = `.openxenon/forges/2026-06-18-md-as-canonical-rewrite-design.md`（路线 C v1）
> - v2 = 路线 C v2 早期设计（361 行，已被取代）
> - v3 = 路线 C v3 + Intent 边界澄清
> - **v3.2（当前）= v3 + 4 风险协议 + v0.3 范围收窄至 2 阶段**
> **定位**：v0.3 核心架构设计 —— **Intent 唯一 MD 化**（与 v2 重大差异）
> **基础**：v2（361 行）+ 2026-06-20 Intent 边界澄清 + 用户反馈 4 项 + 范围收窄
>
> **v0.3 范围（v3.2 锁定）**：
> - **阶段 1**：引入 unified + remark + mdast 接入 Kernel Schema（**核心**）
> - **阶段 2**：实现 Intent 5 类资产 .oxn ↔ .md 双轨制
> - **v0.4.0 再规划**（本文档**不进入 v0.3 实施范围**）：
>   - [`naming-system.md`](./naming-system.md) 命名规范 CI 校验
>   - [`process-version-iteration-flow.md`](./process-version-iteration-flow.md) 5 scripts + CHANGELOG 自动化

---

## 0. 摘要

v2 描述"全栈 MD 化"——但这一目标混淆了 **Intent（OpenXenon 内部 SSOT）** 与 **外部文档（项目自有）** 的本质边界。**v3 重新定义**：

> **MD-SSOT 不是"所有文档 MD 化"，而是"Intent 唯一 MD 化"**。
>
> Intent（domain/blueprint/work/task/proof）是 OpenXenon 内部 SSOT，强制 MD + mdast 解析 + 5 类 E_MD_xxx 强结构校验。
>
> 外部文档（forges/ + pools/{research,issue,design/process-*}）保持原状，Intent MD 通过 URL/相对路径外链引用。

**v3.2 关键变化**（v3 基础上 + 范围收窄）：

| 维度 | v2 | v3 | **v3.2（当前）** |
|---|---|---|---|
| 核心命题 | 全栈 MD 化 | Intent 唯一 MD 化 | Intent 唯一 MD 化 |
| mdast 范围 | 所有 IAP + pools/ | 仅 Intent 5 类 | 仅 Intent 5 类 |
| 5 E_MD_xxx | 全部文档 | 仅 Intent | 仅 Intent |
| forges/ | 物理删除 | 永久保留 | 永久保留 |
| 路线图 | 6 阶段 ~18 周 | 5 阶段 ~10 周 | **2 阶段（unified + dual-track）** |
| 阶段 1 | mdast 解析器 | mdast 解析器 | **unified 接入 Kernel Schema**（核心）|
| 阶段 2 | 14 probe MD 化 | Intent 5 类 OXL↔MD 双轨 | **Intent 5 类 .oxn ↔ .md 双轨制**（核心）|
| 阶段 3-6 | forges/ 迁移 + scripts + 物理删除 | forges/ 分类 + 3 scripts | **取消**（推迟 v0.4.0）|
| naming-system 实施 | 5 scripts 之一 | 阶段 4 实施 | **推迟 v0.4.0**（仅保留文档）|
| version-iteration 实施 | 5 scripts 之一 | 阶段 4 实施 | **推迟 v0.4.0**（仅保留文档）|

---

## 1. 核心理念

### 1.1 Intent vs 文档——本质边界

| 范畴 | 角色 | SSOT 归属 | MD 化要求 |
|---|---|---|---|
| **Intent**（domain/blueprint/work/task/proof）| **OpenXenon 内部** | **OpenXenon SSOT** | **强制 MD + mdast + 5 E_MD_xxx** |
| **文档**（forges/ + pools/{research,issue,design/process-*}）| **OpenXenon 外部** | 各项目自有 | **保持原状** |

**为什么需要这个边界**：

- **SSOT 唯一性**：如果 MD-SSOT 包括所有文档，那么外部项目文档的变更会污染 SSOT——失去 SSOT 价值
- **责任分离**：OpenXenon 控制 Intent；外部项目控制自己的文档——各自维护
- **可演化性**：外部项目用各自格式（README/ADR/Issue tracker/调研笔记），Intent 用 MD 统一

### 1.2 Intent MD 化（v0.3 核心）

**5 类 Intent 实体**全部走 MD + mdast 解析：

| 实体 | 路径 | 角色 |
|---|---|---|
| Domain | `domains/<Name>.md`（PascalCase）| 业务规则（DDD 风格）|
| Blueprint | `blueprints/<name>.md`（kebab-case）| 技术模式 |
| Work | `works/<work>/work.md` | 编排主文件 |
| **Task** | `works/<work>/tasks/<task>.md` | **任务子文件（v3 新增）** |
| Proof | `proofs/<proof>/verdict.md` | 验证产物（frozen）|

**mdast 解析器** `src/oxl/md-bridge/remark-to-kernel.ts`：

- 输入：以上 5 类 MD 文件
- 解析：unified + remark-parse + remark-directive
- 输出：Kernel Schema（Zod 验证后）
- 5 类 E_MD_xxx 错误：仅对 Intent 5 类生效

### 1.3 外部文档（保持原状）

| 类型 | 路径 | 角色 |
|---|---|---|
| 历史设计稿 | `forges/*.md` | 51 篇 v0.1.x 时代设计稿，**永久保留** |
| 调研材料 | `pools/research/*.md` | 外部库 / 竞品 / 技术调研 |
| 项目流程 | `pools/design/process-*.md` | 项目级流程（区别于 OpenXenon 内部流程）|
| 问题追踪 | `pools/issue/*.md` | 项目 bug / 风险评估 |
| Sprint 复盘 | `pools/audit/retro-*.md` | 历史 sprint 复盘（迁移自 forges/sprints/）|

**外部文档不进入 mdast 解析**；CI 跳过 heading 骨架校验；5 E_MD_xxx 不报错。

### 1.4 桥接——Intent 引用外部

Intent MD 可通过 URL/相对路径外链引用外部文档：

```markdown
# Domain: OrderContext

> 业务规则定义。详细业务背景参见 [业务需求文档](https://project.com/spec/order.md)。

## 业务规则
...
```

或相对路径：

```markdown
> 参见 [`pools/research/2026-07-payment-gateway.md`](../../pools/research/2026-07-payment-gateway.md)
```

**E_MD_REFERENCE_BROKEN** 错误：仅当 Intent MD 引用**不可达 URL/路径**时触发。

---

## 2. 4 条边界规则（Intent vs 外部判定）

| 规则 | Intent（SSOT）| 外部文档 |
|---|---|---|
| **所有者** | OpenXenon 内部决策 | 项目/外部输入 |
| **强结构** | 必须 heading 骨架 + 5 E_MD_xxx | 可选 |
| **版本绑定** | 强绑定 OpenXenon 版本（v<X.Y.Z>）| 不绑定或项目自有 |
| **更新触发** | 架构/版本变更时同步 | 外部输入时按需同步 |

**典型判定**：

| 文档 | 判定 | 理由 |
|---|---|---|
| `pools/design/arch-md-ssot-system.md` | Intent | OpenXenon 架构决策 |
| `pools/design/req-md-ssot-v0.3.0.md` | Intent | 阶段文档强绑定版本 |
| `pools/audit/audit-v0.2.0-md-ssot-readiness.md` | Intent | 版本收尾审计 |
| `pools/journal/2026-06-20-md-ssot-decision.md` | Intent | 内部决策日志 |
| `pools/research/2026-07-mdx-parser-research.md` | 外部 | 外部库调研 |
| `pools/issue/2026-08-bug-oxc-1234.md` | 外部 | 项目 bug 跟踪 |
| `pools/design/process-forges-deprecation-migration.md` | Intent | OpenXenon 内部流程 |
| `pools/design/process-pool-operation.md` | Intent | OpenXenon 内部流程 |
| `forges/2026-06-13-intent-pool-design.md` | 外部 | 历史设计参考 |
| `forges/2026-06-17-domain-as-ssot-...` | Intent | OpenXenon 决策（待迁移到 pools/）|
| `forges/sprints/sprint-N/*.md` | 外部 | Sprint 设计稿（已迁 pools/audit/）|

**判定流程**：

1. 是 OpenXenon 内部决策？→ Intent
2. 是项目/外部输入？→ 外部
3. 不确定？→ 默认外部（保守原则）

---

## 3. 3 层架构图

```
┌──────────────────────────────────────────────────┐
│  Layer 1 — Intent SSOT (OpenXenon 内部)          │ ← 全部 MD
│  ┌────────────────────────────────────────────┐  │
│  │  5 类 IAP 实体（mdast 解析范围）：          │  │
│  │    domains/<Name>.md                       │  │
│  │    blueprints/<name>.md                    │  │
│  │    works/<work>/work.md                    │  │
│  │    works/<work>/tasks/<task>.md   ← v3 新增│  │
│  │    proofs/<proof>/verdict.md               │  │
│  └────────────────────────────────────────────┘  │
│         │                                        │
│         │ Intent MD → 外链引用（URL/相对路径）   │
│         ▼                                        │
└──────────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────┐
│  Layer 2 — External Documents (各项目自有)       │ ← 保持原状
│  ┌────────────────────────────────────────────┐  │
│  │  • forges/  (51 篇 v0.1.x 设计稿)          │  │
│  │  • pools/research/  (外部调研)             │  │
│  │  • pools/issue/  (项目 bug)                │  │
│  │  • pools/design/process-*  (项目流程)      │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
                  ▲
                  │
┌──────────────────────────────────────────────────┐
│  Layer 3 — Bridge (OpenXenon 工具层)             │ ← mdast + CLI + CI
│  ┌────────────────────────────────────────────┐  │
│  │  • mdast 解析器（仅 Layer 1）              │  │
│  │  • 5 E_MD_xxx 错误校验（仅 Layer 1）       │  │
│  │  • CI 校验脚本（check-heading-skeleton）   │  │
│  │  • forges/ 分类（Intent 子集迁移到 pools/）│  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 4. mdast 解析器范围（v3 限定）

### 4.1 支持的 5 类 Intent 实体

| 实体 | 路径 | 解析目标 | 命名约定 |
|---|---|---|---|
| Domain | `domains/<Name>.md` | 业务规则 AST | PascalCase（DDD 风格）|
| Blueprint | `blueprints/<name>.md` | 技术模式 AST | kebab-case |
| Work | `works/<work>/work.md` | 编排结构 AST | kebab-case |
| **Task** | `works/<work>/tasks/<task>.md` | **任务子结构 AST** | **kebab-case（v3 新增）**|
| Proof | `proofs/<proof>/verdict.md` | frozen 验证 AST | kebab-case |

### 4.2 5 类 E_MD_xxx 错误（仅 Intent）

| 错误码 | 校验内容 | 触发场景 |
|---|---|---|
| E_MD_INVALID_SYNTAX | mdast 解析失败 | 语法错误 |
| E_MD_MISSING_REQUIRED | 必填字段缺失 | 缺少 `# Domain` 标题等 |
| E_MD_TYPE_MISMATCH | 字段类型不符 | `:::intent` 块参数错误 |
| E_MD_REFERENCE_BROKEN_FATAL | Intent MD → 内部 Intent 资产失效 | 内部 SSOT 引用断链（阻断 Proof）|
| E_MD_REFERENCE_BROKEN_WARN | Intent MD → 外部 URL/路径失效 | 外部文档引用断链（警告不阻断）|
| E_MD_HASH_MISMATCH | frozen.json hash 与 content 不一致 | 篡改检测 |

**外部文档不触发 E_MD_xxx**。

### 4.3 4 步流水线

```
[Intent MD text]
    │ 1. 结构校验（5 类 E_MD_xxx，仅 Intent）
    ▼
[mdast (mdast-util-from-markdown)]
    │ 2. 容器指令识别（remark-directive）
    ▼
[mdast with `:::` directive nodes]
    │ 3. remark-to-kernel 插件
    ▼
[Kernel Schema (Zod 验证后)]
    │ 4. IAP 引擎消费
    ▼
[Proof → Verdict → frozen]
```

---

## 5. 当前 `.openxen/` 目录结构（v3 视角）

```
.openxenon/
├── config.json                   # 项目配置（gitignored）
├── domains/                      # Intent SSOT: Domain MD
├── blueprints/                   # Intent SSOT: Blueprint MD
├── works/                        # Intent SSOT: Work + Task MD
│   └── <work>/
│       ├── work.md               # Intent SSOT
│       ├── tasks/<task>.md       # Intent SSOT（v3 新增 mdast 范围）
│       └── state.json            # 8 阶段状态机
├── proofs/                       # Intent SSOT: Proof MD（frozen）
│   └── <proof>/
│       ├── verdict.md            # Intent SSOT
│       └── verdict.json          # frozen（0o444 不可变）
├── pools/                        # Pool（外部参考池 + 部分 Intent）
│   ├── research/                 # 外部：调研
│   ├── design/                   # 混合：arch-* (Intent) + process-* (外部)
│   ├── issue/                    # 外部：bug 跟踪
│   ├── audit/                    # Intent：准备度审计
│   └── journal/                  # Intent：决策日志
├── forges/                       # 外部：51 篇 v0.1.x 设计稿（永久保留）
└── issues/                       # 外部：项目 issue 跟踪
```

**关键不变量**：

1. `proofs/<proof>/verdict.json` 写入后立即 `chmod 0o444`（frozen）
2. `forges/` 永久保留为外部源（不计划物理删除）
3. `works/<work>/tasks/<task>.md` 是 Intent SSOT（v3 新增 mdast 范围）

---

## 6. 与 L0–L3 架构的兼容性

参见 [`l0-l3-alignment.md`](./l0-l3-alignment.md)

**v3 关键变化**：

- L0-Processor 14 builtin probe：需写 adapter（仅 5 类 Intent MD 入口）
- L1-OXL：新增 `src/oxl/md-bridge/remark-to-kernel.ts`
  - 输入：5 类 Intent MD
  - 解析：unified + remark-parse + remark-directive
  - 输出：Kernel Schema
- L2-Builtin：14 builtin probe 模板迁移（5 → 14 渐进）
- L3-CLI：CLI 改 detect 5 类 Intent MD（不是全部 MD）

---

## 7. v0.3 路线图（v3 简化版）

| 阶段 | 周次 | 内容 | 关键交付 |
|---|---|---|---|
| **0** | W0 | 路线 C v3 + 边界澄清 | `md-ssot-system.md` v3 + 6 篇文档重写 |
| **1** | W1-3 | mdast 解析器（仅 Intent 5 类）| `src/oxl/md-bridge/remark-to-kernel.ts` + B1-B3 代码 |
| **2** | W4-5 | Intent 5 类 OXL↔MD 双轨期 | adapter + 5 case 集成测试 |
| **3** | W6-7 | forges/ 51 文档分类 | Intent 子集迁移到 pools/，外部保留 forges/ |
| **4** | W8-10 | scripts 简化（3 个）| `version-aggregate` + `check-naming` + `parse-mdast` |

**总计**：~10 周（v2 是 ~18 周，**简化 44%**）

**取消**：
- ~~v0.3 阶段 5：forges/ 物理删除~~（**废除**）
- ~~v0.3 阶段 6：`oxn-md` CLI 完整化~~（**推迟 v0.4**）

---

## 8. 与 v0.2.0 边界

| 维度 | v0.2.0 | v0.3 v3 |
|---|---|---|
| Intent 实体格式 | .oxn（Langium DSL）| **.md**（Intent 5 类）+ .oxn（双轨期）|
| 外部文档 | forges/（gitignored）| forges/ 保留为外部源 + pools/ 部分 |
| mdast 范围 | 不涉及 | **仅 Intent 5 类**（含 v3 新增 task.md）|
| 5 E_MD_xxx | 不涉及 | **仅 Intent** |
| forges/ 未来 | T13 计划废弃 | **永久保留**（外部源）|
| v0.3 路线图 | 6 阶段 ~18 周 | **5 阶段 ~10 周** |

**保持**：
- 5 类 IAP 资产 create CLI（v0.2.0 已实施）
- L0–L3 架构护身咒
- 14 builtin probe 渐进替换
- `:::intent` 容器指令

---

## 9. 关键不变量（v3 修订）

1. **Intent = OpenXenon SSOT**——Intent 5 类实体是 OpenXenon 内部唯一权威
2. **Intent 唯一 MD 化**——Intent 全部走 MD + mdast + 5 E_MD_xxx
3. **外部文档保持原状**——forges/ + pools/{research,issue,design/process-*} 不进入 mdast
4. **保留当前 `.openxenon/` 目录结构**——`domains/blueprints/works/proofs/pools/`
5. **pools/ = 5 池外部参考池**（部分含 Intent）——research/design/issue/audit/journal
6. **proofs/ frozen**——一旦写入不可变（chmod 0o444 + contentHash）
7. **强约束保护保留**——5 类 E_MD_xxx + `:::intent` 容器指令（仅 Intent）
8. **AI + 人类双消费**——Intent MD 是共同语言
9. **双轨期过渡**——Intent 5 类 .oxn + .md 并存（**`.md` = 唯一写入入口**，`.oxn` 自动编译生成，**禁止反向修改**）
10. **forges/ 永久保留**——不物理删除（外部源）；内部判定为 Intent 的子集需迁 pools/ 后才进入 mdast 解析

---

## 10. CLI 状态清单（v0.2.0 源码 + v0.3 增强）

5 类 Intent 资产全部有 `create` CLI（v0.2.0 实施，v0.3 增强 MD 入口）：

| 资产 | CLI | v0.2.0 | v0.3 增强 |
|---|---|---|---|
| Domain | `oxn domain create` | ✅ 实施 | + MD 入口 |
| Blueprint | `oxn blueprint create` | ✅ 实施 | + MD 入口 |
| Work | `oxn work create` | ✅ 实施 | + MD 入口 |
| **Task** | `oxn work task create` | ✅ 实施 | **+ MD 入口（v3 新增）** |
| Proof | `oxn proof create` | ✅ 实施 | + MD 入口 |
| Pool | `oxn pool create` | ✅ 实施 | 不变（外部参考）|

**注意**：
- v0.2.0 源码已实现所有 6 类 `create` CLI
- v0.2.0 未发布到 npm；调用本地：`bun src/cli/index.ts <command>`
- v0.3 增强：CLI 改 detect 5 类 Intent MD

---

## 11. 风险、回退与关键协议

### 11.1 风险表

| 风险 | 缓解 | 回退 |
|---|---|---|
| mdast 解析器在 L1-OXL 与 L0-Processor 边界冲突 | B1-B3 纯加法，默认 false | 保留 .oxn 双轨 |
| 5 E_MD_xxx 误用（外部文档也校验）| 限定为 Intent 5 类 | CI 加白名单 |
| forges/ 不删除导致目录冗余 | 51 篇中判定为 Intent 的子集迁移 | 永久保留 forges/ |
| 双轨期复杂度（.oxn + .md）| adapter 模式 | 阶段 5 强制收敛 .md |

### 11.2 双轨期冲突解决协议（v3 关键约束）

**双轨期定义**（v0.3 阶段 2）：Intent 5 类资产同时存在 `.oxn`（v0.2.0 格式）和 `.md`（v0.3 格式）两份。

**真值来源**（v3 锁定）：

> **`.md` = 唯一写入入口**。`.oxn` 由 `.md` 自动编译生成，**禁止反向修改**。

**冲突检测**：

```
1. 计算 .md 的 contentHash（H_md）
2. 读取 .oxn 中存储的 sourceHash（H_oxn）
3. 若 H_md ≠ H_oxn：
   a. 重新编译 .md → .oxn
   b. 更新 H_oxn
   c. 触发审计日志（meta: regenerated-from-md）
4. 若 H_md = H_oxn：
   a. 正常加载 .oxn
```

**强制约束**：

- ❌ 禁止 `oxn <asset> edit` 直接修改 `.oxn`（CLI 拒绝）
- ❌ 禁止手工编辑 `.oxn`（pre-commit hook 检测）
- ✅ 唯一合法路径：编辑 `.md` → 触发 `oxn <asset> sync` 重新编译

**hash mismatch 错误码**：`E_MD_HASH_MISMATCH`（已含在 5 E_MD_xxx 中）触发时**强制阻断** Proof（不降级）。

### 11.3 E_MD_REFERENCE_BROKEN 严重级别分级

v2 一刀切（任何失效都 Fatal）导致脆弱性。v3 引入 2 级：

| 级别 | 触发条件 | 行为 | 适用 |
|---|---|---|---|
| **Warning** | Intent MD → 外部 URL/相对路径失效 | 记录警告，**不阻断** Proof；CLI 显示 ⚠️ | 外部项目文档（不受 OpenXenon 控制）|
| **Fatal** | Intent MD → 内部 Intent 资产失效（domain/blueprint/work/task/proof）| 阻断 Proof；exit 1 | 内部 SSOT 引用（必须强一致）|

**判定规则**：

```typescript
if (引用目标.startsWith('.openxenon/')) {
  // 内部 Intent 引用
  severity = 'Fatal'
} else {
  // 外部文档引用
  severity = 'Warning'
}
```

**错误码扩展**：

- `E_MD_REFERENCE_BROKEN_FATAL` — 内部引用失效（exit 1）
- `E_MD_REFERENCE_BROKEN_WARN` — 外部引用失效（exit 0 + 警告）

### 11.4 Task 解析性能（contentHash 缓存）

**问题**：大型 Work 含 50+ Task 时，每次 Proof 全量 mdast 解析开销大。

**v3 方案**：基于 contentHash 的解析结果缓存。

```typescript
interface CachedParse {
  path: string                  // .md 路径
  contentHash: string           // SHA-256 of .md
  mdastHash: string             // SHA-256 of mdast JSON
  parsedAt: number              // timestamp
  mdast: MdastNode              // 缓存的 AST
}

// 缓存位置: .openxenon/.cache/mdast/<hash>.json (chmod 0o444, gitignored)
```

**缓存命中逻辑**：

```
1. 读 .md → 计算 H_md
2. 查缓存：缓存[H_md] 存在？
   ├─ 是：直接返回 mdast
   └─ 否：解析 → 写缓存 → 返回 mdast
```

**缓存失效**：

- `.md` 内容变化（contentHash 变化）→ 自动失效
- `:::intent` 容器指令语法升级 → 缓存版本号 +1（手动失效）
- 缓存文件 7 天 TTL（v0.3 阶段 4 实施）

**性能估算**（典型 50 Task Work）：

| 操作 | 无缓存 | 有缓存 |
|---|---|---|
| 全量解析 | ~2.5s | ~50ms（命中） |
| 增量解析（1 Task 变化）| ~2.5s | ~70ms（49 命中 + 1 新解析）|
| 内存峰值 | ~150MB | ~5MB（增量）|

### 11.5 forges/ 内部判定与外部源定位的过渡态澄清

**冲突**：
- §1.3：forges/ = 外部源
- §2 典型判定：`forges/2026-06-17-domain-as-ssot-...` = Intent

**v3 澄清**（过渡态规则）：

| 阶段 | forges/ 内容判定 | mdast 解析 | E_MD_xxx 校验 |
|---|---|---|---|
| **当前（v0.2.0 → v0.3 阶段 0-2）** | 物理上是外部源（gitignored）| ❌ 不解析 | ❌ 不校验 |
| **阶段 3（W6-7）迁移后** | 判定为 Intent 的子集 → 迁 `pools/{design/arch,journal}/` | ✅ 进入解析范围 | ✅ 校验 |
| **阶段 3 后 forges/ 残留** | 判定为外部的子集保留 forges/ | ❌ 永久不解析 | ❌ 永久不校验 |

**forges/ 内部判定**（v3 锁定）：

> **forges/ 目录在物理上是外部源；其内容若属于 OpenXenon 内部决策，需在 v0.3 阶段 3 迁移至 `pools/{design/arch,journal}/` 后，才正式成为 Intent 资产并进入 mdast 解析范围。在 forges/ 内部时，永久不触发 E_MD_xxx 校验。**

**判定流程**（forges/ 内部文档）：

1. 文档属于 OpenXenon 内部决策？
   - **是** → 列入迁移候选清单（阶段 3 批量迁至 pools/）
   - **否** → 永久保留 forges/，不进入 Intent
2. 迁移后文档继承 Intent 全部约束（mdast + 5 E_MD_xxx + hash 缓存）

---

## 12. 下一步

- [ ] A2: 简化 `v0.3.0-roadmap.md`（v3 5 阶段）
- [ ] A3: 改写 `process-forges-deprecation-migration.md`（"分类迁移"）
- [ ] A4: 更新 `pool-roadmap.md`（5 池定位为外部参考池）
- [ ] A5: 精简 `naming-system.md`（Intent vs 外部标注）
- [ ] A6: 新建 `intent-ssot-boundary.md`（边界权威定义）
- [ ] B1: `pool-writer.ts` 加 `intent?` 字段
- [ ] B2: `hall/scanIntentPools` 加 `intent: boolean`
- [ ] B3: `pool-create.ts` 加 `--intent` flag

---

## 关联文档

- [`v0.3.0-roadmap.md`](./v0.3.0-roadmap.md) — 简化版路线图（A2）
- [`naming-system.md`](./naming-system.md) — 命名规范 v1.0
- [`process-version-iteration-flow.md`](./process-version-iteration-flow.md) — 版本迭代流
- [`process-forges-deprecation-migration.md`](./process-forges-deprecation-migration.md) — forges/ 分类迁移
- [`l0-l3-alignment.md`](./l0-l3-alignment.md) — L0–L3 兼容性
- [`pool-roadmap.md`](../pool-roadmap.md) — Pool 导航

---

**关联 forges/ 基线**：
- v1 = `.openxenon/forges/2026-06-18-md-as-canonical-rewrite-design.md`（路线 C v1）
- v2 = 本文档早期版本（路线 C v2，已被 v3 取代）
- v3 = 本文档（路线 C v3，**当前权威**）
