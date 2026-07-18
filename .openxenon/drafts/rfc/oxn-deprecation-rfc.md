# .oxn Deprecation RFC — v0.7.0 Langium Retirement & .oxn Canonical Flip

> **日期**：2026-07-11（v1.0 拍板）
> **状态**：🟢 **v1.0 已拍板**（D9/D10/D11 实施路径锁定）
> **目标版本**：v0.7.0
> **前置依赖**：v0.6.1（三边界框架 + Blueprint 提升 + External inline 全部落地）
> **核心交付**：删除 Langium 基础设施 + git rm 全量 .oxn 文件 + 单 .md 路径 + CLI 清理
> **关联 RFC**：[`md-native-grammar-rfc.md` v2.0](./md-native-grammar-rfc.md)（D9/D10/D11 锁定）· [`three-boundary-blueprint-elevation-rfc.md` v1.0](./three-boundary-blueprint-elevation-rfc.md)（三边界框架）
> **关联 ADR**：[ADR-0054](../adrs/0054-three-boundary-framework.md) · [ADR-0055](../adrs/0055-blueprint-as-composition-template.md) · [ADR-0056](../adrs/0056-external-inline-and-status.md)

---

## 0. TL;DR

**问题**：v0.6.1 已完成 MD-native 语法改革（`:::intent{...}` → 纯 MD），Langium `.oxn` 路径仅作为 v0.6.x 向后兼容 fallback 保留。v0.7.0 需要彻底切割：删除 Langium 基础设施、git rm 全量 .oxn 文件、CLI 移除 `--oxn-legacy` flag，让 .md 成为唯一 canonical 格式。

**量化**：
- **399 个 .oxn 文件**（git tracked: 79；untracked: 320）
- **Langium 基础设施**：1 个 `.langium` grammar + 3 个 generated 文件 + 4 个 driver 文件 + 2 个 npm dep（`langium ^4.3.0` + `langium-cli ^4.3.0`）
- **影响范围**：`packages/engine/src/oxl/langium-driver/` 全目录、`src/builtin/` 18 个 .oxn 文件、`.openxenon/assets/` 36 个 .oxn 文件、`docs/` 16 个 .oxn 文件

**Phase A（11 天）**：一次性切割——git rm .oxn + 卸 Langium + 单 .md 路径 + CLI 清理 + CI 守卫
**Phase B（1.5 天）**：文档清理——asset.md / work.md / cli.md 移除 4 级路径 & `--oxn-legacy` flag + ADR-0057
**Phase C（风险项）**：用户项目升级 + builtin 删除 + Work 双轨影响

---

## 1. Background & Motivation

### 1.1 v0.6.1 语法改革完成

v0.6.1 三阶段实施已完成：

| 阶段 | 内容 | 状态 |
|---|---|---|
| PR-A | MD-native compiler（5 类 EntityCompiler） | ✅ done |
| PR-B | decompiler 重写 + domains-md 重生 + `:::intent{...}` 废弃 | ✅ done |
| PR-C | VSCode grammar + VitePress CSS 着色 | ✅ done |

**当前状态**：.md 是 canonical 格式，.oxn 是 v0.6.x fallback。两套路径共存：

```
.openxenon/assets/domains/intent-domain.md   ← canonical
.openxenon/assets/domains/intent-domain.oxn  ← fallback（v0.6.x 兼容）
```

### 1.2 D9/D10/D11 决策锁定

`md-native-grammar-rfc.md` v2.0 已锁定三项决策：

| 决策 | 内容 | 锁定时点 |
|---|---|---|
| **D9** | Langium 退役 = v0.7.0 切割 | D-β c 锁定 |
| **D10** | .oxn canonical 翻转 = v0.7.0 切割 | D-α c 锁定 |
| **D11** | 不做 .md → .oxn 同步；.oxn 留 v0.6.x fallback | D-α c 衍生 |

本 RFC 不重新决策，仅定义 D9/D10 的**实施路径**。

### 1.3 为什么要彻底切割

| 理由 | 说明 |
|---|---|
| **维护成本** | 两套解析路径（Langium + mdast）共存增加复杂度 |
| **npm 依赖** | `langium ^4.3.0` + `langium-cli ^4.3.0` 约 2MB node_modules |
| **generated 文件** | `langium-driver/generated/` 3 个文件（ast.ts/grammar.ts/module.ts）每次 `langium generate` 重生成 |
| **CI 时间** | `bun run build` 包含 `langium:generate` 步骤 |
| **用户困惑** | 同时存在 .oxn 和 .md 两种格式，新手不知道该写哪个 |
| **AI 生成** | LLM 训练集里 Markdown 远比 Langium 语法丰富 |

---

## 2. Decisions（实施路径定义）

### D9 实施：Langium 退役

**切割范围**：

| 组件 | 路径 | 动作 |
|---|---|---|
| Langium grammar 源 | `packages/engine/src/oxl/langium-driver/oxn.langium` | `git rm` |
| Generated 文件 | `packages/engine/src/oxl/langium-driver/generated/` | `git rm` |
| Langium driver | `packages/engine/src/oxl/langium-driver/langium-oxl-driver.ts` | `git rm` |
| Services | `packages/engine/src/oxl/langium-driver/oxn-services.ts` | `git rm` |
| Document builder | `packages/engine/src/oxl/langium-driver/oxn-document-builder.ts` | `git rm` |
| DEPRECATED stub | `packages/engine/src/oxl/langium-driver/DEPRECATED.ts` | `git rm` |
| npm dep: langium | `packages/engine/package.json` → `"langium": "^4.3.0"` | 移除 |
| npm dep: langium-cli | `package.json` → `"langium-cli": "^4.3.0"` | 移除 |
| build script | `package.json` → `"langium:generate": "langium generate"` | 移除 |
| build pipeline | `package.json` → `"build": "... && bun run langium:generate && ..."` | 移除 langium:generate 步骤 |
| tsconfig references | 检查是否有 `langium-driver` 相关 path alias | 移除 |

**前置条件**：确认所有 OxlDriver 调用已切换到 `mdast-oxl-driver.ts`（mdast 路径）。

### D10 实施：.oxn 文件 git rm

**量化**：

| 位置 | 文件数 | 类型 | git tracked | 动作 |
|---|---|---|---|---|
| `.openxenon/works/` | 292 | work.oxn (61) + task.oxn (231) | 0 | `git rm` untracked only |
| `.openxenon/assets/domains/` | 20 | domain.oxn | 20 | `git rm` |
| `.openxenon/assets/workflows/` | 15 | workflow.oxn | 0 | 删除 untracked |
| `.openxenon/assets/roadmaps/` | 1 | roadmap.oxn | 1 | `git rm` |
| `.openxenon/proofs/` | 13 | proof.oxn | 0 | 删除 untracked |
| `src/builtin/probes/` | 15 | probe.oxn | 15 | `git rm` + 迁移到 .md |
| `src/builtin/blueprints/` | 3 | blueprint.oxn | 3 | `git rm` + 迁移到 .md |
| `packages/engine/src/oxl/examples/` | 6 | example.oxn | 6 | `git rm` + 迁移到 .md |
| `packages/engine/src/oxl/examples/domains/` | 3 | domain.oxn | 3 | `git rm` + 迁移到 .md |
| `packages/engine/src/oxl/examples/works/` | 11 | work.oxn + task.oxn | 11 | `git rm` + 迁移到 .md |
| `docs/zh-cn/examples/` | 12 | work.oxn + task.oxn | 12 | `git rm` + 迁移到 .md |
| `docs/en/asset-templates/` | 4 | template.oxn | 4 | `git rm` + 迁移到 .md |
| `.openxenon/.archived/` | 1 | ExampleStackDomain.oxn | 1 | `git rm` |
| **合计** | **399** | | **79** | |

**迁移策略**：
- git tracked 的 79 个 .oxn 文件 → 先 `git rm`，再创建对应 .md（如 `intent-domain.oxn` → `intent-domain.md`）
- untracked 的 320 个 .oxn 文件 → 直接删除（`.openxenon/works/` 等运行时产物）

### D11 实施：不做反向同步

不实现 `.md → .oxn` 同步工具。v0.7.0 后：
- .md 是唯一 canonical 格式
- .oxn 文件在 v0.7.0+ 不再被解析
- 用户如果手写 .oxn → 解析失败，错误信息引导写 .md

---

## 3. Phase A：v0.7.0 切割（11 项任务）

### A1：git rm 所有 git tracked .oxn 文件

**输入**：`git ls-files '*.oxn'`（79 个文件）
**动作**：`git rm <79 files>`
**验收**：`git ls-files '*.oxn'` 返回 0

### A2：git rm langium-driver/ 目录

**输入**：`packages/engine/src/oxl/langium-driver/`（6 个文件）
**动作**：`git rm -r packages/engine/src/oxl/langium-driver/`
**验收**：目录不存在

### A3：卸载 Langium npm 依赖

**输入**：`packages/engine/package.json` + `package.json`
**动作**：
1. 从 `packages/engine/package.json` 移除 `"langium": "^4.3.0"`
2. 从 `package.json` 移除 `"langium-cli": "^4.3.0"` + `"langium:generate"` script
3. 修改 `"build"` script 移除 `bun run langium:generate &&` 步骤
4. `bun install --frozen-lockfile`（更新 lockfile）
**验收**：`bun run build` 不调用 langium generate

### A4：迁移 builtin .oxn → .md

**输入**：15 个 `src/builtin/probes/*.oxn` + 3 个 `src/builtin/blueprints/*.oxn`
**动作**：
1. 为每个 .oxn 文件创建对应的 .md 文件（用 EntityCompiler 或手动转换）
2. 更新 `src/builtin/` 加载逻辑（如有硬编码 `.oxn` 扩展名）
3. `git rm` 18 个 .oxn 文件 + `git add` 18 个 .md 文件
**验收**：`bun test` 通过，builtin probe 加载正常

### A5：迁移 engine examples .oxn → .md

**输入**：6 个 `packages/engine/src/oxl/examples/*.oxn` + 3 个 `domains/*.oxn` + 11 个 `works/**/*.oxn`
**动作**：转换为 .md 格式 + `git rm` + `git add`
**验收**：`bun test` 通过，examples 可被 parser 加载

### A6：迁移 docs .oxn → .md

**输入**：12 个 `docs/zh-cn/examples/**/*.oxn` + 4 个 `docs/en/asset-templates/*.oxn`
**动作**：转换为 .md 格式 + `git rm` + `git add`
**验收**：文档站构建通过（`bun run docs:build`）

### A7：迁移 .openxenon/assets/ .oxn → .md

**输入**：20 个 domains + 15 workflows + 1 个 roadmap（共 36 个 .oxn）
**动作**：
1. 确认已有对应 .md 文件（v0.6.1 已生成）
2. `git rm` 21 个 git tracked .oxn（20 domains + 1 roadmap）
3. 删除 15 个 untracked workflows .oxn
**验收**：`oxn asset list` 正常

### A8：移除 CLI `--oxn-legacy` flag

**输入**：`packages/cli/src/commands/` 下所有命令
**动作**：
1. 搜索 `--oxn-legacy` / `oxn-legacy` / `oxnLegacy` 引用
2. 移除 flag 定义 + 相关条件分支
3. 更新 help 文本
**验收**：`oxn --help` 无 `--oxn-legacy`；`bun test` 通过

### A9：移除 OxlDriver 两路径切换

**输入**：`packages/engine/src/oxl/md-bridge/driver-registry.ts`（或等价注册表）
**动作**：
1. 移除 Langium driver 注册（仅保留 mdast-oxl-driver）
2. 移除 `driverRegistry.get('langium')` 调用
3. 如有 `'langium' | 'mdast'` 类型联合 → 简化为 `'mdast'`
**验收**：`bun test` 通过，无 `'langium'` 字符串残留

### A10：CI 守卫 — 防止 .oxn 回流

**输入**：`scripts/` 目录
**动作**：
1. 新建 `scripts/check-no-oxn-files.ts`（检查 `git ls-files '*.oxn'` 返回 0）
2. 注册到 `package.json` → `"check:no-oxn"` script
3. 添加到 lefthook pre-commit 或 CI gate
**验收**：`bun run check:no-oxn` 通过

### A11：验证全量测试通过

**动作**：
1. `bun run typecheck` — 0 error
2. `bun run lint` — 0 error（L0-L3 架构守卫通过）
3. `bun run check` — biome 0 error
4. `bun test` — 全量通过
5. `bun run build` — 构建成功（不含 langium generate）
**验收**：所有检查通过

---

## 4. Phase B：文档清理（1.5 天）

### B1：asset.md 移除 .oxn 引用

**文件**：`docs/zh-cn/asset.md` + `docs/en/asset.md`
**动作**：
1. 移除 4 级路径描述（`domains/<name>/<name>.oxn`）
2. 移除 `--oxn-legacy` flag 相关段落
3. 更新示例为纯 .md 格式
4. 更新 AssetKind 为 5 类型（domain/workflow/stack/blueprint/roadmap）

### B2：work.md 移除 .oxn 引用

**文件**：`docs/zh-cn/work.md` + `docs/en/work.md`
**动作**：
1. 移除 `.oxn` 文件格式描述
2. 更新 Work 创建示例（纯 .md 路径）

### B3：cli.md 移除 `--oxn-legacy` flag

**文件**：`docs/zh-cn/cli.md` + `docs/en/cli.md`
**动作**：
1. 从命令参考中移除 `--oxn-legacy` flag
2. 更新所有示例

### B4：ADR-0057 记录废弃决策

**文件**：`.openxenon/docs/adrs/0057-oxn-deprecation.md`
**动作**：新建 ADR，记录：
- D9（Langium 退役）实施细节
- D10（.oxn canonical 翻转）实施细节
- D11（不做反向同步）决策理由
- 影响范围（399 文件、2 npm dep、1 目录）
- Supersede 相关旧 ADR（如有引用 .oxn 的）

### B5：AGENTS.md 更新

**文件**：`AGENTS.md`
**动作**：
1. 移除 `.oxn` 相关描述
2. 更新 OXN DSL 段落（语法定义改指 `oxn.langium` → 仅保留历史记录）
3. 更新构建命令（移除 `langium:generate`）
4. 更新测试数量（如有）

### B6：changelog 片段

**文件**：`.changes/0-7-0-oxn-deprecation.md`
**动作**：新建 changelog 片段，记录 breaking changes

---

## 5. Phase C：向后兼容风险

### C1：用户项目升级

**风险**：用户在 v0.6.x 创建的 Work（`.openxenon/works/*/work.oxn`）在 v0.7.0 后无法解析
**缓解**：
- v0.7.0 release notes 明确说明 .oxn 不再支持
- 提供 `oxn migrate --from-oxn` 工具（可选，Phase D 待决策）
- 运行时产物（works/）不影响核心功能（Work 是一次性执行）

### C2：Builtin 删除

**风险**：15 个 probe .oxn + 3 个 blueprint .oxn 删除后，如有硬编码 `.oxn` 扩展名的加载逻辑会失败
**缓解**：
- A4 任务专门处理 builtin 迁移
- 搜索 `*.oxn` 硬编码引用并替换

### C3：Work 双轨

**风险**：Work 创建时同时生成 .oxn 和 .md（v0.6.x 行为），v0.7.0 后只生成 .md
**缓解**：
- A8 任务移除 `--oxn-legacy` flag
- Work 创建逻辑只走 .md 路径

---

## 6. Phase D：待决策事项

### D-1：是否提供 `oxn migrate --from-oxn` CLI

**选项**：
- A. 提供迁移 CLI（自动把 .oxn 转 .md）
- B. 不提供（用户手动转换或重写）
- C. 提供一次性脚本（不纳入 CLI）

**建议**：选 B（.oxn 语法简单，手动转换成本低；且多数 .oxn 是运行时产物，不需要迁移）

### D-2：builtin .oxn 迁移到 .md 的格式

**选项**：
- A. 纯 .md（与 Domain/Workflow/Stack 一致的 MD-native 格式）
- B. 保留为 .oxn（但 git tracked，作为"特殊二进制"）
- C. 迁移到 TypeScript 常量（去掉文件格式，直接内联到代码）

**建议**：选 A（保持一致性）

### D-3：engine examples 迁移策略

**选项**：
- A. 转换为 .md（与 production assets 一致）
- B. 删除（examples 仅用于开发测试）
- C. 保留 .oxn（作为语法参考，但不 git tracked）

**建议**：选 A（examples 应该与 production 格式一致）

---

## 7. Implementation Timeline

| 阶段 | 任务 | 预估工时 | 依赖 |
|---|---|---|---|
| **Phase A** | | **11 天** | |
| A1 | git rm git tracked .oxn | 0.5 天 | — |
| A2 | git rm langium-driver/ | 0.5 天 | — |
| A3 | 卸载 Langium npm 依赖 | 0.5 天 | A2 |
| A4 | 迁移 builtin .oxn → .md | 1 天 | A1 |
| A5 | 迁移 engine examples .oxn → .md | 1 天 | A1 |
| A6 | 迁移 docs .oxn → .md | 1 天 | A1 |
| A7 | 迁移 .openxenon/assets/ .oxn → .md | 1 天 | A1 |
| A8 | 移除 CLI --oxn-legacy flag | 1 天 | A3 |
| A9 | 移除 OxlDriver 两路径切换 | 1 天 | A3 |
| A10 | CI 守卫 — 防止 .oxn 回流 | 0.5 天 | A1 |
| A11 | 验证全量测试通过 | 1 天 | A1-A10 |
| **Phase B** | | **1.5 天** | |
| B1 | asset.md 移除 .oxn 引用 | 0.5 天 | A1-A11 |
| B2 | work.md 移除 .oxn 引用 | 0.5 天 | A1-A11 |
| B3 | cli.md 移除 --oxn-legacy flag | 0.5 天 | A8 |
| B4 | ADR-0057 记录废弃决策 | 0.5 天 | A1-A11 |
| B5 | AGENTS.md 更新 | 0.5 天 | A1-A11 |
| B6 | changelog 片段 | 0.5 天 | A1-A11 |
| **总计** | | **12.5 天** | |

**并行机会**：
- A1 + A2 可并行（无依赖）
- A4 + A5 + A6 + A7 可并行（不同目录，无依赖）
- B1 + B2 + B3 可并行（不同文件，无依赖）

---

## 8. Acceptance Checklist

### 8.1 功能验收

- [ ] `git ls-files '*.oxn'` 返回 0
- [ ] `packages/engine/src/oxl/langium-driver/` 目录不存在
- [ ] `bun run build` 不调用 `langium generate`
- [ ] `bun run typecheck` 0 error
- [ ] `bun run lint` 0 error
- [ ] `bun run check` 0 error
- [ ] `bun test` 全量通过
- [ ] `oxn --help` 无 `--oxn-legacy` flag
- [ ] `oxn asset list` 正常
- [ ] `bun run docs:build` 通过

### 8.2 文档验收

- [ ] `docs/zh-cn/asset.md` + `docs/en/asset.md` 无 `.oxn` 引用
- [ ] `docs/zh-cn/work.md` + `docs/en/work.md` 无 `.oxn` 引用
- [ ] `docs/zh-cn/cli.md` + `docs/en/cli.md` 无 `--oxn-legacy` flag
- [ ] `AGENTS.md` 无 `.oxn` 残留描述
- [ ] `.openxenon/docs/adrs/0057-oxn-deprecation.md` 存在
- [ ] `.changes/0-7-0-oxn-deprecation.md` 存在

### 8.3 CI 验收

- [ ] `bun run check:no-oxn` 通过（防止 .oxn 回流）
- [ ] lefthook pre-commit 包含 no-oxn 检查
- [ ] CI pipeline 无 `langium` 相关步骤

---

## 9. ADR Linkage

| ADR | 内容 | 状态 |
|---|---|---|
| [ADR-0052](../adrs/0052-superseded-0019-blueprint-type-paradigm.md) | Supersede ADR-0019 Blueprint type | Adopted |
| [ADR-0053](../adrs/0053-superseded-0048-library-external-scheme.md) | Supersede ADR-0048 library/external | Adopted |
| [ADR-0054](../adrs/0054-three-boundary-framework.md) | 三边界框架 | Adopted |
| [ADR-0055](../adrs/0055-blueprint-as-composition-template.md) | Blueprint 组合模板 | Adopted |
| [ADR-0056](../adrs/0056-external-inline-and-status.md) | External inline + status | Adopted |
| **ADR-0057**（待新建） | .oxn deprecation + Langium retirement | **待实施** |

---

## 10. RFC Promote Path

```
.openxenon/pools/drafts/oxn-deprecation-rfc.md  ← 已 promote（删除原文件）
    ↓ review + 拍板
.openxenon/docs/rfcs/oxn-deprecation-rfc.md     ← 当前（v1.0 拍板）
    ↓ 实施完成后
.openxenon/docs/adrs/0057-oxn-deprecation.md    ← ADR 记录决策
```

---

## 11. 关联文档

- **语法改革 RFC**：[`md-native-grammar-rfc.md` v2.0](./md-native-grammar-rfc.md)
- **三边界 RFC**：[`three-boundary-blueprint-elevation-rfc.md` v1.0](./three-boundary-blueprint-elevation-rfc.md)
- **Langium DEPRECATED 声明**：`packages/engine/src/oxl/langium-driver/DEPRECATED.ts`
- **mdast 驱动**：`packages/engine/src/oxl/md-bridge/mdast-oxl-driver.ts`（Langium 替代）

---

**变更日志**：

| 版本 | 日期 | 改动 |
|---|---|---|
| v0.1 | 2026-07-11 | Draft 初稿，14 节结构完整 |
| v1.0 | 2026-07-11 | 拍板：D9/D10/D11 实施路径锁定，promote 到 docs/rfcs/ |