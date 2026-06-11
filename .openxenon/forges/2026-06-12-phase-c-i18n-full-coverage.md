# Phase C: i18n 全量覆盖（C档）

> 日期: 2026-06-12
> 关联 PR: PR-5 (Phase C)

## 架构规则

i18n 归属 **L1-Infra**，调用规则因层而异：

| 层 | 能否调 `t()` | 策略 |
|---|---|---|
| **L0-Kernel** | 🔴 禁止 | 返回语义码 + 结构化上下文 |
| **L1-OXL** | 🔴 禁止 | 英文硬编码（编译器错误，开发者面向） |
| **L1-Infra** | 🟡 可以 | `import { t } from './i18n'` — 同层合法 |
| **L2-Work** | 🟡 可以 | `import { t } from '../infra/i18n'` — 但建议只做 key 传递 |
| **L3-CLI** | 🟢 主要消费者 | `import { t } from '../infra/i18n'` — 终态翻译层 |

核心模式：**语义码穿透 + CLI 终态翻译**。
Kernel → 语义码 → Infra/Work → 传语义码 → CLI → `t()` 翻译。

## 执行步骤

### Step 1: i18n 从 L3 迁移到 L1-Infra

```
mv src/i18n/ src/infra/i18n/
```

**文件迁移**：
- `src/i18n/index.ts` → `src/infra/i18n/index.ts`
- `src/i18n/en.json` → `src/infra/i18n/en.json`
- `src/i18n/zh-CN.json` → `src/infra/i18n/zh-CN.json`
- `src/i18n/__tests__/` → `src/infra/i18n/__tests__/`

**更新依赖校验**：`scripts/validate-dependencies.ts`
- 第 91 行删除 `relativePath.startsWith('src/i18n/')`
- 确保 `src/infra/` 已覆盖 `src/infra/i18n/`（已有第 71-73 行）

**更新 14 个 import 路径**（全部在 `src/cli/`）：
```ts
import { t } from '../i18n'       // before
import { t } from '../infra/i18n'  // after
```

| 文件 | 当前 import |
|---|---|
| `socket-client.ts` | `'../i18n'` |
| `oxn-migrate-cmd.ts` | `'../i18n'` |
| `init.ts` | `'../i18n'` (+ setLocale) |
| `gc.ts` | `'../i18n'` |
| `explore-cmd.ts` | `'../i18n'` |
| `domain.ts` | `'../i18n'` |
| `daemon-status.ts` | `'../i18n'` |
| `config.ts` | `'../i18n'` |
| `daemon-start.ts` | `'../i18n'` |
| `cache.ts` | `'../i18n'` |
| `cache-stats.ts` | `'../i18n'` |
| `cache-clear.ts` | `'../i18n'` |
| `blueprint.ts` | `'../i18n'` |
| `config-debug.ts` | `'../i18n'` |

### Step 2: Kernel (L0) — 保持语义码

✅ 现状已验证：`kernel/verdicts/catalog.ts` 中 `translateProbeInputs()` 的 IAPError 全部是英文，0 处 `t()` 调用。

**catalog.ts probe descriptions（48 行中文）**：
改为英文（规范语言，AI 消费）。CLI 显示时如需 zh-CN，由 CLI 层 `t()` 完成。

### Step 3: OXL (L1) — 中文错误消息改英文

11 个文件，~29 行。不调 `t()`，不改 import。

| 文件 | 行数 | 内容 |
|---|---|---|
| `oxl/scope/oxn-builtin-registry.ts` | 7 | probe/part `description` 字段 |
| `oxl/validator/rule-validator.ts` | 2 | `未通过` / `求值错误` |
| `oxl/validator/intent-align-validator.ts` | 3 | `重复声明` / `未声明的 dep` / `存在环` |
| `oxl/validator/slot-reference-validator.ts` | 4 | `未找到` / `未声明` |
| `oxl/evaluator/param-evaluator.ts` | 3 | `未注入` / `类型不匹配` / `未知字段` |
| `oxl/schemas/oxn-assembly.schema.ts` | 1 | 类型描述 |
| `oxl/compiler/blueprint-compiler.ts` | 3 | `缺少必填参数` / `验证失败` / `解析失败` |
| `oxl/compiler/oxn-adapter.ts` | 2 | `缺少必填参数` / `验证失败` |
| `oxl/compiler/bundle-compiler.ts` | 1 | `源文件不存在` |
| `oxl/unpacker/bundle-unpacker.ts` | 1 | `文件不存在` |
| `oxl/validators/probe-ref-validator.ts` | 2 | `缺少前缀` / `格式无效` |

### Step 4: Infra (L1) — 内部错误改英文

| 文件 | 行数 | 方案 |
|---|---|---|
| `infra/sandbox-manager.ts` | 4 | 改为英文 |
| `daemon/ipc/server.ts` | 2 | 改为英文 |

同层调 `t()` 合法，但内部错误用英文更简洁。

### Step 5: Work (L2) — 内部错误改英文

| 文件 | 行数 | 方案 |
|---|---|---|
| `work/sandbox/sandbox-manager.ts` | 4 | 改为英文 |
| `work/blueprint-freezer.ts` | 1 | 改为英文 |

### Step 6: CLI (L3) — 翻译终态消费者

新增 `import { t } from '../infra/i18n'`（如尚未有）。~239 行用户可见字符串。

#### 6a: 小型文件（9 文件, ~49 行）

| 文件 | 内容 |
|---|---|
| `hall.ts` | 3 description + 2 human → `t()` |
| `global-hall.ts` | 3 description + 2 human → `t()` |
| `oxn-unpack.ts` | 5 description + 3 human/error → `t()` |
| `oxn-validate.ts` | 2 description + 1 human → `t()` |
| `export.ts` | 5 description + 2 human/error → `t()` |
| `oxn-compile.ts` | 4 description + 6 human/error → `t()` |
| `insight.ts` | 3 description + 1 human → `t()` |
| `dev.ts` | 1 description → `t()` |
| `install-skill.ts` | 6 description → `t()` |
| `skills/loader.ts` | 1 description → `t()` |

#### 6b: Format descriptions 共享化

在 `output.ts` 新增共享函数：

```ts
export const fmtDesc = {
  json: () => t('format.json'),
  yaml: () => t('format.yaml'),
  html: () => t('format.html'),
  markdown: () => t('format.markdown'),
}
```

各处 `description: 'JSON 格式输出'` → `description: fmtDesc.json()`

受影响文件：work.ts、proof.ts、domain.ts、blueprint.ts、hall.ts、global-hall.ts、oxn-compile.ts、oxn-unpack.ts、export.ts、insight.ts、install-skill.ts、explore.ts、explore-cmd.ts、output.ts、index.ts

#### 6c: 中型 CLI 文件（7 文件, ~110 行）

| 文件 | 策略 |
|---|---|
| `proof.ts` | 35 行 description + human → `t()` |
| `domain.ts` | 19 行 description → `t()`（已有 `t()` import） |
| `blueprint.ts` | 19 行 description → `t()`（已有 `t()` import） |
| `explore-cmd.ts` | 23 行 description → `t()`（消息已用 `t()`） |
| `explore.ts` | 5 行 description + error → `t()` |
| `init.ts` | 2 行 description → `t()`（消息已用 `t()`） |
| `config.ts` | 2 行 description → `t()`（已有 `t()` import） |

#### 6d: work.ts（1 文件, ~80 行）

新增 `import { t } from '../infra/i18n'`。

- 所有 subcommand/arg `description` 字段（~40 行）
- `human:` 输出（~10 行）
- `suggestion:` 字段（~15 行）
- `outputError()` message（~15 行）

### Step 7: i18n 资源同步

#### 新增命名空间

```
hall       — hall.ts, global-hall.ts
export     — export.ts
oxnCompile — oxn-compile.ts
oxnUnpack  — oxn-unpack.ts
oxnValidate— oxn-validate.ts
proof      — proof.ts
domain     — domain.ts
blueprint  — blueprint.ts
insight    — insight.ts
dev        — dev.ts
installSkill— install-skill.ts
format     — output.ts/index.ts（共享 description）
```

#### 扩展已有命名空间

```
work    — 补全 descriptions + error messages + suggestions
explore — 补 descriptions
errors  — 补 源文件不存在 等通用错误
config  — 补 description
init    — 补 description
```

### Step 8: 测试

- 更新 `src/infra/i18n/__tests__/` 中 import 路径
- 扩展 key-completeness test 覆盖新 namespace
- 可选：L0/L1/L2 改英文后做 snapshot 验证

## 执行顺序

```
Step 1 → Steps 2-5 → Step 6a → Step 6b → Step 6c → Step 6d → Steps 7-8
```

## 明确排除

- 社区贡献翻译（其他 locale）
- GUI 翻译（L4）
- `description` 字段运行时动态切换（citty 限制，换 locale 需重启进程）
