import { defineCommand } from 'citty'
import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'fs'
import { createOxnSharedServices } from '../oxn-dsl/langium/oxn-services'
import { URI } from 'langium'
import { createOxnCrudProcessor, type AddProbeIntent } from '../oxn-dsl/crud/oxn-crud-processor'
import { type ProbeConfig } from '../oxn-dsl/crud/oxn-serializer'
import type { TextEdit } from 'vscode-languageserver-types'

export default defineCommand({
  meta: {
    name: 'add-probe',
    description: '给 Part 添加探针',
  },
  args: {
    '--to-part': {
      type: 'string',
      description: '目标 Part 名称',
    },
    '--blueprint': {
      type: 'string',
      description: '目标 Blueprint 名称',
    },
    '--data': {
      type: 'string',
      description: '探针配置 JSON',
    },
    '--file': {
      type: 'string',
      description: '从文件加载探针配置',
    },
  },
  async run(ctx) {
    const partName = ctx.args['--to-part']
    const blueprintName = ctx.args['--blueprint']
    let dataStr = ctx.args['--data']

    if (ctx.args['--file']) {
      dataStr = readFileSync(ctx.args['--file'], 'utf-8')
    }

    if (!partName || !blueprintName || !dataStr) {
      console.error('缺少必要参数: --to-part, --blueprint, --data')
      process.exit(1)
    }

    let probeConfig: ProbeConfig
    try {
      probeConfig = JSON.parse(dataStr) as ProbeConfig
    } catch {
      console.error('JSON 解析失败')
      process.exit(1)
    }

    const intent: AddProbeIntent = {
      blueprint_name: blueprintName,
      part_name: partName,
      probe_config: probeConfig,
    }

    const oxnFiles = findOxnFiles(process.cwd())
    if (oxnFiles.length === 0) {
      console.error('未找到 .oxn 文件')
      process.exit(1)
    }

    const sharedServices = createOxnSharedServices()
    const documentBuilder = sharedServices.workspace.DocumentBuilder
    const langiumDocuments = sharedServices.workspace.LangiumDocuments
    const documentFactory = sharedServices.workspace.LangiumDocumentFactory

    const processor = createOxnCrudProcessor()
    let finalEdits: TextEdit[] = []
    let targetFile = ''

    for (const oxnFile of oxnFiles) {
      const absolutePath = oxnFile
      const mainUri = URI.file(absolutePath)
      const mainText = readFileSync(absolutePath, 'utf-8')

      let mainDocument
      try {
        mainDocument = langiumDocuments.createDocument(mainUri, mainText)
      } catch {
        mainDocument = await documentFactory.fromString(mainText, mainUri)
      }

      await documentBuilder.build([mainDocument], { validation: false })

      if (mainDocument.state < 2) {
        continue
      }

      const result = processor.calculateTextEdits(intent, mainDocument)
      if (result.edits.length > 0) {
        finalEdits = result.edits
        targetFile = absolutePath
        break
      }
    }

    if (!targetFile) {
      console.error('未找到目标 Blueprint 或 Part')
      process.exit(1)
    }

    const originalContent = readFileSync(targetFile, 'utf-8')
    const newContent = applyTextEdits(originalContent, finalEdits)

    const shadowPath = `${targetFile}.shadow`
    writeFileSync(shadowPath, newContent, 'utf-8')

    try {
      renameSync(shadowPath, targetFile)
    } catch {
      unlinkSync(shadowPath)
      console.error('文件写入失败')
      process.exit(1)
    }

    console.log(`成功添加探针到 ${targetFile}`)
  },
})

function findOxnFiles(dir: string): string[] {
  const { readdirSync, existsSync } = require('fs')
  const { join } = require('path')
  const files: string[] = []

  if (!existsSync(dir)) return files

  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      files.push(...findOxnFiles(join(dir, entry.name)))
    } else if (entry.name.endsWith('.oxn')) {
      files.push(join(dir, entry.name))
    }
  }

  return files
}

function applyTextEdits(content: string, edits: TextEdit[]): string {
  const lines = content.split('\n')
  const sortedEdits = [...edits].sort((a, b) => {
    const aStart = a.range.start.line
    const bStart = b.range.start.line
    if (aStart !== bStart) return bStart - aStart
    return b.range.start.character - a.range.start.character
  })

  for (const edit of sortedEdits) {
    const startLine = edit.range.start.line
    const endLine = edit.range.end.line
    const startChar = edit.range.start.character
    const endChar = edit.range.end.character

    if (startLine === endLine && startChar === endChar) {
      const line = lines[startLine] || ''
      lines[startLine] = line.slice(0, startChar) + edit.newText + line.slice(endChar)
    } else if (startLine === endLine) {
      const line = lines[startLine] || ''
      lines[startLine] = line.slice(0, startChar) + edit.newText + line.slice(endChar)
    } else {
      const startLineContent = lines[startLine] || ''
      const endLineContent = lines[endLine] || ''
      const newStart = startLineContent.slice(0, startChar) + edit.newText.split('\n')[0]
      lines[startLine] = newStart
      lines[endLine] = endLineContent.slice(endChar)
    }
  }

  return lines.join('\n')
}
