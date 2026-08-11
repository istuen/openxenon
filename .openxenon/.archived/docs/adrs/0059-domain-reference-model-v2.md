---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0059: Domain 引用模型 v2

<!-- allow-version -->
> **状态**：🟢 Accepted（v0.7 RFC §10 同步拍板）
> **日期**：2026-07-16
> **来源**：[v0.7-domain-hierarchy-restructure-rfc §10](../../rfcs/v0.7-domain-hierarchy-restructure-rfc.md)
<!-- /allow-version -->
> **影响层**：L1-OXL（AssetFrontmatter schema）+ L2-Engine（Domain transformer）+ L3（oxn CLI）

## 背景

<!-- allow-version -->
v0.7 RFC §3 决定采用"三层 Domain 架构"（oxn-domain root + 2 个 package Domain + 4 个 module Domain），但未明确 references / citations / composes 等 frontmatter 字段的精确语义。本 ADR 收紧这些语义，解决三个具体问题：
<!-- /allow-version -->

1. **oxn-domain 与 sub-Domain 间的引用方向**：root 应该引用 sub（top-down），还是 sub 引用 root（bottom-up）？
2. **Domain 引用是否与论文引用同语义**：Domain 可拆分/合并/重写，与论文不可改写矛盾。
3. **AI Agent 主入口诉求**：oxn-domain 作为主入口应能自给自足，AI Agent 读完 root 就懂全貌。

## 决策

### D1：references 字段方向不变（sub → root）

`references` 是硬依赖 DAG，B 缺失则 A 编译失败。方向保持 sub → root：

```yaml
# oxn-domain.md
references: []                # root 自给自足

# oxn-work-domain.md
references: [oxn-domain, oxn-engine-domain, oxn-asset-domain]
```

理由：
- 反转（root → sub）会形成循环（A → B → A），违反 inv-5 AssetDAG 无环约束。
- sub → root 方向与 Asset 拆分语义兼容（root 不被 sub 重构绑架）。
- Domain 的"基础"是抽象定义（root term），sub→root 表达"sub 的具体 term 来自 root 的抽象定义"。

### D2：term 级 MD 链接代替 composes 字段

不新增 `composes` 字段。改用 term desc 里的 markdown 链接表达"该 term 有专门的子 Domain"：

```md
### Work
- desc: 人机协作的工作空间。E2 工程实现见 [`oxn-work-domain`](./oxn-work-domain.md)。
```

规则：
- 仅在该 term 有专属 module 子 Domain 时添加链接（6 个 term 满足：OXN CLI / OXN Engine / Asset / Work / Proof / Insight）
- 链接语法：标准 markdown `[`text`](./oxn-domain.md)`，target 是同目录下另一个 Domain 文件
- 链接方向：root → sub（"详见子 Domain"），与 references 方向互补
- **D2 约束（2026-07-17 修订）**：term desc MD link 仅允许 **root → sub 单向**表达 has sub-Domain；禁止 sub → root（与 references frontmatter 重复）和 sub ↔ sub（造成双向耦合、违反 Domain 视角隔离）。已有 sub → root / sub ↔ sub MD link 在本次修订中删除。

理由：
- 单一 SSOT（链接只在 desc 中写一次，不重复）
- 比 `composes` 字段更直观（desc 上下文自带语义）
- Wiki 风格有机链接网络
- root Domain 文件本身保持"我有哪些子 Domain"的可读性，无需运行 `oxn domain show` 即可通过 desc MD link 静态发现子 Domain

### D3：自动 backlinks

OXN engine 扫描所有 Domain 文件，**双向**构建 backlink 索引（不存储在文件里，运行时计算）：

```bash
$ oxn domain show oxn-work-domain

Referenced by (backlinks, 双源 union):
  # sub → root 反向：扫描所有子 Domain 的 references frontmatter
  - oxn-domain.md                    # oxn-work-domain.references 含 oxn-domain
  - oxn-engine-domain.md             # oxn-work-domain.references 含 oxn-engine-domain
  - oxn-asset-domain.md              # oxn-work-domain.references 含 oxn-asset-domain
  # root → sub 反向（仅当 root 自己使用此功能时）：
  - (root Domain 无 references 字段时此项空)

Terms linking out:
  - 无（sub Domain desc 不嵌 MD link，避免双向耦合）
```

**D3 算法（2026-07-17 修订）**：

1. **sub → root 反向**：扫描所有非 root Domain 的 references frontmatter，对每个被引 Domain 反向建索引（"哪些 Domain 在 references 里列了我"）
2. **root → sub 反向**：扫描 root Domain（如 oxn-domain）的 desc MD link，反向建索引（"root 主动点名了哪些子 Domain"）
3. 两组取 union 后输出 backlinks 索引

理由：
- 不要求手写双向链接（避免失去层级关系）
- backlinks 由 engine 派生，自然形成 wiki 式双向感受
- 不参与 DAG 校验（仅展示用途）
- 双向扫描兼顾 root→sub 显式导航 + sub→root DAG 反查

### D4：Domain 引用与论文引用的差异

论文引用与 Domain 引用虽都用"reference"术语，但语义不同：

| 维度 | 论文引用 | Domain 引用 |
|---|---|---|
| 不可变性 | 论文发表后不可改 | Domain 可拆分/合并/重写 |
| 引用方向 | A 引 B = A 基于 B（B 是基础） | A 引 B = A 依赖 B 编译（DAG 语义） |
| 被引越多 = | 价值越大、适用性越广 | 影响半径（但可能意味着即将拆分） |
| 时间维度 | 单调累积 | 动态重构 |
| 审计模型 | 引用即永久证据 | 引用是可重写工程关系 |

具体后果：
- `citations` 字段在 Domain 语境下是"当前影响半径"，不是"价值评分"
- Domain 拆分时，原 citations 不自动迁移到新 Domain
- 引用图是版本化快照（每次 auditTrail 记录事件）

### D5：Domain 拆分流程（5 步）

场景：oxn-work-domain（16 term）拆为 oxn-work + oxn-round + oxn-task。

```
Step 1：子域新建
  - oxn-round-domain.md: references=[oxn-domain, oxn-engine-domain]（继承父域去掉自身）
  - oxn-task-domain.md: references=[oxn-domain, oxn-engine-domain, oxn-asset-domain]

Step 2：term 物理迁移
  - 父域删除迁移的 term
  - 子域写入迁移的 term + desc

Step 3：父域 stub 化（可选）
  父域保留迁移走的 term 名作为 stub，desc 改为指向新子域：
  ### Round
  - desc: 已拆分到 [oxn-round-domain.Round](./oxn-round-domain.md#round)

  或父域直接删除迁移走的 term（不可逆，一般不推荐）

Step 4：审计记录（强制）
  父域 auditTrail:
    - event: split
      date: 2026-XX-XX
      newChildren: [oxn-round-domain, oxn-task-domain]
      movedTerms: [Round, BirthCert, ...]

  子域 auditTrail:
    - event: splitFrom
      parent: oxn-work-domain
      date: 2026-XX-XX

Step 5：composes 等价物由 MD 链接自动维护
  其他 Domain 的 desc 里指向父域 term 的 MD 链接：
  - 自动跟随 term 移动重写（工具辅助）
  - 或保持指向父域 stub（不立即改写，渐进迁移）
```

### D6：Domain 合并流程（D5 逆操作）

合并 = 拆分逆过程：

```
Step 1：源 Domain stub 化或标记 mergedFrom
Step 2：新 Domain 创建，references 取并集，auditTrail 起始 event: mergedFrom
Step 3：term 物理合并
Step 4：citations 相加（保留历史，不重置）
Step 5：MD 链接指向源 Domain 的条目渐进更新到新 Domain
```

### D7：citations 处理（拆分/合并时不自动迁移）

| 对象 | 拆分/合并前 | 拆分/合并后 |
|---|---|---|
| 父/源 Domain | N | **保留 N**（历史） |
| 子/新 Domain | — | 从 0 起 |

引用方（其他 Domain）的 references 字段**不自动改写**——保持指向原 Domain，靠 stub term 渐进迁移。

## 影响

| 模块 | 改动 |
|---|---|
| `AssetFrontmatter` schema | 不变（不加 composes；references 字段保留） |
| `domain-validate` | 不变 |
| Domain transformer | **可选**增强：扫描 desc 里的 MD 链接，构建 backlink 索引（下次 PR） |
| `oxn domain show` | **可选**增强：显示 backlinks（下次 PR） |
| `oxn domain split` / `merge` | 新 CLI 命令（未来 PR） |

## 兼容性

- 现有 7 个新 Domain 的 references 字段已是 sub→root，无需改动
- 现有 7 个新 Domain 的 desc 里的 "详见 oxn-domain.XXX" 链接保留
- 旧 17 个 Domain（带 migration banner）的 references 字段保留原状

## 验证

- `bun scripts/validate-dependencies.ts`：7 个新 Domain 的 references 仍构成无环 DAG
- `oxn domain validate oxn-domain`：通过（无 references 字段，DAG 校验空集）
- GitHub outline 仍能看到完整 H1/H2/H3 层级
- MD 链接渲染正确（GitHub/Obsidian/VSCode）

## 后续工作

1. **阶段 2（本次）**：RFC §10 + 本 ADR + oxn-domain.md 重构（term desc 加 MD 链接）
2. **阶段 3（下次）**：Domain transformer 实现 backlinks 索引；`oxn domain show` 显示 backlinks
3. **阶段 4（未来）**：`oxn domain split` / `merge` CLI 命令实现；oxn-work-domain 实际拆分

## 与其他 ADR/RFC 的关系

- **ADR-0051 Asset-as-Paper**：保留 Asset = 论文结构的语义（abstract/references/citations/auditTrail 4 字段）。本 ADR 是其补充：说明 Domain 不是论文，引用图可变
- **ADR-0054 三边界框架**：不受影响
- **md-native-grammar-rfc**：不受影响（本 ADR 不改 MD 语法）
<!-- allow-version -->
- **v0.7-domain-hierarchy-restructure-rfc §10**：本 ADR 是其细化与执行约束
<!-- /allow-version -->
