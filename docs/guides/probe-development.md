# 自定义 Probe 开发

> OpenXenon 允许通过 Arsenal 机制自定义 Probe，扩展验证能力。

## 1. Probe 模型

每个 Probe 由三层组成：

```
┌────────────────────────────────────┐
│  [Contract]  OXN/YAML 定义       │  ← 工程师写
│  - type / description / params     │
├────────────────────────────────────┤
│  [Capability]  Infra 物理观测      │  ← L1 Foundation
│  - 触碰 FS / 启动进程               │
├────────────────────────────────────┤
│  [Evaluation]  Kernel 纯函数判定   │  ← L0 Kernel
│  - 比较符号、返回 Verdict           │
```

## 2. 内置 Probe 类型

| Type | 物理观测 | 纯函数判定 |
|---|---|---|
| `fs_exists` | `glob()` | `found.length > 0` |
| `fs_not_exists` | `glob()` | `found.length === 0` |
| `fs_match` | `readFile()` + `RegExp.test()` | `pattern.test(content)` |
| `shell_exec` | `spawn()` | `exitCode === 0` |

详见 [Probe 类型参考](../reference/probe-types.md)。

## 3. 自定义 Probe（v0.1 hard-switch 路径）

> **v0.1 起，Probe 没有 CLI 入口**（`oxn forge probe` / `oxn arsenal promote` / `oxn arsenal inspect` 全部删除）。
> Probe 是**手写**的 `.oxn` 文件，落在 `task.oxn` 的 `part { probe {} }` 块内联（不是独立文件）。

```oxn
// 在 task.oxn 里
part "build" {
  skill_context = "..."
  probe "build-output-exists" align "FsExists" {
    prop "pattern" { type = string; required = true }
    output { exists = boolean }
  }
}
```

校验语法：

```bash
oxn work validate --path .openxenon/works/<work>/work.oxn
```

## 4. 在 Blueprint / Task 中引用 Probe

```oxn
task "verify-build" {
  blueprint "ci-pipeline"

  part "verify" {
    skill_context = "运行构建并验证产物"
    observe = ["build-output-exists"]
  }
}
```

## 5. 添加新型 Probe（v0.2 路线图）

未来 v0.2 计划：
- 通过模板代码片段手写 probe.oxn
- 在 blueprint.oxn 中通过 `observe = [...]` 引用
- 由 Kernel 在 `oxn work submit --run-probes` 时实际执行

## 6. Probe 在 Part 中的语义

> v0.1：probe 块在 Part 内仅作声明
> v0.2：probe 块由 Kernel 在 work submit 时实际执行

详见 [document.md §2.7 信息隐藏原则](../core/document.md#27-信息隐藏原则) — AI 看不到 probe 内容的根本原因。

## 7. 下一章

- [Probe 类型参考](../reference/probe-types.md)
- [OXN DSL 参考](../reference/oxn-dsl.md)
