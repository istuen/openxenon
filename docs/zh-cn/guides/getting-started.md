# 快速开始

本文档帮助你在 5 分钟内跑通 OpenXenon 核心流程。

## 环境要求

- **Bun**: >= 1.0.0
- **pnpm**: >= 8.0.0

## 安装与构建

```bash
# 克隆仓库
git clone https://forgejo.isteed.dev/issac/openxenon.git
cd openxenon

# 安装依赖
pnpm install

# 构建
pnpm build
```

## 初始化项目

```bash
# 初始化项目围栏
./dist/oxn init

# 查看内置资产
./dist/oxn arsenal list
```

## 第一个任务

### 1. 构建 Probe 资产

```bash
# 查看 Probe 元 Forge 约束
./dist/oxn forge probe

# 保存一个简单的 Probe
./dist/oxn forge probe --save '
type: fs_exists
description: "检查文件是否存在"
parameters:
  - name: pattern
    type: string
    required: true
' --name check-file

# 转正为 Canonical
./dist/oxn arsenal promote probes/check-file
```

### 2. 编写 Blueprint

创建 `my-task.yaml`：

```yaml
name: 我的第一个任务
stages:
  - id: create-file
    name: 创建文件
    target:
      description: "在项目根目录创建 test.txt"
    action:
      description: "创建一个包含 Hello World 的文本文件"
    spec:
      description: "文件必须存在且内容正确"
    probes:
      - ref: check-file
        parameters:
          pattern: "test.txt"
```

### 3. 创建 Work

```bash
# 使用 Blueprint 创建 Work，Core 编译生成 Frozen 快照
./dist/oxn work new my-work --type task --blueprint new-task-flow

# 记录返回的 work-id
```

### 4. 模拟 AI 助手执行流程

```bash
# 模拟 AI 助手获取下一个 Part
./dist/oxn work resume my-work

# 手动创建 test.txt 文件（模拟 AI 助手构建 Artifact）
echo "Hello World" > test.txt

# 完成 Work
./dist/oxn work complete my-work
```

### 5. 查看结果

```bash
# 查看 Work 状态
./dist/oxn work list

# 导出执行轨迹
./dist/oxn export
```

## 下一步

- [核心概念](concepts/) - 深入理解 Blueprint/Stage/Probe/Artifact
- [CLI 参考](guides/cli-reference.md) - 完整命令文档
- [架构设计](architecture/) - 系统设计原理
