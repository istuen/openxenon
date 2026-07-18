# onboarding Work

> 端到端 Work 案例：跨域编排。新会员注册 + 发放欢迎福利。

## 场景

新会员注册时同时需要操作 OrderContext，两个限界上下文协作。这是对**模式 4：跨域编排**的演示。

## 文件

- `work.md` — Work 编排（声明 MemberContext + OrderContext 两个 domain ref）
- `tasks/register-member/task.md` — 注册会员任务
- `tasks/grant-welcome-bonus/task.md` — 发放欢迎福利任务

## 跑通方式

```bash
# 1. 复制到项目
cp -r .openxenon/works/onboarding .openxenon/works/

# 2. 校验
oxn work validate onboarding --json

# 3. 锁定
oxn work lock onboarding --json

# 4. 运行
oxn work run onboarding --json

# 5. AI 执行并推进
oxn work submit --work onboarding --task register-member --json
oxn work submit --work onboarding --task grant-welcome-bonus --json
```

详见 [Recipes §3](../../recipes.md#recipe-3跨域编排)。
