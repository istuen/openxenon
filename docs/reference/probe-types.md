# Probe 类型参考

> OpenXenon v0.1.2 内置 Probe 类型。Probe = 物理观测 + 纯函数判定。
> 11 个 catalog 条目（5 builtin + 6 P1），运行时由 `src/kernel/verdicts/catalog.ts` 单一真相源管理。

## 1. 概览

| 类型 | 物理观测 | 纯函数判定 |
|---|---|---|
| `fs-exists` | `glob()` 文件系统扫描 | `found.length > 0` |
| `fs-not-exists` | `glob()` 文件系统扫描 | `found.length === 0` |
| `fs-content-match` | `readFile()` + `RegExp.test()` | `matched === true` |
| `fs-parseable` | `readFile()` + `JSON.parse()` | `parsed === true` |
| `shell-exec` | `spawn()` 执行命令 | `exitCode === 0` |
| `test-pass` | `spawn("bun test")` | `exitCode === 0` |
| `deps-resolved` | 解析 `bun.lock` / `package.json` | `missing.length === 0` |
| `ts-compiles` | `spawn("tsc --noEmit")` | `exitCode === 0` |
| `lint-check` | `spawn("biome check")` | `exitCode === 0` |
| `http-responds` | `Bun fetch()` | `status === expectedStatus` |
| `file-exports` | 子进程 `await import()` 提取 exports | `exports.length > 0` |

## 2. fs-exists

检查匹配 glob 模式的文件是否存在。

```oxn
probe "build-output-exists" {
  description = "构建产物存在"
  ref "@oxn/probes/fs-exists"
  params = { path = "dist/**/*.js" }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `pattern` | string | 是 | glob 模式 |

**判定**：
- 命中 ≥ 1 个文件 → PASSED
- 命中 0 个文件 → FAILED

## 3. fs-not-exists

检查匹配 glob 模式的文件**不**存在。

```oxn
probe "no-debug-code" {
  ref "@oxn/probes/fs-not-exists"
  params = { pattern = "src/console.log" }
}
```

**判定**：
- 命中 0 个文件 → PASSED
- 命中 ≥ 1 个文件 → FAILED

## 4. fs-content-match

检查文件内容是否匹配 regex 模式。

```oxn
probe "uses-prisma" {
  ref "@oxn/probes/fs-content-match"
  params = {
    path     = "src/models/user.ts"
    contains = "@prisma/client"
  }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `path` | string | 是 | 文件路径 |
| `contains` | string | 是 | 正则表达式 |

**判定**：
- `matched === true` → PASSED
- `matched === false` → FAILED

## 5. fs-parseable

检查文件可被解析（当前仅 JSON）。

```oxn
probe "tsconfig-valid" {
  ref "@oxn/probes/fs-parseable"
  params = { path = "./tsconfig.json" }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `path` | string | 是 | 要解析的文件路径 |

**判定**：
- `parsed === true` → PASSED
- 解析失败 → FAILED

## 6. shell-exec

执行命令，检查退出码。

```oxn
probe "tests-pass" {
  ref "@oxn/probes/shell-exec"
  params = {
    command = "bun test"
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

## 7. test-pass

跑 `bun test` 并验证全部通过。

```oxn
probe "all-tests-pass" {
  ref "@oxn/probes/test-pass"
  params = { timeout = 60000 }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `path` | string | 否 | 测试目录（默认项目根） |
| `pattern` | string | 否 | bun test 过滤 pattern |
| `timeout` | number | 否 | 超时（ms，默认 120000） |

**判定**：
- `exitCode === 0` → PASSED

## 8. deps-resolved

验证 `package.json` 所有依赖都被 lockfile 解析。

```oxn
probe "deps-locked" {
  ref "@oxn/probes/deps-resolved"
  params = {}  // 自动检测 bun.lock > package-lock.json > pnpm-lock.yaml > yarn.lock
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `packageJson` | string | 否 | package.json 路径 |
| `lockfile` | string | 否 | lockfile 路径（自动检测） |

**判定**：
- `missing.length === 0` → PASSED

## 9. ts-compiles

跑 `tsc --noEmit` 验证类型检查通过。

```oxn
probe "typecheck-ok" {
  ref "@oxn/probes/ts-compiles"
  params = { timeout = 60000 }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `path` | string | 否 | 要检查的文件或目录（默认全项目） |
| `tsconfig` | string | 否 | tsconfig.json 路径 |
| `timeout` | number | 否 | 超时（ms，默认 120000） |

**判定**：
- `exitCode === 0` → PASSED

## 10. lint-check

跑 `biome check` 验证代码风格。

```oxn
probe "lint-ok" {
  ref "@oxn/probes/lint-check"
  params = { apply = false }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `path` | string | 否 | 要 lint 的路径（默认项目根） |
| `apply` | boolean | 否 | 是否自动修复（默认 false） |
| `timeout` | number | 否 | 超时（ms，默认 60000） |

**判定**：
- `exitCode === 0` → PASSED
- 需项目装 biome

## 11. http-responds

HTTP 请求检查 status code。

```oxn
probe "health-check" {
  ref "@oxn/probes/http-responds"
  params = { url = "https://api.example.com/health" }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `url` | string | 是 | 请求 URL（http/https） |
| `method` | string | 否 | HTTP method（默认 GET） |
| `expectedStatus` | number | 否 | 期望 status code（默认 200） |
| `timeout` | number | 否 | 超时（ms，默认 5000） |
| `body` | string | 否 | 请求 body |
| `headers` | string | 否 | 请求 headers（JSON） |

**判定**：
- `status === expectedStatus` → PASSED

## 12. file-exports

进程隔离 `import()` 提取模块 exports 列表。

```oxn
probe "dist-has-exports" {
  ref "@oxn/probes/file-exports"
  params = { path = "./dist/index.js" }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `path` | string | 是 | 要分析的 .ts / .js 文件路径 |

**判定**：
- `exports.length > 0` → PASSED

## 12b. git-clean (v1.2 PoC)

检查 working tree 是否干净（无未提交改动）。

```oxn
probe "tree-clean" {
  ref "@oxn/probes/git-clean"
  params = {}
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `path` | string | 否 | git 仓库路径（默认当前目录） |
| `includeUntracked` | boolean | 否 | 是否把 untracked 文件算作 dirty（默认 false） |

**判定**：
- `clean === true` → PASSED
- 有未提交改动 → FAILED（verdict.actual.dirtyFiles 列出）

## 12c. git-branch-exists (v1.2 PoC)

检查指定本地分支是否存在。

```oxn
probe "main-exists" {
  ref "@oxn/probes/git-branch-exists"
  params = { branch = "main" }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `branch` | string | 是 | 要检查的本地分支名 |

**判定**：
- `exists === true` → PASSED

## 12d. git-status-clean (v1.2 PoC)

`git-clean` 的 verbose alias；语义一致。

```oxn
probe "verify-clean" {
  ref "@oxn/probes/git-status-clean"
  params = {}
}
```

**判定**：
- `clean === true` → PASSED

## 12e. git-merge-feasible (v1.2 PoC 核心)

**不实际 merge**——用 `git merge-tree --write-tree` 算法模拟三路合并，给出可行性证据。

```oxn
probe "merge-check" {
  ref "@oxn/probes/git-merge-feasible"
  params = {
    workBranch   = "feat/saturn"
    targetBranch = "main"
  }
}
```

**参数**：
| 字段 | 类型 | 必填 | 含义 |
|---|---|---|---|
| `workBranch` | string | 是 | work 分支名 |
| `targetBranch` | string | 否 | 目标分支名（默认 `current` = 当前分支） |
| `cwd` | string | 否 | git 仓库路径（默认当前目录） |

**判定**（状态机映射）：
| Infra status | Verdict | 含义 |
|---|---|---|
| `can_ff_merge` | ✅ PASSED | fast-forward 可行 |
| `can_merge_clean` | ✅ PASSED | 三路合并无冲突（需 `--no-ff` 创 merge commit） |
| `has_conflicts` | ❌ FAILED | 冲突文件列表非空，工程师需手动 resolve |
| `dirty_worktree` | ❌ FAILED | worktree 有未提交改动，应先 clean |
| `unknown` | ❌ FAILED | 分支不存在 / git 报错 |

**关键约束**：Kernel 永远不碰 git；Infra 用 `git merge-tree` 算法（纯观察）计算可行性。**OXN 不替人 merge**——finalize slot 产出 verdict，工程师自己决定怎么 merge。

## 13. 自定义 Probe（v0.1 手写路径）

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

## 14. Probe 三层模型

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

## 15. Verdict 格式

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

## 16. 在 Part 中使用

```oxn
task "verify-build" {
  blueprint "ci-pipeline";

  part "verify" {
    skill_context = "运行构建并验证产物";

    probe "build-output" {
    probe "build-output" {
      ref "@oxn/probes/fs-exists"
      params = { pattern = "dist/index.js" }
    }

    probe "tests-pass" {
      ref "@oxn/probes/shell-exec"
      params = { command = "bun test" }
    }
  }
}
```

> v0.1：probe 块在 Part 内**仅作声明**（不实际运行）
> v0.2：probe 块由 Kernel 在 leader submit 时实际执行

## 17. 下一章

- [State Schema 参考](./state-schema.md)
- [OXN DSL 参考](./oxn-dsl.md)
