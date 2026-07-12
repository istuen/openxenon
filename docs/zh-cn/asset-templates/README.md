# Asset 模板库（v0.6.1-alpha.1+）

> **本目录是 Asset Paper Schema 的 4 个模板**，配合 [v0.6.1-alpha.1](../../.openxenon/pools/sprints/v0.6.1-alpha.1/) 分支落地。
> **v0.6.1-alpha.1 目标**：把 Asset 从"规则堆砌"升级为"论文式结构 + 引用机制"。
> **v0.3+ 格式**：所有模板采用 MD-native 格式（`.md`）。

## 4 个模板

| 模板 | 路径 | 用途 | AssetKind |
|---|---|---|---|
| **Domain** | [`domain.md`](./domain.md) | 业务限界上下文（term / ban / invariant）| `domain` |
| **Blueprint** | [`blueprint.md`](./blueprint.md) | 技术流程（slot DAG）| `blueprint` |
| **Stack** | [`stack.md`](./stack.md) | 技术栈约束（runtime / linter / test）| `stack` |
| **Roadmap** | [`roadmap.md`](./roadmap.md) | Asset 导航图（核心常读 / 按需加载 / 近期变更）| `roadmap`（**v0.6.1-alpha.1 新增**）|

## 4 字段 Asset Paper Schema

每个模板都包含 4 个**Asset Paper 字段**（v0.6.1-alpha.1 引入）：

| 字段 | 用途 | Roadmap 特殊 |
|---|---|---|
| `abstract` | 论文摘要（人类可读）| ✅ 必填 |
| `references[]` | 依赖的 Asset ID 列表（DAG 校验）| ❌ **空**（不参与 DAG）|
| `citations` | 被引用次数（Engine 自动维护）| ✅ 仍维护 |
| `auditTrail[]` | 版本历史（论文修改记录）| ✅ 必填 |

**Roadmap 特殊设计**（按用户最新指示）：
- ❌ `references[]` **留空**（避免循环 DAG 校验）
- 📌 body 内含 Asset 路径/链接（人工维护或后续解析器）
- 📌 仅 Roadmap 类型适用此规则（Domain/Blueprint/Stack 走完整 references[]）

## 使用方法

### 1. 复制模板
```bash
cp docs/zh-cn/asset-templates/domain.md .openxenon/assets/domain/MyDomain.md
```

### 2. 替换占位符
```markdown
# 替换：
- name: <name>        → name: MyDomain
- version: 0.1.0      → version: 1.0.0

# 填充 abstract
abstract: |
  替换为你的项目描述
```

### 3. 验证 + 锁
```bash
oxn domain validate MyDomain
oxn work lock my-work
```

## 后续工作计划

| 阶段 | 任务 | 版本 |
|---|---|---|
| ✅ Batch 1 | 4 模板（骨架 + 1 示例）| v0.6.1-alpha.1 |
| ✅ Batch 2 | AssetKind 扩展 + OXL grammar + Asset Paper 4 字段 schema | v0.6.1-alpha.1 |
| 🔜 Batch 3 | MD-native 模板迁移（.md 完成）| v0.6.1-alpha.1 |
| 🔜 Batch 4 | 引用计数算法 + DAG 校验 | v0.6.1-alpha.1 |
| 🔜 Batch 5 | CLI 扩展（`oxn asset graph` 等）| v0.6.1-alpha.1 |
| 🔜 Batch 6 | 测试 + 文档 | v0.6.1-alpha.1 |

详见 [v0.6.1-alpha.1 plan](#)。

## English Version

See [`docs/en/asset-templates/`](../../en/asset-templates/README.md) for English templates.

## 参考

- [Asset Paper Schema · 资产论文结构](../asset-paper.md) — 完整论文结构说明
- [v0.6.3 Asset Paper Schema RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft
- [ADR-0048 library/external 子目录方案](../../.openxenon/docs/adrs/0048-asset-library-external-scheme.md)
- [ADR-0051 Asset-as-Paper 论文结构 + 引用计数 + DAG](../../.openxenon/docs/adrs/0051-asset-paper-citation-network.md)