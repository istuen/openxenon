---
version: 0.6.2-alpha.2
date: 2026-08-01
type: alpha
status: planned
---

# 0.6.2-alpha.2 — RFC-0016 全部决策点落地（通用验证 probe 扩展）

> 本 changelog 记录 RFC-0016 4 个通用 builtin probe 的代码落地。RFC-0016 与 RFC-0015 是同一 alpha 批次（v0.6.2-alpha.2）。

## 核心改动

### D1: file-hash（中等优先级）

- **验证**：文件 SHA-256（或其他算法）匹配预期 hash
- **新文件**：`packages/engine/src/infra/probes/file-hash.ts`（~80 行）
  - 用 Node `crypto.createHash` + 同步读取（避免流式复杂度，OXN 用场景文件 < 10MB）
  - 支持算法：`sha256` / `sha512` / `md5` / `sha1`（默认 sha256）
  - 失败时返回 `actual: { hash, algorithm, file }` 结构化输出
- **配套**：
  - `packages/engine/src/infra/probes/__tests__/file-hash.test.ts`（7 case）
  - `src/builtin/probes/file-hash.md`（entity/props/output）
  - verdict strategy + catalog entry + index.ts 注册 + probe-lint.ts alias

### D2: test-coverage（高优先级——shell-exec 无法做）

- **验证**：覆盖率（lines / branches / functions）≥ 阈值
- **新文件**：`packages/engine/src/infra/probes/test-coverage.ts`（~140 行）
  - 跑 `bun test --coverage`（通过 `_tool-resolver` 支持 stackTools override）
  - 解析 `coverage/coverage-summary.json` 做数值阈值比较（shell-exec 无法做）
  - 输入：`minLinesPct`（必填）+ `minBranchesPct`/`minFunctionsPct`（可选）+ `runner`（默认 bun）
  - 输出：`{ lines, branches, functions }` 每指标独立 `{ actual, threshold, passed }`
- **v0.6.2 范围**：仅 bun runner；jest/vitest 扩展走 RFC-0015 D5.1 StackToolInfo 模式（v0.7.0 范围）
- **配套**：
  - `packages/engine/src/infra/probes/__tests__/test-coverage.test.ts`（6 case，覆盖 invalid threshold / 文件缺失 / JSON 解析失败 / mock summary）
  - `src/builtin/probes/test-coverage.md`
  - verdict + catalog + index + alias

### D3: json-path（中等优先级）

- **验证**：JSONPath 值匹配预期（简化子集）
- **新文件**：`packages/engine/src/infra/probes/json-path.ts`（~180 行）
  - 自实现简化 JSONPath 解析器：`$.a` / `$.a.b` / `$.a[0]` / `$.a[*]` / `$["quoted-key"]`
  - 深度相等比较（JSON 值）
  - `[*]` 全展开语义：数组中任一元素匹配即 pass
- **不依赖 jq**：跨平台命令不统一（macOS/Linux/Windows 各异），Node 原生 JSON.parse + 自实现路径遍历跨平台一致
- **v0.6.2 范围**：简化子集；完整 RFC 9535 JSONPath 留 v0.8+
- **配套**：
  - `packages/engine/src/infra/probes/__tests__/json-path.test.ts`（8 case）
  - `src/builtin/probes/json-path.md`
  - verdict + catalog + index + alias

### D4: port-listening（低优先级）

- **验证**：TCP 端口正在监听
- **新文件**：`packages/engine/src/infra/probes/port-listening.ts`（~85 行）
  - 用 Node `net.connect({host, port})` + `setTimeout` 检测 timeout
  - 跨平台：macOS / Linux / Windows 一致通过 `net.connect`
  - 不依赖 `lsof` / `netstat` / `ss`
- **输入**：`host`（必填）+ `port`（必填，1-65535）+ `timeout`（默认 3000ms）
- **Taint 集成**：连接失败时由 handler 标记 `network_timeout`（与 trust-baseline 一致）
- **配套**：
  - `packages/engine/src/infra/probes/__tests__/port-listening.test.ts`（5 case，含真实 createServer 监听测试）
  - `src/builtin/probes/port-listening.md`
  - verdict + catalog + index + alias

### 三注册表一致性（D3.2）

新增 4 个 probe 后，`assertRegistryConsistency` 全部通过：
- catalog 19 oxn builtin（15 原 + 4 新）+ 8 @prj/（4 旧 + 4 新 RFC-0015）
- handler alias 完整覆盖 `file-hash` / `test-coverage` / `json-path` / `port-listening`
- verdict strategy 4 个新策略全部注册到 `PROBE_VERDICT_STRATEGIES`
- **附**：同步修复 RFC-0015 D6.2 stale-draft-check 改名遗留的 verdict.ts `stale_pool_check` 注册键漂移（catalog 已用新名，verdict strategy 旧 key 仍存在 → orphan）

## 影响范围

### 代码改动统计

| 类别 | 数量 |
|---|---|
| 新增 handler 文件 | 4（file-hash / test-coverage / json-path / port-listening） |
| 新增 test 文件 | 4（__tests__/ 目录下） |
| 新增 builtin .md | 4（src/builtin/probes/） |
| 修改 verdict.ts | 加 4 个 strategy + 注册 + 修 stale-draft 注册键 |
| 修改 catalog.ts | 加 4 个 entry |
| 修改 index.ts | 加 4 个 handler wrapper + 8 个 alias |
| 修改 probe-lint.ts | 加 4 个 slang → strategy key 映射 |
| 修改 probe-catalog.test.ts | 更新期望名单（15 → 19 oxn builtin） |
| 修改 RFC-0016 | 落地声明 ⏳ → ✅ + Errata 段追加 |

### 测试

- `bun test`：RFC-0016 4 个新 probe 套件全部通过（26 测试 / 0 fail）
- 6 项验证全部通过（typecheck/lint/biome/test/validate-deps/check-doc-boundary）
- 8 个预先存在 baseline 失败（shell-exec / ts-compiles）与本 RFC 无关

### 未落地项（跨团队依赖）

- `oxn-proof-domain.md` builtin-probe-types 扩展补 4 个术语 — 等术语集统一增补
- `oxn-vscode/` grammar 扩展 markdown 注入支持 4 个新 probe — 依赖 vscode 扩展 release cycle
- `docs/product/{en,zh-cn}/cli-user-guide.md` 添加 4 个 probe 用例章节 — 等产品手册下次迭代

## 关联文档

- [RFC-0016 通用验证 probe 扩展](./docs/rfc/zh-cn/RFC-0016-generic-verification-probes.md) — 4 个 probe 设计 + 实施落地（Draft → 待冻结）
- [RFC-0015 Proof 体系重整](./docs/rfc/zh-cn/RFC-0015-proof-system-overhaul.md) — RFC-0016 拆分来源（D6 原设计承接方）
- [RFC-0011 内置 Asset 两层机制](./docs/rfc/zh-cn/RFC-0011-builtin-asset-two-layer.md) — `@oxn/` universal builtin scope（D1-D4 scope 归属依据）
- [RFC-0010 RFC frozen+errata 演进策略](./docs/rfc/zh-cn/RFC-0010-frozen-errata.md) — 本 RFC 的 6 项验证依据