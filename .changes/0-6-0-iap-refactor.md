---
categories:
  - Changed
  - Added
---

# 0.6.0 — IAP 架构重构：E1-E4 四实体 + L0-L3 分层 + Skill 极简 + Monorepo 双包

> **v0.6.0 主题**：把 OXN 从"IAP 三轴叙事"重构为"E1-E4 四结构实体 + L0-L3 工程分层"，把 Skill 收敛为 1 个（`oxn-work`），把 CLI 拆分到 L2 Engine Service（DDD 模块化），把 Monorepo 单包拆为 `packages/engine` + `packages/cli` 双包，新增 Round 多轮 IAP 循环。

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

- [v0.6 RFC 完整设计](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
- [v0.6 Monorepo 双包 RFC](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-monorepo-packages.md)
- [v0.6 Service 层设计 (DDD)](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-service-layer-design.md)
- [L0-L3 Constitution](../architecture/l0-l3-constitution.md)
- [Builtin Assets Scope (v0.6)](../architecture/v0.6-builtin-assets-scope.md)
- [v0.7+ apps/hall Migration Plan](../architecture/v0.7-hall-migration-plan.md)
