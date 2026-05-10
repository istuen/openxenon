module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['src/infra/*', 'node:fs', 'node:net', 'node:child_process'],
          message: '🚨 宪法违规：Kernel 是兰姆达真空，绝对禁止 I/O 操作！'
        },
        {
          group: ['src/daemon/*'],
          target: 'src/cli/**',
          message: '🚨 宪法违规：CLI 不能导入 Daemon，它们只能通过 Socket 通信！'
        },
        {
          group: ['src/cli/*'],
          target: 'src/daemon/**',
          message: '🚨 宪法违规：Daemon 不能导入 CLI，它们只能通过 JSON Payload 交互！'
        },
        {
          group: ['src/kernel/*', 'src/daemon/*', 'src/cli/*'],
          target: 'src/infra/**',
          message: '🚨 宪法违规：Infra 是纯物理电线，不能包含任何业务逻辑依赖！'
        }
      ]
    }],
    'no-restricted-globals': ['error', {
      name: ['fs', 'node:fs'],
      message: '🚨 Daemon 不能直接导入 fs，必须通过 Infra！'
    }]
  },
  overrides: [
    {
      files: ['src/daemon/**'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            { group: ['fs', 'node:fs'], message: '🚨 Daemon 不能直接导入 fs，必须通过 Infra！' }
          ]
        }]
      }
    },
    {
      files: ['src/kernel/**'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            { group: ['src/infra/**'], message: '🚨 Kernel 是兰姆达真空，不能知道 Infra 的存在！' }
          ]
        }]
      }
    }
  ]
}
