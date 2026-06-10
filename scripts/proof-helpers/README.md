# scripts/proof-helpers/

OXN proof 链路专用 helper。被 `oxn-proof` skill 引用的 2 个脚本（domain 重组保真性 + proof 闭环自检）。

**为什么需要这些 helper？** OXN DSL `STRING: /"[^"]*"/` grammar **不支持 `\"` 转义**，所以所有含内嵌双引号的 shell 逻辑必须搬到独立脚本，proof.oxn 只 `bash helper.sh <args>` 干净调用。

## `domain-merge-check.py` — 域重组保真性证明

**职责**：验证旧 X 域去重 term/ban 集 ⊆ 新 Y 域去重集（保证 refactor 没丢语义）。

**何时用**：
- ✅ 任何"X 域 → Y 域"合并 refactor 后
- ✅ "1 域 → N 域"拆分（反向调用）
- ❌ 改单个域内部 term/ban/invariant 文本（不是 merge 场景）
- ❌ 新建空白域（无 old 可比）

**调用**：
```bash
python3 domain-merge-check.py <new-files...> -- <old-files...>
```

**Exit code**：
- `0` = 保真（PASS）
- `1` = 漂移（缺 term 或 ban，列出缺什么）
- `2` = 用法错（缺 `--` 或某侧空）

**典型嵌入 proof.oxn**（来自 `domain-restructure-equivalence`）：
```oxn
probe "p13-set-preserved" {
  ref "@oxn/probes/shell-exec"
  params {
    command = "python3 scripts/proof-helpers/domain-merge-check.py \
      .openxenon/domains/intent-domain.oxn \
      .openxenon/domains/align-domain.oxn \
      .openxenon/domains/proof-domain.oxn \
      -- \
      .oxn-domain-archive/cli-context.oxn \
      .oxn-domain-archive/dsl-context.oxn \
      ...",
    timeout = "15000"
  }
}
```

**重要限制**：这是**语法层证明**，不是语义层。term 重命名（`"X"` → `"XRenamed"`）也判保真 —— 它检查"声明的 key 在不在"，不查"语义是否真的等价"。

---

## `proof-self-check.sh` — proof 空间闭环自检

**职责**：10 个物理观测验证 proof 空间满足 oxn-proof skill 描述的 5 命令闭环。

**何时用**：
- ✅ OXN 升级到 v0.1.3+ 后跑一遍
- ✅ 改 `src/cli/proof.ts` / frozen.json schema / Langium grammar STRING 后
- ❌ 日常 PR（无 proof 链路变动）—— 跑 CI 已覆盖

**调用**：
```bash
bash proof-self-check.sh <proof-name> <check>
```

**10 个 check**：

| Check | 证明什么 | 失败时排查 |
|---|---|---|
| `probes-added` | proof.oxn 含 ≥2 个 probe 块 | 忘加 probe |
| `frozen-readonly-444` | frozen.json mode == 444（OS 锁生效）| writer 没 chmod 0o444 |
| `signature-hex64` | `_xenon_meta.content_hash` 是 64-char hex | hash 算法被改 |
| `verdict-emitted` | `verdict` 字段 ∈ {PASSED, FAILED} | verdict schema 被改 |
| `all-probes-passed` | `probes[]` 存在 + 每条有 `passed` 字段 | probe schema 被改 |
| `show-exit-zero` | `oxn proof show` 退出 0 | CLI 命令被改 |
| `show-probes-listed` | show 输出含 p1-/p2-/... 前 N 个 probe | probe 输出格式被改 |
| `frozen-touch-allowed` | owner 可改 mtime（覆盖语义存在）| OS 锁被错改成 0o000 |
| `echo-write-blocked` | `echo > frozen.json` 被 OS EACCES 拒绝 | 锁失效（极严重） |
| `body-sha256-valid` | frozen.json 全文 SHA-256 是 64-hex | 文件被破坏 |

**Exit code**：
- `0` = check PASS
- `1` = check FAIL
- `2` = argv 错（缺 proof-name/check / 未知 check / proof 空间不存在）

**前置条件**：`frozen-*` 类 check 依赖**先跑过一次 `oxn proof run <name>`** —— 没跑过就报 `no-frozen` 并 exit 1。

**典型嵌入 proof.oxn**（来自 `skill-workflow-proven`）：
```oxn
probe "p5-frozen-readonly-444" {
  ref "@oxn/probes/shell-exec"
  params {
    command = "bash scripts/proof-helpers/proof-self-check.sh skill-workflow-proven frozen-readonly-444",
    timeout = "5000"
  }
}
```

---

## 何时用哪个？决策树

```
我要改 domain 文件
  ├─ 是合并/拆分？
  │   └─ YES → 用 domain-merge-check.py（一次性 + 1 个新 probe 永久）
  └─ 是改 term/invariant/ban 增删？
      └─ NO tool，直接 $EDITOR 改

OXN 升级/CLI 改动
  ├─ 改了 proof 链路？
  │   └─ YES → 跑 proof-self-check.sh（看是否需要新 check）
  └─ 没动 proof 链路？
      └─ 不需要
```

## 添加新 helper

1. 放在 `scripts/proof-helpers/`
2. 文件头 5 行内必须有 `# 名称:` / `# 职责:` / `# 何时用:` / `# 何时不用:`
3. 在本 README 加一节
4. **不加 unit test**（proof 端到端已覆盖；helper 逻辑简单）
