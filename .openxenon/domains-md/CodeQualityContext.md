---
entity: domain
version: 0.3.0
name: CodeQualityContext
---

# Domain: CodeQualityContext

> 源代码质量的检测与改善限界上下文：跨平台一致性、命名解析、模式应用、行为漂移

## Terms

### PatternQuality
- name: PatternQuality
- desc: 软件模式质量：Strategy/Port-Adapter/Registry/SOLID 的应用与遵守程度

### LogicQuality
- name: LogicQuality
- desc: 代码逻辑质量：null 安全、错误处理、竞态、边界条件、类型安全、资源泄漏

### LayerConstitution
- name: LayerConstitution
- desc: L0–L3 分层架构规则：kernel→infra→work→cli 的依赖方向与禁入关系

### CodeSmell
- name: CodeSmell
- desc: 可量化的反模式：重复实现、过长函数、跨层导入、类型断言滥用、需 ESM 残留

### Lint
- name: Lint
- desc: 结构化静态门禁卡：ESLint no-restricted-imports + biome check + tsc noUncheckedIndexedAccess

### CodebaseAudit
- name: CodebaseAudit
- desc: 对 src/ 全量扫描形成的可定位报告，含 file:line 引用与严重级评分

### Refactor
- name: Refactor
- desc: 在保证行为不变前提下，按既定模式（如 5 阶段 fix-issue 蓝图）改造代码

### Regression
- name: Regression
- desc: typecheck / lint / test 三件套之一失败即视为引入了回归

## Bans

### forbidden-constructs
- items: quality_assessment, pattern_score, smell
- desc: quality_assessment, pattern_score, smell

## Invariants

### inv-1
- value: C1: ESM 项目禁用 CJS require() — verbatimModuleSyntax: true 下所有 14 处 require 必须改 import from 'node:*' 或包名
- desc: C1: ESM 项目禁用 CJS require() — verbatimModuleSyntax: true 下所有 14 处 require 必须改 import from 'node:*' 或包名

### inv-2
- value: C2: 路径解析必须读 AGENTS.md 命名约定 — resolveForgeRoot 必须返回 .openxenon/forges/，不得用 .openxenon/arsenal/drafts/
- desc: C2: 路径解析必须读 AGENTS.md 命名约定 — resolveForgeRoot 必须返回 .openxenon/forges/，不得用 .openxenon/arsenal/drafts/

### inv-3
- value: C4: 用户输入进 RegExp 前必须做复杂度校验 — ReDoS 模式 (a+)+ / (a*)* / (a|a)* 必须被 safe-regex 拦截
- desc: C4: 用户输入进 RegExp 前必须做复杂度校验 — ReDoS 模式 (a+)+ / (a*)* / (a|a)* 必须被 safe-regex 拦截

### inv-4
- value: C5: Shell 命令执行必须参数化 — 禁止 spawn(cmd, [], { shell: true })，必须用 spawn(cmd, [arg1, arg2]) 数组形式
- desc: C5: Shell 命令执行必须参数化 — 禁止 spawn(cmd, [], { shell: true })，必须用 spawn(cmd, [arg1, arg2]) 数组形式

### inv-5
- value: P1: 高严重级 (HIGH/CRITICAL) 问题不修复不得合入 main — 修复前应跑 typecheck/lint/test 三件套零回归
- desc: P1: 高严重级 (HIGH/CRITICAL) 问题不修复不得合入 main — 修复前应跑 typecheck/lint/test 三件套零回归
