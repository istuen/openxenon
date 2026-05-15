# Arsenal（资产库）

Arsenal 是存储所有可复用工程资产的仓库。

## 定义

Arsenal 存放由工程师定义、经审查确认的标准化资产，包括：

- Blueprint（蓝图）
- Stage（工序）
- Probe（探针）

## 目录结构

```
.openxenon/
└── arsenals/
    ├── probes/
    │   ├── fs_exists/
    │   │   └── probe.yaml
    │   ├── fs_match/
    │   │   └── probe.yaml
    │   └── shell_exec/
    │       └── probe.yaml
    │
    ├── stages/
    │   └── build/
    │       └── stage.yaml
    │
    └── blueprints/
        └── deploy-service/
            └── blueprint.yaml
```

## DRAFT / CANONICAL 生命周期

所有 Arsenal 资产必须经过两态生命周期：

```
DRAFT ──[oxn arsenal promote]──▶ CANONICAL
(草稿)                           (正式版)
```

| 状态 | 含义 | 可用性 |
|------|------|--------|
| DRAFT | AI 通过 Forge 生成，待审查 | 不可被任务引用 |
| CANONICAL | 工程师审查通过，已转正 | 可被任务引用 |

### 流程

```bash
# 1. AI 通过 Forge 生成 Draft
oxn forge probe --save '<yaml>' --name my-check

# 2. 工程师审查
oxn arsenal inspect probes/my-check

# 3. 转正为 Canonical
oxn arsenal promote probes/my-check
```

## 内置资产

OpenXenon 编译时将内置资产打包进二进制，随处可用：

```bash
# 查看内置资产
oxn arsenal list
```

内置资产包括：

- `fs_exists` - 检查文件是否存在
- `fs_not_exists` - 检查文件不存在
- `fs_match` - 检查文件内容匹配
- `shell_exec` - 执行命令检查退出码

## 项目级 vs 全局级

| 层级 | 路径 | 用途 |
|------|------|------|
| 项目级 | `.openxenon/arsenals/` | 项目特定资产 |
| 全局级 | `~/.openxenon/arsenals/` | 跨项目共享资产（0.2） |

## 资产化价值

- **可积累**：好的资产可沉淀为团队规范
- **可复用**：资产可跨项目、跨任务复用
- **可版本化**：资产可纳入 Git 管理
