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

## 3. 自定义 Probe（v0.0.x 兼容路径）

通过 `oxn forge probe` 从 YAML 创建 Draft：

```bash
oxn forge probe --save 'type: fs_exists
description: "Check build output exists"
parameters:
  - name: pattern
    type: string
    required: true' --name build-output-exists
```

生成 `.openxenon/forges/probes/build-output-exists/probe.yaml`。

## 4. Promote 为 CANONICAL

```bash
# 1. 审查 Draft
oxn arsenal inspect probes/build-output-exists

# 2. Promote（d2c 升级）
oxn arsenal promote probes/build-output-exists
```

提升后变为 `.openxenon/arsenals/probes/build-output-exists/probe.yaml`。

## 5. v0.1 路径：直接在 Part 内引用内置 Probe

v0.1 起，最常见的方式**不**需要自建 Probe，直接在 Part 内引用内置：

```oxn
task "verify-build" {
  blueprint "ci-pipeline";

  part "verify" {
    skill_context = "运行构建并验证产物";

    probe "build-output" {
      ref "@oxn/probe/fs_exists"
      params = { pattern = "dist/index.js" }
    }
  }
}
```

## 6. 添加新型 Probe（v0.2 路线图）

未来 v0.2 计划：
- 通过 `oxn forge probe --as-oxn` 生成 OXN 格式 Probe 草稿
- 通过 `oxn arsenal promote` 升级为 Arsenal 标准资产
- 通过 `oxn get-context --probe-ref` 验证 Probe 行为

## 7. Probe 在 Part 中的语义

> v0.1：probe 块在 Part 内仅作声明
> v0.2：probe 块由 Kernel 在 leader submit 时实际执行

详见 [信息隐藏原则](../architecture/information-hiding.md) — AI 看不到 probe 内容的根本原因。

## 8. 下一章

- [Probe 类型参考](../reference/probe-types.md)
- [OXN DSL 参考](../reference/oxn-dsl.md)
