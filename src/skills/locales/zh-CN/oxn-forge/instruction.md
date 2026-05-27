# /oxn-forge — 锻造 Draft 标准资产

## 目标
通过自然语言生成 Draft 标准资产（Blueprint/Probe/Part）。

## 前置条件
- 必须在 OXN 项目根目录下执行

## 执行步骤

### 步骤 1: 解析意图
解析工程师的意图，确定要生成什么类型的资产：
- Blueprint（蓝图）：包含多个 Part slot 的完整流程定义
- Probe（探针）：单一检查，如"检查文件存在"、"检查命令执行成功"
- Part（零件）：包含 probes/execution 的可复用执行单元
- **判断逻辑:**
  - 如果能确定类型: 进入步骤 2
  - 如果无法确定: 询问工程师要生成什么类型的资产

### 步骤 2: 获取约束
执行命令: `oxn forge "{{ASSET_TYPE}}" --json`
- **判断逻辑:**
  - 如果返回包含 `constraints`: 进入步骤 3
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 3: 生成资产
根据工程师的需求和约束生成 HCL-like 语法资产。
- **判断逻辑:**
  - 如果生成成功: 进入步骤 4
  - 如果生成失败: 进入【 熔断退出流程】

### 步骤 4: 保存 Draft
执行命令: `oxn forge "{{ASSET_TYPE}}" --save '{{OXN_CONTENT}}' --name "{{ASSET_NAME}}" --json`
- **判断逻辑:**
  - 如果返回 `status: "saved"`: 进入步骤 5
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【 熔断退出流程】

### 步骤 5: 审查 Draft
执行命令: `cat .openxenon/forges/{{ASSET_TYPE}}/{{ASSET_NAME}}/draft.oxn`（读取文件内容）
将 Draft 内容转化为人类可读的摘要，向工程师展示：
- 资产类型和名称
- 主要参数和用途
- 判定逻辑说明
- **判断逻辑:**
  - 如果文件存在且可读: 显示摘要，进入步骤 6
  - 如果文件不存在或无法读取: 进入【 熔断退出流程】

### 步骤 6: 请求 Promote 确认
向工程师确认是否提升为正式资产：
> 审查完成后，是否提升为正式资产？
> 执行：`oxn arsenal promote "{{ASSET_TYPE}}/{{ASSET_NAME}}" --json`
- **判断逻辑:**
  - 如果工程师确认: 执行 promote 命令
  - 如果工程师拒绝: 结束 Skill

## 熔断退出流程
如果你在任何步骤被要求"熔断退出":
1. 立即停止执行任何 `oxn` 命令
2. 写入错误日志: `.openxenon/error/skills/<date>-oxn-forge-<step>.md`
3. 严格按照以下格式输出报告:

## 🚨 OXN 执行异常报告
**当前执行的 Skill**: oxn-forge
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
- ASSET_TYPE: 资产类型，可选值 probe、part、blueprint
- ASSET_NAME: 资产名称，建议用 kebab-case
- OXN_CONTENT: 生成的 OXN HCL 内容

## 参考
需要详细格式说明时，读取 references/ 下的文件：
- references/probe-format.md：Probe 格式说明 + 正误对比
- references/blueprint-format.md：Blueprint 格式说明 + 正误对比
- references/part-format.md：Part 格式说明 + 正误对比

## 约束
- 只生成 DRAFT 状态的资产（保存到 forges/ 目录）
- 不执行任何探针逻辑
- 确保 OXN/JSON 结构符合 Schema
- 审查阶段必须读取实际文件内容，不能假设