# 0.1.6 — fix-p2-robustness

> Work: `.openxenon/works/fix-p2-robustness/` (8 task, all passed)
> 来源: `.openxenon/forges/2026-06-12-code-quality-pattern-and-logic.md` (P2 + m6-m12)

## 修复

### 1. Socket 多响应丢消息 (C6)
- `src/infra/socket.ts`: 新增 `SocketRequest` (id 可选), `SocketResponse<T>` envelope 类型。
- `src/daemon/ipc/server.ts`: `writeSocketResponse` 增加 `id` 参数, 写入 `{id, ok, data/error}` envelope; 异常路径也带 respId。
- `src/cli/socket-client.ts`: 改写为 `Map<string, PendingRequest>` 按 id 路由; `crypto.randomUUID()` 生成 id; 5s timeout; `close` / `error` 事件 rejectAllPending; 老 client 兼容 (null id 走 fallback `__default__` 占位).
- 单 socket 长连接多 inflight 请求不再丢消息 / 错配。

### 2. DAG queue O(n²) 性能 (C3)
- `src/kernel/processors/dag.ts`: `queue.shift()` O(n) 数组复制 → `queue[head++]` 索引指针, 整体 O(n) → O(n²) → O(n). 算法行为不变, 仅常数因子优化。

### 3. -vv 详细度计数 (M8)
- `src/cli/context.ts`: 修复 `if/if` 重复触发 (`-v` 既进 count 1 又因 -v -v 字符串误匹配再 +2) + `-v -v` 字符串永远不出现 (argv 拆为 token).
- 提取纯函数 `countVerbosity(argv: readonly string[])`, 用 `/^-+v+$/` 通用正则, 支持 `-v`/`-vv`/`-vvv`/`-vvvv`/`--verbose`.
- 新增 `src/cli/__tests__/verbosity.test.ts` 13 测试覆盖各种 argv 组合.

### 4. output 双重包装 (m6)
- `src/cli/output.ts`: 判别器从 leak 的 `'data' in obj` (任何含 data 字段的对象都被当 OutputOptions) 改为 `isOutputOptions` 严格判别, 用 `error` / `human` / `ok === true` 作为 CLI 渲染指令的强信号.
- 调用方调用习惯不变 (`output({ok, data})` / `output({data, human})` / `output(errorPayload)`), 内部不再误判.
- 修复同步更新 `src/cli/__tests__/work-status-birth-cert-e2e.test.ts` 与 `work-full-lifecycle-e2e.test.ts` 中 3 处测试断言 (r.data.error → r.error), 老测试依赖了 buggy 双重包装.

### 5. compile-cache 整文件读 (m8)
- `src/infra/compile-cache.ts`:
  - `set()` 接受新 `options: { blueprintPath?, fingerprint? }` 参数, 把 fingerprint (mtime+size) 存到 `dependencyHashes.__fingerprint__` synthetic key.
  - `invalidateByPath()` 走快速路径: statSync mtime+size 算 fingerprint, 比对 entry 的 fingerprint, 一致即缓存仍 valid (跳过整文件读). mtime 不可靠 (NaN / 0) 时回退 content hash 慢路径.
- 主 cache key 仍是 content hash (向后兼容), fingerprint 仅作 invalidate 快速比对.

### 6. scanner 静默截断 (m10)
- `src/infra/scanner.ts`: `scanDirectoryRecursive` 返回类型从 `Array<...>` 改为 `ScanResult { items, truncated: boolean }`. 触达 maxDepth 时 `truncated: true`, 沿子目录冒泡. 调用方 (目前无外部调用方) 拿到的 `[]` 仍能工作 (items 字段), 但可读 truncated 信号决定是否告警.
- 新增 `src/infra/__tests__/scanner.test.ts` 5 测试覆盖: 空目录 / maxDepth=0 / maxDepth 充足 / maxDepth 不够 / 目录不存在.

## 测试

- `bun test`: 1118/1118 pass (含 13 verbosity + 5 scanner 新测试)
- `bun run typecheck`: 0 error
- `bun run lint`: 0 增量 (baseline 3 problems, 当前 3 problems)
- `bun run check`: 0 error 增量 (baseline 0 errors, 当前 0 errors; 警告数 0 增量, info 数 +2 仅为行号偏移 artifacts)

## 验证产物

- `.openxenon/works/fix-p2-robustness/verify-output/REPORT.md` — 详细 verify 报告
- `.openxenon/works/fix-p2-robustness/.run/frozen.json` — work 终态快照
- `.openxenon/works/fix-p2-robustness/forensics/socket-multiresp-analysis.md` — socket 协议 forensic 报告

## 范围外 (已知)

- `queue.shift` 仍在 `src/daemon/engine/executor.ts:??` 与 `src/oxl/validator/intent-align-validator.ts:??` — 不在本 work scope (work.oxn 第 50 行只指定 dag.ts).
