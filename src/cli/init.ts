import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readdirSync, cpSync, rmSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR, CONFIG_FILE, GLOBAL_BOUNDARY_PATH, GLOBAL_PROOFS_PATH } from '../kernel/constants'
import { compileAllSkills, formatCompilationReport } from './skill-compiler'

const META_SOURCE_PATH = join(__dirname, '..', 'meta')

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

  if (!existsSync(GLOBAL_PROOFS_PATH)) {
    mkdirSync(GLOBAL_PROOFS_PATH, { recursive: true })
  }
}

function ensureProjectBoundary(projectRoot: string): void {
  const boundaryPath = join(projectRoot, BOUNDARY_DIR)

  if (!existsSync(boundaryPath)) {
    mkdirSync(boundaryPath, { recursive: true })
  }

  const proofsPath = join(boundaryPath, 'proofs')
  if (!existsSync(proofsPath)) {
    mkdirSync(proofsPath, { recursive: true })
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
    }
  },
  async run(ctx) {
    const projectPath = process.cwd()
    const projectName = ctx.args.name || projectPath.split('/').pop() || 'unnamed'
    const sandbox = ctx.args.sandbox as boolean

    try {
      console.log(`正在初始化项目: ${projectName}`)
      console.log(`项目路径: ${projectPath}`)
      console.log(`模式: ${sandbox ? 'SANDBOX' : 'PRODUCTION'}`)

      ensureGlobalBoundary()
      ensureProjectBoundary(projectPath)
      copyMetaToProject(projectPath)

      const existingConfig = readProjectConfig(projectPath)

      if (existingConfig) {
        console.log('✓ 项目已存在')
        if (sandbox !== (existingConfig.mode === 'SANDBOX')) {
          existingConfig.mode = sandbox ? 'SANDBOX' : 'PRODUCTION'
          writeProjectConfig(projectPath, existingConfig)
          console.log(`  模式已更新为: ${existingConfig.mode}`)
        }
      } else {
        const config: ProjectConfig = {
          version: 1,
          mode: sandbox ? 'SANDBOX' : 'PRODUCTION',
          name: projectName,
          createdAt: Date.now()
        }
        writeProjectConfig(projectPath, config)
        console.log('✓ 项目初始化成功')
      }

      console.log('')
      console.log('正在编译 Skill (适配器: opencode)...')

      const report = compileAllSkills('opencode', projectPath, false)
      console.log('')
      console.log(formatCompilationReport(report))

      if (report.total > 0) {
        console.log('')
        console.log('✓ Skill 编译完成')
        console.log(`  输出目录: .opencode/skills/`)
      }
    } catch (error) {
      console.error('✗ 初始化失败:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }
})