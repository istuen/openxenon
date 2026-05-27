# /oxn-plan — 规划模式

## 目标
使用 oxn work 命令执行规划流程，通过 analyze → design → estimate → review 阶段完成规划。

## 前置条件
- 必须在 OXN 项目根目录下执行
- 禁止在未创建 work 前进行操作

## 执行步骤

### 步骤 1: 创建规划 Work
执行命令: `oxn work init "{{PLAN_NAME}}" --type plan --blueprint plan-flow --json`
- **判断逻辑:**
  - 如果返回 `status: "created"`: 进入步骤 2
  - 如果返回 `error_code: "ALREADY_EXISTS"`: 提示规划 Work 已存在
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 2: 获取下一个 Part
执行命令: `oxn work next --work-id "{{PLAN_NAME}}" --type plan --json`
- **判断逻辑:**
  - 如果返回包含 `part_id`: 进入步骤 3
  - 如果返回 `message: "No more parts"`: 告知用户规划已完成
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 3: 执行 Part
根据返回的 part 执行相应工作：

#### Analyze Slot
收集需求信息和约束条件，编辑 `.openxenon/plans/{{PLAN_NAME}}/requirements.md`。

#### Design Slot
进行技术方案设计，编辑 `.openxenon/plans/{{PLAN_NAME}}/design.md`。

#### Estimate Slot
评估工作量和资源需求，编辑 `.openxenon/plans/{{PLAN_NAME}}/estimate.md`。

#### Review Slot
最终评审确认，编辑 `.openxenon/plans/{{PLAN_NAME}}/review.md`。

- **判断逻辑:**
  - 如果当前 Slot 是 analyze: 收集需求信息
  - 如果当前 Slot 是 design: 进行技术方案设计
  - 如果当前 Slot 是 estimate: 评估工作量
  - 如果当前 Slot 是 review: 进行最终评审
  - 如果文件编辑成功: 进入步骤 4
  - 禁止跳过 analyze 直接进行 design
  - 禁止未完成 estimate 直接进行 review

### 步骤 4: 验证 Part
执行命令: `oxn work verify --work-id "{{PLAN_NAME}}" --part-id "{{PART_ID}}" --json`
- **判断逻辑:**
  - 如果返回 `status: "verified"`: 进入步骤 5
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 5: 循环直到完成
重复步骤 2-4，直到所有 part 通过验证。
- **判断逻辑:**
  - 如果还有更多 Part: 返回步骤 2
  - 如果所有 Part 完成: 告知用户规划完成，结束 Skill

## 熔断退出流程
如果你在任何步骤被要求"熔断退出":
1. 立即停止执行任何 `oxn` 命令
2. 写入错误日志: `.openxenon/error/skills/<date>-oxn-plan-<step>.md`
3. 严格按照以下格式输出报告:

## 🚨 OXN 执行异常报告
**当前执行的 Skill**: oxn-plan
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
- PLAN_NAME: 规划名称，建议用 kebab-case
- PART_ID: 从步骤 2 获取的 Part ID

## 参考
需要 Blueprint 详细格式说明时，读取：
- references/blueprint-format.md：Blueprint 格式说明 + 命令用法 + 完整示例

## 绝对禁止
- 禁止在未创建 work 前进行操作
- 禁止跳过 analyze 直接进行 design
- 禁止未完成 estimate 直接进行 review