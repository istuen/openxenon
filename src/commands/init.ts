import { defineCommand } from 'citty'
import { existsSync, mkdirSync } from 'fs'
import { registerProject, getProjectByPath, updateProjectHeartbeat } from '../core/registry'
import { GLOBAL_BOUNDARY_PATH, GLOBAL_PROOFS_PATH, COMMON_PROOFS_PATH, TEMPLATES_PATH } from '../core/global'
import { getProjectBoundaryPath, getProjectProofsPath, getTasksPath } from '../core/project'
import { setSpaceMode } from '../core/config'
import { compileAllSkills, formatCompilationReport } from '../core/skill-compiler'

function ensureGlobalBoundary(): void {
  if (!existsSync(GLOBAL_BOUNDARY_PATH)) {
    mkdirSync(GLOBAL_BOUNDARY_PATH, { recursive: true })
  }

  if (!existsSync(GLOBAL_PROOFS_PATH)) {
    mkdirSync(GLOBAL_PROOFS_PATH, { recursive: true })
  }

  if (!existsSync(COMMON_PROOFS_PATH)) {
    mkdirSync(COMMON_PROOFS_PATH, { recursive: true })
  }

  if (!existsSync(TEMPLATES_PATH)) {
    mkdirSync(TEMPLATES_PATH, { recursive: true })
  }
}

function ensureProjectBoundary(projectRoot: string): void {
  const boundaryPath = getProjectBoundaryPath(projectRoot)

  if (!existsSync(boundaryPath)) {
    mkdirSync(boundaryPath, { recursive: true })
  }

  const proofsPath = getProjectProofsPath(projectRoot)
  if (!existsSync(proofsPath)) {
    mkdirSync(proofsPath, { recursive: true })
  }

  const tasksPath = getTasksPath(projectRoot)
  if (!existsSync(tasksPath)) {
    mkdirSync(tasksPath, { recursive: true })
  }
}

export default defineCommand({
  meta: {
    name: 'init',
    description: '初始化项目，在当前项目建立物理围栏并注册到全局'
  },
  args: {
    name: {
      type: 'positional',
      description: '项目名称',
      required: false
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: '强制重新初始化（更新心跳时间 + 强制重编译 Skill）',
      default: false
    },
    adapter: {
      alias: 'a',
      type: 'string',
      description: '指定适配器编译 Skill（默认: opencode）',
      default: 'opencode'
    },
    'compile-force': {
      type: 'boolean',
      description: '强制重写所有 Skill 文件（忽略内容比对）',
      default: false
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
    const force = ctx.args.force as boolean
    const adapterId = ctx.args.adapter as string
    const compileForce = ctx.args['compile-force'] as boolean || force
    const sandbox = ctx.args.sandbox as boolean

    try {
      console.log(`正在初始化项目: ${projectName}`)
      console.log(`项目路径: ${projectPath}`)
      console.log(`模式: ${sandbox ? 'SANDBOX' : 'PRODUCTION'}`)

      ensureGlobalBoundary()
      ensureProjectBoundary(projectPath)

      if (sandbox) {
        setSpaceMode(projectPath, 'SANDBOX')
      }

      const existingProject = getProjectByPath(projectPath)

      if (existingProject) {
        if (force) {
          updateProjectHeartbeat(projectPath)
          console.log('✓ 项目已更新（更新心跳时间）')
          console.log(`  项目ID: ${existingProject.id}`)
          console.log(`  状态: ${existingProject.status}`)
        } else {
          console.log('✓ 项目已存在')
          console.log(`  项目ID: ${existingProject.id}`)
          console.log(`  状态: ${existingProject.status}`)
          console.log(`  创建时间: ${new Date(existingProject.createdAt).toLocaleString()}`)
          console.log('\n提示: 使用 --force 或 -f 参数可以更新心跳时间')
        }
      } else {
        const project = registerProject(projectPath, projectName)

        console.log('✓ 项目初始化成功')
        console.log(`  项目ID: ${project.id}`)
        console.log(`  状态: ${project.status}`)
      }

      console.log('')
      console.log(`正在编译 Skill (适配器: ${adapterId})...`)

      const report = compileAllSkills(adapterId, projectPath, compileForce)
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
