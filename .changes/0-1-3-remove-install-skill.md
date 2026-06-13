---
categories:
  - Removed
  - Changed
  - Added
---

- **Removed** `oxn install-skill` 子命令及对应路由 / 文件 / E2E。OpenXenon 不再写用户 home（`~/.config/opencode/skills/`、`~/.opencode/skills/`）；Skill 加载严格保持项目级。
- **Changed** `.openxenon/domains/align-domain.oxn`：删除 `EmbeddedSkill` / `InstallTarget` 两个术语及两条 install-skill 相关不变量，新增"Skill 唯一权威源在 `src/skills/locales/`"与"oxn 不写用户 home"两条不变量。
- **Added** `src/cli/skill-compiler.ts:compileAllSkills` 新增 `unregistered` 字段（`CompilationReport`）：`.opencode/skills/oxn-*/` 下存在但未在 `src/skills/loader.ts:skillMeta` 注册的目录作为软警告上报，CLI 在 init 输出中提示。这是双数据源防线的可观测性出口。
- **Changed** `src/skills/loader.ts` 顶部加 17 行注释，明确"本文件是 OpenXenon 内置 Skill 唯一权威源"，告知后续开发者新增 skill 必须改本文件 + 在 `src/skills/locales/` 加文件，**绝不能**仅手写 `.opencode/skills/<id>/SKILL.md`。
- **Changed** `AGENTS.md` / `docs/reference/cli-reference.md` / `src/cli/__tests__/oxn-work-skill-v1_1.test.ts`：移除 install-skill 段；E2E 由 11 用例收敛为 10 用例（删 test 10 项目源/全局一致性 + test 11 装全局 E2E），新 test 10 改为校验 init 编译产物存在。
- **Note** `scripts/restore-skills.sh` / `scripts/verify-skill-structure.sh` 保留（不受影响）：restore 是 `oxn init` 失败后的备份恢复，verify 是 CI 手动结构校验，与 install-skill 行为正交。
- **Removed** `.oxn-domain-archive/` 目录（9 个合并前历史快照）：archive 概念废弃——历史快照改由 `git log <a5ef69f>` 找回。同步删除 `.openxenon/proofs/domain-restructure-equivalence/`（其 proof.oxn p10/p13 硬引用 archive，重跑即 fail，与 archive 一起报废）。
- **Changed** `scripts/proof-helpers/README.md` + `scripts/README.md`：`domain-merge-check.py` 描述去 archive 化，强调"通用工具、old 一侧可指 git tree/branch/tag"。
- **Changed** `src/cli/__tests__/iap-error-dictionary-v1_1.test.ts:25`：删一句 archive 引用注释。
