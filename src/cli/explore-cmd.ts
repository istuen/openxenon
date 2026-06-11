/**
 * @deprecated 此模块已废弃，请使用 oxn work init --type explore 替代
 * 旧命令保持兼容以支持现有工作流，数据路径不变 (.openxenon/explores/)
 */
import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { extname, join } from 'path'
import { BOUNDARY_DIR } from '../kernel/index'
import { t } from '../infra/i18n'
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
    description: t('explore.description'),
  },
  subCommands: {
    new: defineCommand({
      meta: {
        name: 'new',
        description: t('explore.new.description'),
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: t('explore.new.name'),
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
              message: t('explore.exists', { name }),
              suggestion: t('explore.existsHint'),
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
            human: t('explore.created', { path: explorePath }),
          },
          getFormatFromArgs(ctx.args),
        )
      },
    }),
    scan: defineCommand({
      meta: {
        name: 'scan',
        description: t('explore.scan.description'),
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: t('explore.scan.name'),
        },
        '--path': {
          type: 'string',
          description: t('explore.scan.path'),
        },
        '--read': {
          type: 'string',
          description: t('explore.scan.read'),
        },
        '--title': {
          type: 'string',
          description: t('explore.scan.title'),
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
              message: t('explore.notFound', { name }),
              suggestion: t('explore.notFoundHint'),
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
                message: t('explore.fileNotFound', { path: sourcePath }),
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
              human: t('explore.scanIndexed', { path: sourcePath, summary }),
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
                message: t('explore.fileNotFound', { path: filePath }),
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
            output({ data: { files: [] }, human: t('explore.scanNoFiles') }, format)
          }
        }
      },
    }),
    qa: defineCommand({
      meta: {
        name: 'qa',
        description: t('explore.qa.description'),
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: t('explore.qa.name'),
        },
        '--type': {
          type: 'string',
          description: t('explore.qa.type'),
        },
        '--ask': {
          type: 'string',
          description: t('explore.qa.question'),
        },
        '--answer': {
          type: 'string',
          description: t('explore.qa.answer'),
        },
        '--list': {
          type: 'boolean',
          description: t('explore.qa.list'),
        },
        '--pending': {
          type: 'boolean',
          description: t('explore.qa.pending'),
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
              message: t('explore.notFound', { name }),
              suggestion: t('explore.notFoundHint'),
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
            return outputError({ code: 'OXN_INTERNAL_ERROR', message: t('explore.addFailed') }, format)
          }
          output(
            {
              data: { id: lastQ.id, question: lastQ.question, answer: null },
              human: t('explore.qaAdded', { id: lastQ.id, question }),
            },
            format,
          )
        } else if (ctx.args.answer) {
          const [id, ...rest] = (ctx.args.answer as string).split('|')
          if (!id || rest.length === 0) {
            return outputError(
              {
                code: 'OXN_INVALID_ANSWER_FORMAT',
                message: t('explore.invalidAnswer'),
              },
              format,
            )
          }
          const answer = rest.join('|')
          if (updateQAAnswer(qaPath, id, answer)) {
            output(
              {
                data: { id, answer },
                human: t('explore.qaAnswered', { id, answer }),
              },
              format,
            )
          } else {
            return outputError(
              {
                code: 'OXN_QA_NOT_FOUND',
                message: t('explore.qaNotFound', { id }),
              },
              format,
            )
          }
        } else if (ctx.args.pending) {
          const doc = loadQADocument(qaPath)
          const pending = doc.questions.filter((q) => q.answer === null)
          if (pending.length === 0) {
            output({ data: { pending: [] }, human: t('explore.qaNoPending') }, format)
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
            output({ data: { questions: [] }, human: t('explore.qaNoRecords') }, format)
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
              human: t('explore.qaListed', {
                aiPath,
                aiCount: aiDoc.questions.length,
                engPath,
                engCount: engDoc.questions.length,
              }),
            },
            format,
          )
        }
      },
    }),
    report: defineCommand({
      meta: {
        name: 'report',
        description: t('explore.report.description'),
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: t('explore.report.name'),
        },
        '--force': {
          type: 'boolean',
          description: t('explore.report.force'),
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
              message: t('explore.notFound', { name }),
              suggestion: t('explore.notFoundHint'),
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
              message: t('explore.noQaRecords'),
            },
            format,
          )
        }

        if (existsSync(reportPath) && !ctx.args.force) {
          return outputError(
            {
              code: 'OXN_REPORT_EXISTS',
              message: t('explore.reportExists'),
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
            human: t('explore.reportGenerated', { path: reportPath }),
          },
          format,
        )
      },
    }),
    list: defineCommand({
      meta: {
        name: 'list',
        description: t('explore.list.description'),
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const exploresRoot = getExploresRoot()

        if (!existsSync(exploresRoot)) {
          return output({ data: { explores: [] }, human: t('explore.noExplores') }, format)
        }

        const dirs = readdirSync(exploresRoot).filter((d) => existsSync(join(exploresRoot, d, 'ai-qa.json')))

        output(
          {
            data: { explores: dirs },
            human: dirs.length > 0 ? `Explores:\n${dirs.map((d) => `  - ${d}`).join('\n')}` : t('explore.noExplores'),
          },
          format,
        )
      },
    }),
    delete: defineCommand({
      meta: {
        name: 'delete',
        description: t('explore.delete.description'),
      },
      args: {
        name: {
          type: 'string',
          required: true,
          description: t('explore.delete.name'),
        },
        '--force': {
          type: 'boolean',
          description: t('explore.delete.force'),
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
              message: t('explore.notFound', { name }),
            },
            format,
          )
        }

        const explorePath = join(exploresRoot, name)

        if (!ctx.args.force) {
          output(
            {
              data: { path: explorePath },
              human: t('explore.deleteConfirm', { name, path: explorePath }),
            },
            format,
          )
          return
        }

        rmSync(explorePath, { recursive: true, force: true })
        output(
          {
            data: { deleted: name },
            human: t('explore.deleted', { name }),
          },
          format,
        )
      },
    }),
  },
  run() {
    console.log('Run oxn explore <subcommand> to see available subcommands')
    console.log('子命令: new, scan, qa, report, list, delete')
  },
})
