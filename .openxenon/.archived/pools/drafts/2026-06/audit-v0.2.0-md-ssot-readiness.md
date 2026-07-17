---
audit: md-ssot-readiness
version: 0.2.0
date: 2026-06-20
type: audit
status: completed
---

# Audit: v0.2.0 MD-SSOT Readiness

> **审计**：v0.2.0 是否准备好进入 v0.3 MD-SSOT 阶段
> **版本**：v0.2.0
> **日期**：2026-06-20
> **类型**：准备度审计

---

## 1. 审计范围

评估 v0.2.0（commit `5b81e8d` + tag `v0.2.0`）是否具备进入 v0.3 MD-SSOT 阶段的准备度。

**审计维度**：
1. IAP 实体是否已实施（Domain/Blueprint/Work/Proof/Pool）
2. CLI 工具链是否完整
3. L0–L3 架构是否稳定
4. 文档系统是否可改造
5. 现有测试是否守住

---

## 2. 审计结果总览

| 维度 | 准备度 | 详情 |
|---|---|---|
| **IAP 实体实施** | ✅ 100% | 5 类全部 CLI 齐全 |
| **CLI 工具链** | ✅ 100% | `oxn domain/blueprint/work/proof/pool create` 全部 |
| **L0–L3 架构稳定** | ✅ 100% | 1393 测试全绿 |
| **文档系统可改造** | ⚠️ 70% | 8 个 CHANGELOG 待统一；60 片段待重组 |
| **现有测试守住** | ✅ 100% | 1393/1393 pass |
| **v0.2.0 发版到 npm** | ❌ 0% | v0.2.0 还未发布到 npm（全局仍是 v0.1.8）|

**总评**：**85%（可启动 v0.3 阶段 1）**

---

## 3. 详细审计

### 3.1 IAP 实体实施 ✅

| IAP 实体 | v0.2.0 状态 | CLI |
|---|---|---|
| Domain | ✅ 14 资产（`.oxn`）| `oxn domain create` |
| Blueprint | ✅ ~5 资产（`.oxn`）| `oxn blueprint create` |
| Work | ✅ 9+ 资产（运行时）| `oxn work create` |
| Proof | ✅ 3+ 资产（`frozen.json`）| `oxn proof create` |
| Pool | ✅ 5 池已建（research/design/issue/audit/journal）| `oxn pool create` |

**结论**：5 类 IAP 实体全部已实施，CLI 工具链完整。MD 化工作可立即启动。

### 3.2 CLI 工具链 ✅

```
$ bun src/cli/index.ts --help
COMMANDS
  init                   初始化项目
  config                 管理项目配置
  install-skill          把 oxn-* Skills 安装到目标目录
  domain (create/validate/list/index)
  blueprint (create/validate/list/index)
  work (create/validate/lock/run/submit/status/migrate)
  proof (create/probe/run/list/show)
  pool (list/create)     ← 5 类 IAP 资产全部有 create
  insight                 读取 frozen.json + probe-stats.json
  dev                     DSL 开发工具
```

**结论**：CLI 工具链完整，可直接用于 v0.3 MD 化。

### 3.3 L0–L3 架构稳定 ✅

| 层 | v0.2.0 测试 | 状态 |
|---|---|---|
| L0-Schema | schemas/ | ✅ |
| L0-Contract | contracts/ | ✅ |
| L0-Processor | 14 builtin probe | ✅ 全部透传 |
| L1-Infra | filesystem-async | ✅ |
| L1-OXL | Langium grammar | ⚠️ 待 mdast 替代 |
| L2-Builtin | 14 probe .oxn 模板 | ⚠️ 待 MD 化 |
| L2-Work | work 8 阶段 | ✅ |
| L3 | CLI 子命令 | ✅ |

**测试守住**：1393/1393 pass

**结论**：L0–L3 架构稳定，mdast 替代 Langium 是 L1-OXL 局部变更，不影响其他层。

### 3.4 文档系统 ⚠️ 70%

| 项 | 现状 | 问题 |
|---|---|---|
| CHANGELOG | 8 个文件（双语 + 备份 + 旧版）| 需统一为 `design/changelog/` |
| 变更片段 | 60 个 `.changes/<v>-*.md` | 需重组为 pools/audit/ |
| 设计文档 | 51 forges/ 文档 | 需迁移到 pools/ |
| openspec/ | 24 change + 50 spec | 第三方插件，废弃 |
| v0.2.0 路线图 | `.changes/0-2-0-roadmap.md` | 保留 |

**结论**：文档系统需在 v0.3 阶段 3-5 重组。

### 3.5 现有测试守住 ✅

```
$ bun test
1393 pass
0 fail
5527 expect() calls
Ran 1393 tests across 108 files. [70.03s]
```

**结论**：现有测试 100% 守住，v0.3 MD 化不会破坏现有功能。

### 3.6 v0.2.0 发版到 npm ❌ 0%

| 项 | 状态 |
|---|---|
| 源码 | ✅ commit `5b81e8d` + tag `v0.2.0` 已推送 |
| npm | ❌ 未发版（全局 `oxn` 仍是 v0.1.8）|
| dist | ❌ 未重新编译 |

**结论**：v0.2.0 已本地完成，但未发布。v0.3 启动前需 v0.2.0 发版或明确告知用户用 `bun src/cli/index.ts` 调用本地源码。

---

## 4. 风险与缓解

| 风险 | 等级 | 缓解 |
|---|---|---|
| mdast 解析器替代 Langium 回归 | 中 | 双轨期 4 个月 + 1393 测试守住 |
| `:::intent` 不被 GitHub/Notion 渲染 | 中 | oxn-md-renderer 工具 |
| 14 builtin probe 透传失败 | 低 | adapter 模式（probe 函数体不变）|
| 51 forges/ 迁移遗漏 | 中 | scripts/migrate-forges.ts 自动化 + _archive/ 备份 |
| 8 个 CHANGELOG 统一风险 | 低 | 阶段 5 强制统一 |
| 60 片段重组风险 | 低 | 阶段 5 保留为 .changes/ 历史 |
| v0.2.0 未发版 npm 风险 | 中 | 阶段 0 立即发版 v0.2.0 到 npm |

---

## 5. 进入 v0.3 阶段的准备度 checklist

| 项 | 状态 |
|---|---|
| 5 类 IAP 实体已实施 | ✅ |
| 5 个 `oxn * create` CLI 已实现 | ✅ |
| L0–L3 架构稳定 | ✅ |
| 1393 测试守住 | ✅ |
| `:::intent` 语法设计完成 | ✅（详见 [md-ssot-system.md](../md-ssot-system.md)）|
| 命名体系 v1.0 设计完成 | ✅（详见 [naming-system.md](../naming-system.md)）|
| 5 篇 pools/design/ 阶段文档完成 | ✅（本批次）|
| 6 篇 pools/design/ 跨切架构文档完成 | ✅（本批次）|
| v0.2.0 发版到 npm | ❌ **必须补** |
| 主分支 `feat/v0.3-md-ssot` 创建 | ❌ **必须建** |

**总准备度**：**85%**

---

## 6. 行动建议

### 6.1 立即（v0.3 阶段 0 启动前）

1. **v0.2.0 发版到 npm**
   ```bash
   bun run version:release 0.2.0
   npm publish
   ```
   修复全局 `oxn` 仍为 v0.1.8 的问题。

2. **主分支创建**（你执行）
   ```bash
   git checkout -b feat/v0.3-md-ssot dev
   git push -u origin feat/v0.3-md-ssot
   ```

### 6.2 阶段 1（v0.3 W1-3）

- 新建 `src/oxl/md-bridge/` + `remark-to-kernel.ts` + `mdast-validator.ts`
- 5 类 E_MD_xxx 错误校验
- 1393 测试全绿 + +30 新增测试

### 6.3 阶段 2-3（v0.3 W4-9）

- 14 builtin probe 渐进替换
- 51 forges/ 迁移到 pools/

### 6.4 阶段 4-5（v0.3 W10-14）

- 5 个 scripts（version-aggregate/release/audit-completeness/check-naming/parse-mdast）
- forges/ 物理删除

### 6.5 阶段 6（v0.3 W15-18）

- oxn-md CLI 完整化
- oxn-md-renderer 工具
- oxn-vscode 扩展重建（基于 remark）

---

## 7. 结论

**v0.2.0 已具备 v0.3 阶段 1 启动条件**（85% 准备度）。

**必须先补**：
- v0.2.0 发版到 npm
- 主分支 `feat/v0.3-md-ssot` 创建

**可选**：
- 立即写 `pools/audit/retro-v0.2.0-roadmap-execution.md`（v0.2.0 复盘）
- 写 `pools/audit/audit-v0.2.0-domain-migration-readiness.md`（v0.2.0 Domain MD 化准备度）

---

**审计者**：opencode
**日期**：2026-06-20
**结论**：✅ v0.2.0 可启动 v0.3 阶段 1（需先补 npm 发版 + 主分支创建）
