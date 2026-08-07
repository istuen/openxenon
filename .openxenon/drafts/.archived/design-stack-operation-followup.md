---
entity: skeleton
target-entity: rfc
id: RFC-XXXX
theme: stack-operation-followup
status: Draft
date: 2026-08-07
promote-target: rfc
created-from: draft-skeleton-fork@0.1.0
synced-at: 2026-08-07
---

# RFC-XXXX: Stack Operation 后续落地（3 项 P-RFC 收敛）

> RFC-0024 显式标记的 3 项后续工作（**P1 work-validator 校验已合并进 RFC-0024**）— 本 Draft 收敛到一个 RFC，统一设计/分期/依赖。

## 决策要点

- **P1 — work-validator operate 校验落地**：已合并进 RFC-0024 §"实施：work-validator operate 校验落地"，本 Draft 不重复
- **P2 — Blueprint 多 Stack ref 支持 + git-stack 拆分**：架构变更，中优先
- **P3 — Stack OXL transformer 升级**（regex → mdast）：**优先级上调**——P1 校验依赖准确的 operation 元数据，regex 解析的准确性是前置条件；与 P1 同期而非 P2 之后
- **P4 — /oxn-work Skill instruction 联动**：文档更新，低优先但必做

依赖图：

```
P1 (work-validator) ──┐
                      ├─→ P3 (Stack OXL transformer) ─→ P4 (Skill instruction)
P2 (多 Stack ref) ────┘                                  ▲
                                                       │
                                          P3 完成后 Skill 看到稳定 IR 形态
```

**关键修正**：P3 不是 P2 之后，而是与 P1 同期。原因：P1 校验路径读取 operation desc，regex 截断会污染校验输入。

## 影响范围

- **Engine**：
  - `Work/work-validator.ts`（P1，已在 RFC-0024）
  - `oxl/md-pipeline/transformers/stack.ts` 新文件（P3）
  - `Work/work-context-builder.ts` 去掉 `seen.add(ref.name)` 去重（P2）
- **Blueprint schema**：`BlueprintUse.stack` 类型不变（数组已 OK），但 OXL 解析路径需支持多 stack H3（P2）
- **Asset**：
  - `.openxenon/assets/stacks/git-stack.md` 新建（P2）
  - `.openxenon/assets/stacks/oxn-stack.md` 删 `git` + `gh` tool，回滚到 7 tools（P2）
  - 现有 4 个 Blueprint 的 `## Use - stack` 段加 git-stack H3（P2）
- **Skill**：`packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md`（P4）
- **RFC/ADR**：本 Draft → RFC-0025 + ADR-0092（P2 + P3 + P4 合并一对）

## 相关术语

- **work-validator**（oxn-work-domain）— lock 期静态校验器；P1 已落地
- **StackRef**（oxl 契约）— Blueprint 引用的 Stack 句柄（`@prj/stacks/<name>`）；P2 允许多 H3
- **Stack OXL transformer**（oxl/md-pipeline）— 当前 Domain/Workflow/Blueprint 都有 transformer，Stack 只有轻量 regex 解析
- **Skill instruction**（oxn-cli-domain）— OXN Skill 的核心指令文档

## 相关决策

- **RFC-0024** — 本 Draft 来源，定义 Operation/operate 概念 + 注入路径 + work-validator 校验实现
- **ADR-0091** — RFC-0024 配套 ADR
- **RFC-0022 D5/P6** — stackTools 注入路径，P1 与之对称
- **RFC-0022 P2** — Domain regex → mdast 切换先例，本次 P3 复用其模式
- **ADR-0054** — 三边界框架；P2 多 stack ref 是其"实现边界可拆"原则的延伸
- **ADR-0089** — 5 起手 Asset；**D2.4 决策（见下）：git-stack 不进 5 起手 Asset**（按需引用而非默认必有）

## Errata

<!-- status: Draft → 经 grilling → Accepted 后冻结 -->

---

## P2 — Blueprint 多 Stack ref 支持 + git-stack 拆分

### 背景

RFC-0024 D13：git/gh 命令暂放 oxn-stack，未来 Blueprint 支持多 stack ref 后拆出。当前 **Blueprint `## Use - stack` 段只接受单值**（schema：`stackRefs: string[]` 但 OXL 解析只取第一个），且 Blueprint IR 中 `stackRefs[]` 数组虽存在但 **work-context-builder 的 `loadStackToolsFromBlueprint` 按 name 去重**（`seen.add(ref.name)` 后跳过），意味着多 Stack ref 在当前实现下被静默折叠为第一个。

后果：
1. git/gh 与 bun/biome 等"项目技术栈工具"混在 oxn-stack，污染实现边界
2. Blueprint 实际只能引用 1 个 Stack（数组是虚的）
3. RFC-0024 的 "git-stack 拆分"承诺无法兑现

### 设计

#### 2.1 Blueprint schema 变更

`.md` 格式：
```md
## Use
### oxn-stack
- stack: @md/stacks/oxn-stack
### git-stack
- stack: @md/stacks/git-stack
```

`.oxn` 格式：
```
blueprint "X" {
  stack "oxn-stack";
  stack "git-stack";
  ...
}
```

**破坏性变更**：所有现有 Blueprint 的 `stack` 段从单值变多 H3。需 migration script：`oxn blueprint migrate-multi-stack` 扫描 `.openxenon/assets/blueprints/*.md`，把单 `### <name> - stack:` 转成多 H3 段。

#### 2.2 引擎改动

| 文件 | 改动 |
|---|---|
| `oxl/md-pipeline/transformers/blueprint.ts` | `extractBoundary` 收集 stack H3 时确保都进 stackRefs（不再 first-wins） |
| `Work/work-context-builder.ts` `loadStackToolsFromBlueprint` | 去掉 `seen.add(ref.name)` 去重（多 stack 允许同名 tool，因为 Stack 级不同） |
| `Work/per-work-blueprints-merger.ts` | `SlotSlimSchema` + `PerWorkBlueprintEntry` 已支持 stackRefs 数组（type 已 OK），验证 .md 解析路径支持多 H3 |
| `Work/work-validator.ts` | P1 的 operationIndex 计算天然支持跨 Stack union（无需额外改动） |

#### 2.3 git-stack 拆分

新建 `.openxenon/assets/stacks/git-stack.md`：

```md
---
entity: stack
version: 0.1.0
name: git-stack
abstract: Git + GitHub CLI 命令工具栈 — 与项目技术栈（oxn-stack）解耦
references: []
citations: 0
---

# Stack: git-stack

> Git 版本控制 + GitHub CLI 命令集。Blueprint 多 stack ref 支持后从 oxn-stack 拆出。

## Tools

### git
- role: 版本控制
- operations:
  - status: "git status"
  - blame-on-file: "git blame $FILE"
  - add: "git add $PATH"
  - commit: "git commit -m $MSG"
  - tag: "git tag v<next_version>"
  - push: "git push origin $BRANCH"

### gh
- role: GitHub CLI
- operations:
  - pr-create: "gh pr create --title $TITLE --body $BODY"
```

`oxn-stack.md` 删除 `git` + `gh` tool，回滚到 7 tools。E2E 测试的 `Stack Tools (9)` 改回 `Stack Tools (7)`。

#### 2.4 现有 Blueprint 更新

- `oxn-blueprint.md`：加 `### git-stack - stack: @md/stacks/git-stack`
- `bug-fix-blueprint.md`：同上
- `promote-target-aware-workflow.md`：检查是否引用 oxn-stack（如是，加 git-stack）

#### 2.5 测试

- `Work/__tests__/work-context-builder-multi-stack.test.ts` 新增
- 覆盖：2 个 Stack ref → stackTools union → operate 校验跨 Stack 消歧

### 决策点（待 Reviewer 确认）

- **D2.1**：BlueprintUse.stack 是否仍保持单一 kind 字段？还是允许 BlueprintUse 加 `externalStack?: boolean`（外部 Stack 不进 PlanLock）？
- **D2.2**：迁移策略 = 自动（migration script）vs 手动（breakage warning）？建议自动 + dry-run preview
- **D2.3**：多 Stack ref 的优先级 / 覆盖规则 — 后引用覆盖前引用（同 tool 名不同 tool 名）？还是 throw 歧义？建议 throw（与 operate 消歧一致）
- **D2.4** 🆕：**git-stack 是否加入 ADR-0089 5 起手 Asset？建议否**——git-stack 是"按需引用"而非"默认必有"，与 5 起手 Asset 语义不同。oxn-onboard 流程不自动引入 git-stack；只有用了 release-cut / git-workflow 等需要 git 命令的 Blueprint 才显式引用

---

## P3 — Stack OXL transformer 升级（regex → mdast）

### 背景

RFC-0022 P2 把 Domain 解析从 regex 切到 mdast（避免 `## Terms: <group>` 后缀 + multiline `- desc: |` 丢失）。**Stack 解析仍走 `parseStackTools` 轻量 regex**（work-context-builder.ts:354+），与 Domain 不对称。

后果：
1. multiline `- desc: |` 不支持（RFC-0022 F4 part 1 同类问题）
2. `## Tools: <group>` 子分组不识别（与 Domain `## Terms: <group>` 对称问题）
3. Stack OXL 不存在 → 无统一编译路径（Domain/Workflow/Blueprint 都有 transformer + serializer + compiler）

**优先级上调理由**：P1 work-validator 校验路径读取 operation desc 字段，regex 截断（如 `bun.lock（权威锁文件）` → `bun.lock` + desc=`权威锁文件`）会让 desc 进入 operationIndex 时的元数据不准。P3 必须在 P1 同期或之前完成。

### 设计

#### 3.1 新建 `oxl/md-pipeline/transformers/stack.ts`

仿 `transformers/blueprint.ts` 结构：
- `extractStackIR(root, frontmatter)` → `StackIR`
- `StackIR = { name, version, tools: ToolIR[] }`
- `ToolIR = { name, version?, command?, config?, role?, desc?, operations?: OperationIR[] }`
- `OperationIR = { name, command, desc? }`

#### 3.2 解析能力扩展

| 能力 | 当前 regex | 新 mdast |
|---|---|---|
| 单行 `- key: value` | ✅ | ✅ |
| 多行 `- key:` + 子项 | ❌ | ✅（YAML 风格） |
| `- desc: \|` 多行描述 | ❌ | ✅ |
| `## Tools: <group>` 子分组 | ❌ | ✅（与 Domain `## Terms: <group>` 对称） |
| `- operations:` 子段嵌套 | ⚠️ 部分 | ✅ |
| 列表项含特殊字符 | ⚠️ regex 转义 | ✅ |

#### 3.3 依赖与兼容性

- 现有 `parseStackTools` 函数保留作为 fallback（`useOxn: false` 模式）
- 新 transformer 走 `oxl/md-pipeline` 主路径
- `parseStackTools` 在 v0.8.x 标记 deprecated，v0.9 删

#### 3.4 测试

- `oxl/md-pipeline/__tests__/stack-transformer.test.ts` 新增
- `Work/__tests__/work-context-builder-stack.test.ts` 已有 9 测试 — 全部跑通

### 决策点（待 Reviewer 确认）

- **D3.1**：StackIR 是否同时输出到 OXL（`.oxn`）格式？建议是（与 Blueprint 一致）
- **D3.2**：tools 的 group（H3 内的 H4 分组）语义是什么？建议保持单层（与 Blueprint 一致）
- **D3.3**：regex fallback 保留几个版本？建议 v0.8.x deprecate，v0.9 删

---

## P4 — /oxn-work Skill instruction 联动更新

### 背景

RFC-0024 D12：Task Context 加 `operations:` 行（与 `acceptance:` 对称）。但 **/oxn-work Skill 的 instruction 没教 AI Agent 怎么用 operations**。

后果：
1. AI Agent 看到 Task context 里的 `## Operations to run: slot=verify: [lint, typecheck, test]` 不知道去哪取 command
2. 仍按现状在 Stack Tools 段自己找（O(n) 扫描 + 名字匹配）
3. RFC-0024 的 "AI 零推理"目标未完全达成

### 设计（采纳 Option A：保留 D7 决策，锐化 Skill instruction）

**D7 决策回顾**：只注入 operation 名，AI 自取 command。这是为了保持 WorkContextResult 体积小（避免 token 预算膨胀）。

**Option A 不重新审视 D7**，而是通过 Skill instruction 教 AI **精确查询路径**：

```md
## Operations to run（执行参照）

当 Task context 含 `## Operations to run` 段时：
- 每个 slot 列出该 slot 应运行的 Operation 名
- 对每个 operation 名，**精确查询路径**：在 `## Stack Tools` 段按 tool 名定位 → 检查该 tool 的 operations 子段是否有同名 op → 取 command
- operation 是**参照**不是门禁 — 可自主决定是否运行（inv-36），跳过不导致失败
- 按 slot 列出的顺序执行（与 Blueprint slot DAG 一致）
- observe Probe 仍会独立验证；跳过可能导致 Probe 失败

执行示例：
- `## Operations to run`: slot=verify: [lint, typecheck, test]
- `## Stack Tools`: biome (op lint: bun run check), typescript (op typecheck: bun run typecheck), bun-test (op test: bun test)
- AI 应执行：bun run check → bun run typecheck → bun test

不推荐：重新扫描整个 Stack Tools 找命令；或自己推断 `lint-check` Probe 意味着 `bun run check`（这是被 observe 验证的命令，不是被 operate 声明的命令）
```

#### 4.1 Skill instruction 更新

`packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md` 在 `## Task Context` 段后加 §"Operations to run（执行参照）"。

#### 4.2 更新流程

按 Skill 维护流（AGENTS.md）：
1. 改 `packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md`
2. 跑 `bun run packages/cli/src/index.ts init -f` 重新编译
3. `.opencode/skills/oxn-work/` 自动重建

#### 4.3 en locale

按 ADR-0089 / oxn-cli-domain inv-8，en locale 由 CLI init 时从 zh-CN 镜像。不需手维护。

### 决策点（待 Reviewer 确认）

- **D4.1**：Skill instruction 是否要给出"op 执行失败时的回退策略"？建议否（与 operate 参照不强制语义一致）
- **D4.2**：Skill 是否要提示"按 operations 顺序执行"？建议是（与 Blueprint slot 的 deps DAG 一致）
- **D4.3** 🆕：是否要在 Skill instruction 显式说"operate vs observe 的语义区别"（参照 vs 门禁）？建议是——避免 AI 误以为 "observe 里有 test-pass 所以必须跑 test"

---

## 附录 A：依赖图与落地顺序

```
P1 (RFC-0024 § 实施：work-validator operate 校验落地) ─┐
                                                       ├─→ P3 (Stack OXL transformer) ─→ P4 (Skill instruction)
P2 (多 Stack ref + git-stack 拆分) ─────────────────────┘                                  ▲
                                                                                          │
                                                                       P3 完成后 Skill 看到稳定 IR 形态
```

**执行顺序建议**：
1. **P1**（RFC-0024 实施）— 立即做，1 PR
2. **P3**（regex → mdast）— 与 P1 同期，1 PR（独立文件，不影响 P1）
3. **P2**（多 Stack ref）— 1 PR（破坏性变更，需 migration）
4. **P4**（Skill instruction）— 收口 1 PR（依赖 P3 后的稳定 IR）

## 附录 B：风险与缓解

| Phase | 风险 | 概率 | 缓解 |
|---|---|---|---|
| P1 | 校验路径加错漏（误报/漏报）影响现有 Blueprint | 中 | 跑全 test + dry-run mode（先 warn 不 throw） |
| P2 | **多 Stack ref 是破坏性变更**，影响老 Blueprint lock | **高** | migration script + 1 版本 deprecation warn |
| P3 | regex → mdast 切换引入解析差异 | 低 | snapshot test + 保留 regex fallback 1 版本 |
| P4 | Skill 更新后 AI Agent 行为变化 | 中 | 在小范围 Blueprint 上 dogfood 1 周 |

## 附录 C：参考资料

- RFC-0024：本 Draft 来源（含 P1 实施）
- ADR-0091：RFC-0024 配套
- RFC-0022 §4 P2：Domain regex → mdast 切换先例
- RFC-0022 §4 P6：stackTools 注入 Probe 先例
- ADR-0089：5 起手 Asset（D2.4 决策：git-stack 不进 5 起手）
- ADR-0054：三边界框架