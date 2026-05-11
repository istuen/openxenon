# 4. CLI 命令参考

## oxn init

初始化项目，在当前目录创建 `.openxenon` 围栏。

```bash
oxn init
```

## oxn daemon

管理全局 Core 引擎的生命周期。

```bash
oxn daemon start   # 启动 daemon
oxn daemon stop    # 停止 daemon
oxn daemon status  # 查看状态
```

## oxn task

任务管理命令的入口。

```bash
oxn task <subcommand>
```

### oxn task submit

提交 Blueprint 创建任务。

```bash
oxn task submit --blueprint <file>
```

**参数：**

- `--blueprint <file>`：Blueprint YAML 文件路径（必需）

### oxn task next

获取当前 Task 下一个待执行的 Stage。

```bash
oxn task next --task-id <id>
```

**参数：**

- `--task-id <id>`：任务 ID（必需）

### oxn task verify

提交 Stage 验证。

```bash
oxn task verify --task-id <id> --stage-id <id>
```

**参数：**

- `--task-id <id>`：任务 ID（必需）
- `--stage-id <id>`：Stage ID（必需）

### oxn task status

获取任务状态。

```bash
oxn task status --task-id <id>
```

**参数：**

- `--task-id <id>`：任务 ID（必需）

## oxn arsenal

标准资产管理命令的入口。

```bash
oxn arsenal <subcommand>
```

### oxn arsenal list

列出标准资产。

```bash
oxn arsenal list [DRAFT|CANONICAL]
```

**参数：**

- 可选：`DRAFT` 或 `CANONICAL` 筛选状态

**输出示例：**

```
## PROBES
  [CANONICAL] fs_exists
  [CANONICAL] fs_content_match
  [CANONICAL] exec_exit_zero

## PROOFS
  [DRAFT] laravel_install_proof

## STAGES
  [CANONICAL] build_stage

Total: 6 assets
```

### oxn arsenal inspect

查看标准资产内容。

```bash
oxn arsenal inspect <asset-path>
```

**参数：**

- `asset-path`：资产路径（如 `arsenal/proofs/DRAFT/my-proof.yaml`）

**输出示例：**

```
# laravel_install_proof
Type: proofs
State: DRAFT
Path: /home/user/.openxenon/arsenal/proofs/DRAFT/laravel_install_proof.yaml

--- Content ---
name: laravel_install_proof
description: 验证 Laravel 安装成功
target: Laravel 框架已成功安装
proofs:
  - check_composer_json
  - check_vendor_exists
```

### oxn arsenal promote

将 DRAFT 资产转正为 CANONICAL。

```bash
oxn arsenal promote <asset-path>
```

**参数：**

- `asset-path`：DRAFT 资产路径

**输出示例：**

```
Asset promoted successfully!
  Name: laravel_install_proof
  Type: proofs
  New State: CANONICAL
  New Path: /home/user/.openxenon/arsenal/proofs/CANONICAL/laravel_install_proof.yaml
```

### oxn arsenal search

搜索标准资产。

```bash
oxn arsenal search <query>
```

### oxn arsenal export

导出标准资产。

```bash
oxn arsenal export <asset-path>
```

### oxn arsenal import

导入标准资产。

```bash
oxn arsenal import <file>
```

### oxn arsenal migrate

迁移资产格式。

```bash
oxn arsenal migrate
```

## oxn forge

锻造 Draft 标准资产。

```bash
oxn forge [probe|proof|stage|blueprint] --save <yaml> --name <name>
```

**参数：**

- `type`（可选）：元 Forge 类型，不指定则显示所有
- `--save <yaml>`：直接保存 YAML 内容
- `--name <name>`：资产名称
- `--global`：保存到全局 Arsenal

**示例：**

```bash
# 显示所有元 Forge
oxn forge

# 生成 Probe 定义
oxn forge probe --save 'type: fs_exists
description: "检查文件存在"
parameters:
  - name: path
    type: string
    required: true
    description: "文件路径"' --name check-file
```

## oxn export

导出数据。

```bash
oxn export
```

## oxn gc

清理垃圾数据。

```bash
oxn gc
```

## 全局选项

| 选项 | 描述 |
|------|------|
| `-v, --verbose` | 启用详细输出 |
| `-j, --json` | 以 JSON 格式输出 |

## 下一章

下一章将介绍 [Arsenal 资产生成](./05-arsenal.md)。