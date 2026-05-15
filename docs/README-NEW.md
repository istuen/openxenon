# OpenXenon

> OpenXenon 是一个人机对齐框架——沉淀工程师意图与验证标准，积累工程资产，约束 AI 边界并确定性构建软件。

## 1. 探索目标

0.X 阶段，我们在探索一个核心问题：

**工程师的经验，能否成为驾驭 AI 的能力？**

将工程师的审查经验前置为结构化资产与验证标准，让 AI 在约束边界内执行，由 Core 而非人工来执行判定，从而实现 AI 执行过程的确定性。

## 2. 核心角色与职责

OpenXenon 的架构建立在三个核心角色的职责分离之上：

| 角色        | 定位           | 职责                                                    | 数据边界                                                  |
| ----------- | -------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| **工程师**  | 决策者与验收者 | 定义意图、设定验证标准、审查最终结果                    | 拥有全局视野，定义系统资产，验收执行产出                  |
| **AI 助手** | 调度者与执行者 | 接收任务目标，选择执行策略，调度 Core CLI，实施代码操作 | 接收任务级目标与 target+action 指令，**无法感知验证标准** |
| **Core**    | 判决者与记录者 | 编译资产、下发指令、执行校验、记录状态                  | 独占验证标准与执行结果，提供 CLI 供 AI 调用，输出客观判定 |

**交互原则**：工程师通过 AI 助手软件与 AI 模型交互，定义规则并验收；AI 助手驱动流程并执行操作；Core 比对规则与事实。AI 不了解标准，Core 不产生逻辑，工程师不介入实时审查。

## 3. 四大核心概念

| 层级          | 定义                                            | 资产化价值             |
| ------------- | ----------------------------------------------- | ---------------------- |
| **Blueprint** | 任务工程图，定义执行拓扑（DAG）                 | 意图沉淀，可参数化复用 |
| **Stage**     | 工序节点，包含 target/action/spec/probes 四字段 | 标准沉淀，可跨项目复用 |
| **Probe**     | 原子检查，物理观测 + 纯函数判定                 | 判断沉淀，可组合复用   |
| **Artifact**  | AI 构建的产物，Core 验证的对象                  | 执行结果，可追溯可复盘 |

**Stage 四字段结构**：

| 字段     | 可见性       | 含义                         |
| -------- | ------------ | ---------------------------- |
| `target` | 对 AI 可见   | 约束执行的作用域             |
| `action` | 对 AI 可见   | 下发给 AI 的执行指令         |
| `spec`   | 对 AI 不可见 | 工程师对意图的结构化约束     |
| `probes` | 对 AI 不可见 | 校验该工序是否完成的探针集合 |

> 验证逻辑已平铺合并入 Stage，不再作为独立实体存在。

## 4. 交互流程

### 4.1 资产构建流程

**交互链路：工程师 → Core**

1. 工程师通过 Forge 定义 Probe、Stage、Blueprint
2. 工程师审查资产内容
3. 工程师将审查通过的资产提交为 Canonical（正式版），归入 Arsenal

```
Draft ──[审查]──▶ Canonical
(草稿)           (正式版)
```

### 4.2 任务执行流程

**交互链路：工程师 → AI 助手 → Core CLI → AI 助手 → 工程师**

1. **任务下达**：工程师通过 AI 助手软件里的 Skill（如 `/oxn-task`）下达任务目标
2. **策略选择**：AI 助手根据任务目标，自动选择匹配的 Blueprint
3. **循环执行**：AI 助手请求 Core CLI 执行后续每一步，形成闭环：
   - AI 助手调用 Core CLI 请求下一指令（`taskNext`）
   - Core 返回 `target` + `action`，**隐藏验证标准**
   - AI 助手执行代码修改或命令操作，构建 Artifact
   - AI 助手调用 Core CLI 提交执行结果（`taskVerify`）
   - Core 执行 Probes 校验 Artifact，记录 Trace 并判定成败
4. **结果交付**：AI 助手执行完成后，交由工程师审查最终产出

```
工程师 ──▶ AI 助手 ──▶ Core CLI ──▶ AI 助手 ──▶ 工程师
  │          │           │          │           │
  │          │           │          │           │
 下达      调度       返回指令     执行       验收
 目标      CLI       (隐藏标准)   构建       结果
                                     Artifact
```

## 5. 当前状态

版本: 0.1 — 探索阶段

**自举验证**：

| 级别        | 定义                                      | 状态       |
| ----------- | ----------------------------------------- | ---------- |
| L1 编译自举 | `pnpm build` → `oxn forge probe` 可执行   | ✅          |
| L2 资产自举 | Forge→Task→Verify 全链路跑通              | ⚠️ 待验证   |
| L3 质量自举 | OpenXenon 自身开发过程通过 OpenXenon 管理 | 🔜 0.2 目标 |

**已实现**：

- CLI 直连模式（不依赖 Daemon）
- Forge 约束 + AI 生成 Draft
- Arsenal DRAFT→CANONICAL 生命周期
- Blueprint → frozen.yaml 编译管线
- 内置资产编译进二进制

**0.1 目标 = L2 通过**

## 6. 开发计划

| 版本     | 目标             | 核心功能                                |
| -------- | ---------------- | --------------------------------------- |
| **v0.1** | 核心闭环验证     | 跑通全流程，资产与产物形成良性循环      |
| **v0.2** | 运行时监控与容错 | 守护进程、文件监听、状态熔断、异常恢复  |
| **v0.3** | 多 AI 助手适配   | 适配多种 AI 助手软件（当前仅 OpenCode） |
| **v0.4** | 多环境适配       | 支持 Node.js（当前仅 Bun）              |

## 7. 快速开始

```bash
# 1. 构建与初始化
pnpm install && pnpm build
./dist/oxn init

# 2. 查看资产库
./dist/oxn arsenal list

# 3. 构建资产（定义意图与标准）
./dist/oxn forge probe --save '<yaml>' --name my-check
./dist/oxn arsenal promote probes/my-check

# 4. 提交 Blueprint（Core 编译并生成冻结快照）
./dist/oxn task submit --blueprint my-blueprint.yaml

# 5. 模拟 AI 助手获取指令（仅返回 target + action，体验信息隐藏）
./dist/oxn task next --task-id <id>

# 6. 模拟 AI 助手构建 Artifact 后，提交 Core 校验
./dist/oxn task verify --task-id <id> --stage-id <id>
```

## 8. 架构概要

```
工程师经验 ──▶ Forge ──▶ Draft ──▶ Schema 校验 ──▶ Promote ──▶ Canonical 资产
                                                              │
                                                              ▼
Blueprint ──▶ Frozen ──▶ [Stage.target/action] ──▶ Artifact
                                                │
                                 [Stage.probes] ─┘──▶ Kernel ──▶ Verdict
```

三层分离：

- **Kernel**：纯函数，零副作用，只做逻辑判定
- **Infra**：唯一触碰文件系统和进程的组件
- **Arsenal**：内置资产，编译进二进制

详见 [docs/architecture/](docs/architecture/)。

## 9. 文档

| 主题     | 路径                           |
| -------- | ------------------------------ |
| 快速开始 | docs/getting-started.md        |
| 核心概念 | docs/concepts/                 |
| CLI 参考 | docs/guides/cli-reference.md   |
| 架构设计 | docs/architecture/             |
| 故障排查 | docs/guides/troubleshooting.md |

## License

MIT
