# 0.4.0 PR-B (Q4-A 部分) — proof 持有 work.md 不可变快照

> v0.4 RFC PR-B 子项 1/2 (Q4-A): 证据稳定性闭环
> Q5 (task inline) + 28 works migrate 推迟下个 PR (本 PR 范围太大)

## 背景

v0.3.4 proof 验证 live work.md — AI 改 work.md 后, proof 验证
"老 work.md + 新 frozen.json" 的不一致快照, 证据稳定性弱.
v0.4 修复: proof 在 `oxn proof run` 时把 work.md 拷贝成 proof.md (immutable, 0o444),
并写 work-hash.txt SHA-256. 后续可 `oxn proof verify` 检查 hash drift.

## 变更

- src/kernel/constants.ts
  * 新增 `PROOF_MD_FILE = 'proof.md'` (不可变快照)
  * 新增 `PROOF_WORK_HASH_FILE = 'work-hash.txt'` (SHA-256 hex)

- src/kernel/index.ts
  * 导出 PROOF_MD_FILE / PROOF_WORK_HASH_FILE

- src/cli/proof.ts
  * 新增 `parseProofMetadata(oxnPath)` — 解析 proof.oxn 头部 `// proofs-target-work: <path>` 注释
  * 新增 `resolveWorkPath(proofOxnPath, target)` — 解析相对/绝对路径
  * 新增 `computeFileHash(filePath)` — SHA-256 hex
  * 新增 `snapshotWorkMd(name, proofOxnPath)` — 写 proof.md (0o444) + work-hash.txt
  * 新增 `verifyWorkHash(name, proofOxnPath)` — 比较 live hash 与 work-hash.txt
  * `oxn proof run` Phase 0.5: 跑 probe 前先 snapshotWorkMd
  * 新增 `oxn proof verify` 子命令 — hash drift 检查 (E_PROOF_WORKHASH_DRIFT 等)
  * export 新增 6 个辅助函数 (供测试 / 外部调用)

- src/cli/__tests__/proof.test.ts
  * 新增 16 个测试: parseProofMetadata (3) + resolveWorkPath (2) + snapshotWorkMd (6) + verifyWorkHash (5)

## 用户视角 (新 API)

### proof.oxn 加注释 (头 30 行内)
```
// Proof: my-proof
// proofs-target-work: ../../works/my-work/work.oxn

proof "my-proof" { ... }
```

### 提交时自动快照
`oxn proof run my-proof` 在 probe 执行前:
- 计算 work.md SHA-256
- 对比 work-hash.txt: 一致 → 跳过; 不一致 → 拷贝新快照 + 写新 hash
- 跑 probe → 写 frozen.json (原有逻辑)

### 独立验证
`oxn proof verify my-proof` 不改任何文件, 仅比对 hash:
- match      → 证据一致
- drift      → work.md 已被 AI 改动 (E_PROOF_WORKHASH_DRIFT)
- no-snapshot → proof 从未 run 过 (E_PROOF_NO_SNAPSHOT)
- no-target  → 缺 `// proofs-target-work:` 注释 (silent pass, 兼容旧 proof)
- work-missing → 注释指向的 work.md 不存在 (E_PROOF_WORK_MISSING)

## 兼容性

- ✅ 旧 proof.oxn (无 `// proofs-target-work:` 注释): 行为不变, 跳过 snapshot
- ✅ 旧 .openxenon/proofs/<p>/ 目录: 既有 frozen.json 不动
- ⚠ v0.5 视情况升级为硬要求 (缺 `proofs-target-work` 时 reject)

## 后续 (v0.4 RFC)

- PR-B (Q5 部分): task 内联 work.md + `oxn work migrate <w>` 脚本 (下个 PR)
- PR-C1 (unified 基建): 引入 mdast-util-* 标准包
