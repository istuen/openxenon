---
entity: rfc
id: RFC-0016
theme: generic-verification-probes
status: Accepted
date: 2026-08-01
accepted-at: 2026-08-25
supersedes: []
superseded-by: ~
related:
  - RFC-0002: docs/rfc/zh-cn/RFC-0002-kernel-l0.md
  - RFC-0011: docs/rfc/zh-cn/RFC-0011-builtin-asset-two-layer.md
  - RFC-0010: docs/rfc/zh-cn/RFC-0010-frozen-errata.md
synced-at: 2026-08-01
landing-reason: declarative
---

# RFC-0016: 通用验证 probe 扩展——file-hash / test-coverage / json-path / port-listening

> **类型**：RFC（OpenXenon 规范）
> **主题**：generic-verification-probes
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **来源**：原 RFC-0015 §D6 设计了 4 个通用 builtin probe，本 RFC 承接该设计独立推进。RFC-0015 整体系已于 v0.7 收敛归档（[RFC-0032 D25](../../openxenon/.archived/docs/rfcs/RFC-0015-proof-system-overhaul.md)），4 个 probe 已实现并保留。
> **批次**：通用 builtin probe 能力扩展

## 摘要

为 [Proof](/product/zh-cn/concepts/glossary.html#proof) / Probe / Verdict 子系统补 4 个**通用 builtin probe**，覆盖 shell-exec + 现有 probe 无法精细表达的 4 类高频验证场景：

1. **file-hash** —— 文件 SHA-256 匹配预期 hash（精确检测文件内容变化）
2. **test-coverage** —— 测试覆盖率（lines / branches / functions）≥ 阈值（数值阈值比较，shell-exec 只能拿到 exit code）
3. **json-path** —— JSONPath 值匹配预期（结构化 JSON 字段校验）
4. **port-listening** —— 端口正在监听（验证服务已启动）

**scope 归属**：全部 4 个 probe 为 `@oxn/` universal builtin（与 [RFC-0011 内置 Asset 两层机制](./RFC-0011-builtin-asset-two-layer.html) 一致），任何 OXN 用户项目均可使用，**不需要回退到 `@prj/`**。

## 决策要点

### D1：file-hash（中等优先级）

| 维度 | 内容 |
|---|---|
| 验证 | 文件 SHA-256 匹配预期 hash |
| L1 实现 | Node `crypto.createHash('sha256')` + 流式读取，跨平台 |
| L0 verdict | `actual: { hash, algorithm, file }`；匹配 → COMPLETED |
| 关键优势 | 不依赖 shasum/md5sum 系统命令；结构化 actual；clean target extraction |
| catalog entry | `domainTerm: 'SourceFile'` + `builtin: 'oxn'` + `internalRef: '@oxn/probes/file-hash'` |

**inputs 设计**：

```typescript
{
  file: string,        // 必填，相对项目根的文件路径
  expectedHash: string,// 必填，期望 SHA-256 哈希
  algorithm?: 'sha256' // 可选，默认 'sha256'
}
```

**适用场景**：
- 构建产物完整性校验（确保 `dist/main.js` 与上次发布的 hash 一致）
- 关键配置文件 freeze（`package.json` / `pnpm-lock.yaml` 锁定后变更立即发现）
- 文档资产快照（release notes / changelog 生成后冻结）

**为什么不 shell-exec**：`shasum` / `md5sum` / `sha256sum` 各平台命令不同（macOS / Linux / Windows 路径不同），需要硬编码平台分支；Node `crypto.createHash` 跨平台一致。

### D2：test-coverage（高优先级——shell-exec 无法做）

| 维度 | 内容 |
|---|---|
| 验证 | 覆盖率（lines / branches / functions）≥ 阈值 |
| L1 实现 | 跑 `bun test --coverage` + 解析 `coverage/coverage-summary.json` |
| L0 verdict | 数值阈值比较（linesPct ≥ params.minLinesPct） |
| 关键优势 | shell-exec 只能拿到 exit code（反映 pass/fail），无法做数值阈值比较 |
| catalog entry | `domainTerm: 'TestCase'` + `builtin: 'oxn'` + `internalRef: '@oxn/probes/test-coverage'` |

**inputs 设计**：

```typescript
{
  minLinesPct: number,      // 必填，lines 覆盖率下限 (0-100)
  minBranchesPct?: number,  // 可选，branches 覆盖率下限
  minFunctionsPct?: number, // 可选，functions 覆盖率下限
  runner?: 'bun' | 'jest' | 'vitest'  // 可选，默认 'bun'
}
```

**适用场景**：
- CI 质量门禁（PR 合并前 linesPct ≥ 80%）
- 模块覆盖率回归检测（防止新代码稀释覆盖率）
- 关键路径强约束（auth/payment 模块要求 ≥ 95% branches）

**为什么不 shell-exec**：shell-exec 只能跑 `bun test --coverage` 然后看 exit code（反映 pass/fail）——exit 0 不能区分 "lines 65%" 还是 "lines 95%"。需要主动解析 `coverage-summary.json` 的 JSON 值后做数值阈值比较。

<!-- allow-version -->
**多 runner 支持**：v0.6.2 仅支持 bun（OXN 内置默认）；jest / vitest 适配留待后续 RFC（runner 命令从 StackToolInfo 读取，统一经 Provider 路由）。
<!-- /allow-version -->

### D3：json-path（中等优先级）

| 维度 | 内容 |
|---|---|
| 验证 | JSONPath 值匹配预期 |
| L1 实现 | JS 原生 `JSON.parse` + 路径遍历函数（自实现 ~30 行） |
| L0 verdict | 路径存在且值匹配 → COMPLETED |
| 关键优势 | 不依赖 jq（跨平台）；路径语法校验在 catalog 层 |
| catalog entry | `domainTerm: 'ConfigFile'` + `builtin: 'oxn'` + `internalRef: '@oxn/probes/json-path'` |

**inputs 设计**：

```typescript
{
  file: string,       // 必填，JSON 文件路径
  path: string,       // 必填，JSONPath 表达式（如 "$.dependencies.react"）
  expected: unknown,  // 必填，期望值（深度相等比较）
}
```

**适用场景**：
- `package.json` 字段强校验（`name` 不为空 + `version` 符合 semver）
- `tsconfig.json` 关键参数（`compilerOptions.strict === true`）
- API manifest 字段校验（`endpoints[0].method === 'POST'`）
- 配置文件 freeze（避免误改 .eslintrc / .prettierrc 关键字段）

**为什么不 shell-exec**：jq 跨平台命令不统一（`jq` / `python -c` / `node -e`），需要硬编码平台分支；Node `JSON.parse` + 自实现路径遍历跨平台一致。

<!-- allow-version -->
**JSONPath 语法范围**：本 RFC 采用简化子集（`$.<key>` / `$.<key>.<key>` / `$.<key>[<index>]` / `$.<key>[*]`），完整 RFC 9535 JSONPath 留待 v0.8+ 评估。
<!-- /allow-version -->

### D4：port-listening（低优先级）

| 维度 | 内容 |
|---|---|
| 验证 | 端口正在监听 |
| L1 实现 | Node `net.connect({host, port})` + timeout |
| L0 verdict | 连接成功 → COMPLETED |
| 关键优势 | 跨平台（macOS / Linux / Windows 均通过 net.connect）；无 lsof/netstat 依赖 |
| catalog entry | `domainTerm: 'APIEndpoint'` + `builtin: 'oxn'` + `internalRef: '@oxn/probes/port-listening'` |

**inputs 设计**：

```typescript
{
  host: string,       // 必填，如 'localhost' / '127.0.0.1' / '0.0.0.0'
  port: number,       // 必填，1-65535
  timeout?: number,   // 可选，默认 3000ms
}
```

**适用场景**：
- 集成测试前置断言（验证 dev server 已启动）
- daemon 启动顺序编排（验证 upstream service 端口可达）
- smoke test 入口（验证部署后端口可连接）

**为什么不 shell-exec**：`lsof -i` / `netstat -an` / `ss -ltn` 各平台命令不同，且需要 grep 解析；Node `net.connect` 跨平台且语义清晰（直接尝试连接）。

## 实施

### 实施规模

每个 probe 实施规模：

- handler：~60-150 行（含 JSONPath 解析 / 多 runner 适配）
- verdict strategy：~30-60 行
- catalog entry：~30 行
- 单测：~50-100 行（覆盖正常 + 边界 + 错误路径）
- e2e：~30-50 行（与现有 probe 执行框架集成）

每个 probe 总计 ~200-400 行，全 4 个 probe 合计 ~1000-1500 行（含测试）。

### 执行顺序

按依赖与风险从低到高：

```
Phase 1 (D1 + D3): file-hash + json-path    — 低风险，1 周
  ├─ D1.1 file-hash handler + verdict + catalog entry + 单测
  └─ D3.1 json-path handler + verdict + catalog entry + 单测
  
  风险：低（纯 IO + 解析，无外部依赖）
  依赖：无

Phase 2 (D4): port-listening                — 中风险，1 周
  ├─ D4.1 port-listening handler + verdict + catalog entry + 单测

  风险：中（涉及网络 IO）
  依赖：Phase 1 完成后评审（验证 catalog 3-way 一致性检查机制）

Phase 3 (D2): test-coverage                 — 中-高风险，2 周
  ├─ D2.1 test-coverage handler + verdict + catalog entry + 单测
  ├─ D2.2 多 runner 适配（bun → jest / vitest，从 StackToolInfo 读取）
  └─ D2.3 e2e 集成（与现有 test-pass probe 对照）

  风险：中-高（依赖 coverage 工具链 + 跨 runner 兼容性）
  依赖：Phase 2 完成后（验证 Handler-Provider 接线模式）
```

**总计**：~4 周。

### 必跑验证（[RFC-0010 D5](./RFC-0010-frozen-errata.html)）

每个 Phase 完成后必跑：

```
bun run typecheck
bun run lint
bun run check         # biome
bun test              # 约 1700+ 测试（新增 4 probe ~25-30 测试）
bun scripts/validate-dependencies.ts
bun scripts/check-doc-boundary.ts
```

## 影响范围

### 落地声明

- ✅ 4 个新 probe handler：`packages/engine/src/infra/probes/{file-hash,test-coverage,json-path,port-listening}.ts`
- ✅ 4 个 verdict strategy：追加到 `packages/engine/src/kernel/verdicts/verdict.ts`
- ✅ 4 个 catalog entry：追加到 `packages/engine/src/kernel/verdicts/catalog.ts`（`builtin: 'oxn'` + `internalRef: '@oxn/probes/<name>'`）
- ✅ `probe-lint.ts` alias 表追加 4 个 slang → strategy key 映射（3-way 一致性检查通过）
- ✅ `src/builtin/probes/` 创建 4 个 .md 资产描述（@oxn/ scope 载体）
- ⏳ `oxn-proof-domain.md` builtin-probe-types 扩展补 4 个术语（待术语集下一轮统一增补）
- ⏳ `oxn-vscode/` grammar 扩展 markdown 注入支持 4 个新 probe 名称（依赖 vscode 扩展 release cycle）
- ⏳ docs/product/en + docs/product/zh-cn/cli-user-guide.md 添加 4 个 probe 用例章节（待 docs 产品手册下次迭代）

### 不在本 RFC 范围

- ❌ 完整 RFC 9535 JSONPath 语法（D3 仅采用简化子集）
<!-- allow-version -->
- ❌ test-coverage 多 runner 完整适配（D2 Phase 2 仅 bun，jest/vitest 留 v0.7.0）
<!-- /allow-version -->

## 相关术语

- [Proof](/product/zh-cn/concepts/glossary.html#proof) — 验证体系顶层
- [Probe](/product/zh-cn/concepts/glossary.html#probe) — 单条验证声明
- [ProbeOutcome](/product/zh-cn/concepts/glossary.html#probeoutcome) — Verdict 三层拆分第一层（[RFC-0008 D2](./RFC-0008-naming-evolution.html#d2verdict-三层拆分)）
- [outcome](/product/zh-cn/concepts/glossary.html#outcome) — Verdict 三层拆分第二层
- [Asset](/product/zh-cn/concepts/glossary.html#asset) — 5 类 AssetKind（Domain/Workflow/Stack/Blueprint/Roadmap）
- [Built-in Asset](/product/zh-cn/concepts/glossary.html#built-in-asset) — `@oxn/` scope 解析目标（[RFC-0011](./RFC-0011-builtin-asset-two-layer.html)）

## 相关决策

- [RFC-0002 Kernel/L0 边界](./RFC-0002-kernel-l0.md) — L0 兰姆达真空约束（本 RFC D1/D3 verdict 函数边界依据）
- [RFC-0011 内置 Asset 两层机制](./RFC-0011-builtin-asset-two-layer.md) — `@oxn/` universal builtin + `@prj/` project override 解析顺序
- [RFC-0010 RFC frozen+errata 演进策略](./RFC-0010-frozen-errata.md) — D5 每次变更必跑 6 项验证
- [RFC-0008 命名/演进策略](./RFC-0008-naming-evolution.html) — D2 Verdict 三层拆分 + D3 三态字段重命名（probe return shape 依据）

## Errata

> 本段用于后续追加修正说明。核心决策自 RFC-0016 Accepted 起冻结。

### 2026-08-01：核心代码落地完成

- **D1-D4 全部 4 个 probe 已实现**：`file-hash` / `test-coverage` / `json-path` / `port-listening`（handler + verdict + catalog + test + builtin .md 全部就位）
- **6 项验证通过**：typecheck/lint/biome/test/validate-deps/check-doc-boundary
- **3-way 注册表一致性通过**：catalog ↔ handler ↔ strategy 同步无 drift
- **未落地项**（跨团队依赖）：
  - `oxn-proof-domain.md` builtin-probe-types 扩展补 4 个术语 → 等术语集下一轮统一增补
  - `oxn-vscode/` grammar 扩展 markdown 注入 → 依赖 vscode 扩展 release cycle
  - docs/product/{en,zh-cn}/cli-user-guide.md 4 个 probe 用例章节 → 等产品手册下次迭代
- **遗留 baseline 失败**：`shell-exec` / `ts-compiles` 等预先存在的 8 个测试失败与本 RFC 无关（已确认 baseline 一致）

（暂无 errata）
