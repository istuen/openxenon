import { defineCommand } from 'citty'
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR } from '../kernel/constants'
import { output, outputError, getFormatFromArgs } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

function getExploresRoot(): string {
  return join(getProjectRoot(), BOUNDARY_DIR, 'explores')
}

function exploreExists(name: string): boolean {
  return existsSync(join(getExploresRoot(), name))
}

function ensureExploresDir(): void {
  const root = getExploresRoot()
  if (!existsSync(root)) {
    mkdirSync(root, { recursive: true })
  }
}

interface QAPair {
  question: string
  answer: string
}

function parseQA(content: string): QAPair[] {
  const pairs: QAPair[] = []
  const regex = /## Q:\s*(.+?)\n\n\*\*A:\*\*\s*(.+?)(?=\n## Q:|$)/gs
  let match
  while ((match = regex.exec(content)) !== null) {
    if (match[1] && match[2]) {
      pairs.push({ question: match[1].trim(), answer: match[2].trim() })
    }
  }
  return pairs
}

function generateReport(name: string, docsFiles: string[], qaPairs: QAPair[]): string {
  const sections: string[] = []

  sections.push(`# 探索报告: ${name}\n`)

  sections.push('## 扫描资料\n')
  if (docsFiles.length > 0) {
    sections.push(docsFiles.map(f => `- ${f}`).join('\n'))
  } else {
    sections.push('_无_')
  }
  sections.push('\n')

  sections.push('## AI-工程师问答\n')
  if (qaPairs.length > 0) {
    for (const pair of qaPairs) {
      sections.push(`**Q:** ${pair.question}`)
      sections.push(`\n**A:** ${pair.answer}\n`)
    }
  } else {
    sections.push('_无问答记录_\n')
  }

  sections.push('## 关键发现\n')
  sections.push('_基于问答提取_\n\n')

  sections.push('## 待解决问题\n')
  const openQuestions = qaPairs.filter(p =>
    p.answer.includes('未解决') ||
    p.answer.includes('不确定') ||
    p.answer.includes('TODO')
  )
  if (openQuestions.length > 0) {
    sections.push(openQuestions.map(p => `- ${p.question}`).join('\n'))
  } else {
    sections.push('_无_\n')
  }

  sections.push('\n## 总结\n')
  sections.push('_基于以上信息综合_\n')

  return sections.join('\n')
}

export default defineCommand({
  meta: {
    name: 'explore',
    description: '探索项目与任务，采集资料、问答记录、总结归档'
  },
  subCommands: {
    new: defineCommand({
      meta: {
        name: 'new',
        description: '创建新探索'
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: '探索名称 (kebab-case)'
        }
      },
      run(ctx) {
        const name = ctx.args.name as string
        const exploresRoot = getExploresRoot()

        ensureExploresDir()

        const explorePath = join(exploresRoot, name)
        if (existsSync(explorePath)) {
          return outputError({
            code: 'OXN_EXPLORE_EXISTS',
            message: `探索已存在: ${name}`,
            suggestion: '使用其他名称或先删除现有探索'
          }, getFormatFromArgs(ctx.args))
        }

        mkdirSync(join(explorePath, 'docs'), { recursive: true })
        writeFileSync(join(explorePath, 'qa.md'), '# 问答记录\n\n', 'utf-8')
        writeFileSync(join(explorePath, 'report.md'), '# 探索报告\n\n', 'utf-8')

        output({
          data: { name, path: explorePath },
          human: `探索已创建: ${explorePath}\n\n目录结构:\n  docs/\n  qa.md\n  report.md`
        }, getFormatFromArgs(ctx.args))
      }
    }),
    scan: defineCommand({
      meta: {
        name: 'scan',
        description: '扫描资料到探索目录'
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: '探索名称'
        },
        '--path': {
          type: 'string',
          description: '文件或目录路径'
        },
        '--read': {
          type: 'string',
          description: '读取现有文件内容'
        },
        '--title': {
          type: 'string',
          description: '文档标题（用于 --path 模式）'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const name = ctx.args.name as string
        const exploresRoot = getExploresRoot()

        if (!exploreExists(name)) {
          return outputError({
            code: 'OXN_EXPLORE_NOT_FOUND',
            message: `探索不存在: ${name}`,
            suggestion: '先执行 oxn explore new <name> 创建探索'
          }, format)
        }

        const docsPath = join(exploresRoot, name, 'docs')

        if (ctx.args.path) {
          const sourcePath = ctx.args.path as string
          const title = (ctx.args.title as string) || sourcePath.split('/').pop() || 'document'
          const destPath = join(docsPath, `${title}.md`)

          if (existsSync(sourcePath)) {
            const content = readFileSync(sourcePath, 'utf-8')
            writeFileSync(destPath, content, 'utf-8')
            output({
              data: { path: destPath },
              human: `已扫描: ${destPath}`
            }, format)
          } else {
            return outputError({
              code: 'OXN_FILE_NOT_FOUND',
              message: `文件不存在: ${sourcePath}`
            }, format)
          }
        } else if (ctx.args.read) {
          const filePath = ctx.args.read as string
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8')
            output({
              data: { content },
              human: content
            }, format)
          } else {
            return outputError({
              code: 'OXN_FILE_NOT_FOUND',
              message: `文件不存在: ${filePath}`
            }, format)
          }
        } else {
          const files = existsSync(docsPath) ? readdirSync(docsPath) : []
          output({
            data: { files },
            human: `已扫描文件:\n${files.map(f => `  - ${f}`).join('\n')}`
          }, format)
        }
      }
    }),
    qa: defineCommand({
      meta: {
        name: 'qa',
        description: '问答记录管理'
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: '探索名称'
        },
        '--add': {
          type: 'string',
          description: '添加问答对，格式: Q:xxx|A:xxx'
        },
        '--list': {
          type: 'boolean',
          description: '列出所有问答'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const name = ctx.args.name as string
        const exploresRoot = getExploresRoot()

        if (!exploreExists(name)) {
          return outputError({
            code: 'OXN_EXPLORE_NOT_FOUND',
            message: `探索不存在: ${name}`,
            suggestion: '先执行 oxn explore new <name> 创建探索'
          }, format)
        }

        const qaPath = join(exploresRoot, name, 'qa.md')

        if (ctx.args.add) {
          const pair = ctx.args.add as string
          const [q, a] = pair.split('|')
          if (!q || !a) {
            return outputError({
              code: 'OXN_INVALID_QA_FORMAT',
              message: '格式错误，使用: Q:问题|A:回答'
            }, format)
          }
          const entry = `\n## Q: ${q.replace(/^Q:/, '')}\n\n**A:** ${a.replace(/^A:/, '')}\n`
          const existing = existsSync(qaPath) ? readFileSync(qaPath, 'utf-8') : ''
          writeFileSync(qaPath, existing + entry, 'utf-8')
          output({
            data: { added: true },
            human: '已添加问答'
          }, format)
        } else if (ctx.args.list) {
          if (existsSync(qaPath)) {
            const content = readFileSync(qaPath, 'utf-8')
            output({
              data: { content },
              human: content
            }, format)
          } else {
            output({ data: { content: '' }, human: '暂无问答记录' }, format)
          }
        } else {
          output({
            data: { path: qaPath },
            human: `问答文件: ${qaPath}`
          }, format)
        }
      }
    }),
    report: defineCommand({
      meta: {
        name: 'report',
        description: '从问答生成报告'
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: '探索名称'
        },
        '--force': {
          type: 'boolean',
          description: '覆盖现有总结'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const name = ctx.args.name as string
        const exploresRoot = getExploresRoot()

        if (!exploreExists(name)) {
          return outputError({
            code: 'OXN_EXPLORE_NOT_FOUND',
            message: `探索不存在: ${name}`,
            suggestion: '先执行 oxn explore new <name> 创建探索'
          }, format)
        }

        const qaPath = join(exploresRoot, name, 'qa.md')
        const reportPath = join(exploresRoot, name, 'report.md')

        if (!existsSync(qaPath)) {
          return outputError({
            code: 'OXN_QA_NOT_FOUND',
            message: '无问答记录，无法生成报告'
          }, format)
        }

        if (existsSync(reportPath) && !ctx.args.force) {
          return outputError({
            code: 'OXN_REPORT_EXISTS',
            message: '报告已存在，使用 --force 覆盖'
          }, format)
        }

        const docsPath = join(exploresRoot, name, 'docs')
        const docsFiles = existsSync(docsPath) ? readdirSync(docsPath).filter(f => f.endsWith('.md')) : []
        const qaContent = readFileSync(qaPath, 'utf-8')
        const qaPairs = parseQA(qaContent)

        const report = generateReport(name, docsFiles, qaPairs)

        writeFileSync(reportPath, report, 'utf-8')
        output({
          data: { path: reportPath },
          human: `报告已生成: ${reportPath}`
        }, format)
      }
    }),
    list: defineCommand({
      meta: {
        name: 'list',
        description: '列出所有探索'
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const exploresRoot = getExploresRoot()

        if (!existsSync(exploresRoot)) {
          return output({ data: { explores: [] }, human: '暂无探索' }, format)
        }

        const dirs = readdirSync(exploresRoot).filter(d =>
          existsSync(join(exploresRoot, d, 'qa.md'))
        )

        output({
          data: { explores: dirs },
          human: dirs.length > 0 ? `探索列表:\n${dirs.map(d => `  - ${d}`).join('\n')}` : '暂无探索'
        }, format)
      }
    }),
    delete: defineCommand({
      meta: {
        name: 'delete',
        description: '删除探索'
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: '探索名称'
        },
        '--force': {
          type: 'boolean',
          description: '跳过确认直接删除'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const name = ctx.args.name as string
        const exploresRoot = getExploresRoot()

        if (!exploreExists(name)) {
          return outputError({
            code: 'OXN_EXPLORE_NOT_FOUND',
            message: `探索不存在: ${name}`
          }, format)
        }

        const explorePath = join(exploresRoot, name)

        if (!ctx.args.force) {
          output({
            data: { path: explorePath },
            human: `确认删除探索 "${name}"？\n路径: ${explorePath}\n\n使用 --force 确认删除`
          }, format)
          return
        }

        rmSync(explorePath, { recursive: true, force: true })
        output({
          data: { deleted: name },
          human: `已删除探索: ${name}`
        }, format)
      }
    })
  },
  run() {
    console.log('使用 oxn explore <subcommand> 查看可用子命令')
    console.log('子命令: new, scan, qa, report, list, delete')
  }
})