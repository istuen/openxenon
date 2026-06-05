# 快速开始

> 5 分钟跑通 OpenXenon v0.1 核心流程：Domain → Blueprint → Work → Task。

## 1. 环境要求

- **Bun** >= 1.0.0
- **pnpm** >= 8.0.0

## 2. 安装与构建

```bash
# 克隆仓库
git clone https://github.com/istuen/openxenon.git
cd openxenon

# 安装依赖
pnpm install

# 构建
pnpm build
```

## 3. 初始化项目

```bash
# 初始化项目边界
./dist/oxn init

# 查看内置资产
./dist/oxn dev arsenal list
```

输出示例：
```
项目初始化成功: my-project (locale: zh-CN)
✓ Created .openxenon/
✓ Created .openxenon/config.json
```

## 4. v0.1 五步跑通 Intent-Align 范式

### 步骤 1：定义 Domain（业务 Intent）

```bash
# 生成 Domain 骨架
./dist/oxn domain create --name MemberContext
# Created domain MemberContext at .openxenon/domains/member-context.oxn

# 编辑 .openxenon/domains/member-context.oxn
cat > .openxenon/domains/member-context.oxn <<'EOF'
domain "MemberContext" {
  description = "会员限界上下文"

  term {
    "Member":   "注册会员实体",
    "Register": "提交注册表单"
  }

  ban { "User", "Customer" }

  invariant { "密码任何时候都不能明文存储" }
}
EOF

# 校验
./dist/oxn domain validate --name MemberContext
# Domain MemberContext ✓ valid
```

### 步骤 2：准备 Blueprint（技术 Intent）

```bash
mkdir -p .openxenon/blueprints
cat > .openxenon/blueprints/dev-workflow.oxn <<'EOF'
blueprint "dev-workflow" {
  description = "开发工作流：构建 → 测试 → 验证"
  version = 1

  slot "build"  { deps = [] }
  slot "test"   { deps = ["build"] }
  slot "verify" { deps = ["test"] }
}
EOF
```

### 步骤 3：创建 Work（编排）

```bash
# 从 blueprint 生成 work 骨架
./dist/oxn work create --name onboarding

# 编辑 .openxenon/works/onboarding/work.oxn
cat > .openxenon/works/onboarding/work.oxn <<'EOF'
work "Onboarding" {
  context {
    goal = "完成新会员注册";
    constraints = [];
    loop_policy { max_iterations = 3 }
  }

  // 资源池
  domain "MemberContext"   ref "@prj/domains/MemberContext";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";

  // 任务编排
  task "RegisterMember" {
    domain "MemberContext";
    blueprint "dev-workflow";

    part "build" { skill_context = "实现 Member 注册" }
    part "test"  { skill_context = "写 Member 注册测试" }
    deps = [];
  }
}
EOF
```

### 步骤 4：创建 Task

```bash
# 每个 task 必须显式创建 task.oxn
./dist/oxn work add-task \
  --work-name onboarding \
  --task-name register-member \
  --blueprint dev-workflow \
  --domain MemberContext
```

会做：
- 校验 `--blueprint` 必须出现在 work.oxn 的 blueprint ref
- 校验 `--domain` 必须出现在 work.oxn 的 domain ref
- 生成 `.openxenon/works/onboarding/tasks/register-member/task.oxn`

### 步骤 5：获取 AI 上下文（全量隔离）

```bash
./dist/oxn work context --work onboarding --task register-member --json
```

返回示例：
```json
{
  "workspace": "onboarding",
  "task": "register-member",
  "blueprint": "dev-workflow",
  "injectedDomains": [
    { "name": "MemberContext", "language": { "terms": [{"name":"Member"}], "ban": ["User","Customer"] } }
  ],
  "allowedLanguage": {
    "mustUseNouns": ["Member"],
    "banned": ["User", "Customer"]
  },
  "taskParts": [
    { "name": "build", "skillContext": "..." },
    { "name": "test",  "skillContext": "..." }
  ],
  "isolationNotice": "本 task 只能看到 align 列表中的 domain"
}
```

### 步骤 6：AI 执行

在 AI 助手软件中：
1. 读取 `get-context` 输出
2. 严格遵守 `allowedLanguage`（必须用 `Member`、禁用 `User`）
3. 按 `taskParts` 顺序，写代码
4. 每个 part 完成后调用 `oxn work submit`

### 步骤 7：推进状态机

```bash
# 启动 workspace 状态机
./dist/oxn work run --work-file .openxenon/works/onboarding/work.oxn --json

# 推进 task 的当前 part
./dist/oxn work submit --work-name onboarding --task register-member --json

# 查看进度
./dist/oxn work status --work-name onboarding --json
```

### 步骤 8：审查 frozen.json

```bash
cat .openxenon/works/onboarding/tasks/register-member/frozen.json
```

输出：
```json
{
  "taskName": "register-member",
  "frozenAt": "2026-06-05T07:00:30Z",
  "verdict": "PASSED",
  "trace": ["build", "test"]
}
```

## 5. 端到端验证

```bash
# 查看完整 work
./dist/oxn work status --work-name onboarding --json
```

```json
{
  "workName": "onboarding",
  "workspace": { "status": "passed", "taskCount": 1 },
  "tasks": [
    { "taskName": "register-member", "status": "passed" }
  ]
}
```

## 6. 后续

- 跑完整示例：`src/oxn-dsl/examples/works/` 下的 onboarding / develop-member / fix-issue / explore-dsl
- 旧 work.oxn 迁移：`./dist/oxn work migrate`
- 自定义 Probe：手写 `.openxenon/arsenals/probes/<name>.oxn`，用 `./dist/oxn dev validate` 校验

## 7. 下一章

- [DDD 工作流](./ddd-workflow.md) — 端到端示例（onboarding / develop-member / fix-issue / explore-dsl）
- [故障排查](./troubleshooting.md)
