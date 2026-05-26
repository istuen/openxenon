import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
  },
  {
    files: ['src/kernel/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['../infra/*', '../../infra/*', 'src/infra/*'], message: '🚨 宪法违规：Kernel 是兰姆达真空，不能知道 Infra 的存在！' },
          { group: ['node:fs', 'node:net', 'node:child_process', 'fs', 'net', 'child_process'], message: '🚨 宪法违规：Kernel 是兰姆达真空，绝对禁止 I/O 操作！' },
        ],
      }],
    },
  },
  {
    files: ['src/daemon/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['../cli/*', '../../cli/*', 'src/cli/*'], message: '🚨 宪法违规：Daemon 不能导入 CLI，它们只能通过 JSON Payload 交互！' },
          { group: ['fs', 'node:fs'], message: '🚨 Daemon 不能直接导入 fs，必须通过 Infra！' },
        ],
      }],
    },
  },
  {
    files: ['src/cli/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['../daemon/*', '../../daemon/*', 'src/daemon/*'], message: '🚨 宪法违规：CLI 不能导入 Daemon，它们只能通过 Socket 通信！' },
        ],
      }],
    },
  },
  {
    files: ['src/infra/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['../kernel/!(contracts)/*', '../../kernel/!(contracts)/*', 'src/kernel/!(contracts)/*'], message: '🚨 宪法违规：Infra 是纯物理电线，不能包含 Kernel 依赖（contracts 除外）！' },
          { group: ['../daemon/*', '../../daemon/*', 'src/daemon/*'], message: '🚨 宪法违规：Infra 是纯物理电线，不能包含 Daemon 依赖！' },
          { group: ['../cli/*', '../../cli/*', 'src/cli/*'], message: '🚨 宪法违规：Infra 是纯物理电线，不能包含 CLI 依赖！' },
        ],
      }],
    },
  },
]
