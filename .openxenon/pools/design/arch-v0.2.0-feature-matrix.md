# OpenXenon v0.2.0 重点特性矩阵（不含 Intent Pool）

> **角色**：盘点 v0.2.0 release commit `5b81e8d` 的所有**除 Intent Pool 外**的重点特性
>
> **读者**：v0.2.0 用户 + v0.3 启动决策者
>
> **版本**：v0.2.0
>
> **日期**：2026-06-20
>
> **关联**：[`retro-v0.2.0-roadmap-execution.md`](../audit/retro-v0.2.0-roadmap-execution.md)（完整复盘）· [`audit-v0.2.0-md-ssot-readiness.md`](../audit/audit-v0.2.0-md-ssot-readiness.md)（准备度）

---

## What — v0.2.0 是什么

v0.2.0（commit `5b81e8d` + tag `v0.2.0`）是 OpenXenon 的**第二个 minor release**，主题为 **"Proof Engine + Token Ingest"**。在 7 个 Sprint（8 周）内完成 14 个 T-PR + Sprint 9 增量。

**两个 release commit**：
- v0.1.8（`c1ef176`）— i18n + 全量翻译
- v0.2.0（`005f207` → `5b81e8d` fix commit）— **Proof Engine + Token Ingest**

**KPI 对比**：

| 指标 | v0.1.8 | v0.2.0 | 变化 |
|---|---|---|---|
| 测试通过 | 1133 | 1393 | **+260** |
| builtin probe | 9 | 14 | **+5** |
| CHANGELOG | 0 | 2 | **+2** |
| 5 池 | 0 | 5 | **+5** |
| CLI 子命令 | 25 | 30 | **+5** |
| Sprint PR | - | 14 | **+14** |

---

## Why — 为什么 v0.2.0 是关键 release

v0.1.x 的痛点：
- Proof 缺乏可信的 Provider 隔离机制
- Probe 缺乏统一的 Taint 追踪
- fs 直引遍布 52 文件，违反 L1-Infra 边界
- 无 Token Ingest，无法处理外部输入

v0.2.0 在不破坏 L0–L3 架构的前提下，**逐项解决**这些痛点。

---

## How — v0.2.0 重点特性（7 大类）

### 类别 1 — Infra fs 直引收口（T1a + T1b）

**目标**：所有 fs 调用走 `src/infra/filesystem-async.ts`，遵守 L1-Infra 边界。

**范围**：**52 个文件**
- T1a（cli 子 PR 1）：`src/cli/` 22 个文件
- T1b（其余子 PR 2）：28 个非 cli 文件

**关键文件**：`src/infra/filesystem-async.ts`（fs 包装层，提供 mkdir/writeFile/readFile/rename/stat 等）

**lefthook 拦截**：v0.2.0 freeze 时 pre-push hook 拦截 5 个 fs 违规（`5b81e8d` 修复）：
1. `src/infra/frozen/work-domains.ts` (T12)
2. `src/cli/pool-list.ts` (T13)
3. `src/cli/pool-create.ts` (T13)
4. `src/cli/daemon-logs.ts` (T14)
5. `src/cli/daemon-kill.ts` (T14)

**意义**：L0-Processor 继续保持"兰姆达真空"（不感知 fs/net/child_process），架构护身咒严格执行。

---

### 类别 2 — Taint 系统（T4-T7, T9-T10，5 个 PR）

**目标**：所有 Probe 产出追踪"污染标记"（taint flag），防止未验证数据污染下游。

**5 个 PR**：

| PR | 内容 | commit |
|---|---|---|
| **T4 数据契约** | IO Primitive + InterferenceFlag 12 项 + TRUST_BASELINE + ProbeVerdict 三态 | `a5dbab4` |
| **T5 frozen.json 三态** | verdict 必填 PASSED/FAILED/INCONCLUSIVE + interferenceFlags 可选 + reader hash 修复 | `05cd452` + `75d7bd6` |
| **T6 Provider** | ProviderRegistry + 4 内置 Provider（FileProvider / HttpProvider / ShellProvider / GitProvider）| `9d7c136` + `b0c2c58` |
| **T7 沙箱 + CLI** | Bun vm.SourceTextModule PoC 通过 + probe-sandbox + probe-registry-store + `oxn probe add` | `6258d4e` + `1cef78f` |
| **T9 daemon + workcheck** | workPrecheck 精准阻断 + `oxn probe list` / `oxn probe fix` | `52f97e4` + `d72daab` |

**关键概念**：

- **IO Primitive**：8 类原始 IO 操作（`fs.read` / `fs.write` / `net.http` / `shell.exec` / `git.log` / 等）
- **InterferenceFlag**：12 种污染标记（如 `EXTERNAL_INPUT` / `UNSIGNED_BINARY` / `WAF_BYPASS` / `CDN_BYPASS` / 等）
- **TRUST_BASELINE**：基础信任级别（NONE / LOCAL_ONLY / SIGNED / VERIFIED）
- **ProbeVerdict 三态**：`PASSED` / `FAILED` / `INCONCLUSIVE`（替代 v0.1.x 的二态）
- **ProviderRegistry**：4 个内置 Provider + 自定义扩展接口

**IAPError 字典扩展**：3 → 12 码
- v0.1.x：3 码（基础）
- T4：+1 码（TAINT_DETECTED）
- T5：+1 码（FROZEN_CORRUPTED）
- T6：+1 码（PROVIDER_UNAVAILABLE）
- T7：+2 码（SANDBOX_REJECTED / PROBE_INVALID）
- T9：+3 码（PROBE_CORRUPTED / PROBE_MISSING / PROBE_FIX_UNAVAILABLE）

**意义**：OpenXenon 成为**首个支持 taint 追踪的 IAP 引擎**。

---

### 类别 3 — Three-Layer 验证系统（T11 + T12）

**目标**：Work 任务增加 Domain Proof 引用层，finalize 二阶段原子写入。

**T11（PR-1 Grammar）**：

- InvariantDecl 加 `script/manual/scope` 可选字段
- WorkDeclaration 加 `domainProofs+=DomProofRef`（`proofs [...]` 语法）
- OXL grammar 重新生成

**T12（PR-2 Finalize）**：

- `oxn work finalize` 二阶段原子写入：
  - 阶段 1：写 transient state
  - 阶段 2：原子 rename 到 frozen
- domain-proof-evaluator 新建
- 硬阻断 on FAIL（任何 domain proof FAIL → work finalize 失败）

**意义**：Work 任务的合规性从"自证"升级为"Domain 旁证"。

---

### 类别 4 — OXL 1.3 Grammar（T10）

**目标**：Probe 声明增强，支持 scheme 字段。

**改动**：

```oxl
// OXL 1.2
probe "fs.read" { ... }

// OXL 1.3
probe "fs.read" scheme: "fs-stat-v1" { ... }
```

- `ProbeDeclaration` 加可选 `'scheme' ':' scheme=STRING` 字段
- 重新生成 parser/ast/grammar/tmLanguage
- 15 builtin probe 模板迁移（fs-*/git-*/http/shell 全覆盖）

**配套**：`probe-validator.ts`（3 规则校验）+ `validators/index.ts`（统一出口）

**意义**：Probe 模板可声明**适配器协议**（scheme），未来支持多种 IO 协议。

---

### 类别 5 — Daemon 闭环（T2 + T14）

**T2（PR-1 Cleanup）**：

- `src/daemon/recovery.ts` → `src/infra/registry/recovery.ts`（L1-Infra，避免 CLI↔daemon 互引违规）

**T14（PR-2/3/4 闭环，3 子 PR）**：

- **PR-2 step.ts**：Proof-driven incremental steps（基于 Proof 推进而非时间）
- **PR-3 CLI 命令**：`oxn daemon restart` / `oxn daemon logs` / `oxn daemon kill`
- **PR-4 escape-mechanism + trace archiver**：异常逃逸 + trace 归档

**意义**：Daemon 从 v0.1.x 的"启动后无人管"升级为"完整生命周期管理"。

---

### 类别 6 — Soft Gaps（T3）

**目标**：补 v0.1.x 软缺口。

**两个变更**：

1. **Grammar 多语法兼容**：OXL grammar 支持 task.deps 多写法
2. **Merger 升级**：从 regex 匹配改 Langium AST（3 个 sync 函数改 async）

**意义**：OXL 写作容错性提升，merger 不再因格式差异失败。

---

### 类别 7 — Sprint 9 Token Ingest（增量）

**commit**：`c4137ee`

**目标**：处理外部 token 流（GitHub Issues / Linear / Jira 等）。

**最小闭环**：`oxn token ingest <source>` 命令 + 解析器

**意义**：为 v0.3 跨平台输入（外部 ticket → work.oxn）奠基。

---

## 其他 v0.2.0 改进（小特性列表）

| 项 | 内容 | 来源 |
|---|---|---|
| **CHANGELOG 双语** | `docs/zh-cn/changelog/CHANGELOG.md` + `docs/en/changelog/CHANGELOG.md` | v0.1.8 |
| **2 个 release commit** | v0.1.8 + v0.2.0 各自独立 commit | v0.1.8 + v0.2.0 |
| **60 .changes/ 片段** | 每个 PR 1-3 片段（手工写）| v0.2.0 |
| **5 类 IAP 资产 create CLI** | domain / blueprint / work / proof / pool | T13 |
| **lefthook 守卫** | pre-commit（biome-check + eslint-arch + typecheck + heading-skeleton） + pre-push（bun test） | T1-T14 |
| **i18n 全量翻译** | 中文 + 英文双语手册 | v0.1.8 |

---

## 不在 v0.2.0 中的事项（避免误解）

| 不在 v0.2.0 | 说明 |
|---|---|
| **MD-SSOT 体系** | v0.3 阶段 1 实施 |
| **`oxn-md` CLI** | v0.3 阶段 6 |
| **forges/ 物理删除** | v0.3 阶段 5 |
| **T15 PR-7 spike（14 probe 收敛）** | 推迟 v0.3 |
| **跨平台 binary 矩阵** | v0.4 |
| **三方集成（GitHub/Linear/Jira）** | v0.4 |

---

## v0.2.0 与 v0.3 的边界

| 维度 | v0.2.0 | v0.3.0 |
|---|---|---|
| 文档系统 | 分散（forges/ + docs/ + .changes/）| 统一（MD-SSOT + pools/）|
| IAP 实体格式 | .oxn（Langium DSL）| .md（unified + mdast）|
| 版本管理 | 手工 `.changes/` 片段 | 自动化 version:aggregate |
| Probe 验证 | Taint 三态 + Provider | + scheme 协议 + 14 probe 收敛 |
| Work finalize | 简单原子写入 | 二阶段原子 + Domain 旁证 |
| Daemon | recovery + restart | + step + escape + trace |
| 测试数 | 1393 | +300（v0.3 预计）|

---

## 关键成就数字

| 维度 | 数据 |
|---|---|
| T-PR 完成 | 14 / 15（94%；T15 推迟 v0.3）|
| Sprint 9 | 1（增量）|
| 总 commit | 70+ |
| 新增测试 | ~100 case |
| builtin probe | 9 → 14 |
| IAP 资产 CLI | 0 → 5 类 |
| fs 直引违规修复 | 5（pre-push 拦截）|
| lefthook hooks | 5（pre-commit 4 + pre-push 1）|

---

## 暴露的 v0.3 待解决问题

| 问题 | v0.3 解决 |
|---|---|
| 文档碎片化（CHANGELOG 双语 + 60 片段 + 51 forges）| [`process-version-iteration-flow.md`](../design/process-version-iteration-flow.md) 5 scripts |
| OXL 强结构保护丢失风险 | [`md-ssot-system.md`](../design/md-ssot-system.md) §3.2（mdast + 5 E_MD_xxx）|
| forges/ 物理目录与运行时混 | [`process-forges-deprecation-migration.md`](../design/process-forges-deprecation-migration.md) |
| 设计文档无归宿 | v0.3 阶段 3（51 → pools/）|
| version:check 不完整 | v0.3 阶段 4（5 scripts）|

---

## 参考

- [`retro-v0.2.0-roadmap-execution.md`](../audit/retro-v0.2.0-roadmap-execution.md) — 完整 v0.2.0 复盘
- [`audit-v0.2.0-md-ssot-readiness.md`](../audit/audit-v0.2.0-md-ssot-readiness.md) — v0.2.0 准备度审计
- [`.changes/0-2-0-roadmap.md`](../../../changes/0-2-0-roadmap.md) — v0.2.0 路线图占位
- [`v0.3.0-roadmap.md`](../design/v0.3.0-roadmap.md) — v0.3 路线图
- `docs/zh-cn/changelog/CHANGELOG.md` — v0.2.0 中文 CHANGELOG
- `docs/en/changelog/CHANGELOG.md` — v0.2.0 英文 CHANGELOG
- v0.2.0 release commit `5b81e8d`
- v0.2.0 tag `v0.2.0`
