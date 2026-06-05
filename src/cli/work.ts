import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR, WORK_DIR } from '../kernel/constants'
import { getFormatFromArgs, output, outputError } from './output'
import type { WorkDeclaration } from '../oxn-dsl/generated/ast'
import { isWorkDeclaration } from '../oxn-dsl/generated/ast'
import { createOxnServices, resetOxnServices } from '../oxn-dsl/langium/oxn-services'
import type { OXNDocument } from '../oxn-dsl/generated/ast'
import { URI } from 'langium'
import workResume from './work-resume'
import workComplete from './work-complete'

function getProjectRoot(): string {
  return process.cwd()
}

function projectBoundaryExists(): boolean {
  return existsSync(join(getProjectRoot(), BOUNDARY_DIR))
}

function getWorkDir(cwd: string, type: string): string {
  return join(cwd, BOUNDARY_DIR, WORK_DIR, type)
}

function workDirExists(cwd: string, type: string): boolean {
  return existsSync(getWorkDir(cwd, type))
}

function ensureDirectory(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function validateWorkName(name: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: 'Name is required' }
  if (name.length < 2) return { valid: false, error: 'Name too short (min 2 chars)' }
  if (name.length > 64) return { valid: false, error: 'Name too long (max 64 chars)' }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return { valid: false, error: 'Name must be kebab-case (lowercase letter, lowercase letters/numbers, hyphens)' }
  }
  if (name.endsWith('-')) return { valid: false, error: 'Name cannot end with hyphen' }
  return { valid: true }
}

interface NewResult {
  workId: string
  workName: string
  type: string
  status: string
  path: string
  message: string
}

export default defineCommand({
  meta: {
    name: 'work',
    description: 'Work 管理命令',
  },
  subCommands: {
    new: defineCommand({
      meta: {
        name: 'new',
        description: '创建新 Work',
      },
      args: {
        'work-id': {
          type: 'string',
          alias: 'w',
          required: true,
          description: 'Work ID（kebab-case）',
        },
        'work-name': {
          type: 'string',
          alias: 'n',
          required: false,
          description: 'Work 显示名称（可选，默认与 work-id 相同）',
        },
        type: {
          type: 'string',
          alias: 't',
          required: false,
          description: 'Work 类型（默认 task）',
          default: 'task',
        },
        blueprint: {
          type: 'string',
          alias: 'b',
          required: false,
          description: '引用的 Blueprint 名称（可选）',
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出',
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出',
        },
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)

        if (!projectBoundaryExists()) {
          return outputError(
            {
              code: 'OXN_NO_PROJECT',
              message: '项目未初始化，请先执行 oxn init',
              suggestion: '在项目根目录执行 oxn init',
            },
            format,
          )
        }

        try {
          const workId = ctx.args['work-id'] as string
          const workName = ctx.args['work-name'] as string | undefined
          const workType = (ctx.args.type as string) || 'task'
          const blueprintName = ctx.args.blueprint as string | undefined

          const validation = validateWorkName(workId)
          if (!validation.valid) {
            return outputError(
              {
                code: 'OXN_INVALID_WORK_NAME',
                message: `Work ID 无效: ${validation.error}`,
              },
              format,
            )
          }

          const workDir = getWorkDir(getProjectRoot(), workType)
          if (!workDirExists(getProjectRoot(), workType)) {
            ensureDirectory(workDir)
          }

          const workFilePath = join(workDir, `${workId}.oxn`)
          if (existsSync(workFilePath)) {
            return outputError(
              {
                code: 'OXN_WORK_EXISTS',
                message: `Work 已存在: ${workId} (type: ${workType})`,
              },
              format,
            )
          }

          const workOxnContent = blueprintName
            ? `work "${workId}" {\n  context {\n    goal = "TODO: 描述工作目标"\n  }\n\n  blueprint "${blueprintName}" ref "@prj/blueprints/${blueprintName}";\n\n  task "main" {\n    blueprint "${blueprintName}"\n    part "slot-name" {\n      skill_context = "TODO: AI 执行指令"\n    }\n  }\n}\n`
            : `work "${workId}" {\n  context {\n    goal = "TODO: 描述工作目标"\n  }\n\n  // 声明资源引用\n  // domain "DomainName" ref "@prj/domains/DomainName";\n  // blueprint "BlueprintName" ref "@prj/blueprints/BlueprintName";\n\n  // 任务编排\n  // task "TaskName" {\n  //   domain "DomainName"\n  //   blueprint "BlueprintName"\n  //   part "slot-name" {\n  //     skill_context = "AI 执行指令"\n  //   }\n  // }\n}\n`

          writeFileSync(workFilePath, workOxnContent, 'utf-8')

          output(
            {
              data: {
                workId,
                workName: workName || workId,
                type: workType,
                path: workFilePath,
              } as NewResult,
              human: `Work 已创建: ${workId}\n类型: ${workType}\n路径: ${workFilePath}\n\n请编辑 work.oxn 填充 Blueprint 的 slot。`,
            },
            format,
          )
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          outputError(
            {
              code: 'OXN_WORK_NEW_FAILED',
              message: errorMsg,
            },
            format,
          )
        }
      },
    }),
    init: defineCommand({
      meta: {
        name: 'init',
        description: '创建新 Work（已废弃，请使用 work new）',
      },
      args: {
        'work-id': {
          type: 'string',
          alias: 'w',
          required: true,
          description: 'Work ID（kebab-case）',
        },
        'work-name': {
          type: 'string',
          alias: 'n',
          required: false,
          description: 'Work 显示名称（可选，默认与 work-id 相同）',
        },
        type: {
          type: 'string',
          alias: 't',
          required: false,
          description: 'Work 类型（默认 task）',
          default: 'task',
        },
        blueprint: {
          type: 'string',
          alias: 'b',
          required: false,
          description: '引用的 Blueprint 名称（可选）',
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出',
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出',
        },
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        output(
          {
            data: {},
            human: 'work init 已废弃，请使用 work new',
          },
          format,
        )
      },
    }),
    list: defineCommand({
      meta: {
        name: 'list',
        description: '列出所有 Work',
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
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const cwd = getProjectRoot()

        if (!projectBoundaryExists()) {
          return outputError(
            {
              code: 'OXN_NO_PROJECT',
              message: '项目未初始化，请先执行 oxn init',
            },
            format,
          )
        }

        const worksDir = join(cwd, BOUNDARY_DIR, WORK_DIR)
        if (!existsSync(worksDir)) {
          output({ data: { works: [] }, human: '暂无 Work' }, format)
          return
        }

        const works: Array<{ workId: string; type: string; name: string; status: string }> = []

        const typeDirs = readdirSync(worksDir) as string[]
        for (const typeDir of typeDirs) {
          const typePath = join(worksDir, typeDir)
          if (!existsSync(typePath)) continue

          try {
            const files = readdirSync(typePath)
            for (const file of files) {
              if (file.endsWith('.oxn')) {
                const workId = file.replace('.oxn', '')
                works.push({
                  workId,
                  type: typeDir,
                  name: workId,
                  status: 'PENDING',
                })
              }
            }
          } catch {
            // Skip unreadable directories
          }
        }

        if (works.length === 0) {
          output({ data: { works: [] }, human: '暂无 Work' }, format)
          return
        }

        const human = works.map((w) => `[${w.type}] ${w.workId} (${w.name})`).join('\n')

        output(
          {
            data: { works },
            human,
          },
          format,
        )
      },
    }),
    validate: defineCommand({
      meta: {
        name: 'validate',
        description: '验证 Work 文件',
      },
      args: {
        path: {
          type: 'string',
          required: false,
          description: 'Work 文件路径（默认当前目录）',
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出',
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出',
        },
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const cwd = getProjectRoot()

        if (!projectBoundaryExists()) {
          return outputError(
            {
              code: 'OXN_NO_PROJECT',
              message: '项目未初始化，请先执行 oxn init',
            },
            format,
          )
        }

        const workPath = ctx.args.path as string | undefined

        if (!workPath) {
          return outputError(
            {
              code: 'OXN_INVALID_PATH',
              message: '请提供 Work 文件路径',
            },
            format,
          )
        }

        const fullPath = workPath.startsWith('/') ? workPath : join(cwd, workPath)

        if (!existsSync(fullPath)) {
          return outputError(
            {
              code: 'OXN_FILE_NOT_FOUND',
              message: `文件不存在: ${fullPath}`,
            },
            format,
          )
        }

        try {
          const content = readFileSync(fullPath, 'utf-8')
          const services = createOxnServices()
          const shared = services.shared
          shared.ServiceRegistry.register(services)

          const factory = shared.workspace.LangiumDocumentFactory
          const uri = URI.file(fullPath)
          const doc = factory.fromString(content, uri, undefined)

          const errors: string[] = []
          const warnings: string[] = []

          if (doc.parseResult?.lexerErrors?.length) {
            for (const err of doc.parseResult.lexerErrors) {
              errors.push(`Lexer error: ${err.message}`)
            }
          }

          if (doc.parseResult?.parserErrors?.length) {
            for (const err of doc.parseResult.parserErrors) {
              errors.push(`Parser error: ${err.message}`)
            }
          }

          let workType: string | undefined
          let blueprintRef: string | undefined

          if (doc.parseResult?.value && doc.state > 1) {
            const root = doc.parseResult.value as OXNDocument

            for (const entity of root.entities || []) {
              if (isWorkDeclaration(entity)) {
                const work = entity as WorkDeclaration
                workType = 'workspace'
                // v0.1-final: 使用 blueprints 列表
                blueprintRef = work.blueprints?.[0]?.name
              }
            }

            resetOxnServices()

            if (workType) {
              output(
                {
                  data: {
                    valid: true,
                    workType,
                    blueprintRef,
                    errors: [],
                    warnings: [],
                  },
                  human: blueprintRef
                    ? `Work 语法正确\nType: ${workType}\nPrimary Blueprint: ${blueprintRef}\n\n注意: type 1:1 校验需要在加载 Blueprint 后执行。`
                    : `Work 语法正确\nType: ${workType}\n(未声明 use_blueprint，仅靠 task 内 blueprint 字段)\n\n注意: type 1:1 校验需要在加载 Blueprint 后执行。`,
                },
                format,
              )
              return
            }
          }

          resetOxnServices()

          output(
            {
              data: {
                valid: errors.length === 0,
                errors,
                warnings,
              },
              human: errors.length === 0 ? 'Work 语法正确' : `验证失败: ${errors.join(', ')}`,
            },
            format,
          )
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          outputError(
            {
              code: 'OXN_WORK_VALIDATE_FAILED',
              message: errorMsg,
            },
            format,
          )
        }
      },
    }),
    resume: workResume,
    complete: workComplete,
    // v0.1: 在 work 下挂载 task 生命周期管理
    task: () => import('./work-task').then((m) => m.default),
    // v0.1 硬迁移
    migrate: () => import('./work-migrate').then((m) => m.default),
  },
  run() {
    console.log('使用 oxn work <sub命令> 查看可用子命令')
    console.log('子命令: init, list, validate, task (v0.1), migrate (v0.1)')
  },
})
