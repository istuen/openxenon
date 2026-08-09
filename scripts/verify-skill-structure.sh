#!/bin/bash
# verify-skill-structure — OpenCode Skill 加载验证脚本
#
# version: 0.7.5
# synced-at: 2026-08-09

set -e

echo "=== Skill Loading Verification Script (v2) ==="
echo ""

# Step 1: Backup
echo "[1/7] 备份当前 skills..."
cp -r .opencode/skills .opencode/skills.bak
echo "  ✓ 备份完成: .opencode/skills.bak/"

# Step 2: Check current structure
echo ""
echo "[2/7] 检查当前目录结构..."
if [ -f ".opencode/skills/oxn-forge/SKILL.md" ]; then
    echo "  ✓ oxn-forge/SKILL.md 已存在"
else
    echo "  ✗ oxn-forge/SKILL.md 不存在，需要先运行 skill-compiler"
    exit 1
fi
if [ -f ".opencode/skills/oxn-task/SKILL.md" ]; then
    echo "  ✓ oxn-task/SKILL.md 已存在"
else
    echo "  ✗ oxn-task/SKILL.md 不存在，需要先运行 skill-compiler"
    exit 1
fi
echo "  ✓ Skill 文件已是目录结构"

# Step 3: Create references directories
echo ""
echo "[3/7] 创建 references/ 目录..."
mkdir -p .opencode/skills/oxn-forge/references
mkdir -p .opencode/skills/oxn-task/references
echo "  ✓ references/ 目录创建完成"

# Step 4: Create registry.md
echo ""
echo "[4/7] 创建 registry.md (L1)..."
cat > .opencode/skills/registry.md << 'REGISTRY_EOF'
# OpenXenon Skills

## oxn-forge
锻造 Arsenal 资产。当用户需要创建或编辑 Probe/Blueprint 时使用。
触发：forge、创建探针、写 Blueprint、约束定义。
完整指令：.opencode/skills/oxn-forge/SKILL.md

## oxn-task
提交和管理任务。当用户需要创建任务或执行验证流程时使用。
触发：task、任务、提交、验证、下一步。
完整指令：.opencode/skills/oxn-task/SKILL.md

## oxn-init
初始化 OpenXenon 项目。当用户需要初始化或重新编译 Skills 时使用。
触发：init、初始化、开始新项目。

## oxn-status
查看项目和任务状态。当用户需要了解当前进度时使用。
触发：status、状态、进度。

## oxn-resume
恢复中断的任务。当用户需要继续之前的任务时使用。
触发：resume、继续、恢复。

## oxn-stop
停止当前任务。当用户需要中止任务时使用。
触发：stop、停止、中止。

## oxn-trace
导出和分析 task-trace。当用户需要查看详细执行记录时使用。
触发：trace、日志、导出、历史。
REGISTRY_EOF
echo "  ✓ registry.md 创建完成"

# Step 5: Create L3 resource files for oxn-forge
echo ""
echo "[5/7] 创建 L3 资源文件 (oxn-forge)..."

cat > .opencode/skills/oxn-forge/references/probe-format.md << 'PROBE_EOF'
# Probe 格式参考

## Forge 格式 vs Blueprint 格式（⚠️ 最常见的混淆）

Forge 定义的是"能力声明"（我需要什么参数）：
```yaml
type: fs_exists
description: "检查文件存在"
parameters:           ← 注意：是数组
  - name: pattern
    type: string
    required: true
```

Blueprint 定义的是"调用方式"（我传什么值）：
```yaml
type: fs_exists
params:               ← 注意：是对象
  pattern: "src/**/*.ts"
```

⚠️ `oxn forge probe -s` 用的是 Forge 格式，不是 Blueprint 格式！

## 各类型参数速查

### fs_exists
参数：pattern (string, required) — glob 模式

示例：
```yaml
type: fs_exists
description: "检查配置文件存在"
parameters:
  - name: pattern
    type: string
    required: true
    description: "要检查的文件 glob 模式"
```

### fs_not_exists
参数：pattern (string, required) — glob 模式

示例：
```yaml
type: fs_not_exists
description: "检查临时文件已清理"
parameters:
  - name: pattern
    type: string
    required: true
    description: "不应存在的文件模式"
```

### fs_match
参数：pattern (string, required) + contains (string, required)

示例：
```yaml
type: fs_match
description: "检查源码包含版权声明"
parameters:
  - name: pattern
    type: string
    required: true
    description: "文件路径"
  - name: contains
    type: string
    required: true
    description: "文件内容必须匹配的正则"
```

### shell_exec
参数：command (string, required)

示例：
```yaml
type: shell_exec
description: "执行 lint 检查"
parameters:
  - name: command
    type: string
    required: true
    description: "要执行的 shell 命令"
```

## ❌ 常见错误

1. **Forge 格式写成 Blueprint 格式**
   ```yaml
   # 错误
   type: fs_exists
   params: { pattern: "src" }

   # 正确
   type: fs_exists
   parameters: [{ name: pattern, type: string, required: true }]
   ```

2. **parameters 里的 name 和 type 写反**
   ```yaml
   # 错误
   parameters: [{ type: pattern, name: string }]

   # 正确
   parameters: [{ name: pattern, type: string }]
   ```

3. **忘了 required 字段**
   可选字段可以不写 required，但必填字段建议显式标注
PROBE_EOF

cat > .opencode/skills/oxn-forge/references/blueprint-format.md << 'BLUEPRINT_EOF'
# Blueprint 格式参考

## 基本结构

```yaml
name: <blueprint名称>
stages:
  - id: <stage唯一标识>
    name: <显示名称>
    target:
      description: "<目标描述>"
    action:
      description: "<动作描述>"
    probes:
      - ref: <探针类型>
        params:
          <探针参数>
    deps: [<依赖的stage id>]   # 可选
```

## 完整示例

```yaml
name: check-project-structure
stages:
  - id: check-package-json
    name: 检查 package.json
    target:
      description: "检查 package.json 存在"
    action:
      description: "确保项目根目录有 package.json"
    probes:
      - ref: fs_exists
        params:
          pattern: package.json
  - id: check-readme
    name: 检查 README
    target:
      description: "检查 README 存在"
    action:
      description: "确保项目有 README"
    probes:
      - ref: fs_exists
        params:
          pattern: README.md
  - id: check-lint
    name: 检查 lint 通过
    deps: [check-package-json]
    target:
      description: "检查 lint 通过"
    action:
      description: "运行 npm run lint"
    probes:
      - ref: shell_exec
        params:
          command: npm run lint
```

## probes 参数格式

⚠️ Blueprint 里的 probes 用的是 `params` 对象，不是 `parameters` 数组！

```yaml
fs_exists:    { pattern: "glob模式" }
fs_not_exists: { pattern: "glob模式" }
fs_match:     { pattern: "文件路径", contains: "正则" }
shell_exec:   { command: "shell命令" }
```

## deps 规则

- deps 是可选的，没有依赖的 stage 可以并行验证
- deps 里只能引用同 blueprint 内的 stage id
- 不能循环依赖（A→B→A）

## ❌ 常见错误

1. **probes 里用了 parameters 数组**
   ```yaml
   # 错误
   probes: [{ ref: fs_exists, parameters: [{name: pattern, type: string}] }]

   # 正确
   probes: [{ ref: fs_exists, params: { pattern: "src" } }]
   ```

2. **deps 引用了不存在的 stage id**
   确保 deps 里的每个 id 都在 stages 里有定义

3. **stage id 含空格或中文**
   stage id 只用小写字母、数字和连字符：check-readme, deploy-mysql
BLUEPRINT_EOF

cat > .opencode/skills/oxn-forge/references/stage-format.md << 'STAGE_EOF'
# Stage 格式参考

## Stage 结构

Stage 是 Blueprint 的执行单元，包含四个字段：

```yaml
id: <stage-id>
name: <stage名称>
target:
  description: "<目标描述>"
action:
  description: "<动作描述>"
probes:
  - ref: <探针类型>
    params:
      <探针参数>
deps: []
```

## Forge 格式（定义 Stage 元数据）

```yaml
id: <stage-id>
name: <stage名称>
description: "<stage描述>"
target:
  description: "<目标描述>"
action:
  description: "<动作描述>"
probes:
  - ref: <探针类型>
    params:
      <探针参数>
```

## Blueprint 格式（在 Blueprint 中引用 Stage）

Blueprint 里直接定义 stage，不需要单独的 Stage 资产。
详见 blueprint-format.md

## ❌ 常见错误

1. 在 Blueprint 里用了 Forge 的 parameters 格式
   Blueprint 用的是 `params`，不是 `parameters`
STAGE_EOF

echo "  ✓ oxn-forge references 创建完成"

# Step 6: Create L3 resource files for oxn-task
echo ""
echo "[6/7] 创建 L3 资源文件 (oxn-task)..."

cat > .opencode/skills/oxn-task/references/blueprint-format.md << 'TASK_BLUEPRINT_EOF'
# Blueprint 格式参考（oxn-task 用）

## 基本结构

```yaml
name: <blueprint名称>
stages:
  - id: <stage唯一标识>
    name: <显示名称>
    target:
      description: "<目标描述>"
    action:
      description: "<动作描述>"
    probes:
      - ref: <探针类型>
        params:
          <探针参数>
    deps: [<依赖的stage id>]   # 可选
```

## 完整示例

```yaml
name: deploy-mysql
stages:
  - id: prepare
    name: 准备环境
    target:
      description: "检查 MySQL 运行状态"
    action:
      description: "确认 Docker 中 MySQL 容器运行中"
    probes:
      - ref: shell_exec
        params:
          command: docker ps | grep mysql
  - id: deploy
    name: 部署 MySQL
    deps: [prepare]
    target:
      description: "检查 MySQL 数据目录"
    action:
      description: "确认 /data/mysql 目录存在"
    probes:
      - ref: fs_exists
        params:
          pattern: "/data/mysql"
```

## probes 参数速查

```yaml
fs_exists:    { pattern: "glob模式" }
fs_not_exists: { pattern: "glob模式" }
fs_match:     { pattern: "文件路径", contains: "正则" }
shell_exec:   { command: "shell命令" }
```

## 命令用法

### 提交任务
```bash
oxn task submit --blueprint <path-to-blueprint.yaml>
```

### 获取下一个 Stage
```bash
oxn task next --task-id <taskId>
```

### 验证 Stage
```bash
oxn task verify --task-id <taskId> --stage-id <stageId>
```

## Task 工作流

```
submit → next → execute → verify → (repeat until done)
```

1. submit：提交 Blueprint，创建任务
2. next：获取当前需要执行的 Stage
3. execute：AI 执行 Stage 定义的工作
4. verify：验证 Stage 是否通过
5. 循环直到所有 Stage 完成
TASK_BLUEPRINT_EOF

echo "  ✓ oxn-task references 创建完成"

# Show final structure
echo ""
echo "[7/7] 验证目录结构..."
echo "当前 .opencode/skills/ 结构："
find .opencode/skills -type f | sort

echo ""
echo "=========================================="
echo "验证环境已就绪！"
echo ""
echo "下一步：开一个新的 opencode 会话，执行测试："
echo ""
echo "测试 1: 调用 skill({ name: \"oxn-forge\" }) 后问："
echo "        \"帮我创建一个 fs_exists 探针\""
echo ""
echo "测试 2: 调用 skill({ name: \"oxn-task\" }) 后问："
echo "        \"Blueprint 格式是什么？给出完整示例\""
echo ""
echo "测试 3: 问 AI 能否读取 references/ 下的文件"
echo ""
echo "把 AI 的回答记录下来，然后运行："
echo "  ./scripts/restore-skills.sh"
echo "=========================================="