# Issue: `oxn-asset` Skill 文档与 CLI flag drift

- **DraftType**: issue（问题记录）
- **优先级**: P0 hotfix
- **修复成本**: S（改文档）
- **关联**: `design-asset-exploration-ux-overview.md` §5 v0.6.3 hotfix

## 1. 问题

`packages/cli/src/skills/locales/{zh-CN,en}/oxn-asset/references/*.md` 中的命令示例引用了 CLI **不存在**的 flag 或 flag 拼写错误，导致 AI 助手按文档生成的命令会失败。

## 2. 已知 drift 点

| 文档位置 | 文档示例 | 实际命令 | 差异 |
|---|---|---|---|
| `en/oxn-asset/references/asset-evolution.md:7-20` | `oxn asset list --type domain --name MemberContext` | `oxn asset list --kind domain` | flag 名 `--type` 应为 `--kind`；无 `--name` flag |
| 同上 | `oxn asset show MemberContext --json` | `oxn asset show MemberContext --kind <kind>` | 缺必需 `--kind` |
| `en/oxn-asset/references/asset-lifecycle.md:5-16` | `oxn asset archive MemberContext --reason ...` | `oxn asset archive MemberContext --kind <kind> --reason ...` | 缺必需 `--kind` |
| `en/oxn-asset/instruction.md:59-65` | `oxn roadmap sync X --dry-run` | `oxn roadmap sync X`（dry-run 是默认行为） | `--dry-run` flag 不存在；移除即可 |

## 3. 影响

- AI 按 Skill 文档生成的命令 100% 失败
- 用户复制 Skill 示例粘贴到 terminal 也失败
- 文档与 CLI 不同步违反 "Skill 是 CLI 的 mirror" 原则

## 4. 根因

- 文档与 CLI 演进节奏不同步：CLI 改了 `--type` → `--kind`，文档没跟进
- 缺乏 drift 检测：pre-commit/lefthook 无文档-CLI flag 一致性检查
- Skill 在 `.opencode/skills/` 下编译产物 + `packages/cli/src/skills/locales/` SSOT 双源，本身容易漂移

## 5. 修复方向

**最小修复**（本次 hotfix）：
1. 全量 grep Skill 文档对 `oxn asset` / `oxn roadmap` 的引用
2. 对照 `packages/cli/src/commands/{asset,roadmap}.ts` 的实际 flag 定义
3. 修正所有 drift

**长期防御**：
- 加 `bun scripts/check-skill-cli-drift.ts`：解析 Skill md 中的 fenced bash block，提取命令 + flag，对照 commander 定义 diff
- 在 lefthook pre-commit 触发

## 6. 验证

```bash
# 修复后 grep 应为 0
grep -rn "oxn asset list --type" packages/cli/src/skills/locales/
grep -rn "oxn asset show.*--json" packages/cli/src/skills/locales/ | grep -v "\-\-kind"
grep -rn "\-\-dry-run" packages/cli/src/skills/locales/en/oxn-asset/

# 跑新增 drift 检查（待实现）
bun scripts/check-skill-cli-drift.ts
```

## 7. Promote 路径

- 文档修复直接 commit 到 dev（无需走 Work 闭环）
- `oxn work create --blueprint doc-dev-workflow` 不适用（这是同步补丁）
- 在 changelog `.changes/0-6-3-asset-cli-drift.md` 记一条