# Issue: `oxn asset list`（无 `--kind`）漏掉 workflow 与 roadmap

- **DraftType**: issue（问题记录）
- **优先级**: P0 hotfix
- **修复成本**: XS（一行数组修复）
- **关联**: `design-asset-exploration-ux-overview.md` §5 v0.6.3 hotfix

## 1. 问题

执行 `oxn asset list`（不带 `--kind`）时，只输出 **3 类 Asset**（domain / blueprint / stack），遗漏 **workflow（15 个）** 和 **roadmap（1 个）**——对一个存量项目而言，这是 16/31 ≈ 51% 的资产不可见。

## 2. 复现

```bash
ls .openxenon/assets/workflows/ | wc -l   # 15
ls .openxenon/assets/roadmaps/  | wc -l   # 1

oxn asset list          # 输出 15 个 Asset
oxn asset list --kind workflow   # 输出 15 个
oxn asset list --kind roadmap    # 输出 1 个
# 数差 = 16
```

带 `--kind` 时正确；不带 `--kind` 时错误。

## 3. 根因

`packages/engine/src/Asset/list.ts:25-31` 的 `listAll()` 硬编码只扫描 3 类：

```ts
// packages/engine/src/Asset/list.ts:25-31
['domain', 'blueprint', 'stack']   // 漏 workflow + roadmap
```

而 `list({kind})`（带 `--kind` 时调用）走的是完整的 5 类枚举 `ALL_ASSET_KINDS`，行为正确。

## 4. 影响

- 用户首次跑 `oxn asset list` 即被误导（少看到一半资产）
- 任何依赖 `listAll()` 的下游命令（`oxn asset validate --check-dag --all` 等）也漏数据
- 对存量项目：完全无法用一句 list 摸清资产全貌，必须跑 5 次 `--kind`

## 5. 修复方向

**最小修复**：把硬编码数组替换为 `ALL_ASSET_KINDS` 枚举：

```ts
// list.ts:25-31 改为
ALL_ASSET_KINDS.forEach((kind) => { ... })
```

并加测试 `listAll` 必须返回 5 类（哪怕每类为空数组）。

## 6. 验证

```bash
oxn asset list --json | jq 'group_by(.kind) | map({kind: .[0].kind, count: length})'
# 期望：5 个 kind 都出现（domain=9, workflow=15, stack=1, blueprint=5, roadmap=1）
```

## 7. Promote 路径

- 修复命令 + 加单测 → `oxn asset evolve oxn-engine-domain` 不适用（这是 bug fix 不是 Asset 修改）
- 走 hotfix branch → `feat/v0.6.3-asset-list-hotfix` → 合 dev
- 文案记录 → `oxn work create --blueprint doc-dev-workflow` 落 `docs/dev/zh-cn/fixes/asset-list-hotfix.md`