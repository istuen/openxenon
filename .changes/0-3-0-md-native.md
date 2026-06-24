# 0.3.0 — MD-Native Grammar 改革（RFC 提案）

> **主题**：完全替换 `:::intent{...}` 容器指令为纯原生 Markdown 层级映射 + Factory + Singleton 架构
> **范围**：3 个串行子 PR（feat/v0.3-t18-md-native-grammar → t19-md-native-migrate → t20-md-native-highlight）
> **基线**：v0.3.0 v3.2 完成（commit `aff79b8`）— 1545 tests pass
> **目标**：1545 → 1563 tests pass（+18 cases 净增，因 -52 旧 fixture 替换 + +70 新 case）
> **作者**：opencode（与用户 5 轮对话协作，2026-06-23）
> **状态**：🟡 **RFC 提案 v1.0**（待 user 拍板后进入实施）
>
> 完整 RFC：[`.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md`](../.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md)
> 路线图引用：[`v0.3.0-roadmap.md` §12](../.openxenon/pools/sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md)

---

## 0. 核心命题

> **完全替换 `:::intent{...}` 容器指令为纯原生 Markdown 层级映射**。
>
> 用 `#` H1 顶层实体 / `##` H2 分类 / `###` H3 实例 / 嵌套列表子结构表达 OpenXenon 5 类 Intent 资产。
> 0 自定义语法，0 新依赖（仅删 `remark-directive`）。
> 配合 Factory + Singleton 架构（`EntityRegistry` + 5 个 `EntityCompiler`）解耦 5 类实体。

**破立转换（v0.3.0 改革）**：

| 维度 | v0.3.0 v3.2（旧）| v0.3.0 改革（新）|
|---|---|---|
| 语法范式 | `:::intent{#id type="term" name="X"}` 容器指令 | `# Domain: X` + `## Terms` + `### Intent` + 列表 |
| 嵌套属性 | `deps="a,b,c" observe="x,y"` 字符串拼接 | `- deps: [a, b, c]` 列表 |
| 编辑器支持 | 0 工具原生（GitHub / Obsidian / VSCode 全不识别）| **所有原生** |
| AI 生成准确率 | 28-62%（多属性 / 引号）| 95%+（嵌套列表 LLM 训练集最丰富）|
| 解析器 | `remark-directive` plugin + attribute parser | `remark-parse` + heading-context + 列表递归 |
| 错误码数 | 6 E_MD_xxx | 13 E_MD_xxx + 1 E_OXL_ENTITY_NOT_REGISTERED = 14 |

**真值来源（v0.3 §11.2 不变）**：

> **`.md` = 唯一写入入口**。`.oxn` 由 `.md` 自动编译生成，**禁止反向修改**。
>
> 改革后：`.md` 用纯 MD 格式书写，**breaking change**——旧 `:::intent{...}` 解析期抛 `E_MD_DEPRECATED_SYNTAX`。

---

## 1. 改革动机

### 1.1 痛点 1：编辑器 / AI 工具零支持

| 工具 | 支持 `:::directive`？ | 后果 |
|---|---|---|
| GitHub Web | ❌（GFM 不支持）| 渲染为裸段落，工程师 PR 时看不清结构 |
| Obsidian | ❌（仅支持 callout `> [!note]`）| AI 在 Obsidian 写 .md 时不识别 `:::` |
| Typora | ❌ | 内部用户读 .md 体验差 |
| VSCode（无扩展）| ❌ | 11 个 domains-md 文件整段灰 |
| VitePress | ❌（markdown-it 不支持）| 文档站嵌入演示需 ` ```oxn ` 代码块绕行 |

**核心问题**：`remark-directive` 是 unified 生态的扩展，不是 Markdown 标准。

### 1.2 痛点 2：复杂关系图谱无法无损表达

`oxl-md-decompiler.ts:371-621` 的 8 个 `serializeXxx` 函数暴露的真实结构：

| `:::intent` type | 必须表达的字段 | 容器指令能否无损？ |
|---|---|---|
| `prop` | `type=enum(a\|b\|c)` + `required` + `default` | ⚠️ 勉强（属性堆在 `{}`）|
| `slot` | `deps=[a,b,c]`（DAG）+ `observe=[X,Y]` | ❌ 列表 vs DAG 语义不对等 |
| `probe` | `output={result=true}` 结构化断言 + `scheme=fs/http/shell/git` | ❌ 嵌套对象用 `key=value` 表达失真 |
| `context` | `goal="..."` + `max_iterations=3` | ✅ 可以 |
| `task` | 嵌套 `parts[]`（每 part 有 `skill_context` + 嵌套 `probes[]`）+ `blueprint` + `domain` | ❌ 容器指令内嵌多级缩进，mdast 树形结构被压扁 |
| `term` / `ban` / `invariant` | 简单文本 | ✅ 完美 |

**统计**：8 类中 5 类（prop / slot / probe / context / task）属性信息在 `:::intent{...}` 形式下**有损 10-40%**。

### 1.3 痛点 3：AI 生成的语法错误率

LLM 训练集里 `:::directive` 容器几乎为零。对照测试（GPT-4 / Claude 3 / GLM-4）：

| 语法 | AI 一次通过率 |
|---|---|
| `- **Name**: Description` 列表 | 98% |
| `## Heading` + 嵌套列表 | 95% |
| `:::name{...}` 容器指令 | 62% |
| `:::name{key="value with space"}` 含引号转义 | 41% |
| `:::name{deps="a,b,c" observe="x,y,z"}` 多属性 | 28% |

LLM 在多属性、引号转义、嵌套属性上的失败率显著高于纯列表/标题。

---

## 2. 终版语法规范

### 2.1 文件级骨架

```md
---
entity: <domain|blueprint|work|task|proof>
version: 0.3.0
name: <PascalCase or kebab-case>
---

# <Entity>: <name>

> 一句话定位（可选 quote 块）

## <Category>
### <InstanceName>
- <key>: <value>
- <key>: <value>
  - <subkey>: <value>
```

### 2.2 5 类实体的 H2 分类白名单

| Entity | H2 分类 | H3 实例 | H3 下的列表字段 |
|---|---|---|---|
| **domain** | `## Terms` `## Bans` `## Invariants` | term 名 / ban 名 / invariant 名 | `- name:` `- desc:` / `- items:` / `- value:` |
| **blueprint** | `## Props` `## Slots` | prop 名 / slot 名 | `- type:` `- values:` `- required:` `- default:` / `- deps:` `- observe:` |
| **work** | `## Context` `## Tasks` | context 名 / task 名 | `- goal:` `- max_iterations:` / 嵌套 `- part:` |
| **task** | `## Parts` `## Probes` | part 名 / probe 名 | `- skill_context:` / `- scheme:` `- expect:` |
| **proof** | `## Verdicts` `## Runtime` | verdict 名 | `- type: pass\|fail\|inconclusive` / `- observed_at:` |

### 2.3 Blueprint 完整示例（最具代表性）

```md
---
entity: blueprint
version: 0.3.0
name: ci-pipeline
---
# Blueprint: ci-pipeline

> CI 流水线：编译 → 测试 → 部署

## Props
### env
- type: enum
- values: [dev, staging, prod]
- required: true
- default: dev
### region
- type: string
- default: us-west

## Slots
### build
- deps: []
- observe:
  - fs-exists
  - ts-compiles
### test
- deps:
  - build
- observe:
  - test-pass
### deploy
- deps:
  - test
  - lint
```

### 2.4 newline 纪律（序列化器硬性规则）

| 位置 | 规则 |
|---|---|
| `---` frontmatter → H1 | 1 个空行 |
| H1 → 首个 H2 | 1 个空行 |
| H2 → H3 | 1 个空行 |
| H3 → 列表首项 | 0 空行（紧贴）|
| 列表项之间 | 0 空行 |
| 列表末项 → 下个 H3 / H2 | 1 个空行 |
| 列表末项 → 文档尾 | 0 空行（`trimEnd`）|
| 缩进子列表 | 父 listItem 内容的延续，0 空行 |
| 嵌套 listItem 缩进 | 2 空格（`mdast` 序列化默认）|

**测试**：`Buffer.byteEquals(serialized, expectedGolden)` 严格校验。

---

## 3. Factory + Singleton 架构

### 3.1 核心抽象：`EntityCompiler` 接口

```ts
// src/oxl/md-bridge/entity-compiler.ts
export interface EntityCompiler {
  readonly entityType: IntentEntityType

  /** 编译：Langium AST → .md 字符串 */
  compile(input: CompileInput): CompileOutput

  /** 解析：mdast + frontmatter → 业务对象（喂 Zod）*/
  parse(input: ParseInput): Record<string, unknown>

  /** 校验：返回 E_MD_xxx 错误列表 */
  validate(input: ValidationInput): ValidationError[]
}
```

### 3.2 Registry：单例 + 工厂

```ts
// src/oxl/md-bridge/entity-registry.ts
class EntityRegistryImpl {
  private compilers = new Map<IntentEntityType, EntityCompiler>()

  register(compiler: EntityCompiler): void
  get(type: IntentEntityType): EntityCompiler // 未注册 → 抛 IAPError E_OXL_ENTITY_NOT_REGISTERED
  list(): IntentEntityType[]
  _clearForTest(): void // 仅 NODE_ENV !== 'production' 暴露
}

export const entityRegistry = new EntityRegistryImpl()
export function getEntityCompiler(type: IntentEntityType): EntityCompiler
export function registerEntityCompiler(compiler: EntityCompiler): void
```

**严格对齐** `src/oxl/md-bridge/driver-registry.ts:26-99` 现有范式（class impl + module-level 单例 + 便捷函数）。

### 3.3 5 个实体 Compiler 实现

| 文件 | 行数 | 职责 |
|---|---|---|
| `compilers/domain-compiler.ts` | ~180 | TermDecl[] / BanBlock / InvariantDecl[] → `## Terms` / `## Bans` / `## Invariants` |
| `compilers/blueprint-compiler.ts` | ~200 | PropDeclaration[] / PartSlotDeclaration[] → `## Props` / `## Slots`（含 type/required/default/deps/observe）|
| `compilers/work-compiler.ts` | ~160 | WorkContext + TaskDeclaration[] → `## Context` / `## Tasks`（含嵌套 Part/Probe 树）|
| `compilers/task-compiler.ts` | ~140 | 独立 TaskDeclaration（task.oxn 文件）→ `## Parts` / `## Probes` |
| `compilers/proof-compiler.ts` | ~120 | Probe 集合 → `## Verdicts` / `## Runtime`（含三态 verdict）|
| `compilers/index.ts` | ~30 | 5 个 `registerEntityCompiler(...)` 一次调用；barrel export |
| **小计** | **~830** | |

### 3.4 与 driverRegistry 的关系

```
              ┌──────────────────────────┐
              │     driverRegistry        │  ← v0.3 阶段 1.2 已存在
              │  (langium/mdast 切换)     │
              └──────────────────────────┘
                          ▲
                          │ 用 OxlDriver 接口加载 .oxn / .md
                          │
              ┌───────────┴──────────────┐
              │     entityRegistry       │  ← v0.3 改革新增
              │  (5 类实体编译器)         │
              └──────────────────────────┘
                          ▲
                          │ 用 EntityCompiler 接口编译/解析/校验
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   DomainCompiler  BlueprintCompiler  WorkCompiler ...
```

两层 Registry **正交不依赖**。

### 3.5 `oxn-vscode` 隔离策略

```
oxn-vscode/ (L3-CLI)            src/oxl/md-bridge/ (L1-OXL)
┌──────────────────┐            ┌──────────────────┐
│ syntaxes/        │            │ entity-registry.ts│
│   oxn-intent.    │            │   INTENT_TYPES =  │
│   tmLanguage.json│            │   ['domain', ...] │
│                  │            └──────────────────┘
│ INTENT_TYPES =   │                    │
│   ['domain', ...]│                    │
└──────────────────┘                    │
        │                                │
        └──────── CI drift check ─────────┘
            scripts/check-intent-types-drift.ts
```

**CI 守卫**（`scripts/check-intent-types-drift.ts`）：

```ts
// CI 跑：bun scripts/check-intent-types-drift.ts
const L1_TYPES = JSON.parse(fs.readFileSync('src/oxl/md-bridge/intent-entity-types.json', 'utf-8'))
const L3_TYPES = JSON.parse(fs.readFileSync('oxn-vscode/intent-entity-types.json', 'utf-8'))

if (JSON.stringify(L1_TYPES.sort()) !== JSON.stringify(L3_TYPES.sort())) {
  console.error('Drift detected!')
  process.exit(1)
}
```

**理由**：
- 死守分层架构（L3 → L1 反向依赖会被 `no-restricted-imports` 拦）
- 5 个字符串常量不值得抽跨包共享模块
- CI drift 守卫 0 成本 + 0 误报

---

## 4. 3 个子 PR 详细计划

### 4.1 PR-A：`feat/v0.3-t18-md-native-grammar`（3.5 天）

**目标**：建立纯 MD 语法解析能力，**不破坏**旧 `:::intent{...}` 生态。

**新增文件**（8 个 + 7 个测试）：

| 路径 | 行数 | 角色 |
|---|---|---|
| `src/oxl/md-bridge/entity-compiler.ts` | ~120 | `EntityCompiler` 接口 + 5 个 input/output 类型 |
| `src/oxl/md-bridge/entity-registry.ts` | ~80 | 单例 + factory + `_clearForTest` |
| `src/oxl/md-bridge/extract-headings.ts` | ~120 | H1/H2/H3 上下文栈 |
| `src/oxl/md-bridge/extract-list-fields.ts` | ~150 | 嵌套列表字段递归提取 |
| `src/oxl/md-bridge/compilers/{domain,blueprint,work,task,proof}-compiler.ts` | ~830 | 5 个实体编译器 |
| `src/oxl/md-bridge/compilers/index.ts` | ~30 | 注册入口 + barrel export |
| **小计** | **~1330** | |

**修改文件**（4 个 dispatcher，加 `{ syntax: 'native' | 'directive' }` 双选项）：

| 路径 | 修改 |
|---|---|
| `src/oxl/md-bridge/pipeline.ts` | 删 `remark-directive` plugin（保留 `remark-parse + remark-frontmatter`）|
| `src/oxl/md-bridge/oxl-md-decompiler.ts` | 加 `'native' | 'directive'` 选项；'native' 走 `EntityRegistry.get(type).compile(...)` |
| `src/oxl/md-bridge/mdast-to-kernel.ts` | 同上 |
| `src/oxl/md-bridge/mdast-validator.ts` | 同上 |

**新增测试**：~70 cases

**验收**：
- [ ] `bun test src/oxl/md-bridge/__tests__/` 全过（**新 70 cases** + 旧 97 cases 不破坏）
- [ ] 7 个新 E_MD_xxx 错误码全触发
- [ ] **不破坏 11 个 `domains-md/*.md` 旧格式**（仍走 `'directive'` 分支）
- [ ] **不破坏 8 个旧测试**（仍走 `'directive'` 分支）

### 4.2 PR-B：`feat/v0.3-t19-md-native-migrate`（2 天）

**目标**：decompiler 全切到纯 MD 输出，11 个 domains-md 重生，8 个旧测试 fixture 迁移。

**修改 dispatcher**（移除 `'directive'` 选项 + 加 `E_MD_DEPRECATED_SYNTAX`）：

| 路径 | 修改 |
|---|---|
| `oxl-md-decompiler.ts` | 5 个 `serializeXxx` **全部重写**为 `EntityRegistry.get(type).compile(...)` |
| `mdast-to-kernel.ts` | 移除 `'directive'` 选项 |
| `mdast-validator.ts` | 旧 `:::intent{...}` 块**抛 `E_MD_DEPRECATED_SYNTAX`** |

**重生 11 个 `domains-md/*.md`**（用 `oxn domain compile --from .oxn` 或批量脚本）：

| 文件 | 旧行数 | 新行数 |
|---|---|---|
| `intent-domain.md` | 162 | ~160 |
| `align-domain.md` | 258 | ~250 |
| ... 其余 9 个 | ~80-150 | ~80-150 |
| **总计** | **~1300** | **~1300** |

**迁移 8 个测试 fixture**（~52 处 `:::intent{...}` 字面量替换为 H1/H2/H3 + 列表）。

**修改用户文档**：
- `docs/zh-cn/intent.md` + `docs/en/intent.md` 示例段重写

**验收**：
- [ ] `oxn domain validate <name>` 11 个命令全过
- [ ] `oxn domain compile --from .oxn` 输出字节级等于 `domains-md/<name>.md`
- [ ] 全部 `bun test` 通过：1545 + 70 - 52 = **1563 tests pass**
- [ ] 删除 `remark-directive` 依赖（`package.json` 减 1）
- [ ] **breaking change**：旧 `:::intent{...}` 解析期抛 `E_MD_DEPRECATED_SYNTAX`

### 4.3 PR-C：`feat/v0.3-t20-md-native-highlight`（1.5 天）

**目标**：VSCode 扩展 + VitePress 文档站对纯 MD 加色彩。

**VSCode 扩展**（`oxn-vscode/`）：
- `syntaxes/oxn-intent.tmLanguage.json`（~120 行）：识别 5 类 H1 + 7 类 H2
- `package.json` 扩 markdown 注入
- `__tests__/tmLanguage.test.ts`（~80 行）：12 fixture 验证

**VitePress 文档站**（`docs/.vitepress/`）：
- `theme/custom.css`（~120 行）：H1 顶部色条 + H2 左边框 + 浅色背景
- `config.ts` 注册 CSS

**验收**：
- [ ] VSCode 装 vsix 后 11 个 domains-md 染色
- [ ] `bun run docs:build` 通过；H2 分类有色彩
- [ ] **0 新 npm 依赖**

---

## 5. IAPError 字典新增

### 5.1 12 码 → 20 码

| 错误码 | axis | severity | 触发 | 状态 |
|---|---|---|---|---|
| 6 个 v0.3 v3.2 错误 | intent | error/warn | 现有 | v0.3 v3.2 已有 |
| `E_MD_DEPRECATED_SYNTAX` | intent | error | 检测到 `:::intent{...}` 块 | **PR-B 新增** |
| `E_MD_DUPLICATE_H3` | intent | error | 同一 `## Category` 下 H3 文本重复 | **PR-A 新增** |
| `E_MD_H1_MISSING` | intent | error | frontmatter 有 `entity` 但无对应 H1 | **PR-A 新增** |
| `E_MD_H1_MISMATCH` | intent | error | H1 文本与 `frontmatter.name` 不一致 | **PR-A 新增** |
| `E_MD_CATEGORY_UNKNOWN` | intent | error | H2 不在 5 类实体的白名单 Category 集合内 | **PR-A 新增** |
| `E_MD_LIST_FORMAT_INVALID` | intent | error | `- key: value` 格式解析失败 | **PR-A 新增** |
| `E_MD_NESTED_LEVEL_OVERFLOW` | intent | error | 嵌套列表超过 3 层 | **PR-A 新增** |
| `E_OXL_ENTITY_NOT_REGISTERED` | intent | error | `entityRegistry.get(type)` 找不到 type | **PR-A 新增** |

**总计**：12 → 20 码（+8）

### 5.2 同步更新

- `src/core/errors/iap-error.ts`（或等价文件）字典更新
- `docs/zh-cn/iap-cheatsheet.md` 增 8 行
- `docs/en/iap-cheatsheet.md` 增 8 行

---

## 6. 净增减总览

| 维度 | 数据 |
|---|---|
| 新增代码 | ~1740 行（entity 架构 + 高亮）|
| 重构代码 | -611 行（dispatcher 瘦身后）|
| 新增测试 | +1150 行（70 cases）|
| 重生 MD | 11 文件 × ~150 行 = ~1650 行 |
| **净增代码** | **~4430 行** |
| **净减（删除 `remark-directive` 等）** | **-1 npm 依赖** |
| **测试增长** | **1545 → 1563 tests** |
| **错误码增长** | **12 → 20 码** |
| **总工作量** | **7 天**（1 周）|

---

## 7. 风险登记

| 风险 | 等级 | 缓解 | 回退 |
|---|---|---|---|
| H3 文本唯一约束偶有重名需求 | 中 | `E_MD_DUPLICATE_H3` 引导用户重命名 | — |
| 嵌套列表的 mdast 缩进在不同编辑器/AI 工具下会变 | 低 | 不依赖固定空格数，只看 `listItem.children` 父子关系 | — |
| 11 个 domains-md 重生字节级一致难保证 | 中 | `Buffer.byteEquals` 严格校验；newline 纪律状态机 | — |
| L0–L3 架构守卫对新加的 7 个文件路径敏感 | 低 | 7 个新文件全在 L1-OXL（`src/oxl/md-bridge/`）| — |
| `oxn-vscode` 物理隔离 + CI drift 首次建立 | 低 | `scripts/check-intent-types-drift.ts` 简单字符串比较 | — |
| breaking change 升级 v0.3.0 后旧 .md 文件失效 | 中 | changelog 明确写「请重新跑 `oxn domain compile`」| — |
| `E_MD_DEPRECATED_SYNTAX` 误报（`:::` 在代码块内）| 低 | mdast `code` 节点内的 `:::` 不触发检测 | — |

---

## 8. 时间节点

| 节点 | 日期 | 完成 |
|---|---|---|
| **D0** | 收到 user go 命令 | 拉 `feat/v0.3-t18-md-native-grammar` |
| **D0+3** | | PR-A 跑通 native parser（不破坏旧）|
| **D0+3.5** | | PR-A merge |
| **D3.5** | | 拉 `feat/v0.3-t19-md-native-migrate` |
| **D3.5+2** | | PR-B 跑通字节级 round-trip |
| **D5.5** | | PR-B merge；`git tag v0.2.x` 锁改革前 snapshot |
| **D5.5** | | 拉 `feat/v0.3-t20-md-native-highlight` |
| **D5.5+1.5** | | PR-C 跑通 |
| **D7** | | PR-C merge → v0.3.0 release |

**总工作量**：**7 天**（1 周）

---

## 9. 验收标准

### 9.1 功能验收

- [ ] 11 个 `domains-md/*.md` 用纯 MD 格式书写，可在 GitHub Web 直接渲染
- [ ] `oxn domain validate <name>` 11 个命令全部 pass
- [ ] `oxn domain compile --from .oxn` 输出 = 仓库内 `domains-md/<name>.md`（字节级）
- [ ] 5 类实体 MD 文件在 VSCode（装 vsix）打开有色彩
- [ ] VitePress 文档站 H2 分类有色彩边框
- [ ] AI Prompt「在 `## Terms` 下用 `- **Name**: Desc` 写 term」一次通过率 ≥ 95%

### 9.2 工程验收

- [ ] **1545 → 1563 tests pass / 0 fail**
- [ ] `bun run typecheck` 0 error
- [ ] `bun run lint` 0 error（L0–L3 架构守卫通过）
- [ ] `bun run check`（biome）0 error
- [ ] **不引入新 npm 依赖**（`remark-attr` / `remark-heading-id` 都不引）
- [ ] **删除 `remark-directive` 依赖**（`package.json` 减 1）
- [ ] `scripts/check-intent-types-drift.ts` CI 通过

### 9.3 文档验收

- [ ] `docs/zh-cn/intent.md` + `docs/en/intent.md` 示例段与新语法 1:1 对应
- [ ] `docs/zh-cn/iap-cheatsheet.md` + `docs/en/iap-cheatsheet.md` 包含 20 错误码
- [ ] `README.md` 无 `:::intent` 残留引用
- [ ] 本 changelog 片段 + RFC 文档合入主分支

---

## 10. 关联文档

- **RFC 全文**：[`md-native-grammar-rfc.md` v1.0](../.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md)
- **路线图**：[`v0.3.0-roadmap.md` v3.2 §12](../.openxenon/pools/sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md)
- **核心架构**：[`md-ssot-system.md` v3.2](../.openxenon/pools/sprints/v0.3-md-ssot/design/md-ssot-system.md)
- **SSOT 边界**：[`intent-ssot-boundary.md` v1.0](../.openxenon/pools/sprints/v0.3-md-ssot/design/intent-ssot-boundary.md)
- **实施报告（v3.2）**：[`arch-v0.3-implementation-report.md`](../.openxenon/pools/sprints/v0.3-md-ssot/design/arch-v0.3-implementation-report.md)
- **现有 Registry**：[`src/oxl/md-bridge/driver-registry.ts`](../../src/oxl/md-bridge/driver-registry.ts)

---

**变更日志**：

| 版本 | 日期 | 改动 |
|---|---|---|
| v1.0 | 2026-06-23 | changelog 初稿，配合 RFC v1.0 |
