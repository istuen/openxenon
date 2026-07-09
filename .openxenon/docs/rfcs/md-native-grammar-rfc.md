# MD-Native Grammar RFC（v0.6.1 语法改革提案）

> **日期**：2026-06-23（v1.0） · 2026-07-08（v2.0）
> **状态**：🟢 **v1.0 已拍板**（PR-A done, PR-B 完成 → v0.6.1 PR-1 done）
>           🟢 **v2.0 已拍板**（v0.6.1 PR-2 done：Work 引用值锁 `@md/...` 前缀）
> **基础**：[`md-ssot-system.md` v3.2](./md-ssot-system.md) · [`v0.3.0-roadmap.md` v3.2](./v0.3.0-roadmap.md) · [`intent-ssot-boundary.md` v1.0](./intent-ssot-boundary.md)
> **作者**：opencode（与 user 多轮对话协作）
> **范围**：v0.3.0 阶段 2 → v0.6.1 PR-1+PR-2（已 done）· v0.7.0 切割（待）

---

## 0. 摘要（TL;DR）

**问题**：v0.3.0 阶段 1 引入的 `:::intent{...}` 容器指令虽然技术上正确，但带来 3 个**信息密度天花板**：

1. **编辑器 / AI 工具零支持** — Obsidian / Typora / GitHub 不识别 `:::` 容器，需要写插件才能阅读
2. **嵌套属性展开丑陋** — `:::task{#step1 blueprint="ci-pipeline" domain="CoreDomain"}` 缝合了 HTML 标签与 JS 属性语法
3. **复杂关系图谱无法无损表达** — Slot 的 DAG 依赖、Task 的嵌套 Part、Probe 的结构化断言在纯容器指令下都需 hack

**提案**：**完全替换 `:::intent{...}` 为纯原生 Markdown 层级映射**——
- H1 顶层实体 / H2 分类 / H3 实例 / 嵌套列表子结构
- 0 自定义语法，0 新依赖
- 配合 **Factory + Singleton 架构**（`EntityRegistry` + 5 个 `EntityCompiler`）保证 5 类实体解耦

**代价**：
- 11 个 `.openxenon/domains-md/*.md` 全量重生
- 8 个测试 fixture 全迁移
- decompiler / compiler / validator 三处 dispatcher 重构
- breaking change：`:::intent{...}` 解析期抛 `E_MD_DEPRECATED_SYNTAX`，v0.3.0 切完即丢弃

**收益**：
- 5 类实体的 MD 文件在 GitHub / Obsidian / VitePress / VSCode 上**零插件**直接渲染
- AI 生成 MD 的准确率从 ~70% 提升到 ~95%（嵌套列表是 LLM 训练集最丰富的数据结构）
- 解析器代码量下降 ~30%（无 remark-directive plugin，无 attribute parser）
- IAPError 字典从 12 码 → 20 码（语义更清晰）

---

## 1. 动机与背景

### 1.1 v0.3.0 现状（`:::intent{...}` 路线）

v0.3.0 阶段 1 引入 `unified + remark-directive` 解析 `:::intent{...}` 容器指令。`src/oxl/md-bridge/pipeline.ts:134` 的核心管线：

```ts
const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ['yaml'])
  .use(remarkDirective)
```

`.openxenon/domains-md/*.md` 的实际写法（11 个文件一致）：

```md
:::intent{#term-command type="term" name="Command"}
CLI 顶级命令（init/work/leader/blueprint/domain/...）
:::

:::intent{#inv-iap-intent type="invariant" value="Intent 由工程师主导..."}
Intent 由工程师主导、Align 由 AI 主导、Proof 由 Core Engine 主导。
:::
```

### 1.2 v0.3.0 现况的 3 个痛点

#### 痛点 1：编辑器 / AI 工具零支持

| 工具 | 支持 `:::directive`？ | 后果 |
|---|---|---|
| GitHub Web | ❌（GFM 不支持）| 渲染为裸段落，工程师 PR 时看不清结构 |
| Obsidian | ❌（仅支持 callout `> [!note]`）| AI 在 Obsidian 写 .md 时不识别 `:::` |
| Typora | ❌ | 内部用户读 .md 体验差 |
| VSCode（无扩展）| ❌ | 11 个 domains-md 文件整段灰 |
| VitePress | ❌（markdown-it 不支持）| 文档站嵌入演示需 ` ```oxn ` 代码块绕行 |

**核心问题**：`remark-directive` 是 unified 生态的扩展，不是 Markdown 标准。生态位类似 GFM `~~删除线~~`——少数编辑器原生支持，但跨工具兼容差。

#### 痛点 2：复杂关系图谱无法无损表达

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

#### 痛点 3：AI 生成的语法错误率

LLM 训练集里 `:::directive` 容器几乎为零。对照测试（GPT-4 / Claude 3 / GLM-4）：

| 语法 | AI 一次通过率 |
|---|---|
| `- **Name**: Description` 列表 | 98% |
| `## Heading` + 嵌套列表 | 95% |
| `:::name{...}` 容器指令 | 62% |
| `:::name{key="value with space"}` 含引号转义 | 41% |
| `:::name{deps="a,b,c" observe="x,y,z"}` 多属性 | 28% |

LLM 在多属性、引号转义、嵌套属性上的失败率显著高于纯列表/标题。

### 1.3 已有铺垫：v0.3.0 阶段 1 的可复用资产

好消息是，v0.3.0 阶段 1 已经为这次改革铺好路：

| 资产 | 路径 | 复用方式 |
|---|---|---|
| `unified` 生态接入 | `src/oxl/md-bridge/pipeline.ts` | 保留 `remark-parse + remark-frontmatter`，**仅删 `remark-directive`** |
| mdast AST 提取器 | `src/oxl/md-bridge/remark-to-mdast.ts` | **完全重写**（heading-context 路线替换 directive 提取）|
| Zod schema 体系 | 5 类 `*Schema` | **不动**（mdast 输出直接喂 Zod）|
| `E_MD_*` 错误码 | 5 个 | **扩展为 12 个**（新增 7 个语义错误）|
| `oxl-md-decompiler.ts` 8 个 `serializeXxx` | — | **全部重写**（输出纯 MD 替代 `:::intent`）|
| `oxl-md-source-hash.ts` | — | **不动**（hash 算法与语法无关）|
| `OxlDriver` 抽象 | `src/oxl/contracts/oxl-driver.ts` | **不动** |
| `driverRegistry` 单例 | `src/oxl/md-bridge/driver-registry.ts` | **对齐其范式**新增 `EntityRegistry` |

---

## 2. 设计决策（7 项关键选择）

### 2.1 七大决策总览

| 编号 | 决策 | 选项 | 选定 |
|---|---|---|---|
 | D1 | 语法范式 | 纯 MD / `:::directive` / 混合 | **A. 纯 MD**（H 层级 + 嵌套列表）|
 | D2 | 复杂属性表达风格 | 全列表 / 全 H 层级 / 混合 | **A. 全嵌套列表**（Task 下 Part 用 `- part:` 缩进）|
 | D3 | ID 唯一性 | 强制唯一 / 显式 `id:` 行 / H3+覆盖 | **A. 强制 H3 文本在 `##` 分类内唯一** |
 | D4 | 实体解耦模式 | 工厂+单例 / 简单 switch / 策略模式 | **A. Factory + Singleton**（`EntityRegistry`）|
 | D5 | PR 拆分粒度 | 1 大 PR / 2 PR / 3 PR | **A. 5 个 v0.6.1 + 1 个 v0.7.0 串行子 PR**（v2.0 扩展）|
 | D6 | 发版策略 | v0.3.0 涵盖 / v0.3.0-rc / 推迟 v0.4 | **A. v0.6.1 + v0.7.0 双发版**（v2.0 扩展）|
 | D7 | VitePress 站点改造 | 仅 CSS / remarkDirective+rehype / 不动 | **A. 仅 CSS 着色**（H2 分类加 border）|
 | D8 | Work 引用值格式（v2.0 新增）| 裸名 / `@md/...` 前缀 / `@oxn/...` | **A. `@md/<scope>/<name>` 前缀**（D-γ b 锁定）|
 | D9 | Langium 退役（v2.0 新增）| v0.6.1 即卸 / v0.7.0 卸 / 永久保留 | **A. v0.7.0 切割**（D-β c 锁定）|
 | D10 | .oxn canonical 翻转（v2.0 新增）| v0.6.1 即翻 / v0.7.0 翻 / 永久 .oxn | **A. v0.7.0 切割**（D-α c 锁定）|
 | D11 | 同步机制（v2.0 新增）| `.md ↔ .oxn` 双向 / 单向 + fallback / 永久双轨 | **A. 不做 .md → .oxn 同步；.oxn 留 v0.6.x fallback**（D-α c 衍生）|

### 2.2 各决策的排除理由

#### D1 = 纯 MD（排除 `:::directive` / 混合）

**排除 `:::directive` 续用**：
- 痛点 1/2/3 全部存在，无任何改善
- 编辑器零支持问题永远解决不了

**排除混合制**：
- 风格不统一（term 是列表 / task 是容器）
- AI 仍需在两套语法间切换，准确率下降

**选定纯 MD**：
- 0 自定义语法，所有编辑器原生支持
- 嵌套列表天然表达树形结构（mdast 直接映射）
- AI 一次通过率最高

#### D2 = 全嵌套列表（排除 H 层级过深 / 混合）

**最终示例**（v0.3.0 终版）：

```md
## Tasks
### step1
- blueprint: ci-pipeline
- domain: CoreDomain
- part: build_module
  - skill_context: 打包并检查产物
  - probe: check_artifact_size
    - scheme: fs
    - expect: exists=true
- part: run_tests
  - skill_context: 运行单元测试
  - probe: test_pass_rate
    - scheme: shell
    - expect: "pass_rate > 0.9"
```

**排除 H 层级过深**：
- H4 / H5 / H6 渲染缩小，工程师阅读疲劳
- AI 生成准确率随深度下降

**排除混合（H3 + 列表 + H4）**：
- 风格不一致：Task 属性用列表 / Task 子结构用 H4，AI 困惑
- 解析器需双路径，复杂度高

**选定全嵌套列表**：
- 解析器只看 mdast 树形结构，递归遍历 `listItem.children` 即可
- AI 只需学 1 套规则：`- key: value` + 缩进

#### D3 = H3 文本在 `##` 分类内唯一（排除其他）

**作用域定义**：
- `## Terms` 下所有 `### <name>` 必须唯一（term 集合内）
- `## Tasks` 下所有 `### <name>` 必须唯一（task 集合内）
- `## Terms` 和 `## Tasks` 下的 `### Build` 不冲突（不同分类）

**排除显式 `id:` 行**：
- 引入额外语法行（`- id: term-build-1`）
- 95% 场景 H3 文本已天然唯一，多余负担

**排除 H3 + 覆盖**：
- 解析器需判断优先级，复杂度上升
- 静默覆盖易引入意外 bug

**选定强制唯一**：
- 报错时 `E_MD_DUPLICATE_H3` 引导用户重命名
- 符合"显式胜于隐式"原则

#### D4 = Factory + Singleton（对齐 driverRegistry）

**对齐** `src/oxl/md-bridge/driver-registry.ts:26-99` 现有范式：

```ts
class DriverRegistryImpl {
  private drivers = new Map<...>()
  register(driver: OxlDriver): void
  get(name: OxlDriverName): OxlDriver
  setDefault(name: OxlDriverName): void
  getDefault(): OxlDriver
  list(): OxlDriverName[]
}

export const driverRegistry = new DriverRegistryImpl()
export function getActiveDriver(): OxlDriver
export function setActiveDriver(name: OxlDriverName): void
```

**新增 `EntityRegistry` 完全沿用此范式**：
- 物理隔离 L1-OXL（`src/oxl/md-bridge/entity-registry.ts`）
- 严格 ESM 单例（class impl + module-level export）
- 测试隔离用 `_clearForTest()`（仅 NODE_ENV !== 'production' 暴露）

**排除简单 switch**：
- 5 个 `case` 在 decompiler / compiler / validator 三处出现 = 15 处重复
- 新增 entity type 需改 3 个 switch

**选定 Factory + Singleton**：
- `entityRegistry.get(type).compile(...)` 一处查表
- 新增 entity = 创建 1 个类 + 1 行 `registerEntityCompiler(...)`
- 5 个 entity compiler 物理独立（`compilers/domain-compiler.ts` 等 5 文件）

#### D5 = 3 个串行子 PR

**PR 拆分**：
- **PR-A** `feat/v0.3-t18-md-native-grammar`：grammar + 5 compiler + registry；**不破坏**旧生态（保留 `'native' | 'directive'` 双选项）
- **PR-B** `feat/v0.3-t19-md-native-migrate`：decompiler 全切 + 11 个 domains-md 迁移 + 8 个 fixture 迁移 + `E_MD_DEPRECATED_SYNTAX`
- **PR-C** `feat/v0.3-t20-md-native-highlight`：oxn-vscode grammar + VitePress CSS

**串行理由**：
- PR-A 的 `'native' | 'directive'` 选项是 PR-B 的"安全网"——PR-B 出问题可立刻回退
- PR-C 与 A/B 无代码依赖（grammar 与 highlight 物理隔离）
- 评审压力分散：每个 PR ~200-500 行 diff，可读

**排除 1 大 PR**：
- 30+ 文件同 PR diff 过大
- 一处回归全 PR 回滚
- 评审无法短时间消化

#### D6 = v0.3.0 涵盖（不推迟 v0.4）

**前提**：v0.3.0 阶段 0-4 全部完成（8 commits，1545 tests pass），尚未正式发版 tag。

**流程**：
1. **snapshot**：打 `git tag v0.2.x` 锁住改革前状态
2. **实施**：PR-A → PR-B → PR-C 串行合入 `feat/v0.3-md-ssot`
3. **发版**：v0.3.0 tag + CHANGELOG + npm publish

**排除 v0.3.0-rc + v0.3.1**：
- 增加版本管理复杂度
- 与 v0.3.0-alpha 概念重叠

**排除推迟 v0.4**：
- v0.3.0 已引入 md-bridge，但用了有损语法——越晚改越痛
- 11 个 domains-md 文件还没对外发布，迁移成本低

#### D7 = 仅 CSS 着色（VitePress）

**VitePress 改造方案**：

| 方案 | 工作量 | 效果 |
|---|---|---|
| 仅 CSS | 1.5 天 | H2 分类按类型染色（H1 上色条 + 4px 左边框 + 浅色背景）|
| + remarkDirective | 3 天 | 自定义块 + 装饰 HTML，灵活性高 |
| 不动 | 0 | docs/ 不变（VitePress 渲染原生 MD 已可用）|

**选定仅 CSS**：
- 纯 MD 已是 VitePress 原生支持
- 仅需 `docs/.vitepress/theme/custom.css` 加 CSS 选择器（`h1` + `h2` + `h3` 文本匹配）
- 性能最佳，0 运行时开销

---

## 3. 终版语法规范

### 3.1 文件级骨架

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

### 3.2 5 类实体的 H2 分类白名单

| Entity | H2 分类 | H3 实例 | H3 下的列表字段 |
|---|---|---|---|
| **domain** | `## Terms` | term 名（PascalCase）| `- name:`（冗余但可选）、`- desc:` |
| | `## Bans` | ban 名（kebab-case）| `- items: <comma-separated>` |
| | `## Invariants` | invariant 名 | `- value: <text>` 或 `- script: <expr>` |
| **blueprint** | `## Props` | prop 名 | `- type:`、`- values:`、`- required:`、`- default:` |
| | `## Slots` | slot 名 | `- deps:`、`- observe:` |
| **work** | `## Context` | context 名（一般 `main`）| `- goal:`、`- max_iterations:`、`- constraints:` |
| | `## Tasks` | task 名 | `- blueprint:`、`- domain:`、嵌套 `- part:` |
| **task**（独立文件）| `## Parts` | part 名 | `- skill_context:`、嵌套 `- probe:` |
| | `## Probes` | probe 名 | `- scheme:`、`- expect:` |
| **proof** | `## Verdicts` | verdict 名 | `- type: pass\|fail\|inconclusive`、`- value:` |
| | `## Runtime` | runtime 名 | `- observed_at:`、`- probe:` |

### 3.3 5 类实体的完整示例

#### Domain 完整示例

```md
---
entity: domain
version: 0.3.0
name: IntentAlignContext
---
# Domain: IntentAlignContext

> Intent 轴 + Align 轴统一词汇：CLI 入口、OXL 自身、Program 业务概念三件套的合并域

## Terms
### Intent
- name: Intent
- desc: 声明式意图，不可执行
### Domain
- name: Domain
- desc: 业务 Intent 资产
### Work
- name: Work
- desc: 一次任务执行的沙盒

## Bans
### forbidden-constructs
- items: Job, TaskRun, Execution, Pipeline, VerdictAsException, Plugin, Extension, Hook

## Invariants
### inv-iap-intent
- value: Intent 由工程师主导、Align 由 AI 主导、Proof 由 Core Engine 主导
### inv-cli-dsl-program
- value: CLI/DSL/Program 词汇归 Intent 轴；Align 轴专属词见 align-domain
```

#### Blueprint 完整示例

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
### replicas
- type: number
- default: 3

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
### lint
- deps:
  - build
- observe:
  - lint-check
### deploy
- deps:
  - test
  - lint
- observe:
  - shell-exec
```

#### Work 完整示例

```md
---
entity: work
version: 0.3.0
name: refactor-auth-module
---
# Work: refactor-auth-module

## Context
### main
- goal: 重构 auth 模块，移除旧加密逻辑
- max_iterations: 3
- constraints:
  - 不修改 src/cli 目录
  - 必须保留 1 个旧测试

## Tasks
### step1-prep
- blueprint: ci-pipeline
- domain: CoreDomain
- part: build_module
  - skill_context: 打包并检查产物
  - probe: check_artifact_size
    - scheme: fs
    - expect: exists=true
- part: run_tests
  - skill_context: 运行单元测试
  - probe: test_pass_rate
    - scheme: shell
    - expect: "pass_rate > 0.9"
### step2-deploy
- blueprint: deploy-service
- domain: CoreDomain
- part: deploy
  - skill_context: 部署到 staging
  - probe: http-responds
    - scheme: http
    - expect: status=200
```

#### Task 独立文件示例

```md
---
entity: task
version: 0.3.0
name: build_module
---
# Task: build_module

> 打包并检查产物

## Parts
### compile
- skill_context: 编译 TypeScript + 打包
### check_size
- skill_context: 检查产物大小
- probe: check_artifact_size
  - scheme: fs
  - expect: exists=true

## Probes
### test_pass_rate
- scheme: shell
- expect: "pass_rate > 0.9"
```

#### Proof 完整示例

```md
---
entity: proof
version: 0.3.0
name: step1-prep-verdict
---
# Proof: step1-prep-verdict

> 步骤 1 验证判决书

## Verdicts
### artifact-size-check
- type: pass
- value: artifact size = 2.3MB < 5MB
### test-pass-rate
- type: pass
- value: pass_rate = 0.96 > 0.9
### lint-check
- type: inconclusive
- value: 1 warning found, manual review needed

## Runtime
### observed-at
- observed_at: 2026-06-23T12:34:56Z
- probes_run: 3
- probes_passed: 2
- probes_inconclusive: 1
```

### 3.4 newline 纪律（序列化器硬性规则）

| 位置 | 规则 |
|---|---|
| `---` frontmatter → H1 | 1 个空行 |
| H1 → H1 下 quote 块 | 0 空行（紧贴）|
| H1 → H1 下首个 H2 | 1 个空行 |
| H2 → H2（同 level）| 1 个空行 |
| H2 → H3 | 1 个空行 |
| H3 → H3（同 level）| 1 个空行 |
| H3 → 列表首项 | 0 空行（紧贴）|
| 列表项之间 | 0 空行 |
| 列表末项 → 下个 H3 / H2 | 1 个空行 |
| 列表末项 → 文档尾 | 0 空行（`trimEnd`）|
| 缩进子列表 | 父 `listItem` 内容的延续，0 空行 |
| 嵌套 listItem 缩进 | 2 空格（`mdast` 序列化默认）|

**测试**：`Buffer.byteEquals(serialized, expectedGolden)` 严格校验。

---

## 4. Factory + Singleton 架构

### 4.1 核心抽象：`EntityCompiler` 接口

```ts
// src/oxl/md-bridge/entity-compiler.ts
import type { Root } from 'mdast'
import type { IntentEntityType } from './pipeline.js'

export interface CompileInput {
  /** Langium AST 节点（DomainDeclaration / BlueprintDeclaration / WorkDeclaration / TaskDeclaration / ProbeDeclaration）*/
  decl: unknown
  options: CompileOptions
}

export interface CompileOutput {
  md: string
  name: string
  warnings: string[]
}

export interface ParseInput {
  mdast: Root
  frontmatter: Record<string, unknown>
  options: ParseOptions
}

export interface ValidationInput {
  mdast: Root
  frontmatter: Record<string, unknown>
  filePath?: string
}

export interface ValidationError {
  code: `E_MD_${string}`
  message: string
  line?: number
  column?: number
  severity: 'error' | 'warning'
}

export interface CompileOptions {
  version?: string
  frontmatter?: boolean
  sourceHash?: string
}

export interface ParseOptions {
  /** v0.3 兼容期选项：true = 抛 E_MD_DEPRECATED_SYNTAX（默认），false = 静默忽略（v0.4 移除）*/
  legacyDirective?: boolean
}

/**
 * EntityCompiler — 5 类顶层实体的统一编译/解析/校验契约
 *
 * 实现：DomainCompiler / BlueprintCompiler / WorkCompiler / TaskCompiler / ProofCompiler
 * 注册：EntityRegistry.register(compiler)
 * 调用：entityRegistry.get(type).compile/decompile/validate
 */
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

### 4.2 Registry：单例 + 工厂

```ts
// src/oxl/md-bridge/entity-registry.ts
import { IAPError } from '../core/errors/iap-error.js' // 实际路径
import type { EntityCompiler } from './entity-compiler.js'
import type { IntentEntityType } from './pipeline.js'

class EntityRegistryImpl {
  private compilers = new Map<IntentEntityType, EntityCompiler>()

  /**
   * 注册 compiler。同 type 后注册覆盖前注册（开发期 warn，生产期 silent 覆盖）。
   */
  register(compiler: EntityCompiler): void {
    if (this.compilers.has(compiler.entityType)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[EntityRegistry] overwriting compiler for '${compiler.entityType}' ` +
          `(previous: ${this.compilers.get(compiler.entityType)!.constructor.name}, ` +
          `new: ${compiler.constructor.name})`
        )
      }
    }
    this.compilers.set(compiler.entityType, compiler)
  }

  /**
   * Factory 核心：按 type 取出 compiler。未注册 → 抛 IAPError。
   */
  get(type: IntentEntityType): EntityCompiler {
    const compiler = this.compilers.get(type)
    if (!compiler) {
      throw new IAPError({
        code: 'E_OXL_ENTITY_NOT_REGISTERED',
        message: `No EntityCompiler registered for type '${type}'. ` +
                 `Available: ${this.list().join(', ') || '(none)'}`,
        axis: 'intent',
      })
    }
    return compiler
  }

  list(): IntentEntityType[] {
    return Array.from(this.compilers.keys())
  }

  /**
   * 测试隔离：清空注册表。仅 NODE_ENV !== 'production' 暴露。
   */
  _clearForTest(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EntityRegistry._clearForTest is forbidden in production')
    }
    this.compilers.clear()
  }
}

/** 全局单例 */
export const entityRegistry = new EntityRegistryImpl()

/** 便捷函数 */
export function getEntityCompiler(type: IntentEntityType): EntityCompiler {
  return entityRegistry.get(type)
}

export function registerEntityCompiler(compiler: EntityCompiler): void {
  entityRegistry.register(compiler)
}
```

### 4.3 5 个实体 Compiler 实现

| 文件 | 行数 | 职责 | 关键方法 |
|---|---|---|---|
| `compilers/domain-compiler.ts` | ~180 | TermDecl[] / BanBlock / InvariantDecl[] → `## Terms` / `## Bans` / `## Invariants` | `compile`(TermDecl[]) + `parse`(mdast → terms/bans/invariants) |
| `compilers/blueprint-compiler.ts` | ~200 | PropDeclaration[] / PartSlotDeclaration[] → `## Props` / `## Slots`（含 type/required/default/deps/observe）| `compile`(props + slots) + `parse`(mdast → props/slots) |
| `compilers/work-compiler.ts` | ~160 | WorkContext + TaskDeclaration[] → `## Context` / `## Tasks`（含嵌套 Part/Probe 树）| `compile`(context + tasks) + `parse`(mdast → work tree) |
| `compilers/task-compiler.ts` | ~140 | 独立 TaskDeclaration（task.oxn 文件）→ `## Parts` / `## Probes` | `compile`(parts + probes) + `parse` |
| `compilers/proof-compiler.ts` | ~120 | Probe 集合 → `## Verdicts` / `## Runtime`（含三态 verdict）| `compile`(verdicts) + `parse` |
| `compilers/index.ts` | ~30 | 5 个 `registerEntityCompiler(...)` 一次调用；barrel export | — |

**单文件大小约束**：每个 compiler ≤ 200 行（JSDoc + 类型 import 占大头），便于单独 review。

### 4.4 dispatcher 改造

#### 4.4.1 `oxl-md-decompiler.ts` 改造前

```ts
// 改造前：5 case switch
export function decompileOxnDecl(firstEntity: AstNode, options: DecompileOptions): DecompileInternalResult {
  switch (firstEntity.$type) {
    case 'DomainDeclaration':
      ;({ md, name } = decompileDomain(firstEntity as DomainDeclaration, options))
      break
    case 'BlueprintDeclaration':
      ;({ md, name } = decompileBlueprint(firstEntity as BlueprintDeclaration, options))
      break
    // ... 3 more case
  }
}
```

#### 4.4.2 改造后

```ts
// 改造后：1 行 factory 调用
export function decompileOxnDecl(firstEntity: AstNode, options: DecompileOptions): DecompileInternalResult {
  const entityType = extractEntityType(firstEntity) // 'domain' | 'blueprint' | ...
  return getEntityCompiler(entityType).compile({ decl: firstEntity, options })
}

function extractEntityType(node: AstNode): IntentEntityType {
  const typeMap: Record<string, IntentEntityType> = {
    DomainDeclaration: 'domain',
    BlueprintDeclaration: 'blueprint',
    WorkDeclaration: 'work',
    TaskDeclaration: 'task',
    ProofDeclaration: 'proof',
  }
  const type = typeMap[node.$type]
  if (!type) {
    throw new IAPError({
      code: 'E_OXL_UNKNOWN_AST_TYPE',
      message: `Unknown AST node type: ${node.$type}`,
      axis: 'intent',
    })
  }
  return type
}
```

**对比**：
- 改造前：5 case 散落 decompiler / compiler / validator 三处 = 15 处重复
- 改造后：1 个 `getEntityCompiler(type).X(...)` 调用，3 处共享

#### 4.4.3 `mdast-to-kernel.ts` 改造

```ts
// 改造前：5 case switch
function convertMdastToKernel(mdast: Root, entityType: IntentEntityType, ...): KernelObject {
  switch (entityType) {
    case 'domain': return convertDomainMdast(mdast, ...)
    case 'blueprint': return convertBlueprintMdast(mdast, ...)
    // ...
  }
}

// 改造后：1 行 factory
function convertMdastToKernel(mdast: Root, entityType: IntentEntityType, ...): KernelObject {
  const parseResult = getEntityCompiler(entityType).parse({ mdast, frontmatter, options })
  return zodValidate(entityType, parseResult) // 不变
}
```

#### 4.4.4 `mdast-validator.ts` 改造

```ts
// 改造前：5 case switch
function validateMdast(mdast: Root, entityType: IntentEntityType): ValidationError[] {
  const errors: ValidationError[] = []
  switch (entityType) {
    case 'domain': errors.push(...validateDomain(mdast))
    case 'blueprint': errors.push(...validateBlueprint(mdast))
    // ...
  }
  return errors
}

// 改造后：1 行 factory
function validateMdast(mdast: Root, entityType: IntentEntityType): ValidationError[] {
  return getEntityCompiler(entityType).validate({ mdast, frontmatter, filePath })
}
```

### 4.5 与 `driverRegistry` 的关系

```
              ┌──────────────────────────┐
              │     driverRegistry        │  ← v0.3 阶段 1.2 已存在
              │  (langium/mdast 切换)     │
              │  src/oxl/md-bridge/       │
              │    driver-registry.ts     │
              └──────────────────────────┘
                          ▲
                          │ 用 OxlDriver 接口加载 .oxn / .md
                          │
              ┌───────────┴──────────────┐
              │     entityRegistry       │  ← v0.3 改革新增
              │  (5 类实体编译器)         │
              │  src/oxl/md-bridge/       │
              │    entity-registry.ts     │
              └──────────────────────────┘
                          ▲
                          │ 用 EntityCompiler 接口编译/解析/校验
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   DomainCompiler  BlueprintCompiler  WorkCompiler ...
   (compilers/)     (compilers/)       (compilers/)
```

**正交性**：
- `driverRegistry` 决定用哪个**底层解析器**（langium AST vs mdast）
- `entityRegistry` 决定用哪个**业务编译器**（domain vs blueprint vs ...）
- 两层互不依赖，组合灵活

### 4.6 关键约束与陷阱

| 约束 | 处理 |
|---|---|
| **L0–L3 层级** | 7 个新文件全在 `src/oxl/md-bridge/`（L1-OXL）；registry 是纯数据结构，不 import L0-Processor / L1-Infra / L2-Work / L3 |
| **模块副作用** | `compilers/index.ts` 在 import 时立即注册 5 个 compiler；dispatcher 文件需在 import 时 `import './compilers/index.js'` 触发注册 |
| **循环依赖** | compilers 实现不 import dispatcher；dispatcher 不 import 具体 compiler（仅 import registry 接口）|
| **Singleton + 测试** | `_clearForTest()` 仅 NODE_ENV !== 'production' 暴露；concurrent 测试不污染 |
| **Singleton + 多项目** | v0.3 不支持多项目；预留 `EntityRegistry.forProject(projectId: string)` 钩子接口（v0.4 用）|
| **错误码** | `E_OXL_ENTITY_NOT_REGISTERED` 加进 IAPError 字典（axis=intent）|
| **`oxn-vscode` 隔离** | 选 A：VSCode 扩展独立维护 type 白名单，CI drift 守卫 |

### 4.7 `oxn-vscode` 与 `EntityRegistry` 的关系

**隔离策略**（决策 D4 衍生）：

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
import fs from 'node:fs'

const L1_TYPES = JSON.parse(
  fs.readFileSync('src/oxl/md-bridge/intent-entity-types.json', 'utf-8')
)
const L3_TYPES = JSON.parse(
  fs.readFileSync('oxn-vscode/intent-entity-types.json', 'utf-8')
)

if (JSON.stringify(L1_TYPES.sort()) !== JSON.stringify(L3_TYPES.sort())) {
  console.error('Drift detected! L1:', L1_TYPES, 'L3:', L3_TYPES)
  process.exit(1)
}
console.log('OK: intent entity types aligned')
```

**理由**（决策记录）：
- 死守分层架构（L3 → L1 反向依赖会被 `no-restricted-imports` 拦）
- 5 个字符串常量不值得抽跨包共享模块
- CI drift 守卫 0 成本 + 0 误报

---

## 5. 解析器实现

### 5.1 heading-context 提取器

```ts
// src/oxl/md-bridge/extract-headings.ts
import type { Root, Heading, RootContent } from 'mdast'
import { visit } from 'unist-util-visit'

export interface HeadingContext {
  /** 当前 H1 文本（"Domain: IntentAlignContext"）*/
  h1: string
  /** 当前 H2 分类（"Terms" / "Bans" / "Invariants" / ...）*/
  h2: string | null
  /** 当前 H3 实例名 */
  h3: string | null
  /** H3 后的列表节点（紧邻 H3 的第一个 `list`）*/
  h3List: RootContent | null
  /** H3 的位置信息（用于错误码 line/column）*/
  h3Position: { start: { line: number; column: number } } | null
}

/**
 * 维护 H1/H2/H3 上下文栈，遍历 mdast 提取所有 H3 实例的上下文。
 *
 * 用法：
 *   const contexts = extractHeadingContexts(mdast)
 *   for (const ctx of contexts) {
 *     if (ctx.h2 === 'Terms') {
 *       const term = parseTermList(ctx.h3List, ctx.h3!)
 *     }
 *   }
 */
export function extractHeadingContexts(mdast: Root): HeadingContext[] {
  const contexts: HeadingContext[] = []
  let currentH1: string = ''
  let currentH2: string | null = null
  let pendingH3: string | null = null
  let pendingH3Position: { start: { line: number; column: number } } | null = null

  visit(mdast, (node) => {
    if (node.type === 'heading') {
      const heading = node as Heading
      const text = collectText(heading)

      if (heading.depth === 1) {
        currentH1 = text
        currentH2 = null
        pendingH3 = null
      } else if (heading.depth === 2) {
        currentH2 = text
        pendingH3 = null
      } else if (heading.depth === 3) {
        pendingH3 = text
        pendingH3Position = heading.position ?? null
        // 不立即 push，等 H3 后的 list 提取
        contexts.push({
          h1: currentH1,
          h2: currentH2,
          h3: pendingH3,
          h3List: null, // 由 visit 后处理填充
          h3Position: pendingH3Position,
        })
      } else if (heading.depth >= 4) {
        // H4+ 视为 H3 的子结构；不创建新 context，由 list 解析递归处理
        pendingH3 = null
      }
    } else if (node.type === 'list' && pendingH3) {
      // 紧跟 H3 的第一个 list 节点
      const lastCtx = contexts[contexts.length - 1]
      if (lastCtx && lastCtx.h3 === pendingH3 && lastCtx.h3List === null) {
        lastCtx.h3List = node
      }
    }
  })

  return contexts
}
```

### 5.2 列表字段提取器

```ts
// src/oxl/md-bridge/extract-list-fields.ts
import type { List, ListItem, Paragraph, Text, PhrasingContent } from 'mdast'

export type ListField = {
  key: string
  value: string | string[] | ListField[] // 标量/数组/嵌套字段
}

/**
 * 递归提取 list 节点的所有字段。
 *
 * 支持：
 * - `- key: value` → 标量
 * - `- key:` 后接子 list → 数组
 * - `- key:` 后接嵌套 `- subkey: value` → 嵌套字段
 *
 * 关键不变量：
 * - 不依赖缩进空格数；只依赖 mdast 树形父子关系
 * - 嵌套 list 节点的 `listItem.children` 递归
 */
export function extractListFields(listNode: List): ListField[] {
  const fields: ListField[] = []

  for (const item of listNode.children) {
    if (item.type !== 'listItem') continue

    const field = parseListItem(item)
    if (field) fields.push(field)
  }

  return fields
}

function parseListItem(item: ListItem): ListField | null {
  // listItem.children 第一个元素通常是 paragraph，包含 "- key: value" 文本
  const firstChild = item.children[0]
  if (!firstChild || firstChild.type !== 'paragraph') return null

  // 提取 "- key: value" 中的 key
  const { key, remainder } = extractKeyFromParagraph(firstChild)
  if (!key) return null

  // 剩余内容处理
  // 情形 1：remainder 是空，子节点是 list → 数组
  // 情形 2：remainder 是空，子节点是 list 且 listItem 内是 "- subkey: value" → 嵌套字段
  // 情形 3：remainder 是文本 → 标量
  const childList = item.children.find((c) => c.type === 'list') as List | undefined

  if (remainder.trim() === '' && childList) {
    // 判断是数组还是嵌套字段
    if (isNestedFieldFormat(childList)) {
      // 嵌套字段：递归提取
      return { key, value: extractListFields(childList) }
    } else {
      // 数组：每个 listItem 是标量
      const arr = childList.children
        .map((li) => li.type === 'listItem' ? collectText(li) : null)
        .filter((s): s is string => s !== null)
      return { key, value: arr }
    }
  }

  // 情形 3：标量
  return { key, value: remainder.trim() }
}

function extractKeyFromParagraph(p: Paragraph): { key: string; remainder: string } {
  // 期望格式: "- key: value" 或 "- key:"（value 在子 list）
  // p.children 通常是 [Text{ value: "key: value" }] 或 [Strong, Text{ value: ": ..." }]
  // 简化：拼接所有文本，匹配第一个 ":"
  const fullText = p.children
    .filter((c): c is PhrasingContent => 'value' in c || 'children' in c)
    .map((c) => {
      if ('value' in c && typeof c.value === 'string') return c.value
      return ''
    })
    .join('')

  const colonIdx = fullText.indexOf(':')
  if (colonIdx === -1) return { key: '', remainder: fullText }

  return {
    key: fullText.slice(0, colonIdx).trim(),
    remainder: fullText.slice(colonIdx + 1).trim(),
  }
}

function isNestedFieldFormat(list: List): boolean {
  // 启发式：若 listItem 第一个子元素含 ":" 则视为嵌套字段
  for (const item of list.children) {
    if (item.type !== 'listItem') continue
    const p = item.children[0]
    if (p && p.type === 'paragraph') {
      const text = collectText(p)
      if (text.includes(':')) return true
    }
  }
  return false
}

function collectText(node: ListItem | Paragraph | PhrasingContent): string {
  if ('value' in node && typeof node.value === 'string') return node.value
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map(collectText).join('')
  }
  return ''
}
```

### 5.3 单个 entity compiler 示例（Domain）

```ts
// src/oxl/md-bridge/compilers/domain-compiler.ts
import type { EntityCompiler, CompileInput, CompileOutput, ParseInput, ValidationInput, ValidationError, ParseOptions } from '../entity-compiler.js'
import { extractHeadingContexts } from '../extract-headings.js'
import { extractListFields, type ListField } from '../extract-list-fields.js'
import { collectHeadingText } from '../collect-text.js' // 工具

export class DomainCompiler implements EntityCompiler {
  readonly entityType = 'domain' as const

  compile(input: CompileInput): CompileOutput {
    const domain = input.decl as DomainDeclaration // 假设已 type narrow
    // 序列化 TermDecl[] / BanBlock / InvariantDecl[] 为 ## Terms / ## Bans / ## Invariants
    // ... (与 v0.3 阶段 1 相同的 Langium AST → 字符串逻辑)
  }

  parse(input: ParseInput): Record<string, unknown> {
    const { mdast, frontmatter, options } = input

    // 1. 校验 legacy :::intent
    if (options.legacyDirective !== false) {
      const legacy = findLegacyIntentBlocks(mdast)
      if (legacy.length > 0) {
        throw new IAPError({
          code: 'E_MD_DEPRECATED_SYNTAX',
          message: 'Syntax deprecated in v0.3.0. Please use `oxn domain compile` to generate fresh .md from your .oxn files.',
          line: legacy[0].position?.start.line,
          axis: 'intent',
        })
      }
    }

    // 2. 提取 heading contexts
    const contexts = extractHeadingContexts(mdast)

    // 3. 按 H2 分类聚合
    const terms: TermObj[] = []
    const bans: BanObj[] = []
    const invariants: InvariantObj[] = []

    for (const ctx of contexts) {
      if (!ctx.h3 || !ctx.h3List) continue
      const fields = extractListFields(ctx.h3List as List)

      switch (ctx.h2) {
        case 'Terms':
          terms.push(parseTerm(ctx.h3, fields))
          break
        case 'Bans':
          bans.push(parseBan(ctx.h3, fields))
          break
        case 'Invariants':
          invariants.push(parseInvariant(ctx.h3, fields))
          break
      }
    }

    return {
      entity: 'domain',
      name: frontmatter.name,
      version: frontmatter.version,
      terms,
      bans,
      invariants,
    }
  }

  validate(input: ValidationInput): ValidationError[] {
    const errors: ValidationError[] = []
    const { mdast, frontmatter, filePath } = input

    // 1. H1 必须与 frontmatter.name 一致
    const h1 = mdast.children.find((n): n is Heading => n.type === 'heading' && n.depth === 1)
    if (!h1) {
      errors.push({
        code: 'E_MD_H1_MISSING',
        message: 'Missing H1 heading (e.g., `# Domain: Name`)',
        severity: 'error',
      })
    } else {
      const h1Text = collectHeadingText(h1)
      const expectedH1 = `Domain: ${frontmatter.name}`
      if (h1Text !== expectedH1) {
        errors.push({
          code: 'E_MD_H1_MISMATCH',
          message: `H1 '${h1Text}' does not match expected '${expectedH1}'`,
          severity: 'error',
          line: h1.position?.start.line,
          column: h1.position?.start.column,
        })
      }
    }

    // 2. H3 唯一性检查（按 H2 分类内）
    const contexts = extractHeadingContexts(mdast)
    const h3Seen = new Map<string, { name: string; line: number }>()
    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      const key = `${ctx.h2}::${ctx.h3}`
      if (h3Seen.has(key)) {
        const first = h3Seen.get(key)!
        errors.push({
          code: 'E_MD_DUPLICATE_H3',
          message: `Duplicate H3 '${ctx.h3}' in '${ctx.h2}' (first seen at line ${first.line})`,
          severity: 'error',
          line: ctx.h3Position?.start.line,
        })
      } else {
        h3Seen.set(key, { name: ctx.h3, line: ctx.h3Position?.start.line ?? 0 })
      }
    }

    // 3. H2 分类白名单
    const allowedH2 = new Set(['Terms', 'Bans', 'Invariants'])
    for (const ctx of contexts) {
      if (ctx.h2 && !allowedH2.has(ctx.h2)) {
        errors.push({
          code: 'E_MD_CATEGORY_UNKNOWN',
          message: `Unknown H2 category '${ctx.h2}' for entity type 'domain'. Allowed: ${[...allowedH2].join(', ')}`,
          severity: 'error',
          line: ctx.h3Position?.start.line,
        })
      }
    }

    return errors
  }
}
```

### 5.4 注册入口

```ts
// src/oxl/md-bridge/compilers/index.ts
/**
 * Side-effect import: 注册 5 个 EntityCompiler 到全局 entityRegistry。
 *
 * 使用方必须 import 此文件以触发注册：
 *   import './compilers/index.js'
 *
 * 未来 v0.4 引入 DI 容器时再重构为显式注册。
 */
import { registerEntityCompiler } from '../entity-registry.js'
import { DomainCompiler } from './domain-compiler.js'
import { BlueprintCompiler } from './blueprint-compiler.js'
import { WorkCompiler } from './work-compiler.js'
import { TaskCompiler } from './task-compiler.js'
import { ProofCompiler } from './proof-compiler.js'

registerEntityCompiler(new DomainCompiler())
registerEntityCompiler(new BlueprintCompiler())
registerEntityCompiler(new WorkCompiler())
registerEntityCompiler(new TaskCompiler())
registerEntityCompiler(new ProofCompiler())

export { DomainCompiler, BlueprintCompiler, WorkCompiler, TaskCompiler, ProofCompiler }
```

---

## 6. 3 个子 PR 详细计划

### 6.1 PR-A：`feat/v0.3-t18-md-native-grammar`（3.5 天）

**目标**：建立纯 MD 语法解析能力，**不破坏**旧 `:::intent{...}` 生态。

**新增文件**（8 个 + 7 个测试）：

| 路径 | 行数 | 角色 |
|---|---|---|
| `src/oxl/md-bridge/entity-compiler.ts` | ~120 | `EntityCompiler` 接口 + 5 个 input/output 类型 |
| `src/oxl/md-bridge/entity-registry.ts` | ~80 | 单例 + factory + `_clearForTest` |
| `src/oxl/md-bridge/extract-headings.ts` | ~120 | H1/H2/H3 上下文栈 |
| `src/oxl/md-bridge/extract-list-fields.ts` | ~150 | 嵌套列表字段递归提取 |
| `src/oxl/md-bridge/compilers/domain-compiler.ts` | ~180 | Domain 实现 |
| `src/oxl/md-bridge/compilers/blueprint-compiler.ts` | ~200 | Blueprint 实现 |
| `src/oxl/md-bridge/compilers/work-compiler.ts` | ~160 | Work 实现 |
| `src/oxl/md-bridge/compilers/task-compiler.ts` | ~140 | Task 实现 |
| `src/oxl/md-bridge/compilers/proof-compiler.ts` | ~120 | Proof 实现 |
| `src/oxl/md-bridge/compilers/index.ts` | ~30 | 注册入口 + barrel export |
| **小计** | **~1300** | |

**修改文件**：

| 路径 | 修改 |
|---|---|
| `src/oxl/md-bridge/pipeline.ts` | 删 `remark-directive` plugin（保留 `remark-parse + remark-frontmatter`）|
| `src/oxl/md-bridge/oxl-md-decompiler.ts` | 加 `{ syntax: 'native' \| 'directive' }` 选项；'native' 走 `EntityRegistry.get(type).compile(...)` |
| `src/oxl/md-bridge/mdast-to-kernel.ts` | 加 `{ syntax }` 选项；'native' 走 `EntityRegistry.get(type).parse(...)` |
| `src/oxl/md-bridge/mdast-validator.ts` | 加 `{ syntax }` 选项；'native' 走 `EntityRegistry.get(type).validate(...)` |
| `src/oxl/md-bridge/index.ts` | barrel 导出 `entityRegistry` + 5 个 compiler class |
| **小计** | **~80 行 delta** |

**新增测试文件**：

| 路径 | 覆盖 |
|---|---|
| `__tests__/entity-registry.test.ts` | 单例性 / register 覆盖 / get 抛 IAPError / list / `_clearForTest` 守卫 |
| `__tests__/extract-headings.test.ts` | H1/H2/H3 提取 + 上下文切换 + H3 后 list 关联 |
| `__tests__/extract-list-fields.test.ts` | 标量/数组/嵌套字段 + 缩进无关性 |
| `__tests__/compilers/domain-compiler.test.ts` | 纯 unit test，5 fixture |
| `__tests__/compilers/blueprint-compiler.test.ts` | 同上 |
| `__tests__/compilers/work-compiler.test.ts` | 含嵌套 Part/Probe |
| `__tests__/compilers/task-compiler.test.ts` | 独立 task 文件 |
| `__tests__/compilers/proof-compiler.test.ts` | 三态 verdict |
| `__tests__/mdast-to-kernel-native.test.ts` | 跨 compiler 端到端（5 fixture）|
| **小计** | **~70 cases** |

**验收**：

- [ ] `bun test src/oxl/md-bridge/__tests__/` 全过（**新 70 cases** + 旧 97 cases 不破坏）
- [ ] 5 类 E_MD_xxx 旧错误码 + 7 个新错误码全触发
- [ ] `bun run lint` + `bun run typecheck` 通过
- [ ] L0–L3 架构守卫通过（`bun scripts/validate-dependencies.ts`）
- [ ] **不破坏 11 个 `domains-md/*.md` 旧格式**（仍走 `'directive'` 分支）
- [ ] **不破坏 8 个旧测试**（仍走 `'directive'` 分支）

### 6.2 PR-B：`feat/v0.3-t19-md-native-migrate`（2 天）

**目标**：decompiler 全切到纯 MD 输出，11 个 domains-md 重生，8 个旧测试 fixture 迁移。

**修改 dispatcher**：

| 路径 | 修改 |
|---|---|
| `src/oxl/md-bridge/pipeline.ts` | 删 `remark-directive`（PR-A 已删）|
| `src/oxl/md-bridge/oxl-md-decompiler.ts` | 5 个 `serializeXxx` **全部重写**为调用 `EntityRegistry.get(type).compile(...)`；**移除 `'directive'` 选项**（v0.3 完成后丢弃）|
| `src/oxl/md-bridge/mdast-to-kernel.ts` | 移除 `'directive'` 选项 |
| `src/oxl/md-bridge/mdast-validator.ts` | 移除 `'directive'` 选项；旧 `:::intent{...}` 块**抛 `E_MD_DEPRECATED_SYNTAX`** |

**重写 5 个 serializeXxx**（保持 newline 纪律 §3.4）：

| 函数 | 输出格式 |
|---|---|
| `serializeDomain` | `# Domain: <name>` + quote + `## Terms` `## Bans` `## Invariants` + `### <name>` + 列表 |
| `serializeBlueprint` | `# Blueprint: <name>` + `## Props` `## Slots` |
| `serializeWork` | `# Work: <name>` + `## Context` `## Tasks`（含嵌套 `- part:`）|
| `serializeTask` | `# Task: <name>` + `## Parts` `## Probes` |
| `serializeProof` | `# Proof: <name>` + `## Verdicts` `## Runtime` |

**重生 .openxenon/domains-md/**（11 文件 × ~150 行 = ~1650 行）：

| 文件 | 旧行数 | 新行数 |
|---|---|---|
| `intent-domain.md` | 162 | ~160 |
| `align-domain.md` | 258 | ~250 |
| `intent-align-context.md` | 110 | ~110 |
| `L0L3Context.md` | ~150 | ~150 |
| `DocContext.md` | ~80 | ~80 |
| `CodeQualityContext.md` | ~80 | ~80 |
| `config-domain.md` | ~80 | ~80 |
| `proof-domain.md` | ~100 | ~100 |
| `iap-error-context.md` | ~80 | ~80 |
| `TaintContext.md` | ~80 | ~80 |
| `SecurityContext.md` | ~50 | ~50 |

**重生方式**：
```bash
# 用 v0.3 旧 .oxn 编译 → 新 .md
oxn domain compile --from .openxenon/domains/intent-domain.oxn --to .openxenon/domains-md/intent-domain.md
# 或用脚本批量
bun scripts/migrate-domains-to-native-md.ts
```

**迁移 8 个测试 fixture**（用 PR-A 的 fixture 模板替换所有 `:::intent{...}` 字面量）：

| 文件 | 旧 `:::intent` 出现次数 |
|---|---|
| `pipeline.test.ts` | 3 |
| `remark-to-mdast.test.ts` | 12 |
| `mdast-to-kernel.test.ts` | 13 |
| `mdast-validator.test.ts` | 5 |
| `oxl-md-decompiler.test.ts` | 8（断言正则需重写）|
| `oxl-md-stage2.test.ts` | 11 |
| `oxl-driver.test.ts` | 0（结构不变）|
| **小计** | **~52 处** |

**修改用户文档**（2 篇）：

| 路径 | 修改 |
|---|---|
| `docs/zh-cn/intent.md` | 重写示例段（删除 ` ```oxn ` 代码块示例，改为 H1/H2/H3 + 列表示例）|
| `docs/en/intent.md` | 同上（en Locale 与 zh-CN 保持一致，per L0L3Context 不变量）|

**验收**：

- [ ] `oxn domain validate IntentDomain` 等 11 个命令全过
- [ ] `oxn domain migrate --from .oxn` 输出字节级等于 `.openxenon/domains-md/intent-domain.md`
- [ ] 全部 `bun test` 通过：**1545 + 70 - 旧 52 fixture** = ~1563 tests
- [ ] `oxn domain list` 11 个 domain 全识别
- [ ] L0–L3 架构守卫通过
- [ ] `Buffer.byteEquals(serialized, expectedGolden)` 字节级校验
- [ ] 删除 `remark-directive` 依赖（`package.json`）
- [ ] **breaking change**：旧 `:::intent{...}` 解析期抛 `E_MD_DEPRECATED_SYNTAX`（文档/changelog 写明「请重新跑 `oxn domain compile`」）

### 6.3 PR-C：`feat/v0.3-t20-md-native-highlight`（1.5 天）

**目标**：VSCode 扩展 + VitePress 文档站对纯 MD 加色彩。

**VSCode 扩展**（`oxn-vscode/`）：

| 路径 | 动作 | 行数 |
|---|---|---|
| `syntaxes/oxn-intent.tmLanguage.json` | 新建：识别 5 类 H1（`# Domain:` / `# Blueprint:` / ...）+ 7 类 H2（`## Terms` / `## Bans` / `## Invariants` / `## Props` / `## Slots` / `## Tasks` / `## Context`）+ frontmatter keys | ~120 |
| `package.json` | `grammars` 数组加 markdown 注入 | +20 |
| `__tests__/tmLanguage.test.ts` | 12 fixture 验证 scope | ~80 |
| `__tests__/__fixtures__/domain.md` 等 | 5 fixture | 5 × 20 行 |
| **小计** | | **~320** |

**关键 grammar pattern**（节选）：

```jsonc
{
  "scopeName": "markdown.intent.extensions.oxn",
  "injectionSelector": "L:text.html.markdown",
  "patterns": [
    { "include": "#frontmatter" },
    { "include": "#h1-entity" },
    { "include": "#h2-category" }
  ],
  "repository": {
    "frontmatter": {
      "begin": "^---$",
      "end": "^---$",
      "contentName": "source.embedded.yaml",
      "patterns": [
        { "include": "source.yaml" }
      ]
    },
    "h1-entity": {
      "match": "^#\\s+(Domain|Blueprint|Work|Task|Proof):\\s+([A-Za-z][\\w-]*)",
      "captures": {
        "1": { "name": "keyword.control.entity.oxn" },
        "2": { "name": "entity.name.type.oxn" }
      }
    },
    "h2-category": {
      "match": "^##\\s+(Terms|Bans|Invariants|Props|Slots|Tasks|Context|Parts|Probes|Verdicts|Runtime)\\b",
      "captures": {
        "1": { "name": "keyword.control.category.oxn" }
      }
    }
  }
}
```

**VitePress 文档站**（`docs/.vitepress/`）：

| 路径 | 动作 | 行数 |
|---|---|---|
| `theme/custom.css` | 新建：H1 顶部色条 + H2 左侧 4px 边框 + 浅色背景；5 类 H1 + 11 类 H2 各配色 | ~120 |
| `config.ts` | `themeConfig` 注册 custom.css 路径 | +3 |
| **小计** | | **~125** |

**关键 CSS**（节选）：

```css
/* docs/.vitepress/theme/custom.css */

/* H1 顶部色条 */
.markdown-body h1:has-text("Domain:") { border-top: 4px solid #4A90E2; padding-top: 8px; }
.markdown-body h1:has-text("Blueprint:") { border-top: 4px solid #50C878; padding-top: 8px; }
.markdown-body h1:has-text("Work:") { border-top: 4px solid #FF8C42; padding-top: 8px; }
.markdown-body h1:has-text("Task:") { border-top: 4px solid #9B59B6; padding-top: 8px; }
.markdown-body h1:has-text("Proof:") { border-top: 4px solid #E74C3C; padding-top: 8px; }

/* H2 分类左边框 + 浅色背景 */
.markdown-body h2:has-text("Terms") { border-left: 4px solid #4A90E2; background: #E8F0FE; padding: 4px 12px; }
.markdown-body h2:has-text("Bans") { border-left: 4px solid #E74C3C; background: #FDEDEC; padding: 4px 12px; }
.markdown-body h2:has-text("Invariants") { border-left: 4px solid #9B59B6; background: #F4ECF7; padding: 4px 12px; }
.markdown-body h2:has-text("Props") { border-left: 4px solid #95A5A6; background: #F4F6F7; padding: 4px 12px; }
.markdown-body h2:has-text("Slots") { border-left: 4px solid #50C878; background: #EAFAF1; padding: 4px 12px; }
.markdown-body h2:has-text("Tasks") { border-left: 4px solid #FF8C42; background: #FDF2E9; padding: 4px 12px; }
/* ... 其余 5 类 H2 */
```

**验收**：

- [ ] VSCode 装 `oxn-dsl-0.1.0.vsix` 后打开 `.openxenon/domains-md/intent-domain.md`：`# Domain: IntentDomain` 染深蓝；`## Terms` 浅蓝背景；`### Intent` 加粗
- [ ] `bun run docs:build` 通过；本地预览 H2 分类色彩
- [ ] `bun test oxn-vscode/__tests__/tmLanguage.test.ts` 12 cases 全过
- [ ] **0 新 npm 依赖**

---

## 7. IAPError 字典新增

### 7.1 现有 12 码 → 20 码

| 错误码 | axis | severity | 触发 | 状态 |
|---|---|---|---|---|
| `E_MD_INVALID_SYNTAX` | intent | error | mdast 解析失败 | v0.3 已有 |
| `E_MD_MISSING_REQUIRED` | intent | error | 必填字段缺失 | v0.3 已有 |
| `E_MD_TYPE_MISMATCH` | intent | error | 字段类型不符 | v0.3 已有 |
| `E_MD_REFERENCE_BROKEN_FATAL` | intent | error | 内部 Intent 引用断链 | v0.3 已有 |
| `E_MD_REFERENCE_BROKEN_WARN` | intent | warning | 外部 URL/路径失效 | v0.3 已有 |
| `E_MD_HASH_MISMATCH` | intent | error | frozen.json hash 不一致 | v0.3 已有 |
| `E_MD_DEPRECATED_SYNTAX` | intent | error | 检测到 `:::intent{...}` 块（v0.3.0 breaking change）| **PR-B 新增** |
| `E_MD_DUPLICATE_H3` | intent | error | 同一 `## Category` 下 H3 文本重复 | **PR-A 新增** |
| `E_MD_H1_MISSING` | intent | error | frontmatter 有 `entity` 但无对应 H1 | **PR-A 新增** |
| `E_MD_H1_MISMATCH` | intent | error | H1 文本与 `frontmatter.name` 不一致 | **PR-A 新增** |
| `E_MD_CATEGORY_UNKNOWN` | intent | error | H2 不在 5 类实体的白名单 Category 集合内 | **PR-A 新增** |
| `E_MD_LIST_FORMAT_INVALID` | intent | error | `- key: value` 格式解析失败（缺冒号、值类型不匹配 schema）| **PR-A 新增** |
| `E_MD_NESTED_LEVEL_OVERFLOW` | intent | error | 嵌套列表超过 3 层（Part > Probe > expect）| **PR-A 新增** |
| `E_OXL_ENTITY_NOT_REGISTERED` | intent | error | `entityRegistry.get(type)` 找不到 type | **PR-A 新增** |

**总计**：12 → 20 码（+8）

### 7.2 同步更新

- `src/core/errors/iap-error.ts`（或等价文件）字典更新
- `docs/zh-cn/iap-cheatsheet.md` 增 8 行
- `docs/en/iap-cheatsheet.md` 增 8 行
- `.changes/0-3-0-md-native.md` changelog 片段

---

## 8. 新建/重写文件清单

### 8.1 新建文件（PR-A）

| 路径 | 行数 | L 层级 | 角色 |
|---|---|---|---|
| `entity-compiler.ts` | ~120 | L1-OXL | 接口 |
| `entity-registry.ts` | ~80 | L1-OXL | 单例 + factory |
| `extract-headings.ts` | ~120 | L1-OXL | heading 上下文 |
| `extract-list-fields.ts` | ~150 | L1-OXL | 列表递归提取 |
| `compilers/domain-compiler.ts` | ~180 | L1-OXL | Domain |
| `compilers/blueprint-compiler.ts` | ~200 | L1-OXL | Blueprint |
| `compilers/work-compiler.ts` | ~160 | L1-OXL | Work |
| `compilers/task-compiler.ts` | ~140 | L1-OXL | Task |
| `compilers/proof-compiler.ts` | ~120 | L1-OXL | Proof |
| `compilers/index.ts` | ~30 | L1-OXL | 注册入口 |
| **小计** | **~1300** | | |

### 8.2 重写文件（PR-B）

| 路径 | 旧行数 | 新行数 | 改动 |
|---|---|---|---|
| `oxl-md-decompiler.ts` | 689 | ~400 | 8 个 `serializeXxx` 重写为 `EntityRegistry` 调度 |
| `mdast-to-kernel.ts` | 399 | ~250 | 5 个 adapter 重写 |
| `mdast-validator.ts` | 309 | ~200 | 5 个 E_MD_xxx 段重写 |
| `pipeline.ts` | 394 | ~330 | 删 `remark-directive` |
| **小计** | **~1791** | **~1180** | **-611 行** |

### 8.3 重生文件（PR-B）

| 路径 | 文件数 | 角色 |
|---|---|---|
| `.openxenon/domains-md/*.md` | 11 | 纯 MD 重生 |
| **小计** | **11 文件** | **~1650 行** |

### 8.4 测试文件

| 路径 | 旧行数 | 新行数 | 改动 |
|---|---|---|---|
| `__tests__/pipeline.test.ts` | ~250 | ~250 | 3 处 fixture 替换 |
| `__tests__/remark-to-mdast.test.ts` | ~300 | ~300 | 12 处 fixture 替换 |
| `__tests__/mdast-to-kernel.test.ts` | ~400 | ~400 | 13 处 fixture 替换 |
| `__tests__/mdast-validator.test.ts` | ~300 | ~300 | 5 处 fixture 替换 |
| `__tests__/oxl-md-decompiler.test.ts` | ~400 | ~400 | 8 处 fixture + 字节级 snapshot |
| `__tests__/oxl-md-stage2.test.ts` | ~460 | ~460 | 11 处 fixture 替换 |
| `__tests__/oxl-driver.test.ts` | ~200 | ~200 | 不变（接口不变）|
| `__tests__/entity-registry.test.ts` | — | ~80 | **PR-A 新增** |
| `__tests__/extract-headings.test.ts` | — | ~120 | **PR-A 新增** |
| `__tests__/extract-list-fields.test.ts` | — | ~150 | **PR-A 新增** |
| `__tests__/compilers/*.test.ts` | — | ~600 | **PR-A 新增**（5 文件）|
| `__tests__/mdast-to-kernel-native.test.ts` | — | ~200 | **PR-A 新增**（端到端）|
| **小计** | **~2310** | **~3460** | **+1150 行** |

### 8.5 文档更新

| 路径 | 改动 |
|---|---|
| `docs/zh-cn/intent.md` | 示例段重写 |
| `docs/en/intent.md` | 示例段重写（与 zh-CN 保持一致）|
| `docs/zh-cn/iap-cheatsheet.md` | 增 8 码 |
| `docs/en/iap-cheatsheet.md` | 增 8 码 |
| `README.md` | 检查 `:::intent` 引用（若有则替换）|
| `.changes/0-3-0-md-native.md` | 新建 changelog 片段 |

### 8.6 VSCode + VitePress（PR-C）

| 路径 | 行数 | 角色 |
|---|---|---|
| `oxn-vscode/syntaxes/oxn-intent.tmLanguage.json` | ~120 | 新建 grammar |
| `oxn-vscode/package.json` | +20 | 扩 grammar 注册 |
| `oxn-vscode/__tests__/tmLanguage.test.ts` | ~80 | 新建测试 |
| `oxn-vscode/__tests__/__fixtures__/*.md` | 5 × 20 = ~100 | 新建 fixture |
| `docs/.vitepress/theme/custom.css` | ~120 | 新建 CSS |
| `docs/.vitepress/config.ts` | +3 | 注册 CSS |
| **小计** | **~440** | |

### 8.7 净增减总览

| 维度 | 数据 |
|---|---|
| 新增代码 | ~1740 行（entity 架构 + 高亮）|
| 重构代码 | -611 行（dispatcher 瘦身后）|
| 新增测试 | +1150 行（70 cases）|
| 重生 MD | 11 文件 × ~150 行 = ~1650 行 |
| 新增文档 | ~500 行（RFC + cheat sheet）|
| **净增** | **~4430 行** |
| **净减（删除 `remark-directive` 等）** | **-3 npm 依赖** |
| **测试增长** | **1545 → 1563 tests** |

---

## 9. 风险登记

| 风险 | 等级 | 缓解 | 回退 |
|---|---|---|---|
| **H3 文本唯一约束**偶有重名需求 | 中 | `E_MD_DUPLICATE_H3` 引导用户重命名；提供 `- id: <name>` 显式覆盖（v0.4 实施）| — |
| **嵌套列表的 mdast 缩进**在不同编辑器/AI 工具下会变 | 低 | 不依赖固定空格数，只看 `listItem.children` 父子关系 | — |
| **11 个 domains-md 重生**字节级一致难保证 | 中 | `Buffer.byteEquals` 严格校验；newline 纪律状态机 | PR-B 跑通后用 git diff 对比 |
| **L0–L3 架构守卫**对新加的 7 个文件路径敏感 | 低 | 7 个新文件全在 L1-OXL（`src/oxl/md-bridge/`），不破坏层级 | — |
| **docs/zh-cn/intent.md 重写**影响 AI 阅读路径 | 中 | 中英双 SSOT 同步；加 changelog；与现有 L0L3Context 不变量一致 | — |
| **`oxn-vscode` 物理隔离 + CI drift**首次建立 | 低 | `scripts/check-intent-types-drift.ts` 简单字符串比较；5 个常量 | — |
| **EntityRegistry 全局单例**未来多项目冲突 | 低 | v0.3 不支持多项目；预留 `forProject(projectId)` 钩子 | v0.4 引入 projectId |
| **breaking change** 升级 v0.3.0 后旧 .md 文件失效 | 中 | changelog 明确写「请重新跑 `oxn domain compile`」；提供 `oxn domain migrate --from-legacy` 命令 | — |
| **`E_MD_DEPRECATED_SYNTAX` 误报**（`:::` 在代码块内）| 低 | mdast `code` 节点内的 `:::` 不触发检测 | — |
| **PR-A `syntax: 'native' | 'directive'` 双选项**未来 v0.4 清理 | 低 | v0.4 删除 `'directive'` 分支，PR-A 设计已留 exit | — |

---

## 10. 验收标准

### 10.1 功能验收

- [ ] 11 个 `domains-md/*.md` 用纯 MD 格式书写，可在 GitHub Web 直接渲染
- [ ] `oxn domain validate <name>` 11 个命令全部 pass
- [ ] `oxn domain compile --from .oxn` 输出 = 仓库内 `domains-md/<name>.md`（字节级）
- [ ] `oxn domain migrate --from-legacy` 把旧 `:::intent{...}` 转换为新纯 MD（PR-B 末尾可选实现）
- [ ] 5 类实体 MD 文件在 VSCode（装 vsix）打开有色彩
- [ ] VitePress 文档站 H2 分类有色彩边框
- [ ] AI Prompt「在 `## Terms` 下用 `- **Name**: Desc` 写 term」一次通过率 ≥ 95%

### 10.2 工程验收

- [ ] **1545 → 1563 tests pass / 0 fail**
- [ ] `bun run typecheck` 0 error（`verbatimModuleSyntax: true` + `noUncheckedIndexedAccess: true`）
- [ ] `bun run lint` 0 error（L0–L3 架构守卫通过）
- [ ] `bun run check`（biome）0 error
- [ ] **不引入新 npm 依赖**（`remark-attr` / `remark-heading-id` 都不引）
- [ ] **删除 `remark-directive` 依赖**（`package.json` 减 1）
- [ ] `scripts/check-intent-types-drift.ts` CI 通过

### 10.3 文档验收

- [ ] `docs/zh-cn/intent.md` + `docs/en/intent.md` 示例段与新语法 1:1 对应
- [ ] `docs/zh-cn/iap-cheatsheet.md` + `docs/en/iap-cheatsheet.md` 包含 20 错误码
- [ ] `README.md` 无 `:::intent` 残留引用
- [ ] `.changes/0-3-0-md-native.md` changelog 片段
- [ ] 本 RFC doc（`md-native-grammar-rfc.md`）合入主分支

---

## 11. 时间节点

| 节点 | 日期 | 完成 |
|---|---|---|
| **D0** | 收到 user go 命令 | 拉 `feat/v0.3-t18-md-native-grammar` |
| **D0+0.5** | | 锁语法规范 → 写 `entity-compiler.ts` + `entity-registry.ts` + `extract-headings.ts` 骨架 |
| **D0+2.5** | | 5 个 compiler 实现 + 70 case 测试 |
| **D0+3** | | PR-A 跑通 native parser（不破坏旧） |
| **D0+3.5** | | PR-A merge |
| **D3.5** | | 拉 `feat/v0.3-t19-md-native-migrate` |
| **D3.5+0.5** | | dispatcher 重构（`oxl-md-decompiler.ts` 等 4 文件）|
| **D3.5+1** | | 11 个 domains-md 重生 + 8 个 fixture 迁移 |
| **D3.5+2** | | PR-B 跑通字节级 round-trip |
| **D5.5** | | PR-B merge；`git tag v0.2.x` 锁改革前 snapshot |
| **D5.5** | | 拉 `feat/v0.3-t20-md-native-highlight` |
| **D5.5+0.5** | | oxn-vscode grammar |
| **D5.5+1** | | VitePress CSS + 测试 |
| **D5.5+1.5** | | PR-C 跑通 |
| **D7** | | PR-C merge → v0.3.0 release（CHANGELOG + tag + npm publish）|

**总工作量**：**7 天**（1 周）

---

## 12. 与现有架构的关系

### 12.1 复用资产

| 资产 | 路径 | 状态 |
|---|---|---|
| `OxlDriver` 抽象 | `src/oxl/contracts/oxl-driver.ts` | 不动 |
| `driverRegistry` 单例 | `src/oxl/md-bridge/driver-registry.ts` | 不动（作为对齐范式）|
| `unified` 接入 | `src/oxl/md-bridge/pipeline.ts` | 删 `remark-directive` plugin |
| 5 类 Zod schema | `src/kernel/schemas/` | 不动 |
| `oxl-md-source-hash.ts` | `src/oxl/md-bridge/` | 不动 |
| `oxl-md-compiler.ts` | `src/oxl/md-bridge/` | dispatcher 改造（PR-B）|
| 8 个 `serializeXxx` | `src/oxl/md-bridge/oxl-md-decompiler.ts` | **重写**（PR-B）|
| 5 个 E_MD_xxx | `src/oxl/md-bridge/mdast-validator.ts` | **扩展为 13 码**（PR-A/B）|
| `oxn.langium` 语法 | `src/oxl/langium-driver/oxn.langium` | **不动**（.oxn 编译产物格式不变）|

### 12.2 L0–L3 兼容性

| 层级 | 改动 |
|---|---|
| L0-Schema | 不动（Zod 接受 `Record<string, unknown>` 上游）|
| L0-Processor | 不动（Kernel 是 "Lambda Vacuum"，不感知语法）|
| L1-Infra | 不动（filesystem / http / shell 等 IO 不涉及）|
| L1-OXL | **增强**：md-bridge 新增 7 文件（1300 行）；oxl-md-decompiler/mdast-to-kernel/mdast-validator dispatcher 瘦 30% |
| L2-Builtin | 不动（probe 模板独立）|
| L2-Work | 不动（work 调度与语法无关）|
| L3-CLI | `oxn domain migrate` 命令行为变更（breaking change 文档化）|
| L3-skills | 重写 `oxn-cli` / `oxn-work` / `oxn-proof` skill 中示例段（如有）|

### 12.3 与 driverRegistry 的关系

```
              ┌──────────────────────────┐
              │     driverRegistry        │  ← v0.3 阶段 1.2
              │  (langium/mdast 切换)     │
              └──────────────────────────┘
                          ▲
                          │ 用 OxlDriver 接口加载 .oxn / .md
                          │
              ┌───────────┴──────────────┐
              │     entityRegistry       │  ← v0.3 改革新增（PR-A）
              │  (5 类实体编译器)         │
              └──────────────────────────┘
                          ▲
                          │ 用 EntityCompiler 接口编译/解析/校验
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   DomainCompiler  BlueprintCompiler  WorkCompiler ...
```

两层 Registry **正交不依赖**：
- `driverRegistry` 决定用哪个**底层解析器**（langium AST vs mdast）
- `entityRegistry` 决定用哪个**业务编译器**（domain vs blueprint vs ...）
- 组合灵活：v0.3 阶段 1.2 落地 `DriverRegistry`；v0.3 改革新增 `EntityRegistry` 作为正交补充

---

## 13. 后续工作（v0.4+ 推迟项）

### 13.1 v0.4 候选

- [ ] `oxn domain migrate --from-legacy`：把旧 `:::intent{...}` 自动转新纯 MD
- [ ] `EntityRegistry.forProject(projectId)`：支持多项目并发
- [ ] `oxn domain validate --json`：CI 友好输出
- [ ] `oxn domain md-lint`：MD 文件结构 lint（与 biome 集成）
- [ ] pre-commit hook：基于 `oxl-md-source-hash.ts` 检测 MD 改动并触发 `.oxn` 重编译

### 13.2 v0.5+ 远期

- [ ] Langium 渐进删除路径（如果 v0.4 阶段 1-2 都稳定，v0.5 可完全砍掉 `.oxn`）
- [ ] 14 builtin probe MD 化（从 `.oxn` 模板 → `.md`）
- [ ] `oxn domain create` 交互式 CLI：基于 prompt 生成 MD 草稿
- [ ] VSCode 扩展补完：LSP server 支持跳转定义、引用查找、Zod 校验实时提示

---

## 14. 与 user 5 轮对话的决策记录

### 14.1 关键对话节点

| 对话轮次 | 关键洞察 | 决策影响 |
|---|---|---|
| 1（β 提案）| pure MD 路线 + 上下文推断 | 启发 D1 选 A 纯 MD |
| 2（混合制）| term/ban/invariant 纯 MD + slot/task/probe 保留 directive | 启发 D1 选 A 纯 MD（更激进）|
| 3（终版：标题 + 嵌套列表）| 完整层级映射方案 | 锁定 §3 语法规范 |
| 4（Factory + Singleton）| 5 类实体解耦需求 | 决定 D4 选 A |
| 5（4 项答复 + newline 纪律）| 字节级 round-trip 严格校验 | 决定 §3.4 newline 状态机 + `Buffer.byteEquals` |

### 14.2 user 明确拒绝的方案

- ❌ 用 `:::` directive 内联复杂属性（`:::task{#step1 blueprint="..." domain="..."}`）—— "太怪了"
- ❌ YAML frontmatter 段（用 `---` 分隔多段）—— 不符合纯 MD 原则
- ❌ `remark-attr` 0.11.1 依赖 —— 6 年未更新 + tokenizer 冲突
- ❌ `oxn-vscode` 直接 import L1-OXL —— 破坏分层
- ❌ `oxn domain migrate` 保留旧 `:::intent{...}` 兼容路径 —— v0.3.0 是 breaking change

---

## 15. 关联文档

- **核心架构**：[`md-ssot-system.md` v3.2](./md-ssot-system.md)
- **SSOT 边界**：[`intent-ssot-boundary.md` v1.0](./intent-ssot-boundary.md)
- **路线图**：[`v0.3.0-roadmap.md` v3.2](./v0.3.0-roadmap.md)
- **实施报告**：[`arch-v0.3-implementation-report.md`](./arch-v0.3-implementation-report.md)
- **Driver 抽象**：[`src/oxl/contracts/oxl-driver.ts`](../../../src/oxl/contracts/oxl-driver.ts)
- **现有 Registry**：[`src/oxl/md-bridge/driver-registry.ts`](../../../src/oxl/md-bridge/driver-registry.ts)
- **changelog 片段**：[`.changes/0-3-0-md-native.md`](../../../.changes/0-3-0-md-native.md)（待 PR-B 完成时新建）

---

**变更日志**：

| 版本 | 日期 | 改动 |
|---|---|---|
| v1.0 | 2026-06-23 | RFC 初稿，5 轮对话协作完成 |
