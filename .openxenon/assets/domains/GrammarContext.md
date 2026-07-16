---
entity: domain
version: 0.3.0
name: GrammarContext
oxn-source-sha: cdbd4e6d426c157f258838f406da45dc6026ce83457ccd29595195850d5c8268
synced-at: 2026-07-08T13:52:19.201Z
---

<!-- v0.7 MIGRATION BANNER · 2026-07-16
     This Domain has been migrated to [`oxn-engine-domain`](./oxn-engine-domain.md)
     as part of v0.7 domain hierarchy restructure (RFC W3).
     terms 已迁移（OXL / Langium / ProbeDeclaration / InvariantDecl / WorkDeclaration /
     DomainProofRef / TaskDeps / Scheme / Parser / AST / Validator）。
     文件保留供历史审计，不接受新 term 添加。W8 收尾时删除。
-->

# Domain: GrammarContext

> OXL DSL 语法限界上下文: ProbeDeclaration/InvariantDecl/WorkDeclaration/DomainProofRef + Langium 生成管道 + scheme 字段

## Terms

### OXL
- desc: OpenXenon Language — 基于 Langium 的 DDD DSL, 语法定义在 src/oxl/langium/oxn.langium

### Langium
- desc: TypeScript 实现的现代化 DSL 框架: grammar → parser/ast/grammar 自动生成 (bun run langium:generate)

### ProbeDeclaration
- desc: Probe 实体声明: probe name='STRING' { scheme? descriptions? props* output? } — T10 已加 scheme: 可选字段

### InvariantDecl
- desc: 不变式声明: invariant { value/script/manual/scope } — T11 已扩三字段 + InvariantScope 枚举

### WorkDeclaration
- desc: Work 编排声明: 资源池寻址 + Task 编排 + T11 新加 domainProofs 字段

### DomainProofRef
- desc: Work 对 Domain Invariant 的显式引用: 'proofs [domain.invariant]' 语法 (T11)

### TaskDeps
- desc: Task 依赖声明: 4 种语法形式 (数组/单元素/多元素无括号/冒号赋值) — T3 soft-gaps 修复

### Scheme
- desc: Probe URI 前缀 (file:// / http:// / shell:// / git://) — OXL 1.3 grammar 可选字段

### Parser
- desc: Langium 自动生成的 TS 解析器: 从 .oxn 源码 → AST (src/oxl/generated/parser.ts)

### AST
- desc: Abstract Syntax Tree: Langium 生成的 TS 类型接口 (src/oxl/generated/ast.ts, 不可手工编辑)

### Validator
- desc: OXL 编译时校验: probe-validator (scheme 3 规则) / blueprint-dag / probe-namespace / probe-ref-validator

## Bans

### forbidden-constructs
- items:
  - ANTLR
  - Yacc
  - PEG
  - TypeScriptGrammar
  - HandWrittenParser
- desc: ANTLR, Yacc, PEG, TypeScriptGrammar, HandWrittenParser

## Invariants

### inv-1
- value: src/oxl/generated/ 目录由 langium:generate 自动生成, 绝对不可手工编辑

### inv-2
- value: T10 → T11 串行: OXL grammar 两次 langium:generate 必须分两次 PR, 禁止并行合入

### inv-3
- value: script / manual 字段在语法层不强制互斥 (runtime PR-2 校验)

### inv-4
- value: DomainProofRef 语法为 'proofs [entries+=STRING*]' (简单字符串数组, 跨域引用 PR-2 验证)

### inv-5
- value: TaskDeps 4 种语法形式全部支持: deps=['a','b'] / deps='a','b' / deps='a' / deps:'a

### inv-6
- value: 15 builtin probe 模板全部含 scheme 字段 (file:///http:///shell:///git://)
