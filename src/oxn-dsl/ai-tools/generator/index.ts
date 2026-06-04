/**
 * AI Tools Schema Generator
 *
 * 从 oxn.langium 源码自动生成 AI Tools JSON Schema 和 Zod 校验器。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

export interface AiToolAnnotation {
  name: string
  description: string
  example?: Record<string, unknown>
}

export interface GeneratorOptions {
  oxnLangiumPath: string
  outputDir: string
}

function parseAnnotationJson(jsonStr: string): AiToolAnnotation {
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    throw new Error(`注解 JSON 解析失败: ${jsonStr}\n${e}`)
  }
}

export function extractAnnotations(
  sourceCode: string,
): { annotation: AiToolAnnotation; ruleName: string; line: number }[] {
  const results: { annotation: AiToolAnnotation; ruleName: string; line: number }[] = []

  const commentBlockRegex = /\/\*\*([\s\S]*?)\*\/\s*\n(\w+):/g
  const toolStartRegex = /@oxn-ai-tool/

  let match
  while ((match = commentBlockRegex.exec(sourceCode)) !== null) {
    const commentContent = match[1]
    const ruleName = match[2]

    if (!commentContent || !toolStartRegex.test(commentContent)) continue

    const startIdx = commentContent.indexOf('{')
    const endIdx = commentContent.lastIndexOf('}')

    if (startIdx === -1 || endIdx === -1) continue

    const jsonLines = commentContent.substring(startIdx, endIdx + 1).split('\n')
    const cleanedJson = jsonLines.map((line) => line.replace(/^\s*\*\s*/, '')).join('\n')
    const lineNum = sourceCode.substring(0, match.index).split('\n').length

    try {
      results.push({
        annotation: parseAnnotationJson(cleanedJson.trim()),
        ruleName: ruleName ?? '',
        line: lineNum,
      })
    } catch {
      throw new Error(`行 ${lineNum}: 注解 JSON 解析失败\n${cleanedJson}`)
    }
  }
  return results
}

export function buildJsonSchema(annotations: { annotation: AiToolAnnotation; ruleName: string }[]): object {
  const definitions: Record<string, object> = {}

  for (const { annotation, ruleName: _ruleName } of annotations) {
    definitions[annotation.name] = {
      type: 'object',
      properties: {
        blueprint_name: { type: 'string', description: '目标 Blueprint 名称' },
        part_name: { type: 'string', description: '目标 Part 名称' },
        probe_config: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['HttpProbe', 'ShellProbe', 'FsProbe'] },
            ref: { type: 'string', format: 'oxn-ref', description: 'OXN 引用格式: @scope/type/name' },
            params: { type: 'object', additionalProperties: { type: 'string' } },
          },
          required: ['name', 'type'],
        },
      },
      required: ['blueprint_name', 'part_name', 'probe_config'],
    }
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions,
  }
}

export function buildZodValidators(annotations: { annotation: AiToolAnnotation; ruleName: string }[]): string {
  const lines: string[] = ['/**', ' * AI Tools Zod Validators', ' * 由 ai-tools-generator 自动生成', ' */', '']

  // 仅在有 annotation 时才导入 zod
  if (annotations.length > 0) {
    lines.push("import { z } from 'zod'")
    lines.push('')
  }

  for (const { annotation, ruleName: _ruleName } of annotations) {
    lines.push(`export const ${toUpperCamel(annotation.name)}Schema = z.object({`)
    lines.push('  blueprint_name: z.string(),')
    lines.push('  part_name: z.string(),')
    lines.push('  probe_config: z.object({')
    lines.push('    name: z.string(),')
    lines.push("    type: z.enum(['HttpProbe', 'ShellProbe', 'FsProbe']),")
    lines.push('    ref: z.string().optional(),')
    lines.push('    params: z.record(z.string(), z.string()).optional(),')
    lines.push('  }),')
    lines.push('})')
    lines.push('')
  }

  lines.push('export const validators = {')
  for (const { annotation } of annotations) {
    lines.push(`  ${annotation.name}: ${toUpperCamel(annotation.name)}Schema,`)
  }
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}

function toUpperCamel(str: string): string {
  return str
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

export function generateAiTools(options: GeneratorOptions): void {
  const { oxnLangiumPath, outputDir } = options

  if (!existsSync(oxnLangiumPath)) {
    throw new Error(`oxn.langium 文件不存在: ${oxnLangiumPath}`)
  }

  const sourceCode = readFileSync(oxnLangiumPath, 'utf-8')
  const annotations = extractAnnotations(sourceCode)

  if (annotations.length === 0) {
    console.warn('未找到 @oxn-ai-tool 注解')
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const schema = buildJsonSchema(annotations)
  const schemaPath = join(outputDir, 'schema.json')
  writeFileSync(schemaPath, JSON.stringify(schema, null, 2), 'utf-8')
  console.log(`生成 schema.json: ${schemaPath}`)

  const validatorsCode = buildZodValidators(annotations)
  const validatorsPath = join(outputDir, 'validators.ts')
  writeFileSync(validatorsPath, validatorsCode, 'utf-8')
  console.log(`生成 validators.ts: ${validatorsPath}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const langiumPath = join(process.cwd(), 'src/oxn-dsl/langium/oxn.langium')
  const outputPath = join(process.cwd(), 'src/oxn-dsl/ai-tools')

  generateAiTools({
    oxnLangiumPath: langiumPath,
    outputDir: outputPath,
  })
}
