# Probe（原子检查）

Probe 是最小验证单元，执行物理观测并返回判定结果。

## 定义

Probe 是原子化的检查逻辑，通过物理观测（文件系统、进程）获取事实，由 Kernel 纯函数判定结果。

## 三阶段执行

```
┌─────────────────────────────────────────────────────────────┐
│                    Probe 三阶段                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [契约层] YAML 定义                                          │
│  ├─ type: fs_exists                                         │
│  ├─ description: "检查文件是否存在"                          │
│  └─ parameters: [{ name: pattern, type: string }]          │
│                                                              │
│  [能力层] Infra 执行                                         │
│  ├─ 触碰文件系统/进程                                        │
│  └─ 返回物理事实（如：文件列表）                             │
│                                                              │
│  [评判层] Kernel 判定                                        │
│  ├─ 纯函数计算                                              │
│  └─ 返回 ProbeVerdict { passed, message }                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 内置 Probe 类型

| 类型 | 能力层实现 | 评判层逻辑 |
|------|-----------|-----------|
| `fs_exists` | `glob()` 扫描文件系统 | `found.length > 0` |
| `fs_not_exists` | `glob()` 扫描文件系统 | `found.length === 0` |
| `fs_match` | `readFile()` + `RegExp.test()` | `pattern.test(content)` |
| `shell_exec` | `spawn()` 执行命令 | `exitCode === 0` |

## 结构示例

```yaml
type: fs_exists
description: "检查文件是否存在"
parameters:
  - name: pattern
    type: string
    required: true
    description: "glob 模式匹配文件路径"
```

## 执行流程

```
Core 调用 taskVerify
    │
    ▼
取出 Part.probes

所有 Probe 通过 → Part PASSED
任一 Probe 失败 → Part FAILED

- **可复用**：Probe 可跨 Part、跨 Blueprint 复用
