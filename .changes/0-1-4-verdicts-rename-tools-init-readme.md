---
categories:
  - Changed
  - Fixed
---

- **Changed** `src/kernel/probes/` 重命名为 `src/kernel/verdicts/`：兑现 docs/architecture/l0-l3-constitution.md §6.1 ADR-0006 决策（"L2 Domain → L2 Module" 同期叙事：L0 判定/catalog 用 verdicts 与 L1 infra/probes 形成对偶命名）。8 处 import 路径同步、2 处注释同步、`__tests__/probes/` → `__tests__/verdicts/`、`blueprint.ts` 新增 `export { autoRebuildBlueprintIndex }` re-export（修复隐藏的运行时 import 错误）。
- **Changed** `src/cli/init.ts` 接入 `--tools` / `--without-tools` / `--reset-tools` 完整 tools 系统：`existingConfig` 分支走 `mergeToolsConfig` 持久化；`else` 分支把 `resolved` 写入 `config.tools.enabled`；`compileAllSkills` 从硬编码 `'opencode'` 改为传入 `toolIds`。新增 `resolveTools` / `mergeToolsConfig` / `normalizeList` / `idRootForHuman` 4 个辅助函数。
- **Fixed** README §4 / §9 残留的 `pnpm` 安装命令改为 `bun install --frozen-lockfile && bun run build`；过时的 "414/414 / 33 文件 / 1525 expect" 数字改为软描述（指向 `bun test` 与 `bunfig.toml + lefthook.yml` 权威源）。
- **Note** 当前 `bun test` 实测 1005 tests / 70 files / 4739 expect calls 全绿；`AGENTS.md` 描述的"414/414 / 33 文件 / 1525 expect"已废除。
- **Note** `src/cli/proof.ts:probe add` 的 data 不再回显 `internalRef` / `internalParams`（封装边界兑现；AI 仅看语义层）。
- **Note** `src/cli/install-skill.ts` 已删除、`src/cli/index.ts:install-skill` 路由已摘除；对应 E2E 收敛为"install-skill 子命令已取消"回归守卫（oxn-work-skill-v1_1.test.ts:11 + skill-tools-adapters.test.ts:6）。
