/**
 * @deprecated 此模块已废弃，请使用 oxn work init --type explore 替代
 * 旧命令保持兼容以支持现有工作流，数据路径不变 (.openxenon/explores/)
 */
import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { extname, join } from 'path'
import { BOUNDARY_DIR } from '../kernel/constants'
import { getFormatFromArgs, output, outputError } from './output'

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

function scanDirectory(dirPath: string, docsPath: string, prefix = ''): string[] {
  const scanned: string[] = []
  const entries = readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      const subScanned = scanDirectory(fullPath, docsPath, relPath)
      scanned.push(...subScanned)
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase()
      if (ext === '.ts' || ext === '.md' || ext === '.yaml' || ext === '.json' || ext === '.oxn') {
        scanned.push(fullPath)
      }
    }
  }

  return scanned
}

function writeScanIndex(files: string[], docsPath: string): string {
  const indexLines: string[] = ['# 扫描索引\n', `> 共 ${files.length} 个文件，按需用 \`--read\` 读取完整内容\n`]

  for (const file of files) {
    const shortPath = file.length > 60 ? `...${file.slice(-57)}` : file
    indexLines.push(`- \`${shortPath}\``)
  }

  const indexPath = join(docsPath, 'index.md')
  writeFileSync(indexPath, indexLines.join('\n'), 'utf-8')
  return indexPath
}

function readFileSummary(filePath: string, maxLines = 3): string {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    return lines.slice(0, maxLines).join('\n') + (lines.length > maxLines ? '\n...' : '')
  } catch {
    return '(无法读取)'
  }
}

interface QAQuestion {
  id: string
  question: string
  answer: string | null
  createdAt: string
}

interface QADocument {
  questions: QAQuestion[]
}

function getAIQAPath(explorePath: string): string {
  return join(explorePath, 'ai-qa.json')
}

function getEngineerQAPath(explorePath: string): string {
  return join(explorePath, 'engineer-qa.json')
}

function initQADocument(): QADocument {
  return { questions: [] }
}

function loadQADocument(path: string): QADocument {
  if (!existsSync(path)) {
    return initQADocument()
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return initQADocument()
  }
}

function saveQADocument(path: string, doc: QADocument): void {
  writeFileSync(path, JSON.stringify(doc, null, 2), 'utf-8')
}

function addQAEntry(path: string, question: string, answer: string | null = null): void {
  const doc = loadQADocument(path)
  const id = String(doc.questions.length + 1)
  doc.questions.push({
    id,
    question,
    answer,
    createdAt: new Date().toISOString(),
  })
  saveQADocument(path, doc)
}

function updateQAAnswer(path: string, id: string, answer: string): boolean {
  const doc = loadQADocument(path)
  const q = doc.questions.find((q) => q.id === id)
  if (!q) return false
  q.answer = answer
  saveQADocument(path, doc)
  return true
}

export default defineCommand({
  meta: {
    name: 'explore',
    description: 'DEPRECATED: 探索项目与任务，采集资料、问答记录、总结归档。请使用 oxn work init --type explore 替代。',
  },
  subCommands: {
    new: defineCommand({
      meta: {
        name: 'new',
        description: '创建新探索',
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: '探索名称 (kebab-case)',
        },
      },
      run(ctx) {
        const name = ctx.args.name as string
        const exploresRoot = getExploresRoot()

        ensureExploresDir()

        const explorePath = join(exploresRoot, name)
        if (existsSync(explorePath)) {
          return outputError(
            {
              code: 'OXN_EXPLORE_EXISTS',
              message: `探索已存在: ${name}`,
              suggestion: '使用其他名称或先删除现有探索',
            },
            getFormatFromArgs(ctx.args),
          )
        }

        mkdirSync(join(explorePath, 'docs'), { recursive: true })
        writeFileSync(getAIQAPath(explorePath), JSON.stringify(initQADocument(), null, 2), 'utf-8')
        writeFileSync(getEngineerQAPath(explorePath), JSON.stringify(initQADocument(), null, 2), 'utf-8')
        writeFileSync(join(explorePath, 'report.md'), '# 探索报告\n\n', 'utf-8')

        output(
          {
            data: { name, path: explorePath },
            human: `探索已创建: ${explorePath}\n\n目录结构:\n  docs/\n  ai-qa.json\n  engineer-qa.json\n  report.md`,
          },
          getFormatFromArgs(ctx.args),
        )
      },
    }),
    scan: defineCommand({
      meta: {
        name: 'scan',
        description: '扫描资料到探索目录',
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: '探索名称',
        },
        '--path': {
          type: 'string',
          description: '文件或目录路径',
        },
        '--read': {
          type: 'string',
          description: '读取现有文件内容',
        },
        '--title': {
          type: 'string',
          description: '文档标题（用于 --path 模式）',
        },
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const name = ctx.args.name as string
        const exploresRoot = getExploresRoot()

        if (!exploreExists(name)) {
          return outputError(
            {
              code: 'OXN_EXPLORE_NOT_FOUND',
              message: `探索不存在: ${name}`,
              suggestion: '先执行 oxn explore new <name> 创建探索',
            },
            format,
          )
        }

        const docsPath = join(exploresRoot, name, 'docs')

        if (ctx.args.path) {
          const sourcePath = ctx.args.path as string

          if (!existsSync(sourcePath)) {
            return outputError(
              {
                code: 'OXN_FILE_NOT_FOUND',
                message: `文件不存在: ${sourcePath}`,
              },
              format,
            )
          }

          const stat = statSync(sourcePath)
          if (stat.isDirectory()) {
            const files = scanDirectory(sourcePath, docsPath)
            const indexPath = writeScanIndex(files, docsPath)
            return output(
              {
                data: { count: files.length, index: indexPath },
                human:
                  files.length > 0
                    ? `已索引 ${files.length} 个文件\n索引: ${indexPath}\n\n按需读取: oxn explore scan <name> --read <path>`
                    : `目录为空，未扫描任何文件`,
              },
              format,
            )
          }

          const files = [sourcePath]
          writeScanIndex(files, docsPath)
          const summary = readFileSummary(sourcePath, 5)
          output(
            {
              data: { path: sourcePath, summary },
              human: `已索引: ${sourcePath}\n\n摘要:\n${summary}\n\n读取全文: oxn explore scan <name> --read ${sourcePath}`,
            },
            format,
          )
        } else if (ctx.args.read) {
          const filePath = ctx.args.read as string
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8')
            output(
              {
                data: { content },
                human: content,
              },
              format,
            )
          } else {
            return outputError(
              {
                code: 'OXN_FILE_NOT_FOUND',
                message: `文件不存在: ${filePath}`,
              },
              format,
            )
          }
        } else {
          const indexPath = join(docsPath, 'index.md')
          if (existsSync(indexPath)) {
            const content = readFileSync(indexPath, 'utf-8')
            output({ data: { files: content }, human: content }, format)
          } else {
            output({ data: { files: [] }, human: '无已索引文件' }, format)
          }
        }
      },
    }),
    qa: defineCommand({
      meta: {
        name: 'qa',
        description: '问答记录管理 (AI问答 / 工程师问答)',
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: '探索名称',
        },
        '--type': {
          type: 'string',
          description: '问答类型: ai | engineer',
        },
        '--ask': {
          type: 'string',
          description: '添加问题（AI问答使用）',
        },
        '--answer': {
          type: 'string',
          description: '回答问题，格式: id|answer',
        },
        '--list': {
          type: 'boolean',
          description: '列出所有问答',
        },
        '--pending': {
          type: 'boolean',
          description: '列出待回答的问题',
        },
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const name = ctx.args.name as string
        const explorePath = join(getExploresRoot(), name)

        if (!exploreExists(name)) {
          return outputError(
            {
              code: 'OXN_EXPLORE_NOT_FOUND',
              message: `探索不存在: ${name}`,
              suggestion: '先执行 oxn explore new <name> 创建探索',
            },
            format,
          )
        }

        const qaType = (ctx.args.type as string) || 'ai'
        const qaPath = qaType === 'engineer' ? getEngineerQAPath(explorePath) : getAIQAPath(explorePath)

        if (ctx.args.ask) {
          const question = ctx.args.ask as string
          addQAEntry(qaPath, question)
          const doc = loadQADocument(qaPath)
          const lastQ = doc.questions[doc.questions.length - 1]
          if (!lastQ) {
            return outputError({ code: 'OXN_INTERNAL_ERROR', message: '添加问题失败' }, format)
          }
          output(
            {
              data: { id: lastQ.id, question: lastQ.question, answer: null },
              human: `问题已添加 (ID: ${lastQ.id}):\nQ: ${question}\nA: _待回答_`,
            },
            format,
          )
        } else if (ctx.args.answer) {
          const [id, ...rest] = (ctx.args.answer as string).split('|')
          if (!id || rest.length === 0) {
            return outputError(
              {
                code: 'OXN_INVALID_ANSWER_FORMAT',
                message: '格式错误，使用: --answer id|回答内容',
              },
              format,
            )
          }
          const answer = rest.join('|')
          if (updateQAAnswer(qaPath, id, answer)) {
            output(
              {
                data: { id, answer },
                human: `已更新 (ID: ${id}):\nA: ${answer}`,
              },
              format,
            )
          } else {
            return outputError(
              {
                code: 'OXN_QA_NOT_FOUND',
                message: `未找到问题 ID: ${id}`,
              },
              format,
            )
          }
        } else if (ctx.args.pending) {
          const doc = loadQADocument(qaPath)
          const pending = doc.questions.filter((q) => q.answer === null)
          if (pending.length === 0) {
            output({ data: { pending: [] }, human: '无待回答问题' }, format)
          } else {
            output(
              {
                data: { pending: pending.map((q) => ({ id: q.id, question: q.question })) },
                human: pending.map((q) => `[${q.id}] ${q.question}`).join('\n'),
              },
              format,
            )
          }
        } else if (ctx.args.list) {
          const doc = loadQADocument(qaPath)
          if (doc.questions.length === 0) {
            output({ data: { questions: [] }, human: '暂无问答记录' }, format)
          } else {
            const lines = doc.questions
              .map((q) => `[${q.id}] Q: ${q.question}\n    A: ${q.answer ?? '_待回答_'}`)
              .join('\n\n')
            output(
              {
                data: { questions: doc.questions },
                human: lines,
              },
              format,
            )
          }
        } else {
          const aiPath = getAIQAPath(explorePath)
          const engPath = getEngineerQAPath(explorePath)
          const aiDoc = loadQADocument(aiPath)
          const engDoc = loadQADocument(engPath)
          output(
            {
              data: {
                ai: { path: aiPath, count: aiDoc.questions.length },
                engineer: { path: engPath, count: engDoc.questions.length },
              },
              human: `AI 问答: ${aiPath} (${aiDoc.questions.length} 条)\n工程师问答: ${engPath} (${engDoc.questions.length} 条)`,
            },
            format,
          )
        }
      },
    }),
    report: defineCommand({
      meta: {
        name: 'report',
        description: '从问答生成报告',
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: '探索名称',
        },
        '--force': {
          type: 'boolean',
          description: '覆盖现有总结',
        },
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const name = ctx.args.name as string
        const explorePath = join(getExploresRoot(), name)

        if (!exploreExists(name)) {
          return outputError(
            {
              code: 'OXN_EXPLORE_NOT_FOUND',
              message: `探索不存在: ${name}`,
              suggestion: '先执行 oxn explore new <name> 创建探索',
            },
            format,
          )
        }

        const aiQAPath = getAIQAPath(explorePath)
        const engQAPath = getEngineerQAPath(explorePath)
        const reportPath = join(explorePath, 'report.md')

        if (!existsSync(aiQAPath) && !existsSync(engQAPath)) {
          return outputError(
            {
              code: 'OXN_QA_NOT_FOUND',
              message: '无问答记录，无法生成报告',
            },
            format,
          )
        }

        if (existsSync(reportPath) && !ctx.args.force) {
          return outputError(
            {
              code: 'OXN_REPORT_EXISTS',
              message: '报告已存在，使用 --force 覆盖',
            },
            format,
          )
        }

        const docsPath = join(explorePath, 'docs')
        const docsFiles = existsSync(docsPath) ? readdirSync(docsPath).filter((f) => f.endsWith('.md')) : []

        const aiDoc = loadQADocument(aiQAPath)
        const engDoc = loadQADocument(engQAPath)

        const sections: string[] = []
        sections.push(`# 探索报告: ${name}\n`)
        sections.push(`> 生成时间: ${new Date().toISOString()}\n`)

        sections.push('## 扫描资料\n')
        if (docsFiles.length > 0) {
          sections.push(docsFiles.map((f) => `- ${f}`).join('\n'))
        } else {
          sections.push('_无_')
        }
        sections.push('\n')

        sections.push('## AI 提问阶段\n')
        if (aiDoc.questions.length > 0) {
          for (const q of aiDoc.questions) {
            sections.push(`**Q${q.id}:** ${q.question}`)
            sections.push(`\n**A:** ${q.answer ?? '_待回答_'}\n`)
          }
        } else {
          sections.push('_无_\n')
        }

        sections.push('\n## 工程师提问阶段\n')
        if (engDoc.questions.length > 0) {
          for (const q of engDoc.questions) {
            sections.push(`**Q${q.id}:** ${q.question}`)
            sections.push(`\n**A:** ${q.answer ?? '_待回答_'}\n`)
          }
        } else {
          sections.push('_无_\n')
        }

        sections.push('\n## 关键发现\n')
        sections.push('_基于问答提取_\n\n')

        sections.push('## 待解决问题\n')
        const allQ = [...aiDoc.questions, ...engDoc.questions]
        const openQuestions = allQ.filter(
          (p) =>
            p.answer === null ||
            (p.answer && (p.answer.includes('未解决') || p.answer.includes('不确定') || p.answer.includes('TODO'))),
        )
        if (openQuestions.length > 0) {
          sections.push(openQuestions.map((p) => `- [ ] [Q${p.id}] ${p.question}`).join('\n'))
        } else {
          sections.push('_无_\n')
        }

        sections.push('\n## 总结\n')
        sections.push('_基于以上信息综合_\n')

        writeFileSync(reportPath, sections.join('\n'), 'utf-8')
        output(
          {
            data: { path: reportPath },
            human: `报告已生成: ${reportPath}`,
          },
          format,
        )
      },
    }),
    list: defineCommand({
      meta: {
        name: 'list',
        description: '列出所有探索',
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const exploresRoot = getExploresRoot()

        if (!existsSync(exploresRoot)) {
          return output({ data: { explores: [] }, human: '暂无探索' }, format)
        }

        const dirs = readdirSync(exploresRoot).filter((d) => existsSync(join(exploresRoot, d, 'ai-qa.json')))

        output(
          {
            data: { explores: dirs },
            human: dirs.length > 0 ? `探索列表:\n${dirs.map((d) => `  - ${d}`).join('\n')}` : '暂无探索',
          },
          format,
        )
      },
    }),
    delete: defineCommand({
      meta: {
        name: 'delete',
        description: '删除探索',
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: '探索名称',
        },
        '--force': {
          type: 'boolean',
          description: '跳过确认直接删除',
        },
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const name = ctx.args.name as string
        const exploresRoot = getExploresRoot()

        if (!exploreExists(name)) {
          return outputError(
            {
              code: 'OXN_EXPLORE_NOT_FOUND',
              message: `探索不存在: ${name}`,
            },
            format,
          )
        }

        const explorePath = join(exploresRoot, name)

        if (!ctx.args.force) {
          output(
            {
              data: { path: explorePath },
              human: `确认删除探索 "${name}"？\n路径: ${explorePath}\n\n使用 --force 确认删除`,
            },
            format,
          )
          return
        }

        rmSync(explorePath, { recursive: true, force: true })
        output(
          {
            data: { deleted: name },
            human: `已删除探索: ${name}`,
          },
          format,
        )
      },
    }),
  },
  run() {
    console.log('使用 oxn explore <subcommand> 查看可用子命令')
    console.log('子命令: new, scan, qa, report, list, delete')
  },
})
