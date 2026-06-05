export const BUILTIN_PROBES = {
  fs_exists: {
    type: 'fs_exists' as const,
    description: '检查指定 glob 模式的文件是否存在',
    props: [
      { name: 'pattern', type: 'string', required: true, description: 'glob 模式，如 src/**/*.ts 或 package.json' },
    ],
  },
  fs_not_exists: {
    type: 'fs_not_exists' as const,
    description: '检查指定 glob 模式的文件是否不存在',
    props: [{ name: 'pattern', type: 'string', required: true, description: 'glob 模式，文件不应存在' }],
  },
  fs_match: {
    type: 'fs_match' as const,
    description: '检查文件内容是否匹配指定模式',
    props: [
      { name: 'path', type: 'string', required: true, description: '要检查的文件路径' },
      { name: 'pattern', type: 'string', required: true, description: '正则表达式匹配模式' },
    ],
  },
  shell_exec: {
    type: 'shell_exec' as const,
    description: '检查 Shell 命令执行退出码是否为 0',
    props: [{ name: 'command', type: 'string', required: true, description: '要执行的 Shell 命令' }],
  },
} as const

export const BUILTIN_PARTS: Record<
  string,
  {
    id?: string
    name?: string
    description?: string
    _version?: number
    props?: {
      type: 'object'
      properties: Record<string, { type: string; default?: unknown; description?: string }>
      required?: string[]
      default?: Record<string, unknown>
    }
    target?: { description: string; glob?: string }
    spec?: { description: string; constraints?: string[] }
    action?: { instruction?: string; command?: string }
    probes?: Array<{
      ref?: string
      type?: string
      params?: Record<string, unknown>
      pattern?: string
      command?: string
    }>
    deps?: string[]
  }
> = {
  'git-commit': {
    id: 'git-commit',
    name: 'Git Commit',
    _version: 1,
    description: '提交代码到 Git 仓库，验证 commit message 引用当前 feature',
    target: { description: '代码已提交到 Git' },
    spec: {
      description: 'git commit 执行成功，commit message 包含 feature 引用',
      constraints: ['必须包含 {@feature_ref} 引用'],
    },
    action: {
      instruction: '提交代码改动',
      command: 'git add -A && git commit -m "feat(${feature_ref}): ${message}"',
    },
    props: {
      type: 'object',
      properties: {
        feature_ref: { type: 'string', description: 'Feature 引用（如 branch name 或 ticket ID）' },
        message: { type: 'string', description: 'Commit message 描述', default: 'update' },
      },
      required: ['feature_ref'],
    },
    probes: [
      {
        type: 'shell_exec',
        command: "git log -1 --pretty=%s | grep -q '${feature_ref}'",
      },
    ],
  },
  'create-branch': {
    id: 'create-branch',
    name: 'Create Branch',
    _version: 1,
    description: '从 main 分支创建新 feature 分支',
    target: { description: '新分支已创建并切换' },
    spec: {
      description: '创建并切换到 ${branch_name} 分支',
      constraints: ['分支名必须是 kebab-case', '从 main 分支创建'],
    },
    action: {
      instruction: '创建并切换到新分支',
      command: 'git checkout main && git pull && git checkout -b ${branch_name}',
    },
    props: {
      type: 'object',
      properties: {
        branch_name: { type: 'string', description: '新分支名称 (kebab-case)' },
      },
      required: ['branch_name'],
    },
    probes: [{ type: 'shell_exec', command: "git branch --show-current | grep -q '${branch_name}'" }],
  },
  'develop-feature': {
    id: 'develop-feature',
    name: 'Develop Feature',
    _version: 1,
    description: '执行开发任务并通过测试验证',
    target: { description: '功能代码已编写并通过测试' },
    spec: {
      description: '完成代码编写并通过 build + test',
      constraints: ['代码必须通过 build', '代码必须通过 test'],
    },
    action: {
      instruction: '编写功能代码实现 {@feature_desc}',
    },
    props: {
      type: 'object',
      properties: {
        feature_desc: { type: 'string', description: '功能描述' },
        cwd: { type: 'string', description: '工作目录', default: '.' },
      },
      required: ['feature_desc'],
    },
    probes: [
      { type: 'shell_exec', command: 'pnpm build' },
      { type: 'shell_exec', command: 'pnpm test' },
    ],
  },
}

export type BuiltinProbeName = keyof typeof BUILTIN_PROBES
export type BuiltinPartName = keyof typeof BUILTIN_PARTS
