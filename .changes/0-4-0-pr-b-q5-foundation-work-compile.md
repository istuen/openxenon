# 0.4.0 PR-B (Q5 foundation) — `oxn work compile <w>` 命令

> v0.4 RFC PR-B 子项 2/2 (Q5): task 内联 work.md 路径
> 范围: 仅新增 compile 命令, 把 work.oxn (langium) 编译为 work.md (MD canonical)
> 全量 28 works migrate + work.oxn 改名 work.md 推迟下个 PR

## 背景

v0.4 RFC Q5 决策: work.md 是单一文件, 内联 `## Tasks` H2 + H3 = task 格式.
当前 v0.3.4 状态:
- work.oxn 已用 langium 语法 `task "name" { ... }` 内联所有 task (T11 grammar 之后)
- work.oxn 编译为 work.md (MD canonical) 的逻辑已在 `work-compiler.ts`
- 但缺 CLI 命令入口让用户调用

本 PR 提供 `oxn work compile <w>` 命令作为基础, 后续 PR 再做:
1. work.oxn 改名为 work.md (单文件路径)
2. `oxn work add-task` 标记 deprecated
3. 28 works 一次性 migrate

## 变更

- src/cli/work.ts
  * 新增 `compileSubcommand` — 读 work.oxn, 调 `compileOxnToMd` 编译, 写 work.md
  * `oxn work <w> compile [name] [--output-path <path>]`
  * 支持 --json / --yaml 输出
  * 注册到 work 主命令 subCommands 列表

## 输出格式 (work.md canonical)

```md
---
entity: work
version: 0.3.0
name: i18n-pr2-consume-migrate-v2
---

# Work: i18n-pr2-consume-migrate-v2

## Context

### primary
- goal: ...
- max_iterations: 3
- constraints:
  - ...

## Tasks

### map-callers
- blueprint: refactor-safe
- part: map-callers
  - skill_context: ...

### extract
- blueprint: refactor-safe
- part: extract
  - skill_context: ...
```

## 端到端实测

`bun src/cli/index.ts work compile i18n-pr2-consume-migrate-v2`:
- work.oxn 4 task 全部内联
- 输出 3013 字节
- hash 9ce889207d03d225...

## 兼容性

- ✅ work.oxn 仍是 source of truth (langium 解析路径不变)
- ✅ 生成的 work.md 写到 .openxenon/works/<w>/work.md (gitignored)
- ✅ 无 breaking change
- ⚠ v0.5 视情况把 work.oxn 改名为 work.md

## 后续 (v0.4 RFC §4)

- PR-B.5: work.oxn → work.md rename + 28 works migrate 脚本
- PR-B.6: `oxn work add-task` 标记 deprecated
- PR-C1: unified 基建 (mdast-util-* 标准包)

## 验证

- 1727/1727 全仓库 tests pass (无新 fail)
- typecheck clean
- 1 work 端到端 compile 成功 (4 task 内联)
