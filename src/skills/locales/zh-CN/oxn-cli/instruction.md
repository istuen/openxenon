---
name: oxn-cli
description: 统一的 OpenXenon CLI 操作入口，直接转发 CLI 命令
---
# /oxn-cli — 统一的 OpenXenon CLI 操作入口

## 目标
当用户输入自然语言请求时，将请求转换为 `oxn` CLI 命令并执行。用户也可以直接输入 `/oxn-cli <命令>` 跳过解析，直接转发。

## 前置条件
- `oxn` 命令已安装并可用
- Core daemon 已启动（如需要）

## 执行步骤

### 步骤 1: init — 初始化项目围栏
执行命令: `oxn init --json`
- **判断逻辑:**
  - 如果返回 `status: "success"`: 初始化成功，告知用户
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 2: status — 查看任务状态
执行命令: `oxn task status --task-id "{{TASK_ID}}" --json`
- **判断逻辑:**
  - 如果返回 `status: "found"`: 显示任务状态
  - 如果返回 `status: "not_found"`: 提示任务不存在
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 3: stop — 停止任务执行
执行命令: `oxn api task-stop --task-id "{{TASK_ID}}" --json`
- **判断逻辑:**
  - 如果返回 `status: "success"`: 停止成功
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 4: trace — 查看任务轨迹
执行命令: `oxn export "{{EXPORT_ID}}" --json`
- **判断逻辑:**
  - 如果返回包含 `trace`: 显示轨迹
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 5: arsenal list — 列出所有资产
执行命令: `oxn arsenal list --json`
- **判断逻辑:**
  - 如果返回包含 `assets` 数组: 显示资产列表
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 6: arsenal inspect — 查看单个资产
执行命令: `oxn arsenal inspect "{{ASSET_REF}}" --json`
- **判断逻辑:**
  - 如果返回包含 `asset`: 显示资产详情
  - 如果返回 `error_code: "NOT_FOUND"`: 提示资产不存在
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

## 熔断退出流程
如果你在任何步骤被要求"熔断退出":
1. 立即停止执行任何 `oxn` 命令
2. 写入错误日志: `.openxenon/error/skills/<date>-oxn-cli-<step>.md`
3. 严格按照以下格式输出报告:

## 🚨 OXN 执行异常报告
**当前执行的 Skill**: oxn-cli
**失败的步骤**: [步骤编号及描述]
**执行的命令**: `[实际执行的完整命令]`
**CLI 返回的错误 JSON**:
```json
[原样粘贴 CLI 的 --json 输出]
```
**AI 的初步分析**: [1-2 句话客观描述]
**建议工程师操作**: [具体建议]

4. 询问工程师:"是否需要我尝试其他操作，还是您将手动介入?"