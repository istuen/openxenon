# Examples

> 4 个端到端 Work 案例，可直接 fork 改写。每个目录包含 work.oxn + tasks/*/task.oxn。

| 目录 | 场景 | 模式 | 复杂度 |
|---|---|---|---|
| [onboarding/README.md](./onboarding/README.md) | 跨域编排：新会员注册 + 发放福利 | 多 domain 协作 | ★★☆ |
| [develop-member/README.md](./develop-member/README.md) | 单域开发：实现 Member 注册 | 单 domain 多 part | ★☆☆ |
| [fix-issue/README.md](./fix-issue/README.md) | 故障修复：诊断 → 定位 → 修复 → 验证 | 多 task 串行 | ★★☆ |
| [explore-dsl/README.md](./explore-dsl/README.md) | 探索分析：摸清 DSL 模块结构 | 单 task 反馈 | ★☆☆ |

## 使用方式

```bash
# 1. 从 examples 复制到你的项目
cp -r docs/examples/develop-member .openxenon/works/

# 2. 校验
oxn work validate develop-member --json

# 3. 锁定
oxn work lock develop-member --json

# 4. 运行
oxn work run develop-member --json

# 5. AI 执行并推进
oxn work submit --work develop-member --task register-member --json
```
