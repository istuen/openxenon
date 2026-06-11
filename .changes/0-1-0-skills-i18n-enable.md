---
categories:
  - Added
  - Changed
  - Removed
---

- **i18n Phase B 完整闭环 + Skills en 翻译**：en locale 全量可用（CLI 文案 + Skills instruction）
- **PR-3 资源 + 测试**：`src/i18n/en.json`（105 key 英文镜像）；`src/i18n/index.ts` 注册 en 资源；`src/i18n/__tests__/`（12 个测试：基本功能 + key 完整性 + en-zh parity）
- **PR-4 死资产清理**：删除 `src/skills/locales/zh-CN/oxn-resume/instruction.md`（80 行，0 消费方，loader.ts 未 import）
- **PR-4 en skill 翻译**：新建 `src/skills/locales/en/` 下 4 个 instruction.md（oxn-cli / oxn-work / oxn-work/references/blueprint-format / oxn-proof），总计 ~1200 行，所有 OXN 术语 / 代码块 / 文件路径保留，周围 prose 翻译为英文
- **`src/skills/loader.ts` 重构**：en 分支从 `zhCnOxnCli` fallback 改为导入 `enOxnCli` 等真实 en 资源；`getSkillContent` 非默认 locale 缺失时显式 throw `OXN_SKILL_NOT_TRANSLATED`（ADR-6）
- **`src/skills/__tests__/skill-i18n.test.ts`**（7 个守卫测试：import 对齐 / meta 注册 / throw 行为 / locale 目录一致 / 文件数 parity / 语言一致性 / 死资产守卫）
- bump `package.json` → **0.1.0**（语义化跳跃，标记 i18n 双轴完整支持）
- 关联 forge：[`2026-06-11-i18n-version-drift.md`](../.openxenon/forges/2026-06-11-i18n-version-drift.md) §5.3-5.4
