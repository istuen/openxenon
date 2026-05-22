import type { OpenXenonSkill } from './types'

export const oxnTraceSkill: OpenXenonSkill = {
  id: 'oxn-trace',
  description: '轨迹取证，查看任务执行案卷',
instruction: `# /oxn-trace — 查看任务轨迹

## 行为约束

当你收到 /oxn-trace 指令时，必须严格按以下步骤执行，禁止自由发挥。

## 步骤 1：请求任务轨迹

使用 CLI 命令获取任务轨迹：

\`\`\`bash
oxn export <任务ID>
# 或指定输出文件
oxn export <任务ID> -o task-trace.jsonl
\`\`\`

## 步骤 2：解读轨迹并报告

轨迹文件包含：

1. **任务元数据**：任务名称、开始时间、结束时间
2. **步骤记录**：每个步骤的执行状态、验证结果、时间戳
3. **验证详情**：每个 Proof 的执行结果和输出
4. **产物清单**：生成的 Artifact 列表

## 步骤 3：总结报告

向工程师提供简洁的执行总结：

\`\`\`
任务: <任务名称>
总耗时: <时长>
步骤: <N> 步骤完成
验证: <通过>/<总数> 通过
产物: <生成的文件列表>
\`\`\`

## 验证记录解读

- **passed**: 验证通过，产物合规
- **failed**: 验证失败，需人工确认
- **skipped**: 跳过验证（如 force-pass）

## 错误处理

- 如果任务未完成，提示工程师任务仍在进行中
- 如果没有任务，提示工程师先发起任务
`,
}