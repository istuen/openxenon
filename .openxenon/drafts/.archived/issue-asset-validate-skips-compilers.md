# Issue: `oxn asset validate` 不调用 5 个 kind-specific compiler

- **DraftType**: issue（问题记录）
- **优先级**: P1 核心
- **修复成本**: M（加 dispatch table + 单测）
- **关联**: `design-asset-exploration-ux-overview.md` §5 v0.7.0 设计期

## 1. 问题

`oxn asset validate <name> --kind <kind>` 只做 `parseMarkdown(content)` + 正则字段检查（abstract / references / citations / auditTrail），**完全跳过** 5 个已实现的 kind-specific compiler：

| Kind | Compiler 路径 | 实现的强校验 |
|---|---|---|
| domain | `packages/engine/src/oxl/md-bridge/compilers/domain-compiler.ts` | H1/frontmatter 一致性、H2 category 白名单、H3 重复规则 |
| workflow | `.../workflow-compiler.ts` | Workflow slot 结构 |
| stack | `.../stack-compiler.ts` | Stack tool 结构 |
| blueprint | `.../blueprint-compiler.ts` | Use/Boundary 结构 |
| roadmap | `.../roadmap-compiler.ts` | scene/link 结构（注意：与 `Roadmap/parser.ts` 走 scene-based 表示，schema 路径分裂） |

## 2. 现状

```ts
// packages/engine/src/Asset/validate.ts:35-46
const ast = parseMarkdown(content);
return { ok: true, errors: [], ast: { entities: [] }, domain: null };
```

`getEntityCompiler(kind).parse(...)` / `.validate(...)` 从未被调用。

## 3. 影响

- 用户跑 `oxn asset validate` 自以为已校验，实际只能 catch Markdown 语法错
- kind-specific 错误（H2 分类错、H3 重复、slot 错配）全部漏报
- 必须分别跑 `oxn domain validate` / `oxn blueprint validate`（但 `oxn workflow validate` / `oxn stack validate` / `oxn roadmap validate` **根本不存在**）——这意味着 workflow（15 个）/ stack（1 个）/ roadmap（1 个）**无任何强校验入口**

## 4. 设计决策点（需先拍板再实现）

| 选项 | 描述 | 优劣 |
|---|---|---|
| **A. 统一入口** | `oxn asset validate --kind X` 内置 5-way dispatch，所有 kind 都走 compiler | ✅ 用户只需记一个命令；❌ roadmap schema 分裂（scene parser vs RoadmapCompiler）需先解决 |
| **B. 弱校验保留** | `oxn asset validate` 保持 weak，新增 `--strict` 触发 compiler | ✅ 不破坏现有行为；❌ 用户必须知道 `--strict` 才能强校验 |
| **C. 混合** | default = weak，加 `--strict`；另建 `oxn workflow validate` / `oxn stack validate` / `oxn roadmap validate` | ✅ 完整覆盖；❌ 命令面膨胀（从 7 个变 10 个） |

**推荐选项 A**（统一入口），前提是先解决 roadmap 的 scene-parser vs RoadmapCompiler 分裂（roadmap-compiler 期望 `## Links`，Roadmap/parser 期望 `## Scenes`）。

## 5. 修复方向（按选项 A）

```ts
// packages/engine/src/Asset/validate.ts 改为
const compiler = getEntityCompiler(kind);  // 来自 entity-registry
const result = compiler.validate(content);
return result;
```

外加：
- 5 个 kind 的 fixture 测试（每个 kind 至少 3 个 valid + 3 个 invalid 案例）
- roadmap schema 分裂决策（修 RoadmapCompiler 还是 Roadmap/parser？）

## 6. 验证

```bash
# 修复前
oxn asset validate oxn-workflow --kind workflow
# 输出 ok=true，但故意构造 H3 重复也通过

# 修复后
oxn asset validate oxn-workflow --kind workflow --strict
# H3 重复应报错 E_MD_DUPLICATE_H3
```

## 7. Promote 路径

- 实现选项 A → RFC 拍板 → `oxn work create --blueprint doc-rfc-workflow` → `docs/rfc/zh-cn/RFC-XXXX-asset-validate-dispatch.md`
- Doc(dev) 同步：`oxn work create --blueprint doc-dev-workflow` → `docs/dev/zh-cn/asset-validation.md`
- changelog `.changes/0-7-0-asset-validate-dispatch.md`