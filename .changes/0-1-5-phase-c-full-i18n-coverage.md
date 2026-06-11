# 0.1.5 — Phase C: i18n full coverage

## 重构

- **架构迁移：i18n 模块从 L3 移到 L1-Infra**
  - `src/i18n/` → `src/infra/i18n/`
  - 提取 `SupportedLocale` / `DEFAULT_LOCALE` / `SUPPORTED_LOCALES` 到 `src/infra/i18n/locale.ts`，CLI 端从 `project-config.ts` re-export
  - 修复 L0/L1/L2 模块与 i18n 之间的潜在循环依赖
  - 更新 `scripts/validate-dependencies.ts` — 从 L3 移除 `src/i18n/`
  - 核心理由：Kernel 是"兰姆达真空"，永不调用 `t()`；OXL 也不直接 `t()`（避免与 Infra 循环）。CLI（L3）才是翻译终端。

## 新增

- `src/infra/i18n/locale.ts`：`SupportedLocale` 类型 + locale 常量
- `src/infra/i18n/{en,zh-CN}.json`：~250 个 i18n 键，覆盖所有 CLI 用户可见字符串

## 变更

- **L0/L1/L2 中文 → 英文（不走 `t()`）**——~90 处
  - `src/kernel/verdicts/catalog.ts`：48 个 probe 描述 + 输入描述
  - `src/oxl/scope/oxn-builtin-registry.ts`：7 个 builtin 描述
  - `src/oxl/compiler/{blueprint-compiler,bundle-compiler,oxn-adapter}.ts`
  - `src/oxl/evaluator/param-evaluator.ts`
  - `src/oxl/schemas/oxn-assembly.schema.ts`
  - `src/oxl/unpacker/bundle-unpacker.ts`
  - `src/oxl/validator/{intent-align-validator,rule-validator,slot-reference-validator,probe-ref-validator}.ts`
  - `src/daemon/ipc/server.ts`
  - `src/work/{blueprint-freezer,sandbox/sandbox-manager}.ts`
- **L3 CLI 中文 → `t()` 调用**——~288 处，跨 18 个文件
  - 小型 CLI：`hall`、`global-hall`、`export`、`oxn-compile`、`oxn-unpack`、`oxn-validate`、`insight`、`dev`、`install-skill`、`explore`
  - format 描述（`JSON 格式输出` 等）集中到 `output.ts` 的 `t('format.*')` 键
  - 中型 CLI：`proof`、`domain`、`blueprint`、`explore-cmd`、`init`、`config`、`config-cmd`
  - `work.ts`（最大单文件改造，~68 个新 i18n 键，~203 个 `t()` 调用）
- 14 个 CLI 文件的 `import { t } from '../i18n'` 改为 `from '../infra/i18n'`
- `src/cli/__tests__/skill-tools-adapters.test.ts`：更新 `config show` 断言以匹配新英文输出

## 验证

- `bun scripts/validate-dependencies.ts` — 0 违规
- `bun run typecheck` — 通过
- `bun test` — 1053 pass, 2 个 flaky（已有，非本次引入）

## 影响

- CLI 默认 locale 仍是 `zh-CN`，但所有用户可见字符串都通过 `t()` 走 i18n
- Kernel / OXL / Work 层的错误信息变为英文（开发者/AI 消费，不走 i18n）
- AGENTS.md 已记录的硬性规则（L0 兰姆达真空、OXL 不调 `t()`、daemon↔cli 只能 socket）全部维持
