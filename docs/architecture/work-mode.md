# OXN Work Mode 重构方案（统一事务与沙盒架构）

> 终态目标：Work 成为 OXN 中**唯一的事务容器**——工程师与 AI 对任何 OXN 资产的修改、编排与验证，都必须在 Work 的特定模式下进行。
>
> **核心分离**：
> - **事务元数据** → `.work` JSON 文件（识别模式 / 锁定资产 / 记录基线）
> - **领域载荷** → `*.oxn` DSL 文件（按模式分发：work.oxn / 副本 .oxn / proof.oxn）

---

## 1. 核心范式转移

### 1.1 Work 模式的本质

Work 不是 Align 轴的"编排工具"，而是 OXN 中**唯一的事务容器**。它同时承担：

| 职能 | 体现 |
|---|---|
| 事务容器 | `.work` JSON 持有模式 / 状态 / 资产锁 / base_hash / planLock |
| 模式分发 | `.work.mode` 路由到 normal / domain-edit / blueprint-edit / proof-first |
| 沙盒载体 | Edit / PF 模式的工作区 = Work 目录本身 |
| 提交门禁 | `work commit` 走 4 步管线（hash / parse / semantic diff / atomic write） |
| 计划门禁 | Normal 模式 `work lock` 后，Task 执行强制校验 `planLock.hash` |

### 1.2 IAP 三轴在 Work Mode 中的体现

| 主导轴 | 主导者 | 在 Work Mode 中的体现 |
|---|---|---|
| **Intent 轴** | **工程师** | 只有 `domain-edit` / `blueprint-edit` 模式可修改 Intent 资产，且必须走 `commit` 门禁。Normal 模式下工程师通过 `work lock` 审批计划。AI 无法绕过语义 Diff / Plan 锁越权修改。 |
| **Align 轴** | **AI** | `normal` 模式下：Planning 阶段 AI 编排 `work.oxn`；Locked 阶段 AI 严格按计划在 Task 边界内执行。 |
| **Proof 轴** | **OXN** | `proof-first` 模式下，Work 仅提供验证环境，Proof 的执行由 OXN Engine 独占产出 `frozen.json`，不可篡改。 |

> **核心结论**：AI 永不直接操作主干 `.oxn`。AI 只能在 Work 沙盒内编辑副本或 Proof，最终是否合入主干，由 CLI 的 `commit` 门禁（代表工程师意志）裁决。

---

## 2. `.work` 识别文档协议

`.work` 是 Work 空间的唯一入口和门禁卡，存放在 `.openxenon/works/<work-name>/` 根目录。

### 2.1 JSON Schema

```jsonc
// .openxenon/works/<work-name>/.work
{
  "version": 1,
  "name": "<work-name>",
  "mode": "normal",  // 枚举：normal | domain-edit | blueprint-edit | proof-first
  "status": "planning",  // 枚举：planning | locked | running | committed | finished | aborted
                         //   - Normal:    planning -> locked -> finished | aborted
                         //   - Edit:      running  -> committed | aborted
                         //   - PF:        running  -> finished  | aborted

  // 模式特有配置
  "config": {
    "editTarget": null,        // Edit 模式：目标名称 (如 "MemberContext")
    "proofName": null          // PF 模式：证明名称 (如 "check-deploy")
  },

  // 资产锁定与门禁基线 (Edit 模式专用)
  "lockedAssets": {
    // "domains/MemberContext.oxn": "a1b2c3d4..."  // 源文件相对路径 -> Checkout 时的 Hash
  },

  // Normal 模式计划锁定基线 (work lock 时由工程师写入)
  "planLock": {
    "hash": null,        // "sha256:..." (work lock 时写入 work.oxn 的 sha256)
    "lockedAt": null,    // ISO 8601
    "lockedBy": null     // "human" (必须由工程师确认)
  },

  // 审计元数据
  "createdAt": "2026-06-07T10:00:00.000Z",
  "createdBy": "human" | "ai",
  "lastModified": "2026-06-07T10:23:45.000Z"
}
```

### 2.2 字段约束

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `version` | number | ✅ | 当前固定 1 |
| `name` | string | ✅ | 与目录名一致 |
| `mode` | enum | ✅ | 见 §3 |
| `status` | enum | ✅ | 6 选 1；按模式分阶段使用（见 §3 模式路由） |
| `config.editTarget` | string \| null | 仅 Edit 模式 | 目标资产名（不含 `.oxn` 后缀） |
| `config.proofName` | string \| null | 仅 PF 模式 | 证明名 |
| `lockedAssets` | map | 仅 Edit 模式 | `{源文件相对路径: base_hash}` |
| `planLock.hash` | string \| null | Normal 模式 lock 后 | `work.oxn` 的 sha256（执行期门禁基线） |
| `planLock.lockedAt` | ISO 8601 \| null | Normal 模式 lock 后 | 锁定时间 |
| `planLock.lockedBy` | enum \| null | Normal 模式 lock 后 | 必须为 `human`（工程师审批） |
| `createdAt` / `lastModified` | ISO 8601 | ✅ | 审计用 |
| `createdBy` | enum | ✅ | 区分人/AI 启动 |

### 2.3 `.work` 的职责

- **身份证明**：让 CLI 知道当前 Work 的模式与状态
- **资产锁**：Edit 模式记录主干文件的 base_hash（防 commit 时被覆盖）
- **计划锁**：Normal 模式记录 `work.oxn` 的 sha256（防执行期被篡改）
- **门禁基线**：
  - Edit 模式 commit 步骤 1 读取 `lockedAssets` 做 hash 校验
  - Normal 模式 `task activate/finish` 前校验 `planLock.hash`

---

## 3. 三大模式与文件系统映射

### 3.1 Normal 模式（默认编排）

- **目的**：标准 IAP 流转，在 Blueprint 边界内编排 Task。
- **入口**：`oxn work start <name>`（无 `--mode` 默认 normal）
- **载荷**：`work.oxn`（标准语法，含 task register / task activate 等）
- **适用场景**：AI 主导的多 Task 流水线（开发、CI/CD、复杂迁移）

#### 3.1.1 二阶段状态机：Planning → Locked

Normal 模式不是单一的 `running`，而是**两阶段**：

| 阶段 | status | 写权限 | 关键命令 |
|---|---|---|---|
| **Planning** | `planning` | AI 可自由编辑 `work.oxn`（编排 Task 拓扑） | `work task add` 等 |
| **Locked** | `locked` | `work.oxn` 只读（Hash 门禁拦截） | `work run` / `task activate` / `task finish` |

**转换节点**：`oxn work lock <n>`（**工程师专属**）——CLI 计算 `work.oxn` 的 sha256，写入 `.work.planLock`，状态切为 `locked`。

#### 3.1.2 阶段流转

```
                   ┌──────────────────────────────────────────┐
                   │                                          │
                   ▼                                          │
              ┌─────────┐  work lock (engineer)   ┌─────────┐
   work start │ planning │ ───────────────────────▶ │ locked  │
              └─────────┘                          └────┬────┘
                   ▲                                    │
                   │ work abort                         │ task finish (all)
                   │                                    ▼
                   │                              ┌──────────┐
                   └──────────────────────────────│ finished │
                                                  └──────────┘
```

- **Planning 阶段**：AI 在 `work.oxn` 中自由编排 Task 拓扑（add / remove / reorder / 重命名）
- **Lock 节点**：工程师审查后执行 `work lock`，CLI 校验语法 + 算 hash + 写入 `planLock`
- **Locked 阶段**：每次 `task activate/finish` 强制校验 `work.oxn` 的 hash 与 `planLock.hash` 一致（防 AI 边跑边改）

```text
.openxenon/works/onboarding/
├── .work                 # { mode: "normal", status: "locked",
│                          #   planLock: { hash: "sha256:abc...", lockedBy: "human" } }
├── work.oxn              # 锁定后只读；任何修改触发 OXN_PLAN_TAMPERED
└── tasks/
    └── <task-name>/
        └── task.oxn
```

### 3.2 Edit 模式（Intent 轴沙盒起草）

- **目的**：工程师/AI 协作起草或修改 Intent 轴资产（Domain / Blueprint）。
- **入口**：`oxn work start <name> --mode domain-edit --target <T>` 或 `--mode blueprint-edit --target <T>`
- **关键动作**：
  1. 复制 `.openxenon/domains/<T>.oxn` → `.openxenon/works/<name>/<T>.oxn`
  2. 计算源文件 hash → 写入 `.work.lockedAssets`
  3. AI 在沙盒副本上自由编辑
  4. `oxn work commit` 走 4 步门禁管线
- **适用场景**：修改业务契约、调整 Blueprint 拓扑、删除过时 invariant

#### 3.2.1 Domain-Edit 模式

```text
.openxenon/works/refactor-member/
├── .work                 # { mode: "domain-edit", config: { editTarget: "MemberContext" },
│                          #   lockedAssets: { "domains/MemberContext.oxn": "a1b2c3d4..." } }
└── MemberContext.oxn     # 从 .openxenon/domains/ 拷贝过来的沙盒副本
```

#### 3.2.2 Blueprint-Edit 模式

```text
.openxenon/works/enhance-auth/
├── .work                 # { mode: "blueprint-edit", config: { editTarget: "AuthService" },
│                          #   lockedAssets: { "blueprints/AuthService.oxn": "x9y8z7..." } }
└── AuthService.oxn       # 从 .openxenon/blueprints/ 拷贝过来的沙盒副本
```

### 3.3 PF（Proof-First）模式

- **目的**：轻量级验证，不走 Intent 资产化，直接声明 Probe 并验证。
- **入口**：`oxn work start <name> --mode proof-first --proof <proof-name>`
- **关键动作**：
  1. 生成空 `proof.oxn` 模板
  2. AI 在 `proof.oxn` 中追加 Probe
  3. `oxn work run` 调 Proof Engine → 产出 `frozen.json`
- **适用场景**：单点验收、CI 触发、临时检查

```text
.openxenon/works/verify-deploy/
├── .work                 # { mode: "proof-first", config: { proofName: "check-deploy" } }
├── proof.oxn             # 直接在沙盒内声明 Probe
└── frozen.json           # 由 Proof Engine 产出（不可篡改）
```

### 3.4 模式路由表

| Work Mode | 启动 | 阶段流转 | 主要操作 | 终态路径 |
|---|---|---|---|---|
| `normal` | `work start <n>` | `planning` → `lock` → `locked` → `finished` | `work lock` / `work run` / `task activate` / `task finish` | `work finish`（所有 task done） |
| `domain-edit` | `work start <n> --mode domain-edit --target <T>` | `running` → `committed` | `work commit`（沙盒 → 主干） | `work commit` 成功 / `work abort` |
| `blueprint-edit` | `work start <n> --mode blueprint-edit --target <T>` | `running` → `committed` | `work commit` | 同上 |
| `proof-first` | `work start <n> --mode proof-first` | `running` → `finished` | `work run`（跑 Proof） | `work run` 产出 `frozen.json` |

### 3.5 沙盒归宿：Commit 后保留为审计

Edit 模式 commit 成功后，**沙盒副本不删除**，与 `.work` JSON 一起作为该次提交的不变记录（与 `frozen.json` 同等地位）。这保证：

- 后续审计可重放"那次 commit 时 AI 提交了什么"
- 不依赖主干文件 hash 链（hash 链在主干被再次 commit 后断裂）
- 工程师可对比"主干 vs 那次 commit 的沙盒"

---

## 4. CLI 命令重构

### 4.1 统一指令表

| 类别 | 命令 | 说明 |
|---|---|---|
| **Work 生命周期** | `oxn work start <n> [--mode X] [--target T] [--proof P]` | 启动 Work（模式分发，默认 normal） |
| | `oxn work status <n>` | 查看 Work 当前状态（读 `.work` JSON） |
| | `oxn work lock <n>` | **Normal 模式专用**（**工程师专属**）：从 `planning` 切到 `locked`，计算 `work.oxn` 的 hash 写入 `planLock` |
| | `oxn work run <n>` | 路由执行（normal: 必须 `locked` 才允许 / PF: Proof run / Edit: 报错） |
| | `oxn work commit <n> [--force]` | **Edit 模式专用**：走 4 步门禁管线（见 §5） |
| | `oxn work abort <n>` | 终止 Work（不写入主干） |
| | `oxn work finish <n>` | 关闭 Work（Normal 模式：标记完成 / 其他模式：清理沙盒） |
| **Task 子操作（Normal 模式）** | `oxn work task add <task> ... --work <w>` | Planning 阶段：动态插入 Task（CLI 唯一入口，禁止 AI 原生 write_file 改 work.oxn） |
| | `oxn work task activate <task> --work <w>` | Locked 阶段：激活 task（前置 planLock.hash 校验） |
| | `oxn work task finish <task> --work <w>` | Locked 阶段：完成任务（前置 planLock.hash 校验） |

### 4.2 启动 Work（模式分发）

```bash
# 1. Normal 模式（默认）
oxn work start onboarding
# → 生成 .work (mode: normal) + work.oxn 模板

# 2. Domain-Edit 模式（沙盒起草）
oxn work start refactor-member --mode domain-edit --target MemberContext
# → 生成 .work (mode: domain-edit, editTarget: "MemberContext")
# → 复制 .openxenon/domains/MemberContext.oxn 到 .openxenon/works/refactor-member/MemberContext.oxn
# → 计算源文件 hash，写入 .work.lockedAssets

# 3. Blueprint-Edit 模式
oxn work start enhance-auth --mode blueprint-edit --target AuthService
# → 同 Domain-Edit 逻辑

# 4. Proof-First 模式
oxn work start verify-deploy --mode proof-first --proof check-deploy
# → 生成 .work (mode: proof-first, proofName: "check-deploy") + proof.oxn 模板
```

### 4.3 运行与提交（管线路由）

```bash
# 运行当前 Work (根据模式路由到底层引擎)
oxn work run verify-deploy
# → Normal: 必须在 locked 状态；调度 work.oxn 编排的 Task
# → Edit: 抛错，编辑模式需用 commit
# → PF: 调 proof engine 跑 proof.oxn，产出 frozen.json

# Normal 模式：从 planning 切到 locked
oxn work lock onboarding
# → 校验 work.oxn 语法正确
# → 计算 work.oxn sha256 写入 .work.planLock
# → status 切为 locked
# → 此后 task activate/finish 都将校验 planLock.hash

# 提交修改 (仅 Edit 模式)
oxn work commit refactor-member [--force]
# → 走 4 步门禁管线（详见 §5）
# → 通过后状态：committed
# → 沙盒副本保留作为审计（与 frozen.json 同等地位）
```

### 4.4 端到端工作流

#### 4.4.1 Domain-Edit 模式

```bash
# === 启动：复制到沙盒 ===
oxn work start refactor-member --mode domain-edit --target MemberContext
# → { .work: {mode: "domain-edit", editTarget: "MemberContext", lockedAssets: {...}} }
# → { MemberContext.oxn: 副本 }

# === 起草：AI 原地编辑沙盒副本 ===
# AI 用原生 write_to_file 工具修改
# .openxenon/works/refactor-member/MemberContext.oxn
# （注释、缩进、空行 AI 看得见，AI 负责保留/更新）

# === 提交：走 4 步门禁 ===
oxn work commit refactor-member
# → 1. Hash 比对（防并发修改）
# → 2. Langium 语法校验
# → 3. 语义 Diff 审查（防 AI 越权删 Ban/Invariant）
# → 4. 覆盖源文件 + 更新 .work.status = committed
# → {"ok": true, "diff": {...}, "signature": "ed25519:..."}
```

#### 4.4.2 Proof-First 模式

```bash
# === 启动：生成 proof.oxn 模板 ===
oxn work start verify-deploy --mode proof-first --proof check-deploy

# === 起草：AI 在 proof.oxn 追加 Probe ===
# AI 编辑 .openxenon/works/verify-deploy/proof.oxn

# === 跑证明：路由到 Proof Engine ===
oxn work run verify-deploy
# → 调 proof engine 跑 proof.oxn
# → 产出 .openxenon/works/verify-deploy/frozen.json

# === 关闭 Work ===
oxn work finish verify-deploy
```

#### 4.4.3 Normal 模式（二阶段状态机版）

```bash
# === Phase 1: 启动 + 编排（AI 自由编辑） ===
oxn work start onboarding
# → status: "planning"
# → AI 用 CLI 子命令动态编排 Task 拓扑（避免直接改 work.oxn 破坏 Work 状态机一致性）：
oxn work task add setup-db --work onboarding --intent "初始化数据库 schema"
oxn work task add run-migrations --work onboarding --deps setup-db --intent "执行迁移"

# === Phase 2: 锁定（工程师审批） ===
oxn work lock onboarding
# → 1. Langium 语法校验 work.oxn
# → 2. 计算 work.oxn 的 sha256
# → 3. 写入 .work.planLock = { hash, lockedAt, lockedBy: "human" }
# → 4. status: "locked"

# === Phase 3: 执行（按计划 AI 操作） ===
oxn work task activate setup-db --work onboarding
# → CLI 校验：当前 work.oxn hash === .work.planLock.hash
# → 不一致则 OXN_PLAN_TAMPERED 拒绝
# → 匹配则激活 task，AI 开始写代码
oxn work task finish setup-db --work onboarding
# ... 同样校验

# === Phase 4: 关闭 ===
oxn work finish onboarding
# → status: "finished"
```

**关键约束**：
- **Planning 阶段**（status=planning）：AI 通过 `oxn work task add` 编排；禁止 AI 用原生 `write_file` 改 `work.oxn`（绕过 CLI 状态机）
- **Locked 阶段**（status=locked）：`work.oxn` 完全只读；任何 `task activate/finish` 都先校验 `planLock.hash`
- **审批门**：`work lock` 必须是工程师触发（`lockedBy: "human"`），AI 无法自锁

---

## 5. 核心管线：Edit 模式的 4 步 Commit 门禁

> 这是 OXN 在 AI 时代续命的护城河——AI 拥有无限的编辑自由，但**提交权**（Commit）始终由 CLI（代表工程师意志）掌握。

### 5.1 管线伪代码

```ts
async function commitWork(workName: string, options: { force?: boolean }) {
  const workDir = `.openxenon/works/${workName}/`
  const manifest = JSON.parse(readFileSync(`${workDir}/.work`, 'utf-8'))

  // 仅 Edit 模式可 commit
  if (!['domain-edit', 'blueprint-edit'].includes(manifest.mode)) {
    throw new IAPError('USAGE', 'COMMIT_NOT_ALLOWED', ...,
      'commit 仅对 domain-edit / blueprint-edit 模式有效')
  }

  const targetName = manifest.config.editTarget
  const targetPath = resolveEditTarget(manifest.mode, targetName)  // 真实主干文件
  const sandboxPath = `${workDir}${targetName}.oxn`              // 沙盒副本
  const oldHash = manifest.lockedAssets[manifest.mode === 'domain-edit' ? `domains/${targetName}.oxn` : `blueprints/${targetName}.oxn`]

  // 1. 防冲突检测：真实文件 vs base_hash
  const currentHash = sha256(readFileSync(targetPath, 'utf-8'))
  if (currentHash !== oldHash) {
    throw new IAPError('ALIGN', 'MISMATCH', 'YIELD_TO_HUMAN',
      `文件已被人工修改（base_hash 不一致）。请重新 \`work abort\` + \`work start\``,
      { baseHash: oldHash, currentHash })
  }

  // 2. Langium 语法校验
  const sandboxContent = readFileSync(sandboxPath, 'utf-8')
  const newAst = await parseFile(sandboxContent)
  if (newAst.parseErrors.length > 0) {
    throw new IAPError('INTENT', 'UNDEFINED_TERM', 'AUTONOMOUS_RETRY',
      '语法错误',
      { diagnostics: newAst.parseErrors })
  }

  // 3. 语义 Diff 审查 (IAP 防线)
  const mainContent = readFileSync(targetPath, 'utf-8')
  const oldAst = await parseFile(mainContent)
  const diff = computeSemanticDiff(oldAst.ast, newAst.ast, rulesFor(manifest.mode))
  if (diff.removed.some(r => r.critical) && !options.force) {
    throw new IAPError('INTENT', 'SECURITY_VIOLATION', 'YIELD_TO_HUMAN',
      '禁止删除关键节点，除非使用 --force',
      { violations: diff.removed.filter(r => r.critical) })
  }

  // 4. 原子覆盖 + 状态流转
  await atomicWrite(targetPath, sandboxContent)        // 主干文件
  manifest.status = 'committed'
  manifest.lastModified = new Date().toISOString()
  writeFileSync(`${workDir}/.work`, JSON.stringify(manifest, null, 2), 'utf-8')

  return { ok: true, diffSummary: summarize(diff) }
}
```

### 5.2 关键节点保护矩阵

| 模式 | criticalRemoval 命中 | 删除需 --force？ |
|---|---|---|
| `domain-edit` | `entities[domain].ban` / `invariant` / `term` | **是** |
| `blueprint-edit` | `entities[blueprint].slot` / `slot.deps` | **是** |
| `proof-first` | （不走 commit，run 时直跑） | — |
| `normal` | （不修改 Intent，不走 commit） | — |

### 5.3 错误码（Edit 模式 Commit 门禁）

- `OXN_COMMIT_BASE_HASH_MISMATCH`（主干文件被人工改过 → abort，需重新 `work start`）
- `OXN_COMMIT_PARSE_FAILED`（语法错 → diagnostics 给 AI 重写）
- `OXN_COMMIT_SEMANTIC_VIOLATION`（删除关键节点 → `--force` 需工程师显式授权）
- `OXN_COMMIT_MODE_NOT_ALLOWED`（非 Edit 模式调用 commit → 抛错）
- `OXN_COMMIT_TARGET_NOT_FOUND`（`.work.config.editTarget` 对应主干文件不存在）

---

## 5A. Normal 模式的计划锁定 Hash 门禁

> 这是 Normal 模式二阶段状态机的核心防线——AI 拥有 Planning 阶段的写权限，但**锁定后**任何执行操作都先校验 `work.oxn` 是否被篡改。

### 5A.1 `work lock` 转换管线

```ts
async function lockWork(workName: string) {
  const workDir = `.openxenon/works/${workName}/`
  const manifest = JSON.parse(readFileSync(`${workDir}/.work`, 'utf-8'))

  if (manifest.mode !== 'normal') {
    throw new IAPError('USAGE', 'LOCK_NOT_ALLOWED', 'YIELD_TO_HUMAN',
      'work lock 仅对 normal 模式有效')
  }
  if (manifest.status !== 'planning') {
    throw new IAPError('USAGE', 'LOCK_STATE_INVALID', 'YIELD_TO_HUMAN',
      `当前 status=${manifest.status}，无法 lock（必须为 planning）`)
  }

  const workOxnPath = `${workDir}work.oxn`
  const workOxnContent = readFileSync(workOxnPath, 'utf-8')

  // 1. Langium 语法校验（确保 AI 写的 work.oxn 语法正确）
  const parseResult = await parseFile(workOxnContent)
  if (parseResult.parseErrors.length > 0) {
    throw new IAPError('INTENT', 'UNDEFINED_TERM', 'AUTONOMOUS_RETRY',
      'work.oxn 语法错误，请修正后重试',
      { diagnostics: parseResult.parseErrors })
  }

  // 2. 计算 hash + 写入 planLock + 状态流转
  const hash = sha256(workOxnContent)
  manifest.planLock = {
    hash,
    lockedAt: new Date().toISOString(),
    lockedBy: 'human',   // 必须为 human（CLI 调用者上下文判定）
  }
  manifest.status = 'locked'
  manifest.lastModified = new Date().toISOString()
  writeFileSync(`${workDir}.work`, JSON.stringify(manifest, null, 2), 'utf-8')

  return { ok: true, hash, lockedAt: manifest.planLock.lockedAt }
}
```

### 5A.2 执行期 Hash 门禁（task activate / finish）

```ts
async function activateTask(workName: string, taskName: string) {
  const workDir = `.openxenon/works/${workName}/`
  const manifest = JSON.parse(readFileSync(`${workDir}/.work`, 'utf-8'))

  if (manifest.mode === 'normal') {
    // 1. 必须先 lock
    if (manifest.status !== 'locked') {
      throw new IAPError('USAGE', 'PLAN_NOT_LOCKED', 'YIELD_TO_HUMAN',
        '必须先执行 work lock 锁定计划才能开始执行',
        { currentStatus: manifest.status })
    }

    // 2. 核心防线：检测 AI 是否偷偷改了计划
    const currentHash = sha256(readFileSync(`${workDir}work.oxn`, 'utf-8'))
    if (currentHash !== manifest.planLock.hash) {
      throw new IAPError('ALIGN', 'PLAN_TAMPERED', 'YIELD_TO_HUMAN',
        '计划被篡改！work.oxn 与工程师锁定的版本不一致。请检查 AI 是否越权修改了 Task 定义。',
        { lockedHash: manifest.planLock.hash, currentHash })
    }
  }

  // ... 正常的 Task 激活逻辑 ...
}
```

### 5A.3 Normal 模式错误码

- `OXN_PLAN_NOT_LOCKED`：未锁定计划就尝试执行 Task（status 仍为 planning）
- `OXN_PLAN_TAMPERED`：执行期间检测到 `work.oxn` Hash 与 `planLock` 不一致（AI 试图越权改计划）
- `OXN_LOCK_NOT_ALLOWED`：非 Normal 模式调用 `work lock`
- `OXN_LOCK_STATE_INVALID`：`work lock` 时 status 不是 planning（重复 lock 或已 aborted）

---

## 6. Commit 管线实现细节

> 本节是 §5 Edit 模式 4 步 Commit 门禁的实现支撑。Work Mode 不需要"内部 4 原子"——Commit 管线只有一个职责：在 Edit / PF 模式下把沙盒副本安全落到主干。

### 6.1 语义 Diff 接口

```ts
// 纯函数，零 IO（理想归宿 L0-Processor / 当前暂存 L1-OXL/validators/）
export interface SemanticDiff {
  added: { path: string; node: AstNode }[]
  removed: { path: string; node: AstNode; critical: boolean }[]   // critical = 需 --force
  modified: { path: string; before: unknown; after: unknown }[]
}

export function computeSemanticDiff(
  oldAst: OXNDocument,
  newAst: OXNDocument,
  rules: DiffRules
): SemanticDiff
```

**DiffRules（域专属）**：
- `domain-edit` 模式：删 `ban` / `invariant` / `term` = critical
- `blueprint-edit` 模式：删 `slot` / `slot.deps` = critical

### 6.2 Atomic Write

通过 L1-Infra `FsPort` 接口（不直接调 `fs.rename`）：

```ts
// 1. 写 .tmp
const tmp = `${filePath}.${randomUUID()}.tmp`
await fsPort.write(tmp, newContent)

// 2. re-parse 验证（防 syntax 错误的沙盒内容污染主干）
const reparse = await parser.parseFile(tmp)
if (reparse.parseErrors.length > 0) {
  await fsPort.remove(tmp)   // 保留现场到 /tmp/oxn-failed-<uuid>.oxn
  throw new CoreError('OXN_COMMIT_REPARSE_FAILED', ...)
}

// 3. atomic rename（POSIX 原子操作）
await fsPort.rename(tmp, filePath)
```

### 6.3 架构债：AST 类型与 Diff 的 L-layer 归属

按 L0L3 宪法 "L0 Kernel 不得 import L1+" 不变量反推：
- `OXNDocument` / `DomainDeclaration` / `BlueprintDeclaration` 等 AST 类型应属 **L0-Schema**
- §6.1 `computeSemanticDiff` 纯函数应属 **L0-Processor**

**当前现状**（v0）：
- AST 类型在 L1-OXL/generated/（Langium 生成）
- §6.1 暂存 L1-OXL/validators/（与 AST 类型同层，无跨层违规）

**后续清理**（v1+）：
- AST 类型从 L1-OXL 提升到 L0-Schema（新建 `src/kernel/schemas/oxn-ast.ts`）
- §6.1 跟随回迁 L0-Processor
- 详见 `l0-l3-constitution.md §7.4 残留问题`

---

## 7. 权限模型

### 7.1 三层防护

| 防护层 | 机制 | 防什么 |
|---|---|---|
| **物理层** | `work commit` 不暴露 `--file`；删除类操作**不存在**子命令 | AI 无法定位真实路径 / 无法调用删除 |
| **协议层** | `work start --mode edit` 创建沙盒副本；`commit` 走门禁 | AI 无法脱离 Work 沙盒直接改主干 |
| **语义层** | 语义 Diff 审查 + `--force` 显式授权 | AI 无法删 `ban` / `invariant` / `slot` 等关键节点 |
| **计划层**（Normal） | `work lock` 写 `planLock.hash`；执行期每次 Task 操作校验 | AI 锁定后无法偷改 `work.oxn` |

### 7.2 `--force` 语义

- 签名审计日志必带 `force: true`——可追溯"是谁在什么时候授权了越权"
- 适合场景：业务主动变更（如某 invariant 已过时需下线）

### 7.3 权限矩阵

#### 7.3.1 Normal 模式（按阶段）

| 操作 | Planning 阶段 | Locked 阶段 | 备注 |
|---|---|---|---|
| AI 修改 `work.oxn`（原生 write_file） | ❌（仅 `oxn work task add` 改） | ❌（Hash 拦截） | Planning 期仅允许 CLI 子命令编排 |
| `oxn work task add` | ✅ | ❌（拒绝） | 动态插入 Task |
| `oxn work lock` | ✅（**工程师专属**） | — | 审批节点 |
| `oxn work task activate` | ❌（OXN_PLAN_NOT_LOCKED） | ✅（前置 planLock.hash 校验） | 必须在锁定后 |
| `oxn work task finish` | ❌（同上） | ✅（同上） | 必须在锁定后 |
| `oxn work run` | ❌ | ✅ | 必须在锁定后 |
| `oxn work abort` | ✅ | ✅ | 任意阶段可终止 |

#### 7.3.2 Edit / PF 模式

| 操作 | 物理可调 | 语义 Diff 审查 | 需 force |
|---|---|---|---|
| `work start --mode domain-edit` | ✅ | — | — |
| `work start --mode blueprint-edit` | ✅ | — | — |
| `work start --mode proof-first` | ✅ | — | — |
| `work run` (PF) | ✅ | — | — |
| `work commit`（仅新增 / 修改非关键） | ✅ | 通过 | — |
| `work commit`（删 `ban` / `invariant`） | ✅ | 拒绝 | **是** |
| `work commit`（删 `slot`） | ✅ | 拒绝 | **是** |
| `work delete`（子命令级） | ❌ 物理不存在 | — | — |

---

## 8. 架构层命名（最终版）

> OXN 在当前阶段**只有 Work 一个对外层**。所有事务、门禁、检修都收归于 Work。

| 层 | 命名 | 职责 | AI 可见？ |
|---|---|---|---|
| **Work** | **OXN 唯一事务容器 + 统一 Facade** | `oxn work start/lock/run/commit/abort/finish` | ✅ |

- **Commit 管线实现细节**：见 §6（语义 Diff + Atomic Write）
- **未来扩展**：MCP 适配层推迟；当前不需要 LLM 宿主外部集成

**与 v5-v7 的差异**：
- ~~Core~~ → 收归为 Work 内部
- ~~Inspector / oxn work inspect list/schema/validate~~ → 不实现（ai-tools 概念全部剥离）
- ~~Audit~~ → 当前阶段不实现
- ~~W1-W4 内部 4 原子框架~~ → 简化为单一 Commit 管线（沙盒→主干）

---

## 9. L0-L3 物理归属映射

> Work Mode 设计的代码物理归属必须严格遵循 OXN 元域的 L0-L3 宪法。本节是宪法（`docs/architecture/l0-l3-constitution.md`）与 L0L3Context 用户域（`.openxenon/domains/L0L3Context.oxn`）在 Work Mode 上的上下文映射。

### 9.1 SSOT 引用

- **OXN 元域聚合根**：[`l0-l3-constitution.md`](./l0-l3-constitution.md)（代码分层、依赖规则、护栏测试）
- **OXN 元域用户域**：[`L0L3Context.oxn`](../../.openxenon/domains/L0L3Context.oxn)（术语、禁用词、不变量）
- 本文不重复定义 L0-L3 / SubLayer / Port / Builtin 等术语，**直接引用 L0L3Context**

### 9.2 4 大 Work Mode → L-layer 归属

每个 Work Mode 由**驱动层（Driver）+ 数据/逻辑层（Logic）+ 物理 IO 层（Infra）** 三段组成：

| Work Mode | 驱动层（L3-CLI） | 数据/逻辑层 | 物理 IO 层（L1-Infra） |
|---|---|---|---|
| `normal` | `src/cli/work.ts` | L2-Work（`src/work/`） | `FsPort` / `PathPort` / `Process` / `PartPort` |
| `domain-edit` | `src/cli/work.ts` | L1-OXL（parse） + 语义 Diff（§6.1） | `FsPort`（沙盒复制 + atomic write） + `HashPort` |
| `blueprint-edit` | `src/cli/work.ts` | L1-OXL（parse） + 语义 Diff（§6.1） | `FsPort` + `HashPort` |
| `proof-first` | `src/cli/work.ts` | L0-Kernel（verdict） + L1-OXL（parse） | `ProbePort`（探针执行）+ `FsPort`（frozen.json 写入） |

**L0L3 校准**：
- 所有模式驱动都在 L3-CLI（入口层，符合 L3 依赖特权）
- 物理 IO 全部走 L1-Infra 的 **Port 接口**（符合 L1 零外层依赖约束）
- 业务逻辑（Normal 编排）走 L2-Work（符合 L2 Module 自治）
- 验证逻辑（Proof 判决）走 L0-Kernel（符合 L0 零 IO 纯逻辑）

### 9.3 Commit 管线实现 → L-layer 归属

| 实现细节 | 物理位置 | 依赖 | L0L3 校准 |
|---|---|---|---|
| **§6.1 语义 Diff** | **理想 L0-Processor** / 当前 L1-OXL/validators/ | L0-Schema（AST 类型） | ⚠️ 暂存 L1，待 AST 类型提升后回迁 |
| **§6.2 Atomic Write** | L1-Infra（`FsPort` 抽象） | 无 | ✅ 严守 L1-Infra Port 边界 |
| **Commit 4 步管线整体** | L3-CLI 驱动 + L1-OXL（parse） + L1-Infra（write） + L0-Schema（AST 类型） | L0 + L1 | ✅ 各子层职责清晰 |

### 9.4 架构债：AST 类型与 Diff 的 L-layer 归属

按 L0L3 宪法 "L0 Kernel 不得 import L1+" 不变量反推：
- `OXNDocument` / `DomainDeclaration` / `BlueprintDeclaration` 等 AST 类型应属 **L0-Schema**
- §6.1 `computeSemanticDiff` 纯函数应属 **L0-Processor**

**当前现状**（v0）：
- AST 类型在 L1-OXL/generated/（Langium 生成）
- §6.1 暂存 L1-OXL/validators/（与 AST 类型同层，无跨层违规）

**后续清理**（v1+）：
- AST 类型从 L1-OXL 提升到 L0-Schema（新建 `src/kernel/schemas/oxn-ast.ts`）
- §6.1 跟随回迁 L0-Processor（新建 `src/kernel/processors/semantic-diff/`）
- 详见 `l0-l3-constitution.md §7.4 残留问题`

**架构动机澄清**：
> 此举是为实现 L0 Kernel 零 IO 纯逻辑的架构洁癖，**而非为任何外部工具暴露接口**。语义 Diff 是 OXN 引擎的内部护城河，对 AI 不可见。AI 永远通过 `work commit` 4 步管线间接消费 Diff 的判定结果，**不直接 import** `computeSemanticDiff`，**不直接构造** `SemanticDiff`。任何人提议"把 Diff 提升到 L0 是为了让 AI 更好调用"都是对 L0L3 宪法的误读，应直接驳回。

### 9.5 L0L3Context 术语映射表

| 本文档术语 | L0L3Context 对应 | Layer |
|---|---|---|
| Work Mode / .work JSON | （新概念，无直接对应） | L2-Work（运行时状态） |
| §6.1 语义 Diff | L0-Processor 纯函数（待回迁） | L0 |
| §6.2 Atomic Write | L1-Infra FsPort | L1 |
| Langium parse | L1-OXL Parser | L1 |
| hash 校验（base_hash / planLock.hash） | L1-Infra HashPort | L1 |
| CLI 子命令 | L3-CLI | L3 |
| 用户项目资产（`.openxenon/domains/` 等） | L2-Module 项目运行时实例 | L2 |
| 探针执行 | L1-Infra ProbePort | L1 |
| Verdict 判定 | L0-Kernel Processor | L0 |

### 9.6 L0L3 不变量在本设计的兑现

| L0L3 不变量 | 本设计的兑现方式 |
|---|---|
| "L0 Kernel 不得 import 任何 L1+ 模块" | §6.1 暂存 L1，待 AST 提升后回迁 L0（见 §9.4） |
| "L0 Kernel 不得使用 fs/path/crypto/..." | §6.1 语义 Diff 是纯函数，无 IO 依赖（`computeSemanticDiff(oldAst, newAst, rules)`） |
| "L1 Foundation 不得 import L2/L3" | §6.2 Atomic Write 走 L1-Infra FsPort；Commit 4 步管线在 L3-CLI 驱动 |
| "L2 Module 不得 import L3" | Normal 模式的 `work.oxn` 编排数据走 L2-Work；CLI 入口在 L3-CLI 编排调用 |
| "L3 Runtime 允许 import 所有下层" | `src/cli/work.ts` 是 L3-CLI，可 import L2-Work + L1-OXL + L1-Infra + L0-Schema |

---

## 10. 依赖图与里程碑

```
.work JSON 协议
 ├─ Edit 模式 4 步 Commit 门禁（hash / parse / semantic diff / atomic write）
 │   └─ 语义 Diff（§6.1 暂存 L1 / 理想 L0-Processor）
 │       └─ Atomic Write（§6.2 L1-Infra FsPort）
 ├─ Normal 模式 2 阶段状态机（Planning → Locked + planLock Hash 门禁）
 └─ Work Facade
     ├─ .work JSON schema 定义
     ├─ oxn work start/lock/run/commit/abort/finish
     └─ oxn work task add/activate/finish
```

| 里程碑 | 累计 | 验收 |
|---|---|---|
| M0 — `.work` JSON schema | 0 | 3 模式字段约束 + planLock / lockedAssets / status 流转通 |
| M1 — Edit 模式 Commit 门禁 | ~2 d | `work commit` 4 步管线端到端通（hash / parse / semantic diff / atomic write） |
| M2 — 语义 Diff（§6.1） | ~1.5 d | `computeSemanticDiff` 跨 domain / blueprint 域实现 |
| M3 — Atomic Write（§6.2） | ~1 d | `FsPort` 抽象 + .tmp / re-parse / rename 端到端通 |
| M4 — Work Facade 入口 | ~2 d | `oxn work start --mode X` 端到端跑通；Edit 模式沙盒复制正确；commit 走通 |
| M5 — Normal 二阶段 + planLock | ~1 d | `work lock` 转换管线 + `task activate` Hash 门禁通 |
| M6 — L0L3 架构债清理 | ~2 d | AST 类型提升到 L0-Schema；§6.1 回迁 L0-Processor（详见 §9.4） |

---

## 11. 风险与已知限制

| 风险 | 概率 | 缓解 |
|---|---|---|
| AI 改沙盒副本时语法写错 → commit 失败 | 高 | Commit 步骤 2 错误返回 parse diagnostics，AI 重写（与 git push 等价） |
| AI 不知道 OXN 语法 → 写错结构 | 中 | Skills 教语法；commit parse 失败给具体错误 |
| 多 AI agent 并发改同一 Work 沙盒 | 中 | 文件系统无内置锁；v0 文档说明"同 Work 串行使用" |
| `work start --mode domain-edit` 时主干文件被人工改 | 中 | base_hash 比对 + commit 拦截 + 提示 abort + restart |
| AI 在 Normal Locked 阶段偷偷改 work.oxn | 中 | §5A Hash 门禁 + OXN_PLAN_TAMPERED 拒绝执行 |
| AI 在 Normal Planning 阶段用原生 write_file 改 work.oxn（绕过 CLI） | 中 | 文档强约束：禁止原生 write_file；v1 实施文件锁或 git-style pre-commit hook |
| 沙盒副本占存储 | 低 | 单文件 < 10KB；commit 后副本保留为审计（与 frozen.json 同等地位） |
| `.work` JSON schema 演进 | 低 | `version` 字段，未来 v2 加 migration |
| AI 直接绕过沙盒用 `cp` 覆盖主干 | 中 | 事后审计能发现；不阻塞语义正确性 |
| `oxn work task add` / `activate` 命名与现有 `src/cli/work.ts:11 add-task` 不一致 | 高 | M4 实施时对齐重构 |
| Locked 阶段 AI 改 work.oxn 后被检测 → abort → 重新 lock 的 Token 浪费 | 中 | 文档说明"lock 后勿改 work.oxn"；v1 可提供 `work rebase`（git rebase 类似）减少浪费 |
| §6.1 语义 Diff 暂存 L1-OXL，与 AST 类型同层；按 L0L3 宪法理想应在 L0-Processor | 中 | v0 接受暂存方案；v1 跟随 AST 类型提升到 L0-Schema 后回迁（见 §9.4） |
| Atomic Write 不严守 FsPort 接口 → 触碰 L0L3 黑名单 | 低 | 实施时强制 `FsPort` 抽象；CI validate-deps 拦截 |

---

## 12. 决策记录

| # | 维度 | 决策 | 备选 |
|---|---|---|---|
| D1 | 事务容器 | **Work 唯一** | 双层 / Facade 主导（废弃） |
| D2 | 模式分发 | **`.work.mode` 字段统一路由** | 多 CLI 子命令（废弃） |
| D3 | 沙盒位置 | **Work 目录内副本**（`.openxenon/works/<w>/<T>.oxn`） | /tmp/...（废弃）/ .checkpoints/...（废弃） |
| D4 | 事务元数据 | **`.work` JSON 文件** | CLI 参数散落（废弃） |
| D5 | AI 编辑文件方式 | **AI 原地编辑沙盒副本** | 原地编辑真实文件（废弃） |
| D6 | 提交协议 | **Work commit 4 步门禁**（hash / parse / diff / atomic write） | 直接 apply（废弃） |
| D7 | 架构层 | **Work 唯一对外层**（Core / Inspector / Audit 全部收归） | 4 层独立（v5，废弃） |
| D8 | 内部能力 | **不需要"4 原子"框架**——Commit 管线只承担一件事（沙盒→主干） | W1-W4 框架（v7 残留，废弃） |
| D9 | ai-tools 概念 | **全部剥离**（Schema 参考、注解扩展、`oxn work inspect` 全部移除） | 保留为 Work 子命令（v7 妥协，废弃） |
| D10 | Audit | **当前不实现** | v5 实施（推迟到 v2） |
| D11 | Work 模式数 | **3 大类**（normal / domain-edit / blueprint-edit / proof-first） | 单一 normal |
| D12 | 关键节点保护 | **语义 Diff 拒绝删除**（需 --force） | 软权限 + 黑名单 |
| D13 | 删除类操作 | **物理不存在子命令** | 软权限 |
| D14 | 冲突处理 | **base_hash 检测**（commit 时比对） | 无（废弃） |
| D15 | 注释保留 | **AI 自由编辑沙盒**（原地看注释） | CST-splice（与 D5 矛盾，废弃） |
| D16 | 沙盒副本归宿 | **Commit 后保留为审计** | Commit 后删除（丢失现场） |
| D17 | Normal 模式阶段机 | **二阶段：Planning → Locked** | 单一 running（无审批节点） |
| D18 | Plan 锁定机制 | **`work lock` 写 hash 到 `.work.planLock` + 工程师专属** | 自动 lock / AI 可触发（绕过审批） |
| D19 | 范围 | **当前不含 MCP** | 包含 MCP（推迟到 LLM 宿主集成阶段） |
| D20 | L0-L3 SSOT | **本设计遵循 [`l0-l3-constitution.md`](./l0-l3-constitution.md) 与 `L0L3Context.oxn` 上下文映射** | 自创术语（违反 L0L3 ContextMap 原则） |
| D21 | 语义 Diff 物理层 | **v0 暂存 L1-OXL/validators/（与 AST 类型同层）；v1+ 回迁 L0-Processor** | 强行 v0 即迁 L0（需先 AST 提升到 L0-Schema） |
| D22 | 驱动层 | **3 大模式驱动统一在 L3-CLI（`src/cli/work.ts`）** | 各模式独立 driver（破坏 Work 唯一入口） |
