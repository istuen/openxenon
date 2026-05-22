import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR, CONFIG_FILE } from '../kernel/constants'
import { output, outputError, getFormatFromArgs } from './output'

interface ProjectConfig {
  version: 1
  mode: 'PRODUCTION' | 'SANDBOX'
  name?: string
  createdAt?: number
  debug?: boolean
}

function getProjectConfigPath(projectRoot: string): string {
  return join(projectRoot, BOUNDARY_DIR, CONFIG_FILE)
}

function readProjectConfig(projectRoot: string): ProjectConfig | null {
  const configPath = getProjectConfigPath(projectRoot)
  if (!existsSync(configPath)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as ProjectConfig
  } catch {
    return null
  }
}

export default defineCommand({
  meta: {
    name: 'config',
    description: '管理项目配置',
  },
  subCommands: {
    debug: () => import('./config-debug').then((m) => m.default),
  },
  args: {
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出',
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出',
    },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const projectRoot = process.cwd()
    const config = readProjectConfig(projectRoot)

    if (!config) {
      return outputError(
        {
          code: 'OXN_CONFIG_NOT_FOUND',
          message: '项目未初始化，请先执行 oxn init',
        },
        format,
      )
    }

    return output(
      {
        data: config,
        human: `项目配置:\n  mode: ${config.mode}\n  debug: ${config.debug ? 'enabled' : 'disabled'}\n  name: ${config.name || 'unnamed'}\n`,
      },
      format,
    )
  },
})
