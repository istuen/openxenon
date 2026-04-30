import { defineCommand } from 'citty'
import { ensureProjectBoundary } from '../core/boundary-project'
import { registerProject, getProjectByPath, updateProjectHeartbeat } from '../core/registry'
import { ensureGlobalBoundary } from '../core/boundary'
import { compileAllSkills, formatCompilationReport } from '../core/skill-compiler'
import { setSpaceMode } from '../db/operations/config'

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

      const globalDb = ensureGlobalBoundary()
      const projectDb = ensureProjectBoundary(projectPath)

      if (sandbox) {
        setSpaceMode(projectDb, 'SANDBOX')
      }

      const existingProject = getProjectByPath(globalDb, projectPath)

      if (existingProject) {
        if (force) {
          updateProjectHeartbeat(globalDb, existingProject.id)
          console.log('✓ 项目已更新（更新心跳时间）')
          console.log(`  项目ID: ${existingProject.id}`)
          console.log(`  状态: ${existingProject.status}`)
        } else {
          console.log('✓ 项目已存在')
          console.log(`  项目ID: ${existingProject.id}`)
          console.log(`  状态: ${existingProject.status}`)
          console.log(`  创建时间: ${new Date(existingProject.createdAt * 1000).toLocaleString()}`)
          console.log('\n提示: 使用 --force 或 -f 参数可以更新心跳时间')
        }
      } else {
        const project = registerProject(globalDb, projectPath, projectName)

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
