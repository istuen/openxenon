import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readdirSync, cpSync, rmSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR, CONFIG_FILE, GLOBAL_BOUNDARY_PATH } from '../kernel/constants'
import { compileAllSkills, formatCompilationReport } from './skill-compiler'
import { output, outputError, getFormatFromArgs } from './output'

const META_SOURCE_PATH = join(__dirname, '..', 'arsenals', 'forges')

interface ProjectConfig {
  version: 1
  mode: 'PRODUCTION' | 'SANDBOX'
  name?: string
  createdAt?: number
}

function ensureGlobalBoundary(): void {
  if (!existsSync(GLOBAL_BOUNDARY_PATH)) {
    mkdirSync(GLOBAL_BOUNDARY_PATH, { recursive: true })
  }
}

function ensureProjectBoundary(projectRoot: string): void {
  const boundaryPath = join(projectRoot, BOUNDARY_DIR)

  if (!existsSync(boundaryPath)) {
    mkdirSync(boundaryPath, { recursive: true })
  }

  const tasksPath = join(boundaryPath, 'tasks')
  if (!existsSync(tasksPath)) {
    mkdirSync(tasksPath, { recursive: true })
  }
}

function readProjectConfig(projectRoot: string): ProjectConfig | null {
  const configPath = join(projectRoot, BOUNDARY_DIR, CONFIG_FILE)
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
  const configPath = join(projectRoot, BOUNDARY_DIR, CONFIG_FILE)
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

function copyMetaToProject(projectRoot: string): void {
  const metaDestPath = join(projectRoot, BOUNDARY_DIR, 'meta')

  if (!existsSync(META_SOURCE_PATH)) {
    return
  }

  mkdirSync(metaDestPath, { recursive: true })

  const metaDirs = readdirSync(META_SOURCE_PATH)
  for (const dir of metaDirs) {
    const srcDir = join(META_SOURCE_PATH, dir)
    const destDir = join(metaDestPath, dir)

    if (existsSync(destDir)) {
      rmSync(destDir, { recursive: true, force: true })
    }

    cpSync(srcDir, destDir, { recursive: true })
  }
}

export default defineCommand({
  meta: {
    name: 'init',
    description: '初始化项目，在当前项目建立物理围栏'
  },
  args: {
    name: {
      type: 'positional',
      description: '项目名称',
      required: false
    },
    sandbox: {
      alias: 's',
      type: 'boolean',
      description: '初始化为沙箱模式',
      default: false
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: '强制重新编译 Skills',
      default: false
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
    const projectPath = process.cwd()
    const projectName = ctx.args.name || projectPath.split('/').pop() || 'unnamed'
    const sandbox = ctx.args.sandbox as boolean
    const force = ctx.args.force as boolean

    try {
      ensureGlobalBoundary()
      ensureProjectBoundary(projectPath)
      copyMetaToProject(projectPath)

      const existingConfig = readProjectConfig(projectPath)
      let message = ''

      if (existingConfig) {
        message = `项目已存在: ${projectName}`
        if (sandbox !== (existingConfig.mode === 'SANDBOX')) {
          existingConfig.mode = sandbox ? 'SANDBOX' : 'PRODUCTION'
          writeProjectConfig(projectPath, existingConfig)
          message += `\n  模式已更新为: ${existingConfig.mode}`
        }
      } else {
        const config: ProjectConfig = {
          version: 1,
          mode: sandbox ? 'SANDBOX' : 'PRODUCTION',
          name: projectName,
          createdAt: Date.now()
        }
        writeProjectConfig(projectPath, config)
        message = `项目初始化成功: ${projectName}`
      }

      const report = compileAllSkills('opencode', projectPath, force)
      const reportStr = formatCompilationReport(report)

      return output({
        data: {
          name: projectName,
          path: projectPath,
          mode: sandbox ? 'SANDBOX' : 'PRODUCTION',
          skillsCompiled: report.total,
          skillsReport: reportStr
        },
        human: `${message}\n\n正在编译 Skill (适配器: opencode)...\n\n${reportStr}\n\n✓ Skill 编译完成\n  输出目录: .opencode/skills/`
      }, format)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return outputError({
        code: 'OXN_INIT_FAILED',
        message: errorMsg
      }, format)
    }
  }
})