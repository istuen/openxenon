# Probe 类型参考

> OpenXenon v0.1 内置 Probe 类型。Probe = 物理观测 + 纯函数判定。

## 1. 概览

| 类型 | 物理观测 | 纯函数判定 |
|---|---|---|
| `fs_exists` | `glob()` 文件系统扫描 | `found.length > 0` |
| `fs_not_exists` | `glob()` 文件系统扫描 | `found.length === 0` |
| `fs_match` | `readFile()` + `RegExp.test()` | `pattern.test(content)` |
| `shell_exec` | `spawn()` 执行命令 | `exitCode === 0` |

## 2. fs_exists

检查匹配 glob 模式的文件是否存在。

```oxn
probe "build-output-exists" {
  description = "构建产物存在"
  ref "@oxn/probe/fs_exists"
  params = { pattern = "dist/**/*.js" }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `pattern` | string | 是 | glob 模式 |

**判定**：
- 命中 ≥ 1 个文件 → PASSED
- 命中 0 个文件 → FAILED

## 3. fs_not_exists

检查匹配 glob 模式的文件**不**存在。

```oxn
probe "no-debug-code" {
  ref "@oxn/probe/fs_not_exists"
  params = { pattern = "src/console.log" }
}
```

**判定**：
- 命中 0 个文件 → PASSED
- 命中 ≥ 1 个文件 → FAILED

## 4. fs_match

检查文件内容是否匹配正则。

```oxn
probe "uses-prisma" {
  ref "@oxn/probe/fs_match"
  params = {
    path     = "src/models/user.ts"
    pattern  = "@prisma/client"
  }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `path` | string | 是 | 文件路径 |
| `pattern` | string | 是 | 正则表达式 |

**判定**：
- 内容匹配正则 → PASSED
- 内容不匹配 → FAILED

## 5. shell_exec

执行命令，检查退出码。

```oxn
probe "tests-pass" {
  ref "@oxn/probe/shell_exec"
  params = {
    command = "pnpm test"
    timeout = 60000
  }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `command` | string | 是 | shell 命令 |
| `timeout` | number | 否 | 超时（ms，默认 30000） |

**判定**：
- `exitCode === 0` → PASSED
- 非 0 退出码 / 超时 → FAILED

## 6. 自定义 Probe（v0.1 手写路径）

> v0.1 hard-switch：`oxn forge probe` / `oxn arsenal promote` 等已删除。
> Probe 内联写在 `task.oxn` 的 `part { probe {} }` 块内（不是独立文件）：

```oxn
probe "my-check" align "MyCheck" {
  description = "Custom check"
  prop "pattern" { type = string; required = true }
  output { ok = boolean }
}
```

校验：`oxn dev validate <file.oxn>`

## 7. Probe 三层模型

```
┌────────────────────────────────────┐
│  [Contract]  YAML / OXN 定义       │  ← 工程师写
│  - type / description / params     │
├────────────────────────────────────┤
│  [Capability]  Infra 物理观测      │  ← L1 Foundation
│  - 触碰 FS / 启动进程               │
├────────────────────────────────────┤
│  [Evaluation]  Kernel 纯函数判定   │  ← L0 Kernel
│  - 比较符号、返回 Verdict           │
└────────────────────────────────────┘
```

**关键**：Kernel 永远**不触碰**物理世界，只接受 Infra 的观测结果，输出 Verdict。

## 8. Verdict 格式

```typescript
type Verdict = 'PASSED' | 'FAILED'

interface ProbeResult {
  probeName: string
  probeRef:  string
  passed:    boolean
  output?:   unknown
  errorMessage?: string
  durationMs: number
}
```

## 9. 在 Part 中使用

```oxn
task "verify-build" {
  blueprint "ci-pipeline";

  part "verify" {
    skill_context = "运行构建并验证产物";

    probe "build-output" {
      ref "@oxn/probe/fs_exists"
      params = { pattern = "dist/index.js" }
    }

    probe "tests-pass" {
      ref "@oxn/probe/shell_exec"
      params = { command = "pnpm test" }
    }
  }
}
```

> v0.1：probe 块在 Part 内**仅作声明**（不实际运行）
> v0.2：probe 块由 Kernel 在 leader submit 时实际执行

## 10. 下一章

- [State Schema 参考](./state-schema.md)
- [OXN DSL 参考](./oxn-dsl.md)
