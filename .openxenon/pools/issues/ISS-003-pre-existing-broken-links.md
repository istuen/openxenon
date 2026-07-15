# ISS-003 · 预先破损链接：information-hiding.md 在激进清理后残留

> **状态**：✅ Fixed in `ab6cdce` (2026-06-08) · 🗂 Closed (2026-07-10, doc-openxenon-cleanup)
> **严重度**：🟡 Medium（文档可读性问题，CI 不拦截）
> **发现时间**：2026-06-08
> **发现者**：L0-L3 一致性审计（commit `ab6cdce`）
> **影响文件**：`docs/architecture/work-and-task.md` + `docs/architecture/state.md`

---

## 1. 现象

`docs/architecture/` 下 2 个文件包含指向**已删除文件**的链接：

```bash
$ grep -rn "information-hiding.md" docs/
docs/architecture/work-and-task.md:209:- [信息隐藏原则](./information-hiding.md) — AI 看不到什么
docs/architecture/state.md:185:- [信息隐藏原则](./information-hiding.md)
```

`./information-hiding.md` 在 commit `9aa4ba0`（docs 激进清理）中已被删除，但留下 2 处 dangling references。

---

## 2. 根因

`9aa4ba0` 的清理策略是：
- 删除 `docs/architecture/information-hiding.md`（139 行）
- 把内容合并到 `docs/core/document.md` §2.7

但清理只删了源文件，**没扫所有反向引用**。这是典型的"破坏性重构 + 链接审计遗漏"。

### 2.1 时间线

| Commit | 日期 | 动作 |
|---|---|---|
| `9aa4ba0` | 2026-06-06 | 删 `docs/architecture/information-hiding.md`，合并到 `document.md` §2.7 |
| `e100581` | 2026-06-06 | `cleanup-arsenal-remaining-coupling` 改 `work-and-task.md` 引用 |
| `af77862` | 2026-06-05 | `v0.1 hard-switch` 改 `state.md` 引用 |
| `ab6cdce` | 2026-06-08 | **本次审计发现并修复 2 处 dangling links** |

注：`work-and-task.md` 在 `e100581` 改过但未修正 `information-hiding.md` 链接；`state.md` 在更早就引用了此文件。

---

## 3. 修复方案（已落地）

### 3.1 链接重定向

```diff
# docs/architecture/work-and-task.md:209
- - [信息隐藏原则](./information-hiding.md) — AI 看不到什么
+ - [信息隐藏原则](../core/document.md#27-信息隐藏原则) — AI 看不到什么

# docs/architecture/state.md:185
- - [信息隐藏原则](./information-hiding.md)
+ - [信息隐藏原则](../core/document.md#27-信息隐藏原则)
```

### 3.2 验证脚本

```bash
# 提取所有 markdown 内部链接
grep -rho '\[[^]]*\]([^)]*\.md[^)]*)' docs/ README.md 2>/dev/null | \
  sed -E 's/.*\(([^)]*\.md[^)]*)\).*/\1/' | \
  sed -E 's/[#?].*//' | sort -u | while read link; do
  # ... 检查文件是否存在
done
```

修复后：**0 个 broken links**（修复前 2 个）。

---

## 4. 经验教训

### 4.1 应建立的"链接完整性"机制

1. **CI 检查 markdown 链接**：建议未来在 `.github/workflows/docs-check.yml` 中加：
   ```yaml
   - name: Validate markdown links
     run: bun scripts/validate-md-links.ts
   ```
2. **删除文件时必跑 grep**：`git rm <file>` 后必跑 `git grep <file>` 找反向引用。
3. **`openspec/changes/` proposal 加 checklist**：破坏性变更的 proposal 应强制勾选"已扫所有反向引用"。

### 4.2 类似风险点

```bash
# 扫所有可能 dangling 的旧文件引用
git grep -l "9aa4ba0" docs/   # 9aa4ba0 删的文件清单
git grep -l "DEPRECATION.md" docs/   # 已删
git grep -l "concepts.md" docs/      # 已合并到 document.md
git grep -l "intent-align.md" docs/  # 已合并到 document.md
git grep -l "iap-paradigm.md" docs/  # 已合并到 document.md
```

---

## 5. 残留风险（类似模式）

虽然本次审计只发现 2 处破损，但激进清理（`9aa4ba0`）还删了以下文档：

| 删前的文件 | 状态 |
|---|---|
| `docs/architecture/information-hiding.md` | ✅ 已修（本次） |
| `docs/architecture/overview.md` | ✅ 已修（无引用） |
| `docs/adr/*.md`（9 个 ADR） | ✅ 已修（无引用） |
| `docs/core/{iap-paradigm,intent-align,philosophy,concepts,terminology}.md` | ✅ 已修（无引用） |
| `docs/README.md` | ✅ 已修（无引用） |

**结论**：除 `information-hiding.md` 2 处外，其他被删文件无 dangling 引用。

---

## 6. 未来预防措施建议

| 措施 | 实现成本 | 建议 |
|---|---|---|
| CI markdown 链接检查脚本 | 低（~50 行 Bun） | ✅ 建议加入 CI |
| `git rm` 钩子：自动 grep 反向引用 | 中（需写 lefthook 钩子） | ✅ 建议加入 lefthook |
| 文档目录改名前强制 review | 低（流程变更） | ✅ 建议加入 openspec |
| 链接完整性定期 audit | 低（季度跑一次） | ✅ 建议 |

---

## 7. 相关引用

- **修复 commit**：`ab6cdce`（审计时顺手修复）
- **导致破损的 commit**：`9aa4ba0`（docs 激进清理）
- **宪法文档**：[`docs/architecture/l0-l3-constitution.md`](../../docs/architecture/l0-l3-constitution.md) §7.2.1 C-7（无）

---

**标签**：`docs` `broken-link` `fixed` `cleanup-9aa4ba0`
