---
categories:
  - Changed
  - Added
  - Documentation
---

# 0.6.0 — IAP 架构重构：E1-E4 四实体 + L0-L3 分层 + Skill 极简 + Monorepo 双包

> **v0.6.0 主题**：把 OXN 从"IAP 三轴叙事"重构为"E1-E4 四结构实体 + L0-L3 工程分层"，把 Skill 收敛为 1 个（`oxn-work`），把 CLI 拆分到 L2 Engine Service（DDD 模块化），把 Monorepo 单包拆为 `packages/engine` + `packages/cli` 双包，新增 Round 多轮 IAP 循环。
>
> **v6.x 增量（v1.3 拍板）**：协作叙事升级 + 哲学定位调整 + Insight 命名重构。详见 [v0.6 RFC v1.3](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md) §决策记录。

## 核心变化

### 1. E1-E4 四结构实体（哲学层）
| 实体 | 含义 | 主导权 |
|---|---|---|
| E1 Asset | 静态硬约束边界 | 工程师 |
| E2 Work | 动态协作（IAP + Round） | 工程师 ↔ AI |
| E3 Engine | 独立验证主权基座 | OXN |
| E4 Insight | 涌现层（1+1>2） | AI 推理 |

### 2. L0-L3 工程分层（概念层）
```
L3 Tools (CLI+Skills+Daemon) → L2 Engine (Asset/Intent/Align/Proof/Insight) → L1 OXL+Infra → L0 Kernel
```

### 3. Work 3 大模式 + Round
- Asset / Develop / Proof 3 模式（Insight 升为 E4 独立层）
- Round 多轮 IAP 循环（v0.6 最小实现：`oxn work next-round`）

### 4. Skill 极简
删除 `oxn-cli` / `oxn-proof`，唯一保留 `oxn-work`

### 5. Service 层拆分（L2 Engine DDD 模块化）
`packages/engine/src/{Asset,Intent,Align,Proof,Insight,Pool,Work}/` 6+1 模块，纯函数式导出

### 6. Monorepo 双包（重要）

```
openxenon/
├── packages/
│   ├── engine/                  ← L1 Infra + L2 Engine (12+ modules)
│   │   └── src/
│   │       ├── Asset/           Domain/Blueprint/Stack 资产管理
│   │       ├── Intent/          Work 准备阶段
│   │       ├── Align/           Work 执行阶段 (实际开发 - v0.7+)
│   │       ├── Proof/           IAPError 验证
│   │       ├── Insight/         涌现层 (E4)
│   │       ├── Pool/            Intent Pool v3
│   │       ├── Work/            Work dual-state + 8-stage
│   │       ├── errors/          IAPError 4-tier
│   │       ├── infra/           filesystem / socket / git / frozen / probes
│   │       ├── kernel/          L0 Kernel (类型/常量/verdicts)
│   │       └── oxl/             L1 OXL+Langium+MD pipeline
│   └── cli/                      ← L3 CLI (薄壳 38 commands + 8 locales)
│       └── src/
│           ├── index.ts         CLI 入口
│           ├── commands/        domain/blueprint/work/proof/insight/pool/...
│           ├── skills/          4 prod + 8 locale .md
│           └── __tests__/       41 tests
```

**src/ 目录最终状态**（v0.6 清理后）：
- `src/daemon/` — 33 files, 4729 行（保留，v0.6 daemon 进程）
- `src/builtin/` — 18 .oxn 资产（保留，git-tracked starter templates）
- `src/watcher/` — 2 files, 105 行（保留，daemon 的一部分）
- `src/markdown.d.ts` — 20 行（保留，全局类型声明）
- ~~`src/cli/`~~ — **完全删除**（已迁至 `packages/cli/src/commands/`）
- ~~`src/skills/`~~ — **完全删除**（已迁至 `packages/cli/src/skills/`）
- ~~`src/hall/`~~ — **完全删除**（v0.7+ apps/hall 范畴，0 consumer）
- ~~`src/server.ts`~~ — **完全删除**（早期 daemon entry 占位符）

### 7. Insight 重定位
从"Work Mode D"升为 E4 涌现层（钱学森系统论整体论），v0.6 哲学占位 + CLI 占位，涌现推理 v0.7+

### 8. Asset 路径双布局（v0.5 → v0.6 兼容）
- **v0.5 默认**: `.openxenon/domains/` `.openxenon/blueprints/` `.openxenon/stack/`
- **v0.6 默认**: `.openxenon/assets/domains/` `.openxenon/assets/blueprints/` `.openxenon/assets/stack/`
- 通过 `.oxnrc` 字段 `assetRoot` + `assetDirs.{domain,blueprint,stack}` 切换

### 9. 死代码清理
v0.6 阶段共删除 3,800+ 行 dead code:
- 27 个 Align/Intent/Insight/Proof dead engine 模块（1,201 行）
- 9 个 src/ dead files（1,356 行，含 src/hall/index.ts 773 行）
- 13 个 engine → src/ 反向依赖 + 3 处 src/ → src/ 反向依赖

## 测试 / 构建结果

- **typecheck**: 0 errors ✅
- **biome check**: 0 issues (484 files) ✅
- **测试**: **1890 pass / 0 fail** ✅
- **CLI build**: 3.35MB bundled (855 modules) ✅
- **architecture-guard**: 24 tests / 3086 expects 真实运行 ✅

## 迁移路径（开发者视角）

```bash
# 项目从 v0.5 升级
oxn migrate assets  # v0.5 → v0.6 资产目录迁移

# 使用 v0.6 新功能
oxn work create my-feature --type develop \
  --asset domain=MemberContext \
  --asset blueprint=dev-workflow

oxn work next-round my-feature  # Round 多轮 IAP
oxn work finalize my-feature
```

## 关联文档

- [v0.6 RFC 完整设计 (v1.3)](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
- [v0.6 Agent 底座决策（v1.3 新增战略记录）](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/agent-base-decision.md)
- [v0.6 Monorepo 双包 RFC](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-monorepo-packages.md)
- [v0.6 Service 层设计 (DDD)](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-service-layer-design.md)
- [L0-L3 Constitution](../architecture/l0-l3-constitution.md)
- [Builtin Assets Scope (v0.6)](../architecture/v0.6-builtin-assets-scope.md)
- [v0.7+ apps/hall Migration Plan](../architecture/v0.7-hall-migration-plan.md)

## v6.x 增量（v1.3 拍板）— 协作叙事 + 哲学定位 + Insight 命名重构

> 拍板日期：2026-07-04。详见 [v0.6 RFC v1.3 §决策记录](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md) 与 [Agent 底座决策](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/agent-base-decision.md)。

### 协作叙事升级

- **Slogan 升级**：`工程师定义意图，AI 执行对齐，OXN 证明结果` → **`工程师定意图，AI Agent 跑对齐，OXN Engine 出证明`**
  - 隐含终极命题：**工程师信任 AI Agent 在边界内的执行成果**
  - 降级"三权分立 / 三轴不可交叉 / 不可绕过"主推词，保留为底层实现机制
  - 影响范围：所有 docs/ 章节、README.md、README.en.md、AGENTS.md、Skill instruction.md（中/英 8 locales）

### 哲学定位调整

- **OXN Engine 重新定位**：**控制结构，非执行环境**
  - 沙箱、CI/CD、测试等执行通过库调用，Probe 采集结果作为证据
  - Engine 不关心怎么执行，只关心执行结果是否被客观记录
- **Proof 重新定位**：**公证人，不是裁判**
  - `verdict` 字段是探针运行结果客观记录（脚本退出码、测试覆盖率、文件路径）
  - "工作合格"判定属于工程师，基于 Asset 对照 Proof
- **Kernel 确定性约束**：**L0 Kernel 严禁引入概率性数学模型**（PID/ESN/突变论一律归属 Insight 模块）
- **OpenXenon 理论定位**：**工程实践，非系统科学**
  - 系统科学是底色与灵感，不是宣称；工具只证明有用，理论底蕴是底气而非枷锁

### Insight 命名重构（v0.6 PR-5d 实装）

- **`probeEffectiveness` → `probeBehaviorPattern`**
  - 强调"AI Agent 触碰探针的行为特征信号"而非"代码质量评分"
  - failRate 字段语义不变（仍是探针行为特征客观统计）
  - 计算逻辑不变（仍按 failRate 降序）
- **E4 Insight 作用域**：**行为特征观测，不评判代码质量**
  - 输出目标：工程师做决策时所需的协作态势信号（AI 用了哪些边界 / 触碰了什么 / Loop 收敛速度 / 退出模式）
  - 不输出：代码质量评分、代码"美丑"、设计模式合规性
- **不自动回写**：所有 Insight 建议必须经过 `oxn pool review` / `approve` 闸门

### 战略记录新增

- **OpenXenon Agent 底座选型战略档**：[`agent-base-decision.md`](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/agent-base-decision.md)
  - Pi Agent vs OpenCode vs 自研三选项分析
  - 阶段 1 并行验证（v0.6.1 ~ v0.6.3，~3 个月）
  - 决策不阻塞 v0.6.0 发版；v0.7 启动

### v0.7 RFC 主题预告（v1.3 锁定 4 大主题）

1. **Memory 层**（外部动态信息海关）
2. **Asset Roadmap**（Asset 入口层）
3. **Insight 行为特征维度扩展**
4. **OpenXenon Agent 底座选型落地**

### 受影响文件清单（v1.3 增量）

| 类别 | 文件 |
|---|---|
| **Slogan 替换** | `docs/index.md`, `docs/zh-cn/index.md`, `docs/en/index.md`, `README.md`, `README.en.md`, `docs/.vitepress/config.ts`, 4 docs/zh-cn/*.md, 1 docs/en/*.md, 2 skill instruction.md |
| **RFC v1.2 → v1.3** | `.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md`（决策记录 4 条 + v0.7 主题预告） |
| **战略记录** | `.openxenon/pools/sprints/v0.6-iap-refactor/design/agent-base-decision.md`（新增） |
| **Insight 命名** | `packages/engine/src/kernel/schemas/cross-proof-insight-schema.ts`, `packages/engine/src/kernel/verdicts/cross-proof-compute.ts`, `packages/engine/src/Insight/insight-manager.ts`, `packages/engine/src/infra/insight/suggestion-generator.ts`, `packages/engine/src/kernel/index.ts`（barrel）, 2 测试文件 |
| **Service 设计稿** | `.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-service-layer-design.md` §Service 5 Insight 增补 |
