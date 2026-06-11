# Production Plan: OXN DSL → OpenXenon Language (OXL) Rename

> 状态：草案 v3（待批准）
> 范围：仓库全栈重命名，但严格遵循 oxn / oxl 概念边界
> 风险等级：🔴 高（~55-60 文件） ｜ 预计工作量：~10-13 小时
> 触发：OpenXenon DSL 品牌升级为 OpenXenon Language（缩写 OXL），定位为 OXN 引擎下子概念

---

## 0. 核心概念边界（不可破坏）

```
oxn  = OpenXenon 顶层缩写（对外品牌）
       ├ CLI bin: oxn
       ├ 文件扩展名: .oxn
       ├ 作用域: @oxn/
       ├ 错误码前缀: OXN_*
       └ 引擎主品牌

oxl  = OpenXenon Language（oxn 下子概念，对外不直接暴露）
       ├ 目录: src/oxl/
       ├ Langium projectName: OpenXenonLanguage
       ├ Langium language id: oxl
       ├ 架构层: L1-OXL
       ├ 品牌字符串: "OpenXenon Language" / "OXL"
       └ VSCode 扩展包名: oxn
```

**不变量**：`.oxn` / `OXN_*` / `@oxn/` / `oxn` bin 全部保留——属于 oxn 顶层品牌；oxl 仅在源码目录、Langium 标识符、架构层名、文档/注释中体现。

---

## 1. 决策清单（已逐项确认）

| # | 维度 | 决策 | 备注 |
|---|---|---|---|
| 1 | `.oxn` 文件扩展名 | **保留** | 68 资产 + 22 测试 fixture 零变动 |
| 2 | **目录名** | **`src/oxl/`** | `git mv src/oxn-dsl src/oxl` |
| 3 | **VSCode 扩展包名** | **`oxn`** | `name: "oxn-dsl"` → `name: "oxn"`；`displayName: "OpenXenon Language"` |
| 4 | Langium projectName | `OpenXenonLanguage` | 7 个生成标识符 |
| 5 | Langium language id | `oxl` | 与目录对齐 |
| 6 | 错误码 `OXN_*` | **保留** | IAP 错误字典稳定契约 |
| 7 | CLI bin `oxn` | **保留** | 入口命令 |
| 8 | `@oxn/` 作用域 | **保留** | 资产寻址 |
| 9 | **`L1-OXN-DSL` 层名** | **`L1-OXL`** | 架构层名 |
| 10 | **架构守卫白名单** | **`'oxn-dsl'` → `'oxl'`** | 同步宪法级守卫 |
| 11 | 历史 `.changes/` 6 条 | **保留** | 历史归档 |
| 12 | `.oxn-vscode/` 目录 | **保留** | oxn 顶层品牌 |

---

## 2. 改动清单（按文件分组）

### A 组：基础设施配置（8 个文件）

| 文件 | 行号 | 改动 |
|---|---|---|
| `langium-config.json` | 2 | `projectName: "OXNDSL"` → `"OpenXenonLanguage"` |
| `langium-config.json` | 5 | `id: "oxn"` → `"oxl"` |
| `langium-config.json` | 6 | `grammar: "src/oxn-dsl/langium/oxn.langium"` → `"src/oxl/langium/oxn.langium"` |
| `langium-config.json` | 18 | `out: "src/oxn-dsl/generated/"` → `"src/oxl/generated/"` |
| `biome.json` | 9 | `!!**/src/oxn-dsl/generated` → `!!**/src/oxl/generated` |
| `eslint.config.js` | 7 | `ignores: ['src/oxn-dsl/generated/**']` → `['src/oxl/generated/**']` |
| `bunfig.toml` | 33, 34 | `src/oxn-dsl/__tests__/**` → `src/oxl/__tests__/**`；`src/oxl/compiler/__tests__/**` |
| `package.json` | 4 | description 改 + OXL 措辞 |
| `package.json` | 59-66 | keywords 加 `"oxl"` |
| `bun.lock` | — | `bun install` 自动更新 |

### B 组：架构宪法层（2 个文件）

| 文件 | 行号 | 改动 |
|---|---|---|
| `scripts/validate-dependencies.ts` | 49, 57, 61, 65, 71, 80, 84, 105 | 8 处 `L1-OXN-DSL` → `L1-OXL`（**层名硬编码**） |
| `AGENTS.md` | 20 | 表中 `L1-OXN-DSL` → `L1-OXL` |

### C 组：架构守卫测试（1 个文件，多处）

| 文件 | 行号 | 改动 |
|---|---|---|
| `tests/architectural/architectural-guard.test.ts` | 7 | `OXN_DSL_ROOT` 路径 `'../../src/oxn-dsl'` → `'../../src/oxl'`（**变量名保留**） |
| `tests/architectural/architectural-guard.test.ts` | 125-132 | **8 处白名单** `'oxn-dsl'` → `'oxl'` |
| `tests/architectural/architectural-guard.test.ts` | 11-20 | 字符串 `'L0 Kernel 不应导入 oxn-dsl 模块'` → `'L0 Kernel 不应导入 oxl 模块'` |
| `tests/architectural/architectural-guard.test.ts` | 211-267 | 4 个 it block 中 `'L1 OXN DSL 不应导入 L2/L3 模块'` → `'L1 OXL 不应导入 L2/L3 模块'` |

### D 组：物理移动（22 个 .oxn 源 + 16 个子目录）

```
git mv src/oxn-dsl src/oxl
```

子目录（16 个）全部跟着移动：`builtin/ compiler/ contracts/ crud/ evaluator/ examples/ executor/ flattener/ generator/ helpers/ langium/ loader/ scope/ schemas/ unpacker/ validator/ validators/ __tests__/`

### E 组：源代码 import 路径（24 个文件）

#### 桶式 import（7 个）—— 改 1 处即可
- `src/cli/blueprint.ts:22` —— `from '../oxn-dsl'` → `from '../oxl'`
- `src/cli/domain.ts:6` —— 同上
- `src/cli/work.ts:49` —— 同上
- `src/cli/proof.ts:45` —— 同上
- `src/cli/__tests__/proof.test.ts:390` —— `import('../../oxn-dsl')` → `import('../../oxl')`
- `src/oxn-dsl/compiler/blueprint-compiler.ts:2` —— 自引用 `from '../../oxn-dsl/...'` → `from '../../oxl/...'`
- `src/oxn-dsl/compiler/oxn-adapter.ts:13` —— 自引用同上
- `src/oxn-dsl/validator/mutation-validator.ts:11` —— 自引用同上

#### 子路径 import（17 个）—— 全部要改
- `src/cli/blueprint.ts:32` —— `'../oxn-dsl/compiler/blueprint-index-builder'`
- `src/cli/domain.ts:12` —— `'../oxn-dsl/compiler/domain-index-builder'`
- `src/cli/work.ts:64, 70, 71` —— 3 处
- `src/cli/oxn-compile.ts:4, 5, 6` —— 3 处
- `src/cli/oxn-dual-track.ts:18, 21, 28, 29, 30, 31, 32` —— 7 处
- `src/cli/oxn-unpack.ts:2` —— 1 处
- `src/cli/oxn-validate.ts:6, 7, 8, 9, 10, 11, 93` —— 7 处
- `src/cli/task-filesystem.ts:6, 7, 13, 16` —— 4 处
- `src/cli/render/blueprint-renderer.ts:3` —— 1 处
- `src/cli/init.ts:7` —— 1 处
- `src/cli/__tests__/task-filesystem.test.ts:5` —— 1 处
- `src/infra/loader.ts:10` —— 1 处
- `src/infra/sandbox-manager.ts:3` —— 1 处
- `src/work/work-migrator.ts:53, 58` —— 2 处
- `src/work/sandbox/sandbox-manager.ts:13, 14` —— 2 处

### F 组：API 标识符（~12 个 src/oxl 内部文件 + 24 个调用方）

#### 核心改动（`src/oxl/index.ts` + 内部）
- `OxnParser` → `OxlParser`
- `OxnAssetLoader` → `OxlAssetLoader`
- `OxnWorkspaceManager` → `OxlWorkspaceManager`
- `OxnBuiltinRegistry` → `OxlBuiltinRegistry`
- `OxnDocument` → `OxlDocument`
- `OxnDomainIR` / `OxnTaskIR` / `OxnWorkIR` → `OxlDomainIR` / `OxlTaskIR` / `OxlWorkIR`
- `createOxn*` (8 个工厂) → `createOxl*`
- `safeValidateOxn*IR` (8 个) → `safeValidateOxl*IR`
- `OXNDocument` 等 24 个 AST 类型 → `OxlDocument` 等
- `adaptOxnToFrozen` → `adaptOxlToFrozen`
- `generateOxnAssembly` → `generateOxlAssembly`
- `OXN_WORK_REFS_*` 错误码 → **保留**（属于 OXN 顶层契约，不动）

#### 兼容层（关键）
```typescript
// src/oxl/index.ts 末尾
/** @deprecated use OxlParser */
export { OxlParser as OxnParser } from './langium/oxn-services'
/** @deprecated use createOxlParser */
export { createOxlParser as createOxnParser } from './langium/oxn-services'
// ... 8-12 个 alias
```

**调用方策略**：D 组 24 个文件**保留 `createOxn*` 调用**（由 alias 兜底），**不强制同步**。下个版本（v0.1.x）再批量移除。

### G 组：Langium 生成代码（4 个文件，重生成）

跑 `bun run langium:generate`，自动重命名：
- `src/oxn-dsl/generated/ast.ts` 7 个标识符（`OXNDSLTerminals` → `OpenXenonLanguageTerminals` 等）
- `src/oxn-dsl/generated/module.ts`（`OXNLanguageMetaData` / `OXNParserConfig` / `OpenXenonLanguageGeneratedSharedModule` / `OpenXenonLanguageGeneratedModule`）
- `src/oxn-dsl/generated/grammar.ts`（`OXNGrammar` → `OpenXenonLanguageGrammar`）
- `OXNDSLAstType` → `OpenXenonLanguageAstType`、`OXNDSLAstReflection` → `OpenXenonLanguageAstReflection`

### H 组：VSCode 扩展（6 个文件）

| 文件 | 改动 |
|---|---|
| `oxn-vscode/package.json:2` | `name: "oxn-dsl"` → `name: "oxn"` |
| `oxn-vscode/package.json:3` | `displayName: "OXN DSL"` → `displayName: "OpenXenon Language"` |
| `oxn-vscode/package.json:4` | `description` 同步 |
| `oxn-vscode/package.json:6` | `id` 评估（建议同步改为 `oxl`） |
| `oxn-vscode/package.json:17, 22, 23` | `version`/`extensions`/`aliases`/`scopeName` 同步 |
| `oxn-vscode/oxn-dsl-0.1.0.vsix` | 文件名 → `oxn-0.1.0.vsix`（二进制 2946 字节需重打） |
| `oxn-vscode/syntaxes/oxn.tmLanguage.json:1-3` | `name: "oxn-enhanced"` → `name: "oxl-enhanced"` |
| **保留不动** | `oxn-vscode/syntaxes/oxn.tmLanguage.json:3` 的 `scopeName: "source.oxn"`（与 `.oxn` 同根） |

### I 组：品牌字符串精准替换（74 处，分语境）

**精准替换规则**：

| 语境 | 原文 | 替换为 | 例 |
|---|---|---|---|
| **源码内部视角**（描述 L1-OXL 架构层） | "OXN DSL" | "OpenXenon Language (OXL)" / "OXL" | L0L3Context.oxn:18, intent-domain.oxn:15,18,30,71 |
| **用户视角**（描述 .oxn 资产/语法概念） | "OXN DSL" | **保留** | README.md:13 链接文本、docs/reference/oxn-dsl.md 标题 |
| **历史归档** | "OXN DSL" | **保留** | docs/changelog/CHANGELOG.md:47、.changes/ 6 条 |
| **OXN 引擎相关** | "OXN DSL" 出现在描述引擎而非语言处 | **保留** | oxn 顶层品牌 |

**文件分布**：
- 文档 9 篇（`docs/architecture/l0-l3-constitution.md` 13 处 + `docs/core/document.md:184-185` + `docs/architecture/{blueprint,domain,work-and-task,state}.md` + `docs/guides/{getting-started,probe-development,ddd-workflow,troubleshooting}.md` + `docs/changelog/CHANGELOG.md:47` + `README.md:13,192,205`）
- AGENTS.md + 架构脚本注释
- 源码注释 ~30 处（`src/oxl/compiler/oxn-adapter.ts:4` + `src/oxl/crud/oxn-serializer.ts:4` + `src/oxl/__tests__/examples-parsing.test.ts:8` + `src/cli/{oxn-migrate-cmd,migrate-yaml}.ts` 等）
- Skills 5+3 个文件（见 J 组）
- **Domains 2 个文件**（用户核心问题 1）
- `.openxenon/domains/L0L3Context.oxn:18` —— "DSL 解析（OXN DSL）" → "DSL 解析（OXL）"
- `.openxenon/domains/intent-domain.oxn:15` —— "OXN DSL 自身" → "OXL 自身"
- `.openxenon/domains/intent-domain.oxn:18` —— "OXN DSL 8" → "OXL 8"
- `.openxenon/domains/intent-domain.oxn:30` —— "OXN DSL（8）" → "OXL（8）"
- `.openxenon/domains/intent-domain.oxn:71` —— "OXN DSL 不变量" → "OXL 不变量"

### J 组：Skills locales（5+3 个文件）

- `src/skills/locales/zh-CN/oxn-cli/instruction.md:71, 73, 81, 86, 354, 359, 379, 384`（精准替换）
- `src/skills/locales/zh-CN/oxn-work/instruction.md:230, 241, 255`（精准替换）
- `src/skills/locales/zh-CN/oxn-work/references/blueprint-format.md:3`（精准替换）
- `src/skills/locales/zh-CN/oxn-proof/instruction.md:44, 69`（精准替换）
- `src/skills/locales/zh-CN/oxn-resume/instruction.md:43, 53, 56, 59`（精准替换）
- 跑 `bun run init` 重生成 `.opencode/skills/{oxn-cli,oxn-work,oxn-proof}/SKILL.md`

### K 组：新增 changelog（1 个文件）

新建 `.changes/0-X-Y-rename-oxn-dsl-to-oxl.md`（X.Y 为下一个版本号，**待定**）

---

## 3. 实施顺序（13 步）

1. **A 配置 8 文件**（含 `L1-OXL` 命名写入 validate-deps）
2. **B 物理移动** `git mv src/oxn-dsl src/oxl`
3. **C 跑 `bun run langium:generate`**（验证 langium-config.json 路径生效）
4. **D 改 24 个 import 路径**（机械替换）
5. **E 改 API 标识符 + alias**（不强制同步调用方）
6. **F 改架构层名**（8 处 validate-deps + AGENTS + 文档 + blueprint-index-builder 注释）
7. **G 改架构守卫**（白名单 8 处 + it 字符串 4 处）
8. **H 品牌字符串精准替换**（**逐处 review**——分用户视角/内部视角）
9. **I 改 VSCode 扩展**（包名 `oxn` + 重打 .vsix）
10. **J 改 Skills locales + 跑 `bun run init`**
11. **K 改 Domains**（2 文件）
12. **全量验证**（`bun run typecheck && bun run lint && bun run check && bun test`）
13. **新增 changelog** 收尾

---

## 4. 预计工作量

| 阶段 | 工作量 | 风险 |
|---|---|---|
| 1-3. 配置 + 物理移动 + 重生成 | ~40 分钟 | 中（git mv 需评估 history） |
| 4. 24 个 import 路径 | ~1 小时 | 低 |
| 5. API 标识符 + alias | ~2-3 小时 | 中 |
| 6-7. 架构层名 + 守卫 | ~1 小时 | 中（宪法级修改） |
| 8. 品牌字符串精准替换 | ~2-3 小时 | 中（语义判断） |
| 9. VSCode 扩展 + 重打 .vsix | ~1 小时 | 中 |
| 10-11. Skills + Domains | ~40 分钟 | 低 |
| 12. 全量验证 | ~30 分钟 | — |
| 13. 新增 changelog | ~10 分钟 | 低 |
| **合计** | **~10-13 小时** | — |

---

## 5. 关键风险点

1. **架构守卫白名单 `oxn-dsl` → `oxl`**：**宪法级修改**——任何 L0/L1 模块 import 错东西都会红 CI。改前要确认 `scripts/validate-dependencies.ts:49-105` 与守卫测试一致。
2. **`L1-OXN-DSL` → `L1-OXL`**：与 L0-L3 宪法文档强绑定。改后需在 `docs/architecture/l0-l3-constitution.md` 中显式注明层名变更（ADR-style）。
3. **品牌字符串精准替换**：74 处不是 1:1 替换——需逐处判断"用户视角"vs"源码内部视角"语境，**建议用 `grep -n` 列出来逐处 review**，不要一次性全局 sed。
4. **Git history**：`git mv src/oxn-dsl src/oxl` 保留 blame。**绝对不要** `rm` + `add`——会丢失 22 个文件的历史。
5. **VSCode 包名/目录名漂移**：VSCode 扩展包名 `oxn`（顶层品牌），目录 `oxn-vscode/`（顶层），但其内部语法 `oxl-enhanced`（OXL 子概念）——三层概念要清晰。

---

## 6. 不在本次范围（显式确认）

- ❌ `.oxn` 文件扩展名（oxn 顶层）
- ❌ `OXN_*` 错误码（oxn 顶层）
- ❌ CLI bin `oxn`（oxn 顶层）
- ❌ `@oxn/` 作用域（oxn 顶层）
- ❌ `oxn-vscode/` 目录（oxn 顶层）
- ❌ VSCode 扩展 `scopeName: "source.oxn"`（与 `.oxn` 同根）
- ❌ 历史 `.changes/` 6 条归档
- ❌ 历史 `docs/changelog/CHANGELOG.md:47`（用户视角）

---

## 7. 验证清单

实施完成后，必须全绿：

- [ ] `bun run typecheck` —— tsc --noEmit 通过
- [ ] `bun run lint` —— ESLint 架构守卫通过（`oxn-dsl` 不存在；`oxl` 在白名单）
- [ ] `bun run check` —— Biome 格式 + 风格通过
- [ ] `bun test` —— 414 个测试全量通过
- [ ] `bun run langium:generate` —— 无 diff（生成代码稳定）
- [ ] `git grep -n 'oxn-dsl' src/ docs/ scripts/ tests/ .changes/ AGENTS.md README.md langium-config.json biome.json eslint.config.js bunfig.toml package.json` —— **0 处**（除历史归档外）
- [ ] `git grep -n 'L1-OXN-DSL' src/ docs/ scripts/ tests/ AGENTS.md` —— **0 处**
- [ ] `git grep -n 'OXN DSL' src/ docs/ skills/ AGENTS.md README.md` —— 仅用户视角保留处
- [ ] `bun run build:macos` —— 编译成功
- [ ] VSCode `.vsix` 重打成功

---

## 8. 相关域（Context Map）

| 域 | 角色 | 引用方式 |
|---|---|---|
| `.openxenon/domains/L0L3Context.oxn` | 元域 | 本方案修改其中 1 行（line 18） |
| `.openxenon/domains/intent-domain.oxn` | 业务域 | 本方案修改其中 4 行（line 15, 18, 30, 71） |
| `.openxenon/domains/align-domain.oxn` | 业务域 | 隐式相关（`@oxn/probes/*` 引用） |
| `.openxenon/domains/proof-domain.oxn` | 业务域 | 隐式相关（`OxnBuiltinRegistry` 提及） |
| `.openxenon/domains/iap-error-context.oxn` | 业务域 | 隐式相关（`OXN_*` 错误码契约） |
| `.openxenon/domains/intent-align-context.oxn` | 业务域 | 上下文映射，无直接 brand |

**本计划对 6 个域文件的影响**：仅修改 2 个文件中的 5 行。

---

## 9. 回滚预案

如实施中途遇严重问题：

```bash
# 1. 暂存所有改动
git stash push -u -m "oxl-rename-wip"

# 2. 恢复目录
git mv src/oxl src/oxn-dsl

# 3. 恢复配置
git checkout -- langium-config.json biome.json eslint.config.js bunfig.toml package.json bun.lock

# 4. 验证
bun run typecheck && bun test
```

**所有改动可一键回滚**（`git stash pop` 恢复进度，或 `git reset --hard` 全弃）。

---

## 10. 附录：grep 检索命令（实施时用）

```bash
# 找出所有 OXN DSL 字符串（按文件统计）
rg -n 'OXN DSL' src/ docs/ skills/ AGENTS.md README.md

# 找出所有 oxn-dsl 路径
rg -n 'oxn-dsl' src/ docs/ scripts/ tests/ AGENTS.md README.md \
  langium-config.json biome.json eslint.config.js bunfig.toml package.json

# 找出所有 L1-OXN-DSL 层名
rg -n 'L1-OXN-DSL' src/ docs/ scripts/ tests/ AGENTS.md

# 找出所有 Oxn* / createOxn* 标识符
rg -n '\bOxn[A-Z]\w*|\bcreateOxn\w*' src/

# 找出所有 OXNDSL 生成标识符
rg -n 'OXNDSL\w*' src/oxn-dsl/generated/
```
