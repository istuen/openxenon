# 4. Arsenal 资产生成流程

## 概述

OpenXenon 通过 Draft/CANONICAL 两态生命周期管理标准资产。标准资产可以是 Probe、Proof 或 Stage。

## 流程总览

```
工程师意图 (自然语言)
        │
        ▼
    /oxn-forge
        │
        ▼
    AI 降维生成 YAML
        │
        ▼
    Kernel Schema 校验
        │
        ▼
    物理落盘到 DRAFT 目录
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
    资产转正到 CANONICAL
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
/oxn-forge 帮我写一个检查文件是否存在 Probe
```

AI 会生成类似以下的 YAML：

```yaml
type: fs_exists
description: "检查文件是否存在"
parameters:
  - name: path
    type: string
    required: true
    description: "要检查的文件路径"
```

#### 生成 Proof

```
/oxn-forge 写一个验证 Laravel 安装成功的 Proof
```

AI 会生成类似以下的 YAML：

```yaml
name: laravel_install_proof
target:
  description: "验证 Laravel 安装成功"
spec:
  description: "Laravel 框架已成功安装"
probes:
  - ref: check_composer_json
    description: "检查 composer.json 存在"
  - ref: check_vendor_exists
    description: "检查 vendor 目录存在"
```

#### 生成 Stage

```
/oxn-forge 创建一个安装 Laravel 的 Stage
```

AI 会生成类似以下的 YAML：

```yaml
id: install-laravel
name: install_laravel
description: "安装 Laravel 项目骨架"
proof: laravel_install_proof
deps: []
```

## 资产生成约束

AI 在生成资产时必须遵守以下约束：

1. **只生成 DRAFT 状态**：所有 AI 生成的资产都进入 DRAFT 目录
2. **不执行任何逻辑**：Draft 阶段不做物理验证
3. **符合 Zod Schema**：生成的 YAML 必须符合类型定义
4. **原子化 Probe**：每个 Probe 只做单一检查

## 审查与确权

AI 生成 Draft 资产后，会输出以下提示：

```
已生成 Draft Proof：laravel_install_proof
路径：.openxenon/arsenal/proofs/DRAFT/laravel_install_proof.yaml
请使用 'oxn arsenal inspect' 查看内容，确认后使用 'oxn arsenal promote' 转正。
```

### 查看资产

```bash
oxn arsenal inspect arsenal/proofs/DRAFT/laravel_install_proof.yaml
```

### 转正资产

```bash
oxn arsenal promote arsenal/proofs/DRAFT/laravel_install_proof.yaml
```

## Probe 设计原则

### 单一职责

每个 Probe 只执行单一类型的检查：

| Probe 类型 | 检查内容 |
|------------|----------|
| `fs_exists` | 文件是否存在 |
| `fs_content_match` | 文件内容是否匹配正则 |
| `exec_exit_zero` | 命令退出码是否为 0 |

### 组合使用

多个 Probe 可以组合成一个 Proof：

```yaml
name: laravel_install_proof
target:
  description: "验证 Laravel 安装成功"
spec:
  description: "Laravel 框架已成功安装"
probes:
  - ref: check_composer_json
    description: "检查 composer.json 存在"
  - ref: check_laravel_dependency
    description: "检查包含 laravel 依赖"
  - ref: check_vendor_exists
    description: "检查 vendor 目录存在"
```

## 目录结构

标准资产在 `.openxenon/arsenal/` 下按类型和状态组织：

```
.openxenon/
└── arsenal/
    ├── probes/
    │   ├── DRAFT/
    │   │   └── (AI 生成的 Probe)
    │   └── CANONICAL/
    │       ├── fs_exists.yaml
    │       ├── fs_content_match.yaml
    │       └── exec_exit_zero.yaml
    ├── proofs/
    │   ├── DRAFT/
    │   └── CANONICAL/
    └── stages/
        ├── DRAFT/
        └── CANONICAL/
```

## 最佳实践

1. **先有 Probe，后有 Proof**：先创建原子化 Probe，再组合成 Proof
2. **先有 Proof，后有 Stage**：Stage 引用已存在的 Proof
3. **先有 Stage，后有 Blueprint**：Blueprint 选择需要的 Stage
4. **审查后再 promote**：不要跳过 `oxn arsenal inspect` 步骤

## 迁移现有资产

如果已有其他来源的 Probe/Proof/Stage，可以通过以下方式纳入管理：

1. 手动创建 DRAFT 目录下的 YAML 文件
2. 使用 `oxn arsenal inspect` 验证内容
3. 使用 `oxn arsenal promote` 转正

## 下一章

下一章将介绍[故障排查](./05-troubleshooting.md)。