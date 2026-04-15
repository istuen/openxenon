import { defineCommand } from 'citty'
import { ensureProjectBoundary } from '../core/boundary-project'
import { registerProject } from '../core/registry'
import { ensureGlobalBoundary } from '../core/boundary'

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
    }
  },
  async run(ctx) {
    const projectPath = process.cwd()
    const projectName = ctx.args.name || projectPath.split('/').pop() || 'unnamed'
    
    try {
      console.log(`正在初始化项目: ${projectName}`)
      console.log(`项目路径: ${projectPath}`)
      
      const globalDb = ensureGlobalBoundary()
      ensureProjectBoundary(projectPath)
      
      const project = registerProject(globalDb, projectPath, projectName)
      
      console.log('✓ 项目初始化成功')
      console.log(`  项目ID: ${project.id}`)
      console.log(`  状态: ${project.status}`)
    } catch (error) {
      console.error('✗ 初始化失败:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }
})
