---
categories:
  - Added
  - Fixed
---

- **i18n Phase B（资源 + 测试）**：闭合资源漂移 + 测试漂移，en locale 现在真的可用
- 新建 `src/i18n/en.json`（105 key，全量英文镜像，与 zh-CN.json 1:1 结构对齐）
- `src/i18n/index.ts` 注册 en 资源：`i18next.init({ resources: { en: { translation: en } } })`
- `src/skills/loader.ts` 注释更新（删"已废弃"，加"v0.0.30 en 资源就绪"）
- 新建 `src/i18n/__tests__/i18n-basic.test.ts`（6 个测试：插值、locale 切换、nonexistent key fallback）
- 新建 `src/i18n/__tests__/i18n-key-completeness.test.ts`（3 个测试：zh-CN 完整性 / en 完整性 / en-zh key parity）
- bump `package.json` → **0.0.30**
- 关联 forge：[`2026-06-11-i18n-version-drift.md`](../.openxenon/forges/2026-06-11-i18n-version-drift.md) §5.3
