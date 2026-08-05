---
redirectFrom:
  - /zh-cn/extending.html
title: 扩展
---

# 扩展

> 自定义 Probe、Part、DSL 扩展点。OpenXenon 的扩展体系分为三个层级。

## What —— 三层扩展体系

| 层级 | 扩展点 | 难度 | 何时用 |
|---|---|---|---|
| 自定义 Probe | 新增验证量具 | 低 | 内置 Probe 不够用 |
| 自定义 Part | 新增执行构件 | 中 | 需要特定的工具集成 |
| DSL 扩展 | 修改 OXL 语法 | 高 | 需要新的资产类型或语法结构 |

---

## 自定义 Probe

### 内置 Probe 类型

OpenXenon 内置 11 个 Probe，涵盖最常见的验证需求：

| Probe | 用途 |
|---|---|
| `fs-exists` | 检查文件是否存在 |
| `fs-not-exists` | 检查文件不存在 |
| `fs-content-match` | 检查文件内容匹配正则 |
| `fs-parseable` | 检查文件可解析（JSON 等） |
| `shell-exec` | 执行命令并检查退出码 |
| `test-pass` | 运行 `bun test` |
| `ts-compiles` | 运行 `tsc --noEmit` |
| `lint-check` | 运行 `biome check` |
| `deps-resolved` | 检查依赖完整性 |
| `http-responds` | HTTP 端点检查 |
| `file-exports` | 检查文件导出 |

完整参数与判定逻辑见 [Proof](./proof.md)。

### 自定义 Probe 的结构

一个 Probe 由两部分组成：

1. **物理观测**（Infra 层）：执行实际的 IO 操作
2. **纯函数判定**（Kernel 层）：根据观测结果给出 COMPLETED/DEVIATED

```
观测函数（Infra）        →    判定函数（Kernel）
fs.glob("dist/**/*.js")  →    found.length > 0 → COMPLETED
```

### 内联 Probe（推荐）

在 Part 内直接声明 Probe，无需注册：

```oxn
part "build" {
  skill_context = "实现 Member 注册 API"
  probe "api-exists" ref "@oxn/probes/fs-exists" {
    params = { path = "src/api/member.ts" }
  }
  probe "api-compiles" ref "@oxn/probes/ts-compiles" {
    params = { project = "tsconfig.json" }
  }
}
```

---

## 自定义 Part

Part 是 Task 的执行单元。内置 Part 类型：

| Part 类型 | 说明 |
|---|---|
| `shell-exec` | 执行 shell 命令 |
| `jest-runner` | 运行 Jest 测试 |

自定义 Part 需要在代码层面注册到 Part 注册表（见旧文档 `docs/guides/probe-development.md`）。

---

## OXL DSL 扩展

OXL 基于 Langium 实现。语法定义在 `src/oxl/langium/oxn.langium`。

修改语法后需重新生成：

```bash
bun run langium:generate
```

生成的文件在 `src/oxl/generated/`，**禁止手动编辑**。

### 扩展场景

| 场景 | 方法 |
|---|---|
| 新增 DSL 关键字 | 修改 `oxn.langium` 语法规则 |
| 新增资产类型 | 添加新的 grammar rule + 对应的 validator |
| 新增 scope 寻址 | 添加 `@oxn/` 或自定义 scope |

---

## 私有 Builtin 模块

将项目内常用的 Domain / Blueprint / Probe 打包为内置资产，放在 `src/builtin/` 下：

```
src/builtin/
├── blueprints/
│   └── git-workflow.md
├── domains/
│   └── ProgramContext.md
└── probes/
    └── custom-probe.ts
```

这些资产在 `oxn init` 时复制到 `.openxenon/`。

---

<!-- allow-version -->
## Langium 退役时间表（v0.6.1 PR-4 + v0.7.0）

> **D-β c 锁定**：v0.6.1 不卸 Langium（保留作 v0.6.x fallback）；v0.7.0 切割
<!-- /allow-version -->

| 阶段 | 时间 | 状态 |
|---|---|---|
<!-- allow-version -->
| **v0.6.0** 起 | unified-native（默认走 mdast + EntityCompiler）| ✅ 已完成 |
| **v0.6.1 PR-1** | `:::intent{...}` 旧语法解析期抛 `E_MD_DEPRECATED_SYNTAX` | ✅ 已完成 |
| **v0.6.1 PR-4** | Langium driver 标 `@deprecated`；`oxn <asset> validate --no-langium` 引入 | ✅ 当前 PR |
| **v0.6.1 PR-4** | CI 守卫：`bun run check:no-langium-usage`（拦截新增 Langium import） | ✅ 当前 PR |
| **v0.7.0 cutover**（8–12 周后）| `git rm` `packages/engine/src/oxl/langium-driver/` + `generated/` + 卸 `langium`/`langium-cli` npm dep | 🔲 待启动 |
<!-- /allow-version -->

**用户行为变更**：

1. **新代码禁止 import Langium** — 走 mdast + EntityCompiler 路径
2. **CLI 默认走 mdast** — `oxn <asset> validate` 默认不动 Langium grammar
<!-- allow-version -->
3. **强校验**：`oxn <asset> validate --no-langium` 标志保证 mdast-only（v0.7.0 后唯一合法形式）

**迁移指南（v0.7.0 准备）**：
<!-- /allow-version -->

- 现有 `.md` 文件无需迁移（已是 canonical 格式）
- 转完后用户代码不再需要 `import { URI } from 'langium'` — 删即可
- 参考 [md-native-grammar-rfc.md](https://github.com/istuen/openxenon/blob/main/.openxenon/.archived/docs/rfcs/md-native-grammar-rfc.md) D9

## → 参考

- 旧文档：[Probe 开发指南](./guides/probe-development.md)（旧 SSOT）
- 旧文档：[OXN DSL 参考](./reference/oxn-dsl.md)（旧 SSOT）
- [Architecture](../architecture.md) — L0-L3 分层中扩展点的物理归属
