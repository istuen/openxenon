# Asset 模式 vs Work 模式边界

> 本文件是 `oxn-asset` Skill 的按需加载补充。区分两种 Work 模式时查阅。

## 两种 Skill 的职责边界

| 维度 | `oxn-asset` | `oxn-work` |
|---|---|---|
| 入口触发 | "建/改/删 Asset" | "跑 work / 编排 task" |
| 底层 CLI | `oxn work create --type asset --asset-kind X` | `oxn work create --type develop` |
| 主要操作 | CRUD Asset | 编排 + 执行 + 展示 Proof |
| 状态管理 | planLock + citations + DAG | 8 阶段 + Round + .work.planLock |
| references/ 焦点 | AssetKind / 创建 / 演进 / 生命周期 | 8 阶段 / 错误码 / 反模式 / git workspace |

## 内部 CLI 对应

```bash
# === oxn-asset 触发 ===
oxn work create MyDomain --type asset --asset-kind domain
oxn work create evolve-MemberContext --type asset --asset-kind domain --evolve-from MemberContext
oxn work create w-archive-old --type asset --asset-kind domain --action archive

# === oxn-work 触发 ===
oxn work create feat-x --type develop --asset domain=MemberContext --asset blueprint=dev-workflow
oxn work run --work-file feat-x/work.oxn
oxn work submit --work feat-x --task step1
```

## 概念区分

### Asset 是"边界"（I）

- Domain: 业务边界（DDD）
- Blueprint: 技术边界（slot DAG）
- Stack: 环境边界（runtime / linter / test）
- Library: 知识边界（文档聚合）
- External: 外部边界（外部资源）

### Work 是"编排"（A+P）

- 编排：声明哪些 Asset 被引用（`--asset`）
- 执行：驱动 Round 状态机（run / submit / status）
- 证明：跑完后生成 Proof（frozen.json）

## 双路径设计

### 快速通道 CLI（v0.6.1-alpha.0）

```bash
oxn domain create MyDomain
oxn blueprint create dev-workflow --slots build,test,verify
```

- 绕过 IAP
- 直接写盘
- 适合快速原型

### 严谨路径 Work（v0.6.3+）

```bash
oxn work create MyDomain --type asset --asset-kind domain
```

- 走 IAP 闭环
- planLock 保护
- Skill `oxn-asset` 教学推荐此路径

## 反模式

- ❌ 在 `oxn-asset` 触发时调用 `oxn work run`（那是 `oxn-work` 的操作）
- ❌ 在 `oxn-work` 中调用 `oxn asset create`（那是 `oxn-asset` 的操作）
- ❌ 混用 Asset 模式和 Develop 模式（asset 模式无 task DAG）