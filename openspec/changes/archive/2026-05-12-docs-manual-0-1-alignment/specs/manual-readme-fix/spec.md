# manual-readme-fix

## MODIFIED Requirements

### Requirement: 替换"工程化控制引擎"描述

**FROM:**

```markdown
OpenXenon 是一个面向大语言模型的工程化控制引擎，通过"综合集成研讨厅"模式实现人机协同。
```

**TO:**

```markdown
OpenXenon 是一个实验性框架，探索如何让工程师与 AI 更有效地协作。
```

### Requirement: 修正命令签名

**FROM:**

```markdown
# 2. 创建任务
oxn task new my-task

# 3. 提交任务
oxn task submit my-task
```

**TO:**

```markdown
# 2. 创建任务 Blueprint
#    编写 my-task.yaml 文件，定义 stages 和 proofs

# 3. 提交任务
oxn task submit --blueprint my-task.yaml
```

### Requirement: 替换"提交任务到 Core"

**FROM:**

```markdown
| `oxn task submit <id>` | 提交任务到 Core |
```

**TO:**

```markdown
| `oxn task submit --blueprint <file>` | 提交 Blueprint 创建任务 |
```
