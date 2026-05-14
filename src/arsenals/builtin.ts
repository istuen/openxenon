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

export const BUILTIN_FORGES = {
  'meta-probe': {
    name: 'meta-probe',
    description: '锻造 Draft Probe 的元 Forge',
    stages: [{
      id: 'generate-probe',
      name: '生成 Probe',
      target: { description: 'Probe YAML 文件', glob: '**/*.yaml' },
      spec: {
        description: '验证 Probe YAML 结构',
        constraints: [
          'YAML 必须符合 ProbeDefinitionSchema',
          'type 必须是 fs_exists / fs_not_exists / fs_match / shell_exec 之一',
          '必须有 description 字段',
          'parameters 中每个参数必须有 description',
          'required 参数必须标记 required: true'
        ]
      },
      probes: [
        { type: 'fs_exists', params: { pattern: '**/*.yaml' } }
      ]
    }]
  },
  'meta-stage': {
    name: 'meta-stage',
    description: '锻造 Draft Stage 的元 Forge',
    stages: [{
      id: 'generate-stage',
      name: '生成 Stage',
      target: { description: 'Stage YAML 文件', glob: '**/*.yaml' },
      spec: {
        description: '验证 Stage YAML 结构',
        constraints: [
          'YAML 必须符合 StageDefinitionSchema',
          '必须有 id（kebab-case）、name、description',
          '必须包含 target.description 和 spec.description',
          'probes 必须是数组（可选）',
          'deps 只能引用已定义的 Stage id'
        ]
      },
      probes: [
        { type: 'fs_exists', params: { pattern: '**/*.yaml' } }
      ]
    }]
  },
  'meta-blueprint': {
    name: 'meta-blueprint',
    description: '锻造 Blueprint 的元 Forge',
    stages: [{
      id: 'generate-blueprint',
      name: '生成 Blueprint',
      target: { description: 'Blueprint YAML 文件', glob: '**/*.yaml' },
      spec: {
        description: '验证 Blueprint YAML 结构',
        constraints: [
          '必须有 name 或 id',
          'stages 不能为空',
          '每个 stage 必须有 id 和 name 或 ref',
          'deps 必须形成 DAG'
        ]
      },
      probes: [
        { type: 'fs_exists', params: { pattern: '**/*.yaml' } }
      ]
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
export type BuiltinStageName = keyof typeof BUILTIN_STAGES