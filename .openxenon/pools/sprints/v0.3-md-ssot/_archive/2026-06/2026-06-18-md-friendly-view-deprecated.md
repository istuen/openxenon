# MD as Friendly View of OXL Canonical — spike/md-as-canonical 设计稿 [DEPRECATED 2026-06-18]

> **状态**：**DEPRECATED 2026-06-18** ——路线 C 全栈重写（unified 替代 Langium）已被采纳为终局方向，本设计稿（路线 A）已被取代。保留为历史参考，不作为实施依据。
> **替代设计**：[`2026-06-18-md-as-canonical-rewrite-design.md`](./2026-06-18-md-as-canonical-rewrite-design.md)（路线 C 远期愿景）
>
> ---
>
> **历史信息（保留）**：
>
> - **日期**：2026-06-18
> - **状态**：spike 设计稿（待 spike commit 1 落地验证）
> - **前置（必读）**：[`2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md`](./2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md)
> - **范围**：v0.3 路线图前置设计（独立 spike，不入 v0.2 main）
> - **本稿价值**：在 2026-06-17 已确立的"Domain 作为 SSOT"基础上，**新增"MD 作为 OXL 友好写作入口"维度**——两份设计互补，不重叠。

---

## 0. 元信息

- **作者**：opencode（基于 `docs_tmp/domain-md-1.md` 三轮 AI 讨论 + 用户三轮决策）
- **目标读者**：架构师 + OXN 维护者
- **本稿与 2026-06-17 的边界**：
  - 2026-06-17 解决的是"**Domain 与文档如何关联**"（`docs = [STRING...]` 字段）
  - 本稿解决的是"**Domain 自身能否用 MD 写作**"（`.md` → `.oxn` 预处理器）
  - 二者正交，可独立落地；本稿 graduate 时需兼容 2026-06-17 的 `docs` 字段
- **关键决策（已与用户确认）**：
  - OXL 是 canonical，MD 是 friendly view
  - 解析器走预处理（MD → 虚拟 OXL 文本 → 现有 Langium）
  - 错误定位走 4 步流水线 + offset 反向回填
  - 错误粒度开放扩展；collect-all 限上限（默认 20）
  - frontmatter spike 阶段不支持
  - 不入 main，spike 阶段先验证 D1–D5
- **影响路径**：
  - 新建：`spike/md-as-canonical/`（不入 main）
  - 暂不改：`src/oxl/langium/oxn.langium`（D4 红线）
  - 暂不改：`src/oxl/validators/*.ts`（graduate 阶段再统一 PR）
  - 暂不改：`.openxenon/domains/*.oxn`（现有 14 个资产零迁移）

---

## 1. What：命题与三轮决策

### 1.1 命题

> OpenXenon 的 Domain 当前以 `.oxn` 文本作为 canonical 表达。但 `.oxn` 是工程师/AI 友好的"强结构"语言，对普通 PM 存在认知壁垒。**能否让 PM 用 Markdown 写 Domain，再由 CLI 编译为 `.oxn`？**

### 1.2 三轮 AI 讨论要点（`docs_tmp/domain-md-1.md`）

| 轮次 | 议题 | 结论 |
|---|---|---|
| 1 | DDD 业务词汇如何设计 | Ubiquitous Language + Bounded Context（DDD 经典） |
| 2 | DDD 是否为 SSOT | 是，但"有边界的 SSOT"——OXL 即 DDD 的 SSOT 实例 |
| 3 | DDD 是树形还是 DAG | 战略层 DAG；战术层（聚合内部）树形 |
| 4 | OXL 现有 Domain 缺什么 | 缺 ContextMap（战略）+ 缺树形战术结构 |
| 5 | 是否引入类型系统 | **不引入**（避免 OXL 退化为编程语言） |
| 6 | 是否引入 `desc` 描述 | **引入**（给 AI 喂业务语义） |
| 7 | 是否用 MD 作为底层格式 | **是**（人类熟悉 + AI 友好 + Langium 加硬结构） |
| 8 | Langium 能直接解析 MD 吗 | **不能**（Chevrotain 假设强分隔符） |
| 9 | 方案 A（Custom Lexer）vs B（预处理） | 选 B（工作量低 + 现有 grammar 零修改） |
| 10 | 代码示例 | 已给；本稿在 §4 给出最终版契约 |

### 1.3 三轮决策的"硬结构"盲点（AI 没解决的）

| 盲点 | 影响 | 本稿处理 |
|---|---|---|
| 方案 A 虚拟 token `startLine: 1` 错位坑 | LSP 跳转 + 错误信息全废 | 选 B；本稿明确 offset 回填方案 |
| MD 结构校验缺失 | 5 类结构错（孤立 H2 等）会翻译成畸形 OXL | D2 给出 5 类 + 扩展协议 |
| 现有 grammar 是扁平 term 列表，MD 示例是树形 | grammar 真改会破坏 14 现有资产 | 形态 A：dot-path + `@tag` 前缀，grammar 零改 |
| 讨论未指明与 2026-06-17 的关系 | 可能与 `docs = [STRING...]` 字段冲突 | §2 明确两稿正交 |
| `script=/manual=/scope=` 跑不了（T11 暗债） | invariant 求值是空头支票 | spike 不涉及求值；求值问题归 Kernel |

---

## 2. 与 2026-06-17 的正交关系

| 维度 | 2026-06-17 | 本稿 |
|---|---|---|
| **关注点** | Domain 如何**关联**外部文档 | Domain 自身如何**被写作** |
| **OXL 改动** | `oxn.langium:178` 后加 `(docs=DocBlock)?` | **零改动**（D4 红线） |
| **CLI 改动** | `oxn work context` 渲染时附带 docs 路径 | 新增 `oxn domain --md` 入口（graduate 时） |
| **存储格式** | `.oxn` + `docs/zh-cn/*.md` | `.oxn`（canonical）+ `.md`（friendly view） |
| **关系** | Domain 引用 doc | `.md` 编译为 `.oxn`（`.md` 不入库；可选） |
| **优先级** | v0.3 路线（前置债：T11/T12/沙箱） | spike 验证后 v0.3 末尾或 v0.4 |

**关键非冲突点**：2026-06-17 的 `docs = [STRING...]` 字段解决"**业务规则依赖哪些长文档**"（如合规说明、PRD 流程）；本稿解决"**业务规则自身的初稿用什么写**"（如 PM 在 Notion 习惯写 MD）。两个字段可以共存——Domain 可以既包含 `docs = [STRING...]`（引用长文档），又是从 MD 编译来的（友好写作）。

**graduate 时的合并点**：CLI 同时支持 `.oxn` 与 `.md` 两种 Domain 入口。MD 入口编译出的 `.oxn` 必须包含 `docs` 字段（与 2026-06-17 兼容）。

---

## 3. Why：源码事实核对

下文所有 `file:line` 均经本地仓库核对。

### 3.1 现有 OXL grammar 是扁平 term（与 MD 树形示例不匹配）

- `src/oxl/langium/oxn.langium:181-187` 定义 `TermBlock: 'term' '{' (terms+=TermDecl)* '}'` —— **扁平列表**
- `TermDecl: name=STRING ':' desc=STRING ';'?` —— 一维 key-value
- 14 个现有 `.oxn` 资产（`.openxenon/domains/*.oxn`）全部按扁平 term 写

**结论**：MD 的 `## @aggregate > ### @entity` 树形结构**不能直接翻译**为 OXL grammar。本稿形态 A 用 dot-path（`@aggregate Order` + `Order.items.price`）保留扁平结构，对 Kernel 友好（`src/kernel/verdicts/` 可扫描 `@tag` 拿到 role）。

### 3.2 形态 A 的"前缀注入"零 grammar 修改

- `TermDecl.name` 是 `STRING`（`oxn.langium:305-306`）
- STRING 内部可以包含任意字符包括 `@` 与 `.`
- Kernel 解析时按 `^@(\w+)\s+(.+)$` 拆分得到 `{ role, path }`
- **14 现有资产中无前缀的 term 全部合法**（`role: undefined`，向下兼容）

**结论**：形态 A 是纯扩展，零破坏。这条路径 D3（现有兼容）天然通过。

### 3.3 现有 12+ builtin probe 不消费 domain.invariant 求值

- `src/builtin/probes/` 14 个 probe 全部走 IO 路径（fs/http/shell/git）
- 没有任何 probe 把 domain.invariant 当求值器
- 2026-06-17 §2.4 指出：`domain-proof-evaluator.ts:64` 直接 `spawn('sh', ['-c', script])` 跑裸 sh，无沙箱

**结论**：本稿不涉及 invariant 求值。求值器是 Kernel 问题，spike 只验证"MD 能被忠实翻译为 OXL 文本"。D2/D3/D4 通过后，invariant 内容语义由现有 Langium + 后续 Kernel 求值器接管。

### 3.4 现有 forges/ 设计文档形成完整样本

- 2026-06-17 给出"Domain 与文档关联"的完整设计
- 2026-06-13 给出 Intent Pool v3 设计（forges/ 升级为 .pools/）
- 本稿填补第三块：**"Domain 文件本身用 MD 写"**

**结论**：三份设计构成 OpenXenon 业务建模层的完整三角：
- 2026-06-13：业务问题的**来源**（Intent Pool）
- 2026-06-17：业务问题的**结构化表达**（Domain + 文档绑定）
- 本稿：业务问题的**写作入口**（MD 友好形式）

---

## 4. How：4 步流水线 + 5 类错误 + 形态 A 契约

### 4.1 4 步流水线（spike commit 1+2 落地）

```
MD text
   │
   ▼ (1) MD 结构校验（pre-transform）
[结构错误 → 抛 E_MD_xxx + offset]
   │
   ▼ (2) mdast-util-from-markdown → MD AST
[mdast: heading/table/code/paragraph 节点 + position]
   │
   ▼ (3) AST 拍平 + dot-path 拼接
[生成 OXL 文本 + offset map (md-line, md-col) → (oxl-line, oxl-col)]
   │
   ▼ (4) 现有 Langium 解析 OXL 文本
[AST + 错误带 oxl offset → 反向回填到 md offset → 用户看到 md 的行/列]
```

**关键不变量**：
- 第 1 步必须在第 3 步之前——MD 结构错必须先拦截，否则 OXL 解析错位置无意义
- 第 3 步维护 offset map——每行产出的 OXL 都记录 md→oxl 映射
- 第 4 步零修改——Langium 不知道自己在解析 MD 派生的 OXL

### 4.2 形态 A 契约（dot-path + `@tag` 前缀）

```oxn
domain "OrderContext" {
  description = "电商订单履约边界"

  term {
    // ===== Aggregate Root =====
    "@aggregate Order": "客户发起的一次购买契约"
    "Order.id": "订单全局唯一标识符"
    "Order.status": "订单生命周期状态"
    "Order.totalAmount": "订单最终需要支付的总金额"

    // ===== 内部 Entity =====
    "@entity Order.items": "该订单下包含的商品快照"
    "Order.items.itemId": "行项目 ID"
    "Order.items.price": "商品单价"
    "Order.items.quantity": "购买数量"

    // ===== 内部 Value Object =====
    "@vo Order.shippingAddress": "用户的收货地址"
    "Order.shippingAddress.province": "省份"
    "Order.shippingAddress.city": "城市"
    "Order.shippingAddress.detail": "详细地址"
  }

  // 兼容 2026-06-17：docs 字段（graduate 阶段必加）
  // docs = ["docs/zh-cn/intent.md#intent"]

  ban { "modify_items_when_shipped" }

  invariant {
    "Order: totalAmount == sum(items.price * items.quantity)"
  }
}
```

**形态 A 校验规则**（由 structure-validator 强制）：

| 规则 | 触发条件 | 错误码 |
|---|---|---|
| 单一 root | 一个 domain 只能有一个 `@aggregate`（path.length === 1） | `E_DUP_AGGREGATE` |
| 父节点存在 | `@entity X.Y` 要求 X 必须是已声明 aggregate 名 | `E_ORPHAN_ENTITY` |
| VO 叶子性 | `@vo X.Y.Z` 中 Z 之后不能再有子 term | `E_VO_HAS_CHILDREN` |
| 隐式角色 | 无 `@` 前缀的 term 视作 atomic，不参与 tree 校验 | （合法） |

**14 现有资产兼容**：所有无前缀的 term 自动按 `path: ["X"], role: undefined` 解析。D3 天然通过。

### 4.3 5 类基线错误（D2 必交付 + 扩展协议）

#### 4.3.1 基线错误表

| 错误码 | 触发场景 | remark AST 节点 | location 字段 |
|---|---|---|---|
| `E_MD_MULTIPLE_H1` | 多个 `#` 标题 | `Heading { depth: 1 }` 第二个起 | `node.position.start` |
| `E_MD_ORPHAN_H2` | `##` 无父 `#` | `Heading { depth: 2 }` 且 h1Count === 0 | `node.position.start` |
| `E_MD_CROSS_AGGREGATE` | H3 path 根 ≠ 当前 aggregate 名 | `Heading { depth: 3 }` | `node.position.start` |
| `E_MD_TABLE_OUT_OF_AGGREGATE` | 表格在 H1 后但 H1 后无 H2 | `Table` 且 currentAggregate === null | `node.position.start` |
| `E_MD_INVARIANT_OUT_OF_SCOPE` | `\`\`\`oxn invariant` 在 H1 后但无 H2 | `Code { lang: 'oxn invariant' \| 'oxn ban' }` 且 currentAggregate === null | `node.position.start` |

#### 4.3.2 扩展位（D1–D5 实施时按需追加）

| 错误码 | 触发场景 |
|---|---|
| `E_MD_FRONTMATTER_NOT_SUPPORTED` | 首行 `---` 或 `ast.children[0].type === 'yaml'` |
| `E_MD_TOO_MANY_ERRORS` | 错误数 ≥ `maxErrors`（默认 20） |
| 未来扩展 | `E_MD_DUPLICATE_TERM`、`E_MD_INVALID_TAG` 等 |

#### 4.3.3 错误码扩展协议

D1–D5 实施时新增错误码必须：

1. 在 `spike/md-as-canonical/tests/fixtures/bad/` 增加 `<name>.md`
2. 在 `structure-validator.ts` 对应 `onXxx` 函数加分支
3. 在 `MdStructureErrorCode` 联合**追加**新字面量
4. 在 README.md 错误码表中登记

**禁止**：
- 复用现有 5 类错误码（在错误信息层面"重载"含义）
- 在 `onXxx` 之外构造 `MdStructureError`（保证 walk 顺序可追踪）

### 4.4 错误收集策略：collect-all + 限上限

```ts
// 伪代码（commit 2 落地）
export function validateMdStructure(
  md: string,
  options: ValidateOptions = {}
): MdStructureError[] {
  const maxErrors = options.maxErrors ?? 20;
  const ast = fromMarkdown(md);
  const state: ValidationState = { /* ... */ };
  const errors: MdStructureError[] = [];

  // frontmatter 早检
  const frontmatterErr = checkNoFrontmatter(ast, md);
  if (frontmatterErr) {
    errors.push(frontmatterErr);
    if (errors.length >= maxErrors) return errors;
  }

  walk(ast.children, state, errors, md, maxErrors);
  return errors;
}
```

**哨兵注入**：超过 maxErrors 时追加 `E_MD_TOO_MANY_ERRORS`，实际错误数 = `maxErrors + 1`（哨兵不计入业务错误统计）。

---

## 5. spike 执行计划

### 5.1 物理位置

```
spike/md-as-canonical/
├── README.md                       # 决策报告 (D1–D5 结果汇总)
├── package.json                    # 独立子包
├── tsconfig.json                   # extends 主 tsconfig
├── src/
│   ├── transformer.ts              # MD AST → OXL 文本 + OffsetMap
│   ├── offset-map.ts               # md↔oxl 双向定位
│   ├── structure-validator.ts      # 5 类 E_MD_xxx 错误
│   ├── term-name-parser.ts         # 形态 A 的 STRING→{role,path}
│   ├── invariants-parser.ts        # "root: expr" 解析
│   └── langium-bridge.ts           # 调现有 parseOxlInLanguageServer
├── tests/
│   ├── transformer.test.ts
│   ├── offset-map.test.ts          # D1
│   ├── structure-validator.test.ts # D2
│   ├── term-name-parser.test.ts    # D3
│   ├── langium-bridge.test.ts      # D3
│   ├── grammar-isolation.test.ts   # D4
│   └── perf.test.ts                # D5
├── fixtures/
│   ├── good/                       # 3 个 good fixture
│   ├── bad/                        # 5 个 bad fixture
│   └── large-1mb.md                # 性能测试
└── docs/
    ├── design.md                   # 4 步流水线设计
    ├── decision-criteria.md        # D1–D5 详述
    └── graduation-plan.md          # spike→v0.3 主线迁移
```

### 5.2 D1–D5 验证门槛（全硬门槛，任一不通过即 spike 失败）

| D | 标题 | 测试文件 | 验证方法 |
|---|---|---|---|
| **D1** | 100% offset mapping 精度 | `offset-map.test.ts` | 故意改 fixture OXL 第 7 行，Langium 报错经 offset map 反查必须指向 MD 原行（行号偏差 = 0） |
| **D2** | MD 结构校验 detect 5 类错误 | `structure-validator.test.ts` | 5 个 bad fixture 各自抛对应 `E_MD_xxx`，带精确 `md: Location` |
| **D3** | 现有 12+ OXL 资产零回归 | `term-name-parser.test.ts` + `langium-bridge.test.ts` | 14 个现有资产走 term-name-parser + Langium 解析，零失败 |
| **D4** | 零 grammar 修改 | `grammar-isolation.test.ts` | `git diff src/oxl/langium/oxn.langium` 长度必须 = 0 |
| **D5** | 1MB MD < 500ms P95 | `perf.test.ts` | 跑 10 次取 P95，`Bun.nanoseconds()` 计时 |

### 5.3 4 个 commit 序列

| # | Commit | 验证 |
|---|---|---|
| 1 | `chore(spike): md-as-canonical scaffold + README + fixtures` | 目录结构 + 12 fixture 就绪 |
| 2 | `feat(spike): md structure validator (D2)` | 5 个 bad fixture 全绿 |
| 3 | `feat(spike): transformer + offset map (D1, D3)` | 转换正确性 + 14 现有资产零回归 |
| 4 | `feat(spike): langium bridge + perf (D3, D4, D5)` | 1MB 性能达标 + grammar diff 为空 |

每个 commit 独立可验证；任一失败不进入下个 commit。

### 5.4 Commit 2 内部 5 个子步

按"小步快跑"分 5 个子步骤：

| 子步 | 内容 | 验证 |
|---|---|---|
| 2.1 | 5 个 bad fixture 文件就位 | 文件存在，结构正确 |
| 2.2 | 类型定义（`MdStructureErrorCode` + `MdStructureError` + `ValidateOptions`） | tsc 编译通过 |
| 2.3 | frontmatter 早检（`checkNoFrontmatter`） | bad-frontmatter fixture 抛 E_MD_FRONTMATTER_NOT_SUPPORTED |
| 2.4 | walk 主循环 + `onHeading` 处理 H1/H2/H3 | 触发 E_MD_MULTIPLE_H1 / E_MD_ORPHAN_H2 / E_MD_CROSS_AGGREGATE |
| 2.5 | `onTable` + `onCode` + maxErrors 哨兵 | 触发 E_MD_TABLE_OUT_OF_AGGREGATE / E_MD_INVARIANT_OUT_OF_SCOPE / E_MD_TOO_MANY_ERRORS |

### 5.5 spike 失败兜底

| D 不通过 | 回退策略 |
|---|---|
| D1 | offset 仅支持行级回填（±行），列为 D1' |
| D2 | 拆 spike 为 spike-1（1H+1H2 极简）+ spike-2（完整 H3/table/code） |
| D3 | dot-path 仅作 display hint；term 仍按现有 name=STRING |
| D4 | **直接 spike 失败**，不进主线 |
| D5 | 降级到 500KB < 500ms P95，列为 v0.3 优化项 |

### 5.6 不可触达边界（写入 spike README 红线）

| 不可触达 | 原因 |
|---|---|
| `src/oxl/langium/oxn.langium` | D4 红线 |
| `src/oxl/langium/oxn-services.ts` | 同上 |
| `src/oxl/validators/*.ts` | spike 不参与 v0.2 done 任务 |
| `package.json` 顶层 | spike 用独立子包 |
| `lefthook.yml` | spike 不入 pre-commit |
| `src/oxl/builtin/**` | 不修改 builtin 资产 |
| `.openxenon/domains/*.oxn` | 14 现有资产零迁移 |

---

## 6. graduate 路径（spike 成功后）

```
spike/md-as-canonical/
   ↓ 5 个 D 全绿 + 用户确认
   ↓ 新建分支 feat/v0.3-md-domain (从 dev 拉)
src/oxl/md-bridge/                  (L1-OXL)
  ├── transformer.ts
  ├── offset-map.ts
  ├── structure-validator.ts
  ├── term-name-parser.ts
  └── invariants-parser.ts
src/cli/oxl/md-loader.ts            (L3-CLI, detect .md 走 transformer)
   ↓
v0.3 主线：oxn domain 命令支持 --md 入口
   ↓
兼容 2026-06-17 的 docs = [STRING...] 字段
```

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 形态 A 前缀 `@aggregate` 与现有 OXL 关键字冲突 | 解析歧义 | STRING 内部字符自由；现有 grammar 不动；零冲突 |
| MD offset 回填精度不够 | 错误信息错位 | D1 硬门槛；行级偏差 > 0 即 spike 失败 |
| 14 现有资产经 term-name-parser 失败 | 兼容债 | D3 硬门槛；兼容测试先于一切 |
| Langium 对 OXL 解析抛错但 D3 已有兼容 | spike 内部测试设计缺陷 | langium-bridge.test.ts 必须用 14 现有资产真实跑通 |
| frontmatter 边界 case（BOM/CRLF/空行）漏检 | 边缘 case 漏报 | 双重检查（首行 `---` + ast.yaml 节点） |
| 5 类错误不够，D1–D5 实施时补不到 | spike 卡死 | 错误码扩展协议（§4.3.3）允许在 spike 内追加 |
| 与 2026-06-17 的 `docs` 字段冲突 | graduate 时合并债 | §2 已明确两稿正交；graduate 时 docs 字段透传 |

---

## 8. 与 OpenXenon 战略的对齐

| 战略原则 | 本稿如何对齐 |
|---|---|
| OXL 是 AI 意图层 | 本稿坚持 OXL 是 canonical；MD 仅是 friendly view |
| L0-Processor 是兰姆达真空 | structure-validator 是纯函数，无 fs/net/child_process |
| L1-OXL 不依赖 L2+ | spike 落地后归 `src/oxl/md-bridge/`，L1-OXL |
| v0.2 兼容性优先 | D4 红线：零 grammar 修改 |
| spike 不入 main | §5.6 graduate 路径明确 spike → 分支 → 主线 |

---

## 9. 未决问题

- [ ] **Q1**：graduate 后 `.md` 资产是入库（tracked）还是不入库（仅作写作中转）？目前推荐**不入库**——`.oxn` 是 git 跟踪对象，`.md` 是写作副本。
- [ ] **Q2**：MD 入口的触发是自动（CLI detect 扩展名）还是显式（`--md` flag）？目前推荐**两者都支持**——自动 detect 兜底，显式 flag 强制。
- [ ] **Q3**：error 信息提示用户时，是否附带"建议的 MD 修复 patch"？目前推荐**否**（避免 scope creep）；graduate 后再考虑。
- [ ] **Q4**：D2 的 5 类错误是否需要 i18n（中英双语）？目前推荐**否**（spike 阶段英文 + `code` 字段足够机器消费）；graduate 后跟随主仓 i18n 体系。
- [ ] **Q5**：MD 写作时如何与 2026-06-17 的 `docs = [STRING...]` 字段协作？**MD 中应提供 `## Docs` 段落或 `docs:` frontmatter 触发**（但 frontmatter spike 不支持，所以用段落形式）。

---

## 10. 结论

三轮 AI 讨论 + 用户三轮决策收敛出**"OXL canonical + MD friendly view"** 路线。本稿给出完整的 spike 设计与 D1–D5 硬门槛验证机制。**关键不变量**：

1. **零 grammar 修改**（D4 红线）—— 14 现有资产 + T10/T11/T12 done 任务的 compatibility 不被破坏
2. **形态 A 是纯扩展**——`@tag` 前缀是 STRING 子串，term 块保持扁平
3. **collect-all + 限上限**——一次 walk 报所有问题，避免 fail-fast 烦人
4. **错误码开放扩展**——D1–D5 实施时按需追加，不预设上限
5. **frontmatter 明确拒绝**——spike 阶段不支持，避免 scope creep

spike 通过门槛 = D1–D5 全绿。任一不过 spike 失败，按 §5.5 兜底。**graduate 路径与 2026-06-17 的 `docs` 字段正交可合并**。

下一步：**执行 commit 1（scaffold + 12 fixture + README 草稿）**。
