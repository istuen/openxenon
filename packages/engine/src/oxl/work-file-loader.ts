/**
 * work-file-loader.ts — Work file loading (v0.7.0: md-native only)
 *
 * v0.7.0: Removed Langium dependency; all parsing is md-native
 */

import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { parseMarkdown } from './md-pipeline/utils'
import { extractWorkIR } from './md-pipeline/transformers/work.js'

export interface WorkFileResult {
  ok: boolean
  work?: import('./md-pipeline/transformers/work').WorkIR
  errors: string[]
}

/**
 * Parse a .md work file and extract WorkIR
 */
export async function parseWorkFile(filePath: string): Promise<WorkFileResult> {
  if (!existsSync(filePath)) {
    return { ok: false, errors: [`work file not found: ${filePath}`] }
  }

  if (!filePath.endsWith('.md')) {
    return { ok: false, errors: ['v0.7.0+: only .md files are supported'] }
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const parsed = parseMarkdown(content)
    const work = extractWorkIR(parsed.tree, parsed.frontmatter)
    return { ok: true, work, errors: [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, errors: [message] }
  }
}

/**
 * Validate a work file (v0.7.0: md-native only)
 */
export async function validateWorkFile(filePath: string): Promise<WorkFileResult> {
  return parseWorkFile(filePath)
}

/**
 * @deprecated Use parseWorkFile instead
 */
export const parseOxnFile = parseWorkFile
