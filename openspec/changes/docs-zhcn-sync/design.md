## Context

README.md 已更新到 v0.1+ 版本，但 `docs/zh-cn/` 存在两大类问题：
1. **术语断层**：Stage/Task vs Part/Work/Hall
2. **架构缺失**：缺少 L0-L3 四层架构宪法描述

审查意见（代AI-1/2/3号）一致裁定：
- `stage.md` 必须重命名为 `part.md`
- `concepts.md` 必须补充 L0-L3 架构章节
- Arsenal 物理结构为类型优先（Blueprint/Part/Probe），状态嵌套在类型内部

## Goals / Non-Goals

**Goals:**
- 术语同步：Stage→Part, Task→Work，补充 Hall
- 架构补全：新增 L0-L3 四层架构宪法描述
- 链接修复：修复所有断裂的文档链接
- 结构同步：更新目录结构描述（类型优先，状态嵌套）

**Non-Goals:**
- 不修改 docs/en/（英文文档独立演进）
- 不修改代码实现

## Decisions

### D1: 术语映射规则

| 旧术语 | 新术语 | 影响文件 |
|--------|--------|---------|
| Stage | **Part** | concepts.md, stage.md→part.md, blueprint.md, arsenal-guide.md |
| Task | **Work** | concepts.md, lifecycle.md, getting-started.md |
| (无) | **Hall** (研讨厅) | concepts.md 需补充 |
| stages[] | **parts[]** | blueprint.md |

### D2: 文件更新顺序

按依赖关系排序：

```
1. concepts.md         — 核心概念，引入 Part/Work/Hall + L0-L3 架构
2. stage.md → part.md  — 重命名，内容更新为 Part 描述
3. blueprint.md        — stages[] → parts[]
4. intro.md            — 修复内部链接
5. lifecycle.md        — 修复内部链接，Task → Work
6. getting-started.md  — 补命令 + 修复链接
7. development.md      — 修复目录结构
8. README.md §9        — 添加 zh-cn 前缀
```

### D3: stage.md 必须重命名

三方审查一致裁定：`stage.md` 必须重命名为 `part.md`。

理由：
- 代码已全面使用 Part，文档文件名还叫 stage.md 会造成新开发者极度困惑
- OpenXenon 处于 0.x 阶段，外部引用极少，重命名代价最低
- 旧路径可保留重定向文件：`stage.md` → 内容为 `// ⚠️ 已迁移至 part.md`

### D4: L0-L3 架构宪法必须补入

`concepts.md` 必须新增一节描述四层架构：

```
L0 - Kernel (核心真空层)
    Schema    ← 数据契约定义
    Contract  ← 外部接口（由 L1 实现注入）
    Processor ← 纯逻辑推演，零 IO

L1 - Foundation (基座层)
    OXN DSL   ← 领域语言：Grammar/Parser/Validator
    Infra     ← 宿主适配：FsPort/PathPort/ProbePort

L2 - Domain (领域层)
    Arsenal   ← 资产域：Blueprint/Part/Probe + Forge/Promote
    Work      ← 执行域：Task/Plan/Explore（与 Blueprint.type 强绑定）

L3 - Runtime (应用层)
    CLI/Daemon/Skill/Hall
```

### D5: Arsenal 物理结构（类型优先，状态嵌套）

```
.openxenon/arsenal/
├── blueprints/
│   ├── drafts/<name>/       ← Forge 产出
│   └── formal/<name>/       ← Promote 产出
├── parts/
│   ├── drafts/<name>.oxn
│   └── formal/<name>.oxn
└── probes/
    ├── drafts/<name>.oxn
    └── formal/<name>.oxn
```

类型是第一级分类维度，状态嵌套在类型内部。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 术语混用 | 确保每个文件内部术语一致，完成后 grep 验证 |
| 链接遗漏 | 按清单逐一验证 |

## Open Questions

（已解决）
- `stage.md` 重命名 → **必须执行**（三方一致）
- Arsenal 物理结构 → **类型优先，状态嵌套**（已裁决）