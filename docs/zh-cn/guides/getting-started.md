# 快速开始

> v0.1 起，OpenXenon 引入 DDD 双层架构。本文档同时覆盖**传统资产流程**与 **v0.1 Domain/Task 流程**。

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

## v0.1 流程：Domain + Task 演示

> 5 步跑通 DDD 双层架构的核心能力——Domain 定义 + Work 编排 + Task 注入 + 上下文隔离。

### 1. 定义一个 DDD Domain

```bash
# 生成 Domain 骨架
./dist/oxn domain new --name MemberContext
# 输出: Created domain MemberContext at .openxenon/domains/member-context.oxn

# 编辑 .openxenon/domains/member-context.oxn，填写 language
cat > .openxenon/domains/member-context.oxn <<'EOF'
domain "MemberContext" {
  description = "会员限界上下文"
  language {
    noun "Member" desc "注册会员实体"
    verb "Register" desc "提交注册表单"
    ban = ["User", "Customer"]
  }
  domain_rules {
    rule "PasswordNeverPlaintext" desc "密码任何时候都不能明文存储"
  }
}
EOF

# 校验
./dist/oxn domain validate --name MemberContext
# Domain MemberContext ✓ valid
```

### 2. 准备一份 Blueprint

```bash
mkdir -p .openxenon/blueprints
cat > .openxenon/blueprints/dev-workflow.oxn <<'EOF'
blueprint "dev-workflow" {
  version = 1
  description = "开发工作流"
  slot "develop" { }
  slot "test" { deps = ["develop"] }
}
EOF
```

### 3. 编写 work.oxn 编排

```bash
mkdir -p .openxenon/works/onboarding
cat > .openxenon/works/onboarding/work.oxn <<'EOF'
work "Onboarding" {
  context {
    goal = "完成新会员注册";
    constraints = [];
    loop_policy { max_iterations = 3 }
  }
  use_domain "MemberContext";
  use_blueprint "dev-workflow";
  task "Register" align "MemberContext.Register" {
    deps = []
  }
}
EOF
```

### 4. 创建 task（绑 1 Blueprint + 注入 1 Domain）

```bash
./dist/oxn work task new \
  --work onboarding \
  --task register \
  --blueprint dev-workflow \
  --inject MemberContext
# 输出: Created task register in work Onboarding at .openxenon/works/onboarding/tasks/register/task.oxn
```

### 5. 获取 AI 上下文（**全量隔离**）

```bash
./dist/oxn get-context --work onboarding --task register
# 输出包含:
#   - Injected Domains (isolated): MemberContext
#   - Allowed Language: Nouns (must use): Member
#   - 本 task 只能看到 inject 列表中的 domain，work 中其他 domain 一律不可见。
```

---

## 传统流程：资产 + Work 演示

> v0.0.x 兼容路径。如果不需要 DDD 隔离，可继续走这条路。

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

# 转正为 Formal
./dist/oxn arsenal promote probes/check-file
```

### 2. 编写 Blueprint

创建 `my-task.oxn`：

```oxn
blueprint "my-task" {
  version = 1
  description = "我的第一个任务"
  slot "create-file" { }
  slot "verify-file" { deps = ["create-file"] }
}
```

### 3. 创建 Work

```bash
# v0.0.x 路径（type 锁定）
./dist/oxn work new my-work --type task --blueprint my-task

# v0.1 路径（work.oxn 已存在则直接 run）
./dist/oxn leader new --name my-work --blueprint-file .openxenon/blueprints/my-task.oxn
```

### 4. 模拟 AI 助手执行流程

```bash
# 启动 work 状态机
./dist/oxn leader run --work-file .openxenon/works/my-work/work.oxn

# 推进 part
./dist/oxn leader submit --work-name my-work
```

### 5. 查看结果

```bash
# 查看 Work 状态
./dist/oxn leader status --work-name my-work

# 打开研讨厅 (Hall)
./dist/oxn hall
```

---

## v0.1 迁移工具（升级既有项目）

如果你的项目里已经有旧版 work 空间（`work/task/<name>.oxn` 或单层 state.json），需要运行：

```bash
# 预览
./dist/oxn work migrate --dry-run

# 实际迁移
./dist/oxn work migrate
```

迁移会：
- 把 `work/task/<name>.oxn` 改造为 `works/<name>/work.oxn`
- 把 `task "X" use "..."` 改写为 `task "X" blueprint "..."`
- 把单层 `state.json` 拆为 workspace 级 + 单一 task 级

## 下一步

- [核心概念](../architecture/concepts.md) - 深入理解 Domain/Blueprint/Task/Work
- [DDD 双层架构](../architecture/ddd-dual-layer.md) - v0.1 架构详解
- [CLI 参考](./cli-reference.md) - 完整命令文档
- [架构设计](../architecture/) - 系统设计原理