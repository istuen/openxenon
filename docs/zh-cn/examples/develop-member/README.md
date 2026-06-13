# develop-member Work

> 端到端 Work 案例：单域完整开发。实现 Member 注册功能。

## 场景

实现新会员注册功能 + 单测 + 端到端验证。这是对**模式 2：单域多 part**的演示（1 task 多 part 对齐 blueprint 多 slot）。

## 文件

- `work.oxn` — Work 编排
- `tasks/register-member/task.oxn` — 注册会员任务（3 part：develop / test / verify）

## 跑通方式

```bash
cp -r .openxenon/works/develop-member .openxenon/works/
oxn work validate develop-member --json
oxn work lock develop-member --json
oxn work run develop-member --json
oxn work submit --work develop-member --task register-member --json
```

详见 [Recipes §2](../../recipes.md#recipe-2开发新功能)。
