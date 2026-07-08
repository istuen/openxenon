---
entity: domain
version: 0.3.0
name: PoolContext
oxn-source-sha: b62bff32e9bb2a8b5f822dcf81b29dd47e825476f8d8305c38ea9b3c9d7da3a1
synced-at: 2026-07-08T13:52:19.205Z
---

# Domain: PoolContext

> Intent Pool v3 限界上下文: 5 类池 (research/design/issue/audit/journal) + pool-writer + heading-skeleton + forges/ 弃用迁移

## Terms

### IntentPool
- desc: 5 类池 union (research/design/issue/audit/journal), v0.2 T8 仅 research, T13 全启用

### PoolEntry
- desc: 单个池条目: pool/slug/title/content/metadata, 物理路径 .openxenon/pools/

### PoolWriter
- desc: 写入器 writePoolEntry: 写 .md (0o644) + frozen.json (0o444 复用 writeFrozenImmutable) + SHA-256 hash

### HeadingSkeleton
- desc: 每个 .md 文件的 heading 骨架校验: 行首 ^#{1,6}\s, 排除

### JournalSnippet
- desc: 从单个 .md 生成 journal 风格简短摘要: 提取首个 ## 标题 + 首段去 markdown 标记, 截断 200 chars

### CalibrationSignal
- desc: work finalize 阶段写入 pools/research/

### ForgeDeprecation
- desc: forges/ 目录弃用: 兼容期默认静默 (warnOnForgesDeprecated=false), Sprint 6 flip WARN

### PoolScan
- desc: Hall 扫描入口: scanIntentPools() 遍历 5 池 + scanForgeDrafts() 兼容期保留

### PoolCLI
- desc: oxn pool 子命令族: list (列池条目) + create (写新条目) + show/update/delete/transition (v0.3 计划)

### ResearchSpec
- desc: # What' '# Why' '# How' (可选 '# Reference') — 探索/调研类池

### DesignSpec
- desc: # What' '# Why' '# How' (可选 '# 决策记录' '# 范围之外') — 设计稿类池

### IssueSpec
- desc: # What' '# Why' '# How' '# 复现步骤' '# 期望' '# 实际' — 问题追踪类池

### AuditSpec
- desc: # What' '# Why' '# How' '# 证据' '# 结论' — 审计类池

### JournalSpec
- desc: # What' '# Why' '# How' '# 时间线' — 工作日志类池

## Bans

### forbidden-constructs
- items:
  - Forge
  - DesignNote
  - WorkLog
  - ResearchPaper
- desc: Forge, DesignNote, WorkLog, ResearchPaper

## Invariants

### inv-1
- value: 5 池 heading 模板互为独立 spec, 不可交叉 (如 research 池不可出现 '# 决策记录')

### inv-2
- value: pool-writer.ts slug 必须匹配 /^[a-z0-9][a-z0-9-]*$/ (小写中划线)

### inv-3
- value: check-heading-skeleton.ts 仅检查 pools/ + forges/ (不影响其他 .md)

### inv-4
- value: forges/ 兼容期: warnOnForgesDeprecated 默认 false (静默), Sprint 6 flip 后打印 WARN

### inv-5
- value: pool 条目 frozen.json chmod 0o444 + content_hash 不可篡改 (复用 writeFrozenImmutable)
