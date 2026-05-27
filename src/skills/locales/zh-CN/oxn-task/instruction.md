# /oxn-task — 发起 OpenXenon 任务

## 目标
依据 Target State 拆解并提交 Blueprint，创建任务后逐步执行直到完成验证。

## 前置条件
- 必须在 OXN 项目根目录下执行
- 必须已经完成了代码修改和本地验证

## 执行步骤

### 步骤 1: 初始化项目围栏
执行命令: `oxn init --json`
- **判断逻辑:**
  - 如果返回 `status: "success"`: 进入步骤 2
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 2: 列出可用资产
执行命令: `oxn arsenal list --json`
- **判断逻辑:**
  - 如果返回包含 `assets` 数组: 进入步骤 3
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 3: 创建任务
执行命令: `oxn task new "{{TASK_ID (kebab-case)}}" --name "{{TASK_NAME}}" --blueprint "{{BLUEPRINT_NAME}}" --json`
- **判断逻辑:**
  - 如果返回 `status: "created"`: 进入步骤 4
  - 如果返回 `error_code: "ALREADY_EXISTS"`: 提示任务已存在
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 4: 拆解任务
基于用户需求和可用资产列表，按照 Target State 理念拆解任务：
1. 确定最终目标状态（Target State）
2. 逆向推导所需的中间 Part slot
3. 为每个 Part 选择合适的 Probe
- **判断逻辑:**
  - 如果拆解成功: 进入步骤 5
  - 如果无法拆解: 进入【 熔断退出流程】

### 步骤 5: 编辑 task.oxn（如需要）
如果需要填充 Blueprint 中的 slot，编辑 `.openxenon/tasks/{{TASK_ID}}/task.oxn`：
```oxn
work "{{TASK_NAME}}" type "task" ref "@prj/blueprints/{{BLUEPRINT_NAME}}" {
  part slot "develop" { }
}
```
- **判断逻辑:**
  - 如果文件编辑成功: 进入步骤 5.1
  - 如果无法编辑: 进入【 熔断退出流程】

### 步骤 5.1: 创建任务描述文档
在提交前，先创建任务描述文档 `.openxenon/tasks/{{TASK_ID}}/task.md`：
```markdown
# {{TASK_NAME}}

## 目标
[工程师期望达成的最终状态]

## 背景
[为什么需要这个任务，有什么约束条件]

## 执行计划
[拆解的 Part slot 列表和各自目标]

## 验收标准
[工程师如何判断任务成功完成]
```
- **判断逻辑:**
  - 如果文件创建成功: 进入步骤 6
  - 如果无法创建: 进入【 熔断退出流程】

### 步骤 6: 提交任务
执行命令: `oxn task submit --task-id "{{TASK_ID}}" --json`
- **判断逻辑:**
  - 如果返回 `status: "success"`: 进入步骤 7
  - 如果返回 `error_code: "CONFLICT"`: 执行 `oxn task pull --task-id "{{TASK_ID}}" --json` 覆盖本地后重试
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 7: 获取下一个 Part
执行命令: `oxn task next --task-id "{{TASK_ID}}" --json`
- **判断逻辑:**
  - 如果返回包含新的 `part_id`: 告知用户已获取 Part，进入步骤 8
  - 如果返回 `message: "No more tasks"`: 告知用户任务全部完成，结束 Skill
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 8: 执行并验证
1. AI 执行 Part 定义的工作
2. 执行完成后，提交验证：
执行命令: `oxn task verify --task-id "{{TASK_ID}}" --part-id "{{PART_ID}}" --json`
- **判断逻辑:**
  - 如果返回 `status: "verified"`: 进入步骤 9
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 9: 循环直到完成
重复步骤 7-8，直到所有 Part 通过验证。
- **判断逻辑:**
  - 如果还有更多 Part: 返回步骤 7
  - 如果所有 Part 完成: 告知用户任务完成，结束 Skill

## 熔断退出流程
如果你在任何步骤被要求"熔断退出":
1. 立即停止执行任何 `oxn` 命令
2. 写入错误日志: `.openxenon/error/skills/<date>-oxn-task-<step>.md`
3. 严格按照以下格式输出报告:

## 🚨 OXN 执行异常报告
**当前执行的 Skill**: oxn-task
**失败的步骤**: [步骤编号及描述]
**执行的命令**: `[实际执行的完整命令]`
**CLI 返回的错误 JSON**:
```json
[原样粘贴 CLI 的 --json 输出]
```
**AI 的初步分析**: [1-2 句话客观描述]
**建议工程师操作**: [具体建议]

4. 询问工程师:"是否需要我尝试其他操作，还是您将手动介入?"

## 变量定义
- TASK_ID: 必须 kebab-case，如 my-task-001
- TASK_NAME: 人类可读名称，建议用中文
- BLUEPRINT_NAME: Blueprint 名称，如 new-task-flow
- PART_ID: 从步骤 7 获取的 Part ID

## 参考
需要 Blueprint 详细格式说明时，读取：
- references/blueprint-format.md：格式说明 + 命令用法 + 完整示例

## 绝对禁止
- 禁止跳过任何步骤
- 禁止使用 HTTP/curl 调用，必须使用 CLI 命令
- 禁止在未通过 Core 验证的情况下自行推进任务