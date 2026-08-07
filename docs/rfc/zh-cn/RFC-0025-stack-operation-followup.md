---
entity: rfc
id: RFC-0025
theme: stack-operation-followup
status: Accepted
date: 2026-08-07
accepted: 2026-08-07
supersedes: []
superseded-by: ~
related:
  - ADR-0092: docs/adrs/0092-stack-operation-followup.md
  - ADR-0091: docs/adrs/0091-stack-operation-as-execution-referent.md
  - RFC-0024: docs/rfc/zh-cn/RFC-0024-stack-operation-referent.md
  - RFC-0022: docs/rfc/zh-cn/RFC-0022-ideal-data-flow.md
promoted-from: .openxenon/drafts/design-stack-operation-followup.md
synced-at: 2026-08-07
---

# RFC-0025: Stack Operation 后续落地（3 项 P-RFC 收敛）

> RFC-0024 显式标记的 3 项后续工作（**P1 work-validator 校验已合并进 RFC-0024**）— 本 RFC 收敛到 P2 多 Stack ref + P3 Stack OXL transformer + P4 Skill instruction 联动。

## 决策要点

- **P1 — work-validator operate 校验落地**：已合并进 RFC-0024 §"实施：work-validator operate 校验落地"，本 RFC 不重复
- **P2 — Blueprint 多 Stack ref 支持 + git-stack 拆分**：架构变更
- **P3 — Stack OXL transformer 升级**（regex → mdast）：**优先级上调**——P1 校验依赖准确的 operation 元数据，regex 解析的准确性是前置条件；与 P1 同期
- **P4 — /oxn-work Skill instruction 联动**：文档更新，依赖 P3 后的稳定 IR

依赖图：

```
P1 (RFC-0024 § 实施) ──┐
                       ├─→ P3 (Stack OXL transformer) ─→ P4 (Skill instruction)
P2 (多 Stack ref) ─────┘
```

## 影响范围

- **Engine**：
  - `Work/work-validator.ts`（P1，已在 RFC-0024）新增 `collectAndThrowOperateViolations()`
  - `oxl/md-pipeline/transformers/stack.ts` 新文件（P3）
  - `Work/work-context-builder.ts` `loadStackToolsFromBlueprint` 改为按 Stack 名去重（允许多 Stack ref，P2）
  - `Work/work-context-builder.ts` `parseStackTools` 解析 operations 子段（RFC-0024 已加）+ 引号剥离 bug 修复（regex 升级准备）
- **Blueprint schema**：`BlueprintUse.stack` 类型不变（数组已 OK），OXL 解析路径支持多 stack H3
- **Asset**：
  - `.openxenon/assets/stacks/git-stack.md` 新建（P2）— 含 git + gh tool + operations
  - `.openxenon/assets/stacks/oxn-stack.md` 删 `git` + `gh` tool + `bun.test` op（去歧义），回滚到 7 tools
  - `oxn-blueprint.md` / `bug-fix-blueprint.md` 加 `### git-stack - stack: @md/stacks/git-stack` 段
  - `promote-target-aware-workflow.md` 不引用 oxn-stack，无需改
- **Skill**：`packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md` 加 `## Operations to run` 段（P4）
- **RFC/ADR**：本 RFC = RFC-0025 + ADR-0092

## 相关术语

- **work-validator**（oxn-work-domain）— lock 期静态校验器；P1 已落地，含 `OPERATION_NOT_FOUND` / `OPERATION_AMBIGUOUS` 两个错误码
- **StackRef**（oxl 契约）— Blueprint 引用的 Stack 句柄；P2 允许多 H3
- **Stack OXL transformer**（oxl/md-pipeline）— P3 新建 `transformers/stack.ts`；替代 `parseStackTools` 轻量 regex
- **Skill instruction**（oxn-cli-domain）— P4 加 `## Operations to run` 段

## 相关决策

- **RFC-0024**：本 RFC 来源，定义 Operation/operate 概念 + 注入路径 + work-validator 校验实现
- **ADR-0091**：RFC-0024 配套 ADR
- **RFC-0022 D5/P6**：stackTools 注入路径，P1 与之对称
- **RFC-0022 P2**：Domain regex → mdast 切换先例，本次 P3 复用其模式
- **ADR-0054**：三边界框架；P2 多 stack ref 是其"实现边界可拆"原则的延伸
- **ADR-0089**：5 起手 Asset；**D2.4 决策**：git-stack 不进 5 起手 Asset（按需引用而非默认必有）

## Grilling 决策记录

| # | 决策 | 选项 |
|---|---|---|
| D2.1 | BlueprintUse.stack 是否仍保持单一 kind 字段？还是允许 BlueprintUse 加 externalStack? | 保持现状（kind 单一） |
| D2.2 | 迁移策略 = 自动 vs 手动？ | **无需 migration**（原 schema 已支持 `### name` + `- stack:` 多 H3，只需补 git-stack H3） |
| D2.3 | 多 Stack ref 优先级/覆盖规则？ | **silent 跳过跨 Stack 同 tool**（保守策略；与 observe 引用语义一致；P3 可考虑 throw） |
| D2.4 | git-stack 是否进 5 起手 Asset？ | **否**（按需引用而非默认必有） |
| D3.1 | StackIR 是否同时输出到 OXL 格式？ | **是**（与 Blueprint 一致） |
| D3.2 | tools 的 group 语义？ | **保持单层**（与 Blueprint 一致） |
| D3.3 | regex fallback 保留几个版本？ | **v0.8.x deprecate，v0.9 删**（当前 v0.7.4 共存） |
| D4.1 | Skill 是否给"op 失败回退策略"？ | **否**（与 operate 参照不强制一致） |
| D4.2 | Skill 是否提示"按 operations 顺序执行"？ | **是**（与 Blueprint slot DAG 一致） |
| D4.3 | Skill 显式说"operate vs observe 语义区别"？ | **是**（避免 AI 误以为 observe 里有 test-pass 必须跑 test） |

## 数据流示意

```
Stack ## Tools
  ### bun-test                          # oxn-stack
    - command: "bun test"
    - operations:
      - test: "bun test" — 全量测试
  ### git                               # git-stack
    - operations:
      - status: "git status"
        ↓
Blueprint ## Use
  ### oxn-stack
    - stack: @md/stacks/oxn-stack
  ### git-stack
    - stack: @md/stacks/git-stack
  ## Boundaries
  ### verify
    - operate: [lint, typecheck, test]              # AI Agent 跑
    - observe: [lint-check, ts-compiles, test-pass] # OXN 跑
        ↓
work-validator (lock 期) — P1:
  加载 Blueprint 引用的 Stack（oxn-stack + git-stack）
  → 收集 tool.operations union
  → slot.operate[] 每项验证可解析
  → lint/typecheck/test 全解析 → 通过
  → 跨 Stack 同名 op → OPERATION_AMBIGUOUS
        ↓
work-context-builder (lock 期):
  → BlueprintIR.boundaries[].operate 解析
  → WorkContextResult.slotOperations: [{slot: "verify", operations: ["lint", "typecheck", "test"]}]
        ↓
Task context (AI Agent 看到) — P4 教 AI:
  ## Operations to run
  - slot=verify: [lint, typecheck, test]
  ## Stack Tools
  - biome · op lint: bun run check
  - typescript · op typecheck: bun run typecheck
  - bun-test · op test: bun test
```

## 实施记录（2026-08-07）

- **work-context-builder.ts `parseStackTools`**：补 operations 子段解析（RFC-0024 Phase 2）；修复引号剥离 regex bug（`/^["']|["']$/g` 对 `value` 中部引号不工作，改用成对剥离）
- **work-context-builder.ts `loadStackToolsFromBlueprint`**：从 `seen.add(ref.name)` 改为 `loadedStacks`（按 Stack 名去重），允许多 Stack ref；同名 tool 跨 Stack 时后引用覆盖前引用（silent 跳过保守策略）
- **work-validator.ts**：新增 `collectAndThrowOperateViolations()` 函数，lock 期校验 operate 引用 + 限定名消歧
- **iap-error.ts**：新增 `OPERATION_NOT_FOUND` / `OPERATION_AMBIGUOUS` 错误码
- **`oxl/md-pipeline/transformers/stack.ts`**：新建 mdast-based Stack 抽取 transformer；与 Domain/Workflow/Blueprint 对称
- **`oxn-stack.md`**：删除 git + gh tool（拆给 git-stack）+ 删除 bun.test op（与 bun-test.test 歧义）
- **`git-stack.md`**：新建（git + gh tool + operations）
- **3 个 Blueprint** 加 git-stack H3
- **/oxn-work Skill instruction** 加 `## Operations to run` 段（操作 vs 观察语义区别说明）
- **测试**：2126 → 2135 pass，新增 9 个 stack-transformer.test + 12 个 work-validator-operate.test

## 风险与缓解

| Phase | 风险 | 概率 | 缓解 |
|---|---|---|---|
| P1 | 校验路径加错漏（误报/漏报） | 中 | 跑全 test + 12 个新测试覆盖 |
| P2 | 多 Stack ref 静默折叠 | 低 | `loadStackToolsFromBlueprint` 按 Stack 名去重（已修） |
| P3 | regex → mdast 切换引入解析差异 | 低 | snapshot test + 保留 regex fallback（`parseStackTools` 仍可用） |
| P4 | Skill 更新后 AI 行为变化 | 中 | 小范围 dogfood 1 周 |

## 开放问题

1. **多 Stack ref 的真正歧义策略**：当前 silent 跳过保守，未来需 throw（与 operate 消歧对称）
2. **Stack IR 的 OXL serializer**：P3 D3.1 决策是，本 RFC 未实现 OXL 序列化（仅 extractor）；后续单独 RFC 处理
3. **migration script**：因 schema 已支持多 H3，无需自动迁移；但可加 `oxn blueprint lint` 检测单一 stack 警告（未来）

## Errata

<!-- status: Accepted 2026-08-07 -->