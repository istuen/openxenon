# 4. Arsenal 资产生成流程

## 概述

OpenXenon 通过 Draft/Formal 两态生命周期管理标准资产。标准资产包括 Probe、Part、Blueprint 三种类型。

## 流程总览

```
工程师意图 (自然语言)
         │
         ▼
    /oxn-forge
         │
         ▼
    AI 根据约束生成 YAML
         │
         ▼
    Kernel Schema 校验
         │
         ▼
    保存到 Arsenal drafts/ 目录
         │
         ▼
    [阻断] 等待工程师审查
         │
         ▼
    oxn arsenal inspect
         │
         ▼
    oxn arsenal promote
         │
         ▼
    资产转正到 formal/ 目录
```

## /oxn-forge 指令

`/oxn-forge` 是 AI Skill 指令，用于通过自然语言生成标准资产。在 AI 助手中输入 `/oxn-forge <描述>` 即可触发。

### 使用方式

```
/oxn-forge <自然语言描述>
```

### 示例

#### 生成 Probe

```
/oxn-forge 帮我写一个检查文件是否存在的 Probe
```

AI 会生成类似以下的 YAML：

```yaml
type: fs_exists
description: "检查文件是否存在"
parameters:
  - name: pattern
    type: string
    required: true
    description: "glob 模式匹配文件路径"
```

#### 生成 Part

```
/oxn-forge 创建一个安装 Laravel 的 Part
```

AI 会生成类似以下的 YAML：

```yaml
name: install-laravel
_version: 1
target:
  description: "在项目中安装 Laravel"
action:
  description: "运行 composer install"
probes:
  - ref: fs_exists
    parameters:
      pattern: "vendor/laravel"
```

## 资产生成约束

AI 在生成资产时必须遵守以下约束：

1. **只生成 DRAFT 状态**：所有 AI 生成的资产都进入 drafts/ 目录
2. **不执行任何逻辑**：Draft 阶段不做物理验证
3. **符合 Zod Schema**：生成的 YAML 必须符合类型定义
4. **原子化 Probe**：每个 Probe 只做单一检查

## 审查与转正

AI 生成 Draft 资产后，会输出以下提示：

```
已生成 Draft Part：install-laravel
路径：.openxenon/arsenal/parts/drafts/install-laravel.oxn
请使用 'oxn arsenal inspect' 查看内容，确认后使用 'oxn arsenal promote' 转正。
```

### 查看资产

```bash
oxn arsenal inspect parts/install-laravel
```

### 转正资产

```bash
oxn arsenal promote parts/install-laravel
```

## Probe 设计原则

### 单一职责

每个 Probe 只执行单一类型的检查：

| Probe 类型 | 检查内容 |
|------------|----------|
| `fs_exists` | 文件是否存在 |
| `fs_match` | 文件内容是否匹配正则 |
| `shell_exec` | 命令退出码是否为 0 |

## Arsenal 物理结构

类型优先（Blueprint/Part/Probe），状态（drafts/formal）嵌套在类型内部：

```
.openxenon/arsenal/
├── blueprints/
│   ├── drafts/<name>/       ← Forge 产出
│   └── formal/<name>/      ← Promote 产出
├── parts/
│   ├── drafts/<name>.oxn
│   └── formal/<name>.oxn
└── probes/
    ├── drafts/<name>.oxn
    └── formal/<name>.oxn
```

## 最佳实践

1. **先有 Probe**：先创建原子化 Probe
2. **Part 使用 Probe**：Part 通过 probes 数组引用已有 Probe
3. **Blueprint 使用 Part**：Blueprint 选择需要的 Part
4. **审查后再 promote**：不要跳过 `oxn arsenal inspect` 步骤

## 迁移现有资产

如果已有其他来源的 Probe 或 Part，可以通过以下方式纳入管理：

1. 手动创建 drafts/ 目录下的 YAML 文件
2. 使用 `oxn arsenal inspect` 验证内容
3. 使用 `oxn arsenal promote` 转正

## 下一章

下一章将介绍[故障排查](./troubleshooting.md)。