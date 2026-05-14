export const BUILTIN_PROBES = {
  'fs_exists': {
    type: 'fs_exists' as const,
    description: '检查指定 glob 模式的文件是否存在',
    parameters: [
      { name: 'pattern', type: 'string', required: true, description: 'glob 模式，如 src/**/*.ts 或 package.json' }
    ]
  },
  'fs_not_exists': {
    type: 'fs_not_exists' as const,
    description: '检查指定 glob 模式的文件是否不存在',
    parameters: [
      { name: 'pattern', type: 'string', required: true, description: 'glob 模式，文件不应存在' }
    ]
  },
  'fs_match': {
    type: 'fs_match' as const,
    description: '检查文件内容是否匹配指定模式',
    parameters: [
      { name: 'path', type: 'string', required: true, description: '要检查的文件路径' },
      { name: 'pattern', type: 'string', required: true, description: '正则表达式匹配模式' }
    ]
  },
  'shell_exec': {
    type: 'shell_exec' as const,
    description: '检查 Shell 命令执行退出码是否为 0',
    parameters: [
      { name: 'command', type: 'string', required: true, description: '要执行的 Shell 命令' }
    ]
  }
} as const

export const BUILTIN_PROOFS = {
  'tests-pass': {
    target: { description: '测试套件全部通过' },
    spec: {
      description: 'pnpm test 退出码为 0，无失败用例',
      constraints: ['测试命令执行成功']
    },
    probes: [
      { ref: 'shell_exec', description: '验证测试命令执行成功' }
    ]
  },
  'build-succeeds': {
    target: { description: '项目构建成功' },
    spec: {
      description: 'pnpm build 退出码为 0',
      constraints: ['构建命令执行成功']
    },
    probes: [
      { ref: 'shell_exec', description: '验证构建命令执行成功' }
    ]
  },
  'typecheck-passes': {
    target: { description: 'TypeScript 类型检查通过' },
    spec: {
      description: 'pnpm typecheck 退出码为 0',
      constraints: ['类型检查无错误']
    },
    probes: [
      { ref: 'shell_exec', description: '验证类型检查执行成功' }
    ]
  }
} as const

export const BUILTIN_FORGES = {
  'meta-probe': {
    name: 'meta-probe',
    description: '锻造 Draft Probe 的元 Forge',
    stages: [{
      id: 'generate-probe',
      name: '生成 Probe',
      proof: {
        spec: {
          constraints: [
            'YAML 必须符合 ProbeDefinitionSchema',
            'type 必须是 fs_exists / fs_not_exists / fs_match / shell_exec 之一',
            '必须有 description 字段',
            'parameters 中每个参数必须有 description',
            'required 参数必须标记 required: true'
          ]
        }
      }
    }]
  },
  'meta-proof': {
    name: 'meta-proof',
    description: '锻造 Draft Proof 的元 Forge',
    stages: [{
      id: 'generate-proof',
      name: '生成 Proof',
      proof: {
        spec: {
          constraints: [
            'YAML 必须符合 ProofDefinitionSchema',
            '必须有 target.description',
            '必须有 spec.description',
            'probes 不能为空',
            'probes 中每个引用必须有 ref 和 description'
          ]
        }
      }
    }]
  },
  'meta-stage': {
    name: 'meta-stage',
    description: '锻造 Draft Stage 的元 Forge',
    stages: [{
      id: 'generate-stage',
      name: '生成 Stage',
      proof: {
        spec: {
          constraints: [
            'YAML 必须符合 StageDefinitionSchema',
            '必须有 id（kebab-case）、name、description、proof',
            'deps 只能引用已定义的 Stage id'
          ]
        }
      }
    }]
  },
  'meta-blueprint': {
    name: 'meta-blueprint',
    description: '锻造 Blueprint 的元 Forge',
    stages: [{
      id: 'generate-blueprint',
      name: '生成 Blueprint',
      proof: {
        spec: {
          constraints: [
            '必须有 name 或 id',
            'stages 不能为空',
            '每个 stage 必须有 name 和 proof',
            'deps 必须形成 DAG'
          ]
        }
      }
    }]
  }
} as const

export const BUILTIN_STAGES: Record<string, {
  id?: string
  name?: string
  description?: string
  params_schema?: {
    type: 'object'
    properties: Record<string, { type: string; default?: unknown; description?: string }>
    required?: string[]
    default?: Record<string, unknown>
  }
  target?: { description: string; glob?: string }
  spec?: { description: string; constraints?: string[] }
  action?: { instruction?: string; command?: string }
  probes?: Array<{ ref?: string; type?: string; params?: Record<string, unknown>; pattern?: string; command?: string }>
  deps?: string[]
}> = {}

export type BuiltinForgeName = keyof typeof BUILTIN_FORGES
export type BuiltinProbeName = keyof typeof BUILTIN_PROBES
export type BuiltinProofName = keyof typeof BUILTIN_PROOFS
export type BuiltinStageName = keyof typeof BUILTIN_STAGES