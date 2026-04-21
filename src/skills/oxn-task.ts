import type { XenonixSkill } from './types'
import type { Step } from '../types/blueprint'
import type { Blueprint } from '../types/blueprint'

export const oxnTaskSkill: XenonixSkill = {
  id: 'oxn-task',
  description: '发起 Xenonix 任务，依据 Target State 拆解并提交 Blueprint',
  instruction: `# \`/oxn-task\` — 发起 Xenonix 任务

## 行为约束

当你收到 \`/oxn-task <需求>\` 指令时，必须严格按以下步骤执行，禁止自由发挥。

## 步骤 1：获取 Core 通信地址

在终端执行以下命令获取 Core 引擎的当前通信地址：

\`\`\`bash
oxn api base
\`\`\`

该命令会返回一个地址（如 \`http://127.0.0.1:8420\`）。
你必须在后续所有请求中使用此地址。**绝对禁止自行编造地址或端口号。**

## 步骤 2：申请可用探针与空白 Blueprint

向 Core 发起 GET 请求：

\`\`\`bash
curl -s $(oxn api base)/api/v1/proofs/list
\`\`\`

该请求返回当前项目可用的 Proof 探针列表。

## 步骤 3：拆解任务

基于用户需求和返回的探针列表，按照 Target State 理念拆解任务：

1. 确定最终目标状态（Target State）
2. 逆向推导所需的中间步骤
3. 为每个步骤绑定合适的 Proof 探针

## 步骤 4：提交 Blueprint

将填充好的 Blueprint 提交给 Core 进行预验证：

\`\`\`bash
curl -s -X POST $(oxn api base)/api/v1/task/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_path": "<当前项目绝对路径>",
    "blueprint": {
      "task": "<任务描述>",
      "steps": [
        {
          "id": "step_1",
          "name": "<步骤名称>",
          "spec": "<约束规范>",
          "proof": "<探针名称>"
        }
      ]
    }
  }'
\`\`\`

## 步骤 5：处理预验证结果

- 若返回 \`PREVALIDATED\`：进入执行循环，开始执行第一个 Step
- 若返回 \`REJECTED\`：依据 error 信息修正 Blueprint 后重新提交

## 绝对禁止

- 禁止跳过任何步骤
- 禁止修改上述 URL 拼接逻辑
- 禁止在未通过 Core 验证的情况下自行推进任务
`,
  examples: {
    playbook_step: {
      id: 'step_1',
      name: '定义数据模型',
      spec: '必须使用 TypeScript 接口定义 User 类型',
      proof: 'fs-content-match',
    } as Step,
    target_state: {
      type: 'file_content',
      path: 'src/types/user.ts',
      must_contain: 'export interface User',
    },
  },
}
