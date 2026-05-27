## Why

README.md 已演进到 v0.1+ 版本，引入 Part/Work/Hall 等新概念和 L0-L3 四层架构，但 `docs/zh-cn/` 仍停留在 Stage/Task 旧术语体系且缺少架构宪法描述。两套文档描述不一致导致：
- 开发者阅读指南后无法对应到实际 CLI 命令
- 概念混淆影响资产构建和任务执行的正确理解
- 链接断裂使文档导航失效
- 缺失 L0-L3 架构导致新手无法建立整体认知

经代AI-1/2/3号三方审查，一致裁定：
- `stage.md` 必须重命名为 `part.md`
- `concepts.md` 必须补充 L0-L3 四层架构宪法
- Arsenal 物理结构为类型优先（Blueprint/Part/Probe），状态嵌套在类型内部（drafts/formal）

## What Changes

**术语同步**：
- `Stage` → `Part` (L2 资产单元)
- `Task` → `Work` (任务实例)
- 引入 `Hall` (研讨厅) 概念

**架构补全**：
- `concepts.md` 新增 L0-L3 四层架构宪法章节
- 补充 L0 Kernel (Schema/Contract/Processor) 纯真空说明
- 补充 L1 Foundation (OXN DSL/Infra) 双基座说明
- 补充 L2 Domain (Arsenal/Work) 领域说明
- 补充 Blueprint.type 与 Work.type 强绑定说明

**结构修复**：
- 重命名 `stage.md` → `part.md`（三方一致裁定）
- 修复 `README §9` 文档链接，添加 `zh-cn/` 前缀
- 修复 `docs/zh-cn/architecture/` 内部错误链接
- 更新 `guides/development.md` 目录结构描述

**Arsenal 物理结构同步**：
- 类型优先（Blueprint/Part/Probe），状态嵌套（drafts/formal）
- 路径示例：`arsenal/parts/drafts/Nginx.oxn` → `arsenal/parts/formal/Nginx.oxn`

## Capabilities

### New Capabilities
- `docs-zhcn-sync`: 同步 docs/zh-cn 文档与 README.md 版本对齐

### Modified Capabilities
- (无 spec 级行为变化，纯文档修复)

## Impact

- `docs/zh-cn/architecture/concepts.md` — 术语同步 + L0-L3 架构新增
- `docs/zh-cn/architecture/stage.md` → `docs/zh-cn/architecture/part.md` — 重命名
- `docs/zh-cn/architecture/blueprint.md` — stages[] → parts[] + type 绑定说明
- `docs/zh-cn/guides/getting-started.md` — 补命令 + 修复链接
- `docs/zh-cn/guides/development.md` — 目录结构修正
- `docs/zh-cn/architecture/intro.md` — 修复内部链接
- `docs/zh-cn/architecture/lifecycle.md` — Task → Work + 修复链接
- `docs/zh-cn/guides/arsenal-guide.md` — 物理结构同步
- `docs/zh-cn/architecture/arsenal.md` — 物理结构同步
- `README.md` — §9 链接添加 zh-cn 前缀