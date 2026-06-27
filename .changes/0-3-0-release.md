# 0.3.0 — MD-Native Grammar 改革（释放版）

> **主题**：把 `:::intent{...}` 容器指令完全替换为纯原生 Markdown 层级映射 + Factory + Singleton 架构
> **范围**：RFC v1.0 → 3 个串行子 PR (feat/v0.3-t18-md-native-grammar → t19-md-native-migrate → t20-md-native-highlight) + 5 个后续 commits (canonical 范式落地) + A1 fixture 迁移 + A2 CLI 实装
> **基线**：v0.3.0 v3.2 alpha (commit `63e1233`) — 1545 tests pass
> **当前**：1700 tests pass（+155 净增：md-bridge +27 / examples +5 / CLI +11 / 重生 fixture +66 / canonical CI +5 守卫）
> **作者**：opencode（与用户协作，2026-06-22 ~ 2026-06-24，~3 天）
>
> RFC 全文：[`.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md` v1.0](../.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md)
> 路线图：[`.openxenon/pools/sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md` v3.2](../.openxenon/pools/sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md)

---

## 0. 核心命题

> **完全替换 `:::intent{...}` 容器指令为纯原生 Markdown**。
>
> 用 `#` H1 顶层实体 / `##` H2 分类 / `###` H3 实例 / 嵌套列表子结构表达 OpenXenon 5 类 Intent 资产。
> 0 自定义语法，0 新依赖（仅删 `remark-directive`）。
> 配合 Factory + Singleton 架构（`EntityRegistry` + 5 个 `EntityCompiler`）解耦 5 类实体。

**canonical 范式三原则**：
1. **H3 = canonical name** —— 不再写冗余 `- name: <H3>`
2. **一行一个 `- key: value`** —— 不再用 `;` 内联分隔
3. **数组 = 缩进列表** —— 不用逗号字符串或内联 `[a, b, c]`

**真值来源（v0.3 §11.2 锁定）**：

> **`.md` = 唯一写入入口**。`.oxn` 由 `.md` 自动编译生成，**禁止反向修改**。
>
> v0.3.0 改革：`.md` 用纯 MD 格式书写，**breaking change**——旧 `:::intent{...}` 解析期抛 `E_MD_DEPRECATED_SYNTAX`。

---

## 1. 5 commits on `feat/v0.3-md-ssot` (PR-A → C)

### 1.1 feat/v0.3-t18-md-native-grammar（PR-A）✅
- **EntityCompiler 接口**：`compile()` + `parse()` + `validate()` 抽象
- **EntityRegistry Singleton**：`getEntityCompiler(type)` 路由
- **5 个 compiler 实现**：Domain / Blueprint / Work / Task / Proof
- **extract-headings.ts** + **extract-list-fields.ts**：H3 + 列表树形提取
- **70 case 新测试**
- **不破坏旧 `:::intent` 解析**（双选项 `'native' | 'directive'` 作为安全网）

### 1.2 feat/v0.3-t19-md-native-migrate（PR-B）✅
- 14 个 `.md` regen（rewriter 切到纯 MD 输出）
- 11 个 `domains-md/*.md` 字节级重生
- `E_MD_DEPRECATED_SYNTAX` 抛错（breaking change）
- 删 `remark-directive` 依赖
- 8 fixture 文件迁移到新格式

### 1.3 feat/v0.3-t20-md-native-highlight（PR-C）✅
- oxn-vscode grammar 扩 markdown 注入（`oxn-intent.tmLanguage.json`）
- VitePress CSS 着色（`docs/.vitepress/theme/custom.css`）
- drift guard `scripts/check-intent-types-drift.ts`（CI 守卫 type 白名单一致）
- 0 新 npm 依赖

### 1.4 5 commits canonical 范式落地 ✅
- `examples-md`: 5 entity canonical 纯 MD 样例 + README 同步
- `ci(check-md-canonical)`: 5 条 canonical 守卫规则
- `compilers`: 4 decompiler 产出 canonical 形式 + 重生 14 domains-md
- `docs`: intent.md 双 SSOT 同步 canonical 范式章节

---

## 2. 错误码扩展（6 → 13 E_MD_xxx + 5 canonical 守卫）

### 2.1 13 个 E_MD_xxx（md-bridge 内置）

| 错误码 | 触发条件 |
|---|---|
| E_MD_INVALID_SYNTAX | mdast 解析失败 |
| E_MD_MISSING_REQUIRED | 必填字段缺失（如 frontmatter.entity）|
| E_MD_TYPE_MISMATCH | 字段类型不符 |
| E_MD_REFERENCE_BROKEN_FATAL | 内部 Intent 引用断链 |
| E_MD_REFERENCE_BROKEN_WARN | 外部 URL/路径断链 |
| E_MD_HASH_MISMATCH | contentHash 不匹配 |
| E_MD_DEPRECATED_SYNTAX | 检测到 `:::intent{...}` 旧语法 |
| E_MD_DUPLICATE_H3 | 同 H2 下 H3 文本重复 |
| E_MD_H1_MISSING | 缺 H1 |
| E_MD_H1_MISMATCH | H1 与 frontmatter.name 不一致 |
| E_MD_CATEGORY_UNKNOWN | H2 不在实体白名单 |
| E_MD_LIST_FORMAT_INVALID | 列表层级/缩进错乱 |
| E_MD_NESTED_LEVEL_OVERFLOW | 嵌套深度超限（>3）|

### 2.2 5 个 canonical 守卫（CI 拦截）

| 规则 | 触发条件 |
|---|---|
| E_MD_CANONICAL_NAME_REDUNDANT | `- name: <H3-text>` 冗余 |
| E_MD_CANONICAL_ITEMS_COMMA_STRING | `items: A, B, C` 逗号字符串 |
| E_MD_CANONICAL_VALUES_INLINE_ARRAY | `values: [a, b, c]` 内联数组 |
| E_MD_CANONICAL_SEMICOLON_INLINE | 结构性字段含 `;`（自然语言字段豁免）|
| E_MD_INVALID_SYNTAX | md-bridge pipeline 解析失败 |

---

## 3. A1: 66 fixture 迁移到 canonical 纯 MD（从 66 fail → 0 fail）

**核心改动**：
- `src/oxl/md-bridge/remark-to-mdast.ts`：`parseDomainMd` / `parseBlueprintMd` / `parseWorkMd` 重写从 legacy `result.intents` 改为 `extractHeadingContexts + extractListFields`
- `src/oxl/md-bridge/mdast-validator.ts`：`validateReferences` 扩展支持 H3 `- ref:` 字段（FATAL/WARN 分级）
- `src/oxl/md-bridge/mdast-to-kernel.ts`：`convertTaskToCompiled` 重写 part 提取
- 5 测试文件 fixture 迁移（66 → 0 失败）
- `entity-registry.test.ts`：测试隔离修复（beforeEach 还原 5 个 compiler）

---

## 4. A2: `oxn domain compile` + `oxn blueprint compile` CLI 实装

**v0.3 PR-B 错误消息承诺的命令终于真实存在**：
```
E_MD_DEPRECATED_SYNTAX: Syntax deprecated in v0.3.0. 
Please use `oxn domain compile` to generate fresh .md from your .oxn files.
```

**新增 CLI 子命令**：
- `oxn domain compile <name>` — 读 `.openxenon/domains/<name>.oxn` → `compileOxnToMd()` → 写 `.openxenon/domains-md/<name>.md`
- `oxn blueprint compile <name>` — 同上 for blueprint

**测试**：11 case e2e（端到端验证 compile 产物可被 md-bridge 解析 + EntityCompiler.parse 还原业务对象）

---

## 5. 测试 + 验证总览

| 指标 | v0.3.0-alpha | v0.3.0 final |
|---|---|---|
| 全仓库测试 | 1545 pass / 66 fail | **1700 / 0** |
| md-bridge 测试 | 175 / 66 fail | **241 / 0** |
| canonical CI (22 文件) | — | **22 / 22** |
| 5 个 entity canonical examples | — | **6 / 6** |
| 14 个 domains-md byte-level 重生 | — | ✅ |

### 5.1 新增/重写文件
- `src/oxl/md-bridge/extract-headings.ts`（H3 上下文栈）
- `src/oxl/md-bridge/extract-list-fields.ts`（列表字段递归）
- `src/oxl/md-bridge/entity-compiler.ts`（EntityCompiler 接口）
- `src/oxl/md-bridge/entity-registry.ts`（Singleton 注册）
- `src/oxl/md-bridge/compilers/{domain,blueprint,work,task,proof}-compiler.ts`（5 个实现）
- `src/oxl/md-bridge/oxl-md-decompiler.ts`（canonical compile 入口）
- `src/oxl/md-bridge/mdast-validator.ts`（13 E_MD_xxx 校验 + ref 字段扩展）
- `src/oxl/examples-md/*.md`（6 个 canonical 样例）
- `scripts/check-md-canonical.ts`（5 条守卫）
- `scripts/migrate-{domains,blueprints}-to-native-md.ts`（重生工具）
- `src/cli/domain.ts` + `src/cli/blueprint.ts`（新增 compile 子命令）

---

## 6. 后续 (v0.4.0 推迟清单)

### 6.1 工具类（v0.4 实施）
- [ ] `naming-system.md` 完整 CI 校验
- [ ] pre-commit hook 实施（基于 `oxl-md-source-hash.ts`）
- [ ] `.changes/` 重组 + version:check/sync 增强
- [ ] CHANGELOG 自动化（`version-aggregate.ts` 已有）
- [ ] 修复 `.gitignore` 第 83 行（`pools/*/!(.gitkeep)` 未生效）

### 6.2 内容类（v0.4 实施）
- [ ] 149 个历史 `.openxenon/works-md/*/task.md` 批量迁移
- [ ] `oxn proof compile` 第三个 compile CLI 子命令
- [ ] `oxn work compile` Work / Task 同样加 compile
- [ ] 5 个 builtin probe 增加 scheme 字段（v0.3 RFC §5.2）

---

## 关联

- RFC 全文：[`md-native-grammar-rfc.md` v1.0](../.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md)
- 实施报告：[`arch-v0.3-implementation-report.md`](../.openxenon/pools/sprints/v0.3-md-ssot/design/arch-v0.3-implementation-report.md)
- 路线图：[`v0.3.0-roadmap.md` v3.2](../.openxenon/pools/sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md)
- Intent SSOT 边界：[`intent-ssot-boundary.md` v1.0](../.openxenon/pools/sprints/v0.3-md-ssot/design/intent-ssot-boundary.md)
- v0.3 md-ssot 改革 RFC（PR-A/B/C）：[`md-native-grammar-rfc.md`](../.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md)
- Changelog 片段：`.changes/0-3-0-md-ssot.md` + `.changes/0-3-0-md-native.md` + `.changes/0-3-0-release.md`（本文档）
