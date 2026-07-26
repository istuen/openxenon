---
version: pre-0.6
date: 2026-06-26
type: archive
---

# OpenXenon 0.0.x–0.5.x 历史变更

> 本文合并 0.0.x 至 0.5.x 的 78 个历史变更片段，只保留用户可见能力、关键架构决策、破坏性变更和发布修复。
>
> 原片段中的测试计数、逐文件执行记录、临时风险表和过期 TODO 已省略。删除源片段后，完整实施细节仍可通过 Git 历史恢复。

## 0.0.x — 原型、文件系统架构与 OXN DSL

### 0.0.1

- 建立初始 CLI、Skill 注入、Daemon 健康检查、Task 执行 API、核心类型和 Stage 模块。

### 0.0.2

- HTTP API 改为 Unix Socket；项目从 Xenonix/xn 更名为 OpenXenon/oxn，并以 Blueprint 取代 Playbook。

### 0.0.3

- 引入 Task、Blueprint、Stage 的 Zod Schema、全局 `--json` 和扁平 Schema 迁移器。

### 0.0.4

- 项目数据库迁移到三表扁平 Schema；统一 Task 状态并补齐任务目录创建。

### 0.0.5

- 确立文件系统优先的 Task 执行架构，并由 BlueprintParser 解析 Stage 声明。

### 0.0.6

- 增加沙箱模式、Arsenal 导入导出和 Meta-forge；删除未进入 MVP 的 draft/export/gc/daemon 等旧命令。

### 0.0.7

- 完成 Blueprint 资产 CRUD、Stage 引用解析，以及 topology、edges、scope 和 state 能力。

### 0.0.8

- 建立 DRAFT/CANONICAL 生命周期和 `/oxn-forge` Skill；统一 standards/arsenal 命名与路径。

### 0.0.9

- BlueprintCompiler 接入 Task pipeline，支持 L2 self-hosting，并从文件路径推导资产状态。

### 0.0.10

- 项目采用 MIT License；当时的 Proof 概念并入 Stage 验证字段。

### 0.0.11

- CLI Task 命令改为直接文件系统操作，并补齐 Stage、Proof invocation 和参数描述契约。

### 0.0.12

- 移除核心数据库依赖，采用纯文件系统状态、append-only task trace 和原子 manifest。

### 0.0.13

- 建立 Arsenal Registry 与语义搜索；Skill compiler 统一输出 `<skillId>/SKILL.md` 和标准 frontmatter。

### 0.0.14

- Arsenal list 增加 Stage、类型和来源过滤；加入内置资产 fallback，并修复 Probe 参数兼容。

### 0.0.15

- 落实 Kernel “Lambda Vacuum”：CLI 与 Daemon 仅经 Socket 通信，执行器连接到纯 Kernel evaluator，并删除越层实现。

### 0.0.16

- 形成 kernel/infra/arsenals 函数式、零数据库架构，并加入宪法级 ESLint 边界守卫。

### 0.0.17

- 引入 Stage/Probe 命名空间和 Blueprint v1；修复 DAG 顺序，并使用稳定 kebab-case Task ID。

### 0.0.18

- 加入隐私隔离的 AI 执行循环和 HTML trace/DAG 视图；统一 CLI 输出并清理废弃命令。

### 0.0.19

- 发布项目级 Hall 仪表盘，展示 Forge、Arsenal、Harvest 和 Probe 判定结果。

### 0.0.20

- Hall 增加资产详情、Task 探索与状态管理；加入增量编译缓存、Daemon 监控、进程管理和 SSE 事件。

### 0.0.21

- 全仓完成 Stage → Part 重构，加入 Slot 支持，并从当时的代码与文档中清理旧 Proof 模型。

### 0.0.22

- 完成编译缓存、props/params 命名统一和参数注入链。

### 0.0.23

- 建立 OXN DSL 核心架构和 interface/rule/expectation validators；增加 compile、unpack、promote、migrate-yaml 命令。

### 0.0.24

- 清除 YAML canonical 路径，建立 Forge → Arsenal pipeline、端到端参数流和 Langium services 集成。

### 0.0.25

- OXN DSL 重构为 Slot 范式，并收敛类型和架构检查问题。

### 0.0.26

- 启动 i18n Phase A；OxnKernelAdapter 移入 OXN DSL 层，Explore 增加索引扫描模式，Skills 对齐 DSL v3.1。

### 0.0.27

- 增加 `oxn validate`、Work 类型简写和 `slotBindings` Part 引用；删除无消费者的 Arsenal builtin。
- L0 判定目录由 `kernel/probes` 更名为 `kernel/verdicts`，与 L1 `infra/probes` 形成显式边界。

### 0.0.28

- **Breaking**：`task.deps` 当时收紧为 `deps = ["t1", "t2"]`，且必须位于所有 Part 之后；裸数组、缺少 `=` 或重复字段会被拒绝。
- 修复 `ts-compiles` 同时传入 path 与 tsconfig 时触发 TS5042：使用临时 tsconfig 保留项目 compilerOptions，并在结束后清理。

### 0.0.29

- i18n Phase B 将 CLI 硬编码文案迁移到 `t()`；`oxn init --locale` 开始立即切换当前进程语言。

### 0.0.30

- 提供完整英文 locale，并加入基础行为、键完整性和中英文键对齐守卫。

## 0.1.x — Proof-First、Insight、运行时与分发

### 0.1.0

- 完成 CLI 与内置 Skills 的中英文闭环；缺失翻译改为显式错误，并清理无消费者的 Skill 资产。

### 0.1.2

- `oxn proof run` 开始累计全局 Probe 统计，包括运行历史、失败连续次数和原子持久化。
- 新增 `oxn insight --proof`，从 frozen proof 和统计生成 evidence chain、Probe 视图与三类跨 Proof 涌现模式。

### 0.1.3

- 增加全局 Blueprint slim index，并让 create、validate、list、init 自动维护或消费索引。
- 加入可组合的 Git workflow Blueprint 和只读 merge feasibility probes；明确 OXN 不自动 commit、merge、push 或创建 PR。
- 移除 `oxn install-skill` 和写入用户 home 的行为；项目级 Skill 成为唯一加载路径，旧快照改由 Git 历史恢复。

### 0.1.4

- 将实体名称 canonicalization 上移到 L0 Contract；Domain、Blueprint、Work、Proof 补齐文件名或目录名一致性校验。
- 明确 L0 Schema 可以通过编译后消除的 `import type` 依赖 L0 Contract。
- 完成 verdicts/probes 命名、`oxn init` tools 配置和内部 Probe 引用封装的对齐。

### 0.1.5

- i18n 移入 L1 Infra；CLI 用户文案统一通过 `t()`，Kernel、OXL 和 Work 层保持英文机器消息，避免翻译依赖进入纯逻辑层。

### 0.1.6

- Verdict 策略统一到 L0 Kernel；执行错误迁入 IAPError 双轨契约，Work 引用解析改用 Langium AST，并补齐 DAG edge 校验。
- Socket 协议增加请求 ID，支持单连接多并发请求；优化 DAG 队列、编译缓存快速失效和递归扫描截断信号。
- 删除未使用的 Work state Schema，拆分 migrator，减少不安全类型断言，并修复 NaN 比较与跨平台路径处理。
- 新建 L1 Runtime Adapter，为 Bun、Node 18+ 和 Deno 提供统一 spawn/file/glob/which 接口；Probe handler 不再直接依赖具体运行时。
- npm 包改为 `@istuen/openxenon`，建立 scoped public publish workflow，并将发布产物收敛为 Node 目标的 `dist/cli.js`。

### 0.1.8

- VitePress 文档站采用中英文对称路由，补齐英文文档和示例，并将安装说明统一为全局安装后的 `oxn` 命令。

## 0.2.x — Proof Engine、干涉信号与 Provider

### 0.2.0

- **T1a/T1b**：所有生产代码的直接文件系统访问收口到 Infra，同步/异步适配层分离，并删除无消费者的 Port。
- **T2**：Daemon recovery 归入 `daemon/trace/`，保持恢复逻辑与职责分化不变。
- **T3**：`task.deps` 恢复 `:`/`=`、数组/字符串列表兼容；per-work Domain 引用由正则改为 Langium AST。
- **T4**：引入 `io.stat`、`io.read`、`io.exec`、12 类 interference flag 和 PASS/FAIL/INCONCLUSIVE 三态 Verdict；RED 干涉短路为 INCONCLUSIVE，YELLOW 仅记录。
- **T5**：`frozen.json`、Insight 和 Probe Stats 升级为三态；修复基于 Zod 重排字段导致的 content hash 验签错误，并统一 `permission_denied` 拼写。
- **T6**：建立 ProviderRegistry 和 File/HTTP/Shell/Git 四个内置 Provider；损坏或缺失 Provider 只标记状态，不阻断 Daemon。
- **T7**：基于 Bun `vm.SourceTextModule` 建立第三方 Provider 沙箱和 `oxn probe add`；越界模块、进程和网络全局被拒绝，缓存文件只读落盘。
- **T8**：建立 research Intent Pool 最小骨架、Markdown heading 校验和 Hall 扫描；旧 forges 在兼容期继续保留。
- **T9**：Daemon 启动时只读冷加载 Provider；Work 启动前只阻断自身依赖的坏 Provider，并增加 `oxn probe list/fix`。
- **T10**：OXL Probe 声明增加可选 `scheme`，内置模板补齐 file/http/shell/git scheme，并加入注册状态校验。

## 0.3.x — MD-SSOT、纯 Markdown 与发布链路修复

### 0.3.0

- 建立 OxlDriver、md-bridge、content hash 缓存和五类 Intent 的 `.md` → Kernel 转换；Intent `.md` 被确立为唯一写入入口，`.oxn` 为生成物。
- 引入 EntityCompiler Factory、EntityRegistry Singleton 和 Domain/Blueprint/Work/Task/Proof 五个实体编译器。
- **Breaking**：`:::intent{...}` 被 H1/H2/H3 与嵌套列表组成的纯 Markdown 取代；旧语法抛 `E_MD_DEPRECATED_SYNTAX`，升级后应运行 `oxn domain compile` 或对应 compile 命令重生资产。
- 删除 `remark-directive`，采用 canonical 规则：H3 即名称、一行一个字段、数组使用缩进列表。
- 增加 Domain/Blueprint compile CLI、13 类 E_MD 错误、canonical CI 守卫、VSCode Markdown 注入和 VitePress 样式。
- 历史 forges 不再计划物理删除；Intent 决策迁入版本化 Pool，旧实施材料由原目录或 Git 保留。

### 0.3.1

- 修复 npm 安装后 Node 默认运行时启动崩溃：`SourceTextModule` 改为仅在沙箱调用时动态加载。
- 普通 CLI 命令可在 Node 直接运行；无实验性 VM 支持时，只有 `oxn probe add` 返回明确的 `SANDBOX_REJECTED`。

### 0.3.2

- 修复发布工作流长期受 Bun lockfile 版本漂移阻断的问题：固定 Bun 版本，并让 publish job 使用普通 install 后构建发布产物。

### 0.3.3

- 将不稳定的 npx smoke test 改为临时前缀安装后直接运行 `dist/cli.js`，验证真实 npm 包。

### 0.3.4

- 发布后先验证本地 dist，再以最长 120 秒重试等待 npm registry 传播，最后执行安装 smoke test，消除传播延迟误报。

## 0.4.x — unified-native 管线与双向同步

### 0.4.0

- **PR-A**：Domain 增加可选 `## Stack`，用于声明语言、运行时和工具约束，不填写不报错。
- **PR-B/Q4-A**：`oxn proof run` 自动保存只读 `proof.md` 和 `work-hash.txt`；`oxn proof verify` 可检测 Work 漂移。
- **PR-B/Q5**：增加 `oxn work compile`，将内联 Tasks 的 `work.oxn` 编译为 canonical `work.md`。
- **PR-B.5**：增加 `oxn work migrate-md` 并完成历史 Works 的批量 MD 生成；兼容期仍保留 `work.oxn`。
- **PR-C1**：建立 `md-pipeline`，采用 `unist-util-visit`、`remark-stringify` 和 `mdast-util-to-markdown` 等标准组件。
- **PR-C2**：五类实体抽取改为统一 transformer plugin，并保持既有 IR 形状。
- **PR-C3**：canonical 校验改为 `remark-canonical` plugin，统一写入 `tree.data.canonical`。
- **PR-C4**：删除 driver registry、heading/list 自研遍历层，以单一 unified driver 和兼容别名收口解析路径。

### 0.4.1

- 为 Domain、Blueprint、Work 增加 `sync` 与 `sync-md` 六个子命令，支持批量、dry-run、链式同步、冲突反转和 round-trip 守卫。
- 双向冲突默认 `.md` 优先；`--oxn-priority` 可显式反转，并通过 hash cache 保证幂等。
- WorkIR 增加 work-level Domain/Blueprint refs，MD 新增 `## Refs` 与 `## LoopPolicy`。
- **Breaking**：OXL `loop_policy` 从 `context` 内移到 Work 顶层；旧文件需迁移后重新同步。
- 修复 Domain description、Blueprint version 和 Work refs 在 round-trip 中丢失的问题。
- 修复 citty 将 `--no-X` 解析为 `X: false` 后相关选项失效的问题；受旧 round-trip 缺陷影响的资产应重跑 sync。

## 0.5.x — Proof → Insight → Intent 闭环

### 0.5.0

- 每次 `oxn proof run` 除 `frozen.json` 外生成可读的 `verdict.md`，包含证据、结论、汇总和干涉标记。
- `oxn insight --cross-proof` 提供趋势矩阵、Proof 共现关系、恶化/改善信号和 Probe 有效性排名。
- `oxn insight --pipeline` 关联 Intent、Work trace 与 Proof，分析不变量命中率、Slot DAG 偏差、覆盖缺口和全链追踪。
- Insight 可生成 audit Pool 改进建议，经 review/approve/reject 闸门后更新 Domain 或 Blueprint。
- approve/reject 产生包含 before/after hash 的 frozen 审计链，形成 Proof → Insight → Intent 的可追溯反馈闭环。
