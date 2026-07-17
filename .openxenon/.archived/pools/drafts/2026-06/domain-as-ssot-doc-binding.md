# Domain 作为 SSOT + 文档绑定 + Skills 重构：三轮讨论合并分析

> 分析日期：2026-06-17
> 状态：已完成（首轮决策稿）
> 来源：与两位 AI 协作者的三轮讨论 + 本地源码事实核对
> 范围：v0.3 路线图前置设计（前置债：T11 Zod 同步 + T12 CLI 接通 + `language-ban-checker` probe 落地）

---

## 0. 背景

围绕"OpenXenon 的 Domain 能否作为文档体系的 SSOT 支撑"以及"Skills 是否应与 IAP 三轴对齐"两个问题，与两位 AI 协作者各作了一轮讨论，并自行做了合并稿。本文是这次合并的**独立分析**：在两轮 AI 答复的基础上，**补充源码事实核对**，明确合并点、差异点、未决问题，并给出推荐的实施切片。

---

## 1. What：三轮讨论的命题

### 1.1 命题 A — Domain 作为 SSOT

> Domain（`.openxenon/domains/<X>.oxn`）是否足以承担"业务规则的 SSOT 守卫者"职责？文档（技术选型、需求分析、修复报告、性能分析）如何与 Domain 结合？

**AI-A 的回答**：把 Domain 升级为"业务规则的 SSOT 守卫者"，文档 = Domain 的 `term` 实例化产物，缺失 Domain 时作为新 Work 补充；提出 `oxn-intent` skill 统一管理 domain/blueprint/文档。

**AI-B 的回答**：Domain 已是雏形，需工程化强化（版本、可发现性、链接机制）；文档与 Domain 是"使用场景"与"知识背景"的双向链接。

**本稿立场**：两位都看到了方向，但都**漏了关键的源码事实债**——Domain 的 `script=/manual=/scope=` 语法与 Zod schema 不同步、frozen.json 没有 `domain` 字段、没有任何 builtin probe 消费 domain.invariant。

### 1.2 命题 B — Skills 与 IAP 三轴对齐

> 是否应将 `oxn-work` 改名为 `oxn-align`、新增 `oxn-intent` 收口 Intent 轴管理？

**AI-A 的回答**：强烈主张。理由是给 AI 清晰的"阶段感"，杜绝无序试错。

**本稿立场**：**赞成 `oxn-intent` 作为"AI 视角的 Intent 资产导航"，反对 `oxn-work` 改名**——理由见 §5.2。

### 1.3 命题 C — OXL 关联文档

> OXL 是否应支持"绑定文档 + 锚点"机制？边界在哪？

**AI-B 的回答**：提出 3 大价值（终结上下文漂移 / 文档形式化静态检查 / 业务意图溯源）+ 3 道边界（关联粒度 = 资产槽位；OXL 只做约束不做版本；文档描述 Why、OXL 断言 What）。

**本稿立场**：**完全认同 AI-B 的边界三原则**——尤其是"OXL 不生产文档、不解析文档"这一条。具体语法加在哪里，见 §4。

---

## 2. Why：源码事实核对（关键债清单）

下文所有 `file:line` 均经本地仓库核对。

### 2.1 语法层与 IR 层不同步（T11 留下的暗债）

- `src/oxl/langium/oxn.langium:202-207` 已加 `InvariantDecl: value=STRING | script=STRING | manual=STRING | scope=STRING`
- `src/oxl/schemas/oxn-assembly.schema.ts:133-135` 的 `OxnInvariantDeclSchema` **仍只有 `value: string`**
- `src/infra/frozen/domain-proof-evaluator.ts:64` 跑 `spawn('sh', ['-c', script])` 永远等不到 `script` 字段（被 IR 映射静默丢弃）

**结论**：T11 的语法升级**没有真正生效**。任何"用 script 校验文档"的方案都跑不通，必须先补这层 Zod。

### 2.2 完全没有 doc 绑定机制

| 检查项 | 结果 |
|---|---|
| `grep -E 'bind_docs\|doc:\|\.md\|markdown' src/` 业务命中 | **0** |
| `DomainDeclaration` 字段 | 只有 `name/descriptions/terms/ban/invariants`（`oxn.langium:173-179`） |
| `OxnDomainIRSchema` 字段 | 只有 `name/description?/language?`（`oxn-assembly.schema.ts:146-150`） |
| `frozen.json` schema 字段 | 只有 `name/runAt/verdict/.../probes/_xenon_meta`（`proof-schema.ts:58-69`），**无 `domain`** |
| 17 个 builtin probe 消费 domain.invariant？ | **0 个** |
| `docs/*.md` frontmatter 标注 domain | **0 个**（抽样 `index.md`/`intent.md`/`align.md`/`cli.md`） |
| `DocContext.oxn` ↔ `docs/zh-cn/intent.md` 关联 | **纯软关联**——AI-B 提到的"term → doc 路径映射"在机器可读层不存在 |

**结论**：`DocContext.oxn` 与 `docs/zh-cn/intent.md` 之间的关联**完全是 AI 软关联**，没有机器可读的绑定。`docs/architecture/domain.md:60` 承诺的 `language-ban-checker` probe **不在 `src/builtin/probes/` 里**——这是个被承诺但未落地的能力。

### 2.3 `oxn work finalize` 还是 PoC 占位

`src/cli/work-finalize.ts:21-29` 显式抛 `IAPError: "Use finalizeWorkDomains() programmatically"`。T12 PR-2 的 domain-proof 评估代码**写好了但 CLI 没接通**。

### 2.4 invariant `script` 跑裸 sh，无沙箱

`domain-proof-evaluator.ts:64` 直接 `spawn('sh', ['-c', script])`。v0.2 T7 的 `FORBIDDEN_GLOBALS`/`sandboxValidate` **只对第三方 Probe Provider 生效**（`src/cli/probe-sandbox.ts:33-46`），**不覆盖 Domain invariant**。Domain 里写 `script = "rm -rf /"` 不会被拦——这是一个**安全债**。

---

## 3. How：合并点 vs 差异点

### 3.1 三轮**都认同**的（合并点）

1. Domain 必须升级为可执行 SSOT，不能只停留在文本 invariant
2. 文档必须关联到 Domain（frontmatter 标注 / 锚点 / 反向索引，三轮各执一词但方向一致）
3. 缺失 Domain 时应触发新 Work（这是闭环的关键）
4. Skills 应与 IAP 三轴对齐（`oxn-intent` 收口 Intent 轴）
5. **OXL 的边界是"资产映射"而非"文档解析"**（AI-B 的核心贡献）

### 3.2 三轮**互相矛盾或本稿反对的**（差异点）

| 议题 | AI-A 的说法 | AI-B 的说法 | 本稿判断 |
|---|---|---|---|
| **Domain 与 Blueprint 的关系** | 模糊 | 强调 OXL 边界 | **保持正交**（与 `docs/zh-cn/intent.md:19` 一致）——Domain 不引用 doc 路径会让"概念"和"实例"耦合 |
| **OXL 是否加 `bind_docs` 字段** | 未明确 | `bind_docs: { path, anchor }` | **不应该**。`bind_docs` 应归 Domain，OXL 不该长出"文档"概念 |
| **`oxn-intent` 是否新 Skill** | 强烈主张 | 未谈 | **赞成新增，但作为"AI 视角 Intent 资产导航"**，不复述 `oxn-cli` 的命令教学 |
| **`oxn-work` 是否改名 `oxn align`** | 主张改 | 未谈 | **反对**。Work 是数据对象，Align 是能力阶段，改名破坏 8 个 E2E + 30+ 工作文件 |
| **doc 关联粒度** | 全文 | Anchor/Slot | **AI-B 对**——否则 10 万字 PRD 撑爆 AI 上下文 |
| **版本管理** | 语义级由 Domain 自身负责 | OXL 不管，交给 Git | **AI-B 对**。Domain 当前无 `version` 字段，强加语义版本是过度设计 |
| **谁消费 doc 上下文** | 未谈 | `oxn-align` 阶段注入 | **应在 `oxn work context` 渲染时附带**——CLI 已有的 `oxn work context` 是自然注入点 |
| **缺失 Domain 的处理** | 触发新 Work | 审核流程 | **警告而非阻断**——避免 AI 早期写文档就被拦死 |

### 3.3 三轮都**漏掉**的关键问题

1. **doc→Domain 绑定的存储格式**：frontmatter YAML 解析要不要走 Langium？还是简单 regex？本稿建议独立小解析器（gray-matter 或自写 30 行），不进 OXL grammar。
2. **doc 自身怎么校验**：三轮都假设"AI 写完用 invariant 校验"，但 §2.1 + §2.4 证明 `script` 跑不了。必须前置债还清。
3. **"什么算 SSOT 文档"**：`docs/` 根平铺是 SSOT，`docs_tmp/` 与 `docs-bak-2026-06/` 是工作副本。doc-binding 方案必须能区分三者。
4. **skill 物理层债**：`src/cli/install-skill.ts:27-31` 的 `EMBEDDED_SKILLS` 没注册 `oxn-intent`，新建 skill 不会进 Bun 编译产物。

---

## 4. 推荐的最小可行改动

按依赖顺序排列，**前置债不还清则后续步骤跑不动**。

### 4.1 前置债（必须先做）

1. **T11 Zod 同步**：把 `script=/manual=/scope=` 加到 `OxnInvariantDeclSchema`（`oxn-assembly.schema.ts:133-135`）—— 1 行 Zod
2. **T12 CLI 接通**：`src/cli/work-finalize.ts:21-29` 删 throw，接 `finalizeWorkDomains()` —— 30 行 CLI
3. **Domain invariant script 加沙箱**：复用 T7 的 `FORBIDDEN_GLOBALS`/`sandboxValidate` 拦截（`probe-sandbox.ts:33-46`）—— 50 行

### 4.2 doc-binding 语法加在 Domain（不在 OXL）

```
// .openxenon/domains/DocContext.oxn  (v0.3)
domain "DocContext" {
  description = "..."
  docs = [                    // ← 新增字段 (v0.3 提案)
    "docs/zh-cn/intent.md#intent",
    "docs/zh-cn/align.md#work-task-part",
    "docs/zh-cn/cli.md#oxn-domain",
  ]
  term { ... }
  ban { ... }
  invariant { ... }
}
```

具体改动：

1. **OXL grammar**：`oxn.langium:178` 后加 `(docs=DocBlock)?`，新增 `DocBlock: 'docs' '{' (docPaths+=STRING)* '}'`
2. **`bun run langium:generate`**：重新生成 `src/oxl/generated/`
3. **`OxnDomainIRSchema`** 加 `docs: z.array(z.string()).default([])`（`oxn-assembly.schema.ts:146-150`）
4. **`domainAstToIr()`** 提取 `docs` 字段（`domain.ts:311-334`）
5. **`oxn work context` 渲染时附带 docs 路径清单**（`src/cli/work.ts`），让 AI 自取而非塞全文
6. **frontmatter 解析**：最小实现，30 行自写或引 `gray-matter` 依赖

### 4.3 `oxn-intent` skill 新增

- **物理路径**：`src/skills/locales/{zh-CN,en}/oxn-intent/instruction.md`（L3-CLI，`src/skills/` 目录下）
- **职责定位**：**只做"AI 视角的 Intent 资产导航"**，不复述 `oxn-cli` 的命令教学
  - "我要修 bug → 找哪个 Domain → 读哪些 Blueprint → 看哪段 doc"
  - 不教 `oxn domain create` 怎么用（那是 `oxn-cli` 的事）
- **嵌入 Bun 产物**：`src/cli/install-skill.ts:27-31` 的 `EMBEDDED_SKILLS` 加 `'oxn-intent'`

### 4.4 不做的事

- **不改** `oxn-work` 名为 `oxn-align`（破坏 8 个 E2E + 30+ 工作文件 + 所有 sprint 文档）
- **不**让 doc 校验失败阻塞 `oxn work submit`（否则 50 个 work 全因 doc 引用问题卡住）
- **不**为 doc 关联建 Langium 解析器（过度设计）
- **不**给 Domain 加语义版本（当前无此概念）

---

## 5. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 前置债（T11/T12/沙箱）未清就动 doc-binding | 新语法跑不通、留下暗债 | 严格按 §4.1 → §4.2 顺序；§4.2 第 1 步即 `bun run typecheck` 必须绿 |
| `oxn-intent` 与 `oxn-cli` 职责重叠 | AI 不知道用哪个 | §4.3 明确定位：oxn-intent 只做"导航"，命令教学归 oxn-cli |
| Domain `docs = [STRING...]` 写死路径 | doc 改名/移动时 Domain 失效 | 软关联：仅 `oxn work context` 渲染时 warning，不阻断 submit |
| doc 引用未存在的 Domain | 闭环断裂 | `oxn domain validate` 时 warning 列表，由人/AI 决定开新 Work |
| `docs_tmp/` 与 `docs-bak-2026-06/` 被误绑定 | 错误 SSOT 关联 | 在 doc-binding 解析层做白名单：只接受 `docs/<locale>/*.md` 路径前缀 |

---

## 6. 未决问题（待 v0.2 完结后决策）

- [ ] Q1：Domain 升级 `docs` 字段时，是否同时升级 `oxn-work` 的引用语法（如 `domain "X" ref "..."` 加 `doc "Y" ref "..."`）？
- [ ] Q2：doc 校验失败时，**警告**还是**阻断**？目前推荐警告，待 v0.3 观察 AI 实际漂移率再决定
- [ ] Q3：缺失 Domain 时，**同步**还是**异步**触发新 Work？目前推荐 warning 列表
- [ ] Q4：`language-ban-checker` probe 是落地 builtin 还是仅文档承诺？目前源码中没有，应在 v0.3 一并补齐
- [ ] Q5：doc 关联是否需要版本号锚定（如 `docs/zh-cn/intent.md@v1.2#intent`）？目前不需要，git log 即可追溯

---

## 7. 结论

三位协作者（AI-A、AI-B、本稿）共同点：**Domain 必须升级为可执行 SSOT、文档必须机器可读地绑定 Domain、Skills 应与 IAP 三轴对齐**。本稿与 AI-A 的关键分歧在**改名激进程度**（反对 `oxn-work` 改名），与 AI-B 的关键共识在**OXL 边界三原则**。源码事实核对揭示了**两笔前置债**（T11 Zod 同步 + T12 CLI 接通），不还清则任何"doc-binding"方案都是空中楼阁。

最小可执行路径见 §4：3 笔前置债 → 6 步 doc-binding 改动 → 1 个新 skill。新增 `oxn-intent` 不动 `oxn-work` 名字，Domain 加 `docs = [STRING...]` 不动 OXL 边界，doc 校验走 warning 不阻塞 submit。
