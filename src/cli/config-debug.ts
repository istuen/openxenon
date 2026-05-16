import { defineCommand } from 'citty'
import { existsSync, readFileSync, writeFileSync } from 'fs'
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

function writeProjectConfig(projectRoot: string, config: ProjectConfig): void {
  const configPath = getProjectConfigPath(projectRoot)
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

export default defineCommand({
  meta: {
    name: 'config debug',
    description: '管理项目调试模式'
  },
  args: {
    action: {
      type: 'positional',
      required: true,
      description: 'start | stop'
    },
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出'
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出'
    }
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const projectRoot = process.cwd()
    const action = ctx.args.action as string

    const config = readProjectConfig(projectRoot)
    if (!config) {
      return outputError({
        code: 'OXN_CONFIG_NOT_FOUND',
        message: '项目未初始化，请先执行 oxn init'
      }, format)
    }

    if (action === 'start') {
      config.debug = true
      writeProjectConfig(projectRoot, config)
      return output({
        data: { debug: true },
        human: '调试模式已开启\n  日志将写入: .openxenon/debug.log'
      }, format)
    }

    if (action === 'stop') {
      config.debug = false
      writeProjectConfig(projectRoot, config)
      return output({
        data: { debug: false },
        human: '调试模式已关闭'
      }, format)
    }

    return outputError({
      code: 'OXN_INVALID_ACTION',
      message: `无效操作: ${action}`,
      suggestion: '使用 start 或 stop'
    }, format)
  }
})