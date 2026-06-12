# git-workflow 工作空间蓝图 + E2E（方案 B）

> 日期：2026-06-11
> 关联 Skill：`oxn-work`
> 状态：已批准实施（方案 B：蓝图 + e2e；OXN 不替人合并；git worktree 形态；含变更日志与 docs）

---

## 1. 目标

端到端验证 `oxn-work` 在 **git worktree 工作空间** 下的可用性。
OXN 全程**不替人 commit / push / merge**——只观察并产
`can_ff_merge / can_merge_clean / has_conflicts` 证据，
由人在 `git merge` 时消费。

**设计哲学**（来自 `src/infra/git/workspace.ts:1-17` 头注）：
> 不替人 commit / push / merge（"OXN 永远不替人决策"哲学）

---

## 2. 关键发现（影响计划）

1. **DSL 语法**（`src/oxn-dsl/langium/oxn.langium`）
   - 蓝图 `description` 字段允许（`:154`），但 **slot 不接受** `description`；
   - observe 元素是 `STRING`（`:135-136`），引用 catalog 中已注册的
     probe semanticName。
2. **4 个 git probe semanticName 确认**
   （`src/kernel/verdicts/catalog.ts:390-491`）：
   - `git-clean`（`:393`）
   - `git-branch-exists`（`:420`）
   - `git-status-clean`（`:441`）
   - `git-merge-feasible`（`:460`）
3. **builtin 蓝图非自动加载**
   - `src/builtin/blueprints/` 中无任何 TypeScript 代码引用；
   - 必须由用户/skill `cp` 到 `.openxenon/blueprints/` 才生效
     （参看 `src/skills/locales/zh-CN/oxn-work/references/blueprint-format.md:161`）。

---

## 3. 改动清单（5 文件 + 1 文档）

| # | 路径 | 动作 | 层级 |
|---|---|---|---|
| 1 | `src/builtin/blueprints/git-workflow.oxn` | 新建蓝图资产（4 slot） | L2-Builtin 静态资产 |
| 2 | `src/builtin/blueprints/__tests__/git-workflow-compile.test.ts` | 新建：解析 + 形状断言 | L2-Builtin test |
| 3 | `src/cli/__tests__/work-git-workspace-e2e.test.ts` | 新建：真 git 仓 + `cp` builtin 蓝图 + work 8 阶段 + 探针 | L3 e2e（串行） |
| 4 | `docs/architecture/git-workflow-workspace.md` | 新建：哲学 + 步骤 + 不替人合并说明 | docs |
| 5 | `.opencode/skills/oxn-work/SKILL.md` | 编辑：追加「git 工作空间指引」小节，引用 `git-workflow.oxn` | skill |
| 6 | `.changes/<next>-git-workflow.md` | 新建：变更日志片段（先 `package.json` 取版本号） | changelog |

不动：
- `src/cli/work.ts`
- `src/work/`
- L1 git 适配器（`src/infra/git/workspace.ts`）
- `src/kernel/verdicts/catalog.ts`

---

## 4. `git-workflow.oxn` 内容（修订版）

```oxn
// git-workflow — 配合 git worktree 使用的 4 阶段工作空间蓝图
// 配合 e2e：src/cli/__tests__/work-git-workspace-e2e.test.ts
// 哲学：OXN 不替人 commit / merge — 只观察并报告可合并性
blueprint "git-workflow" {
  version = 1

  slot "ensure_clean_workspace" {
    observe = ["git-clean", "git-branch-exists"]
  }
  slot "prepare_branch" {
    deps = ["ensure_clean_workspace"]
    observe = ["git-status-clean"]
  }
  slot "develop" {
    deps = ["prepare_branch"]
  }
  slot "verify_merge_feasible" {
    deps = ["develop"]
    observe = ["git-merge-feasible"]
  }
}
```

### Slot 设计说明

| Slot | 触发的探针 | 阶段意义 |
|---|---|---|
| `ensure_clean_workspace` | `git-clean` + `git-branch-exists` | 入口守卫：工作树干净 + base 分支存在 |
| `prepare_branch` | `git-status-clean` | 准备分支阶段再次确认状态干净 |
| `develop` | — | 工程师实施工作（AI 行动上下文） |
| `verify_merge_feasible` | `git-merge-feasible` | 收尾：用 `git merge-tree` 算法判定可合并性，**不实际 merge** |

---

## 5. e2e 测试骨架

文件：`src/cli/__tests__/work-git-workspace-e2e.test.ts`

模板参考：`work-full-lifecycle-e2e.test.ts:1-120`
（`Bun.spawn(['bun', CLI_PATH, ...])` + `cwd: tmpDir` + `mkdtempSync(join(tmpdir(), 'oxn-…-'))` + 先 `oxn init` 建 `.openxenon/` 边界）。

### 场景

```
1) setup：mkdtemp + git init + 初始 commit + oxn init + cp builtin 蓝图
2) domain + work create + add-task + validate + lock
3) git worktree add -b feat/<w>
4) 在 worktree 改文件 + git add
5) run work + submit task
6) 手工调探针 → 断言 verdict: can_ff_merge
7) 故意制造冲突 → 再探 → 断言 verdict: has_conflicts
8) 清理 worktree + branch
```

### 关键代码段

```ts
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')
const BUILTIN_BP_SRC = join(
  import.meta.dir, '..', '..', 'builtin', 'blueprints', 'git-workflow.oxn'
)

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-git-workflow-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

async function runCli(args: string[]): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  return { stdout, exitCode }
}
```

---

## 6. 验证（按 AGENTS.md 硬性要求）

```bash
bun run typecheck
bun run lint                # 架构守卫 — 蓝图文件不是 .ts，零违规
bun run check               # biome
bun test src/builtin/blueprints/__tests__/git-workflow-compile.test.ts
bun test src/cli/__tests__/work-git-workspace-e2e.test.ts
bun test                    # 完整 414 测试不退化
```

---

## 7. 风险与回退

- **E2E 依赖 git 二进制**：测试机上 `git --version` 必须可执行
  （CI runner 通常有）。`beforeEach` 中用 `isGitAvailable`
  （`src/infra/git/workspace.ts:60-63`）探测；不可用时 `test.skip`。
- **E2E 与 worktree 清理**：失败时 `afterEach` 必须
  `git worktree remove --force` + `git branch -D` + `rmSync`，
  否则污染宿主。
- **changelog 版本号**：执行前先 `bun run version:check`
  取权威版本号，文件名形如 `.changes/0.1.3-git-workflow.md`。

---

## 8. 显式不做（明确边界）

- ❌ `oxn work create --worktree`（方案 C 范围）
- ❌ 自动 `git merge`（已确认哲学上不做）
- ❌ 改 L1 适配器 / catalog / 状态字段
- ❌ 动 `src/cli/work.ts` 主体

---

## 9. 参考引用

- Skill 入口：`.opencode/skills/oxn-work/SKILL.md`
- 蓝图 grammar：`src/oxn-dsl/langium/oxn.langium:151-163`
- builtin 蓝图样式：`src/builtin/blueprints/verify-pipeline.oxn` / `leader-test-dsl.oxn`
- 4 git probe 注册：`src/kernel/verdicts/catalog.ts:390-491`
- L1 git 适配器：`src/infra/git/workspace.ts:1-317`
- E2E 模板：`src/cli/__tests__/work-full-lifecycle-e2e.test.ts:1-120`
- builtin 蓝图 cp 约定：
  `src/skills/locales/zh-CN/oxn-work/references/blueprint-format.md:161`