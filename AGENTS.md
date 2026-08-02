# AGENTS.md

OpenXenon 是基于 Bun 构建的 OXO/IAP 控制引擎：`oxn` CLI + Daemon + 基于 **md-pipeline** 的 OXN DSL（0.6.x 起纯 MD）。当前版本：`0.6.3`（alpha 阶段）。包管理器 pnpm（阶段 1），构建/测试 Bun。

## 语义优先级（5 级，从强到弱）

1. **`.openxenon/assets/domains/*.md` 中的 invariants**（最强；术语 + 边界硬约束）
2. **各 Asset 自身的 YAML frontmatter 与正文**（定义性 SSOT）
3. **`.openxenon/assets/assetmaps/oxn-system.md`** 中的 scene → asset 映射（路由数据）
4. **`docs/` 下的 RFC / glossary**（仅解释，不约束）
5. **本文件中的"行为规则"**（最后兜底）

## Agent 行为规则

- 不得修改 Domain 文件中的 invariants（详见 `scripts/check-doc-boundary.ts` 守门）
- 不得把 glossary / docs 当 SSOT 改——改术语走 `.openxenon/assets/domains/*.md` + 跑 `bun scripts/sync-domain-glossary.ts`
- 执行任务前必须先建 Work，禁止在 Asset 外裸奔写代码：`oxn work create <name> --blueprint <bp>`
- Proof 只记录过程，不评判质量（ADR-0066/0067）
- 读 AssetMap 是为了"找 Blueprint"，不是找 Domain 关系
- Skill 维护流：改 `packages/cli/src/skills/locales/{zh-CN,en}/<skill>/instruction.md` → 跑 `bun run packages/cli/src/index.ts init -f` → `.opencode/skills/` 自动重建
- 跨层引用规则：RFC / Doc / Dev 不依赖 Meta 层（CONTEXT-MAP.md 例外），守门在 pre-commit 自动跑

## 意图解析流程（4 步）

1. 从用户话里抽 goal
2. 调 `oxn assetmap suggest --goal "<goal>" --scene <scene>` 拿到 assetmap + scene
3. 读对应 assetmap 里该 scene 块，挑最相关 Blueprint
4. `oxn work create --blueprint <name>` 进入执行

## 常用命令

```bash
pnpm install --frozen-lockfile    # 装依赖
bun run build                     # 构建
bun run typecheck                 # tsc --noEmit
bun run check                     # biome check
bun run lint                      # eslint（架构守卫）
bun test                          # 跑测试
```

## 入口指针

- **项目介绍**：`README.md` + `docs/product/zh-cn/introduction.md`
- **架构**：`docs/dev/zh-cn/architecture.md` + RFC-0018 + RFC-0009
- **AI 路由数据**：`.openxenon/assets/assetmaps/oxn-system.md`
- **术语权威**：`.openxenon/assets/domains/`（内部）+ `docs/product/zh-cn/concepts/glossary.md`（外部，单一权威）
- **L0-L3 宪法**：`docs/dev/zh-cn/architecture.md` + `bun scripts/validate-dependencies.ts`
- **CLI 参考**：`docs/product/zh-cn/reference/cli-user-guide.md`
- **变更历史**：`.changes/`（按版本号组织）
- **历史归档**：`.changes/pre-0-6-history.md`（v0.2.x / v0.3.x 已 done 路线图）