# 0.4.0 PR-B.5 — `oxn work migrate-md` + 30 works 批量迁移

> v0.4 RFC PR-B 子项 2/2 完整 Q5: 28+ works work.oxn → work.md 迁移
> 安全版 (不动 work.oxn / tasks/) — 后续 PR-C1 切换 work.ts 读 work.md 时再删原文件

## 背景

v0.4 RFC Q5 决策: work.md 是单一文件, 内联 `## Tasks` H2 + H3 = task.
v0.3.4 现状: work.oxn 已是 source of truth (T11 grammar 之后), tasks/<n>/task.oxn
是 v0.3 期间 add-task 生成的占位符 (TODO 内容), work.oxn 已有真实 task 内容.

本 PR 提供 `oxn work migrate-md` 命令 + 30 works 批量执行:
- work.oxn → work.md (用 work-compiler 编译)
- work.oxn / tasks/ 不动 (向后兼容)
- work.ts 继续读 work.oxn (零 breaking change)
- 后续 PR-C1 (unified-native) 切换 work.ts 读 work.md 时再删 work.oxn / tasks/

## 变更

- src/cli/work.ts
  * 新增 `migrateMdSubcommand` — `--all` 批量 / `<name>` 单个
  * 调 `compileOxnToMd` (work-compiler 已有) 生成 work.md
  * 写 `.openxenon/works/.migrate-md.log` 报告 (compiled/skipped/error 计数)
  * 支持 --json / --yaml 输出

## 批量执行结果

```
$ oxn work migrate-md --all
migrate-md --all
  total:    30
  compiled: 30
  skipped:  0
  error:    0
  log:      /Users/issac/pro/openxenon/.openxenon/works/.migrate-md.log
```

| 维度 | 值 |
|---|---|
| 总 works | 30 |
| 编译成功 | 30 (100%) |
| 跳过 | 0 |
| 错误 | 0 |
| 总字节 | ~90KB (28 works 平均 2.8KB) |
| 最大 work.md | v0.3-md-native-reform (6978 bytes, 4 task) |
| 最小 work.md | fix-domain-name-consistency (516 bytes, 1 task) |

## 兼容性

- ✅ work.oxn 仍为 source of truth (work.ts 读 work.oxn 不变)
- ✅ work.md 是 v0.3 canonical 视图 (供 proof snapshot / 后续 unified 解析)
- ✅ 30 works 零破坏
- ⚠ v0.5 PR (unified-native) 时, work.ts 切到读 work.md, 此时删 work.oxn

## 验证

- 1727/1727 全仓库 tests pass
- typecheck clean
- 30 works 端到端 compile 成功 (4 task 内联 / constraints 完整保留)

## 后续 (v0.4 RFC §4)

- PR-C1: unified 基建 (mdast-util-* 标准包) + work.ts 改读 work.md
- PR-C2: 5 EntityCompilers 改写为 unified plugins
- PR-C3: mdast-validator → remark-canonical
- PR-C4: 删 driver-registry / extract-* / oxl-md-* + 切到 work.md
