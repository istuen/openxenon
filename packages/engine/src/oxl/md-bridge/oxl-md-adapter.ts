/**
 * oxl-md-adapter.ts — .md adapter (v0.7.0: Langium removed)
 *
 * v0.7.0: Only .md path remains; .oxn path removed
 */

import type { CompiledBlueprint, XenonMeta } from '@openxenon/engine/kernel/index.js'
import { runMdPipeline, type PipelineOutput } from './pipeline.js'
import { parseDomainMd, parseBlueprintMd, parseWorkMd } from './remark-to-mdast.js'
import { mdastToKernel, type MdastToKernelContext } from './mdast-to-kernel.js'
import { detectHashMismatch, type SourceHashMapping } from './oxl-md-source-hash.js'
import { compileMdToOxn } from './oxl-md-compiler.js'

// ========================
// Types
// ========================

/** Adapter preference (v0.7.0: only .md) */
export type PreferredFormat = '.md'

/** Adapter input */
export interface OxlMdAdapterInput {
  /** .md content */
  mdContent?: string
  /** .md contentHash */
  mdContentHash?: string
  /** .md parse result */
  mdPipelineOutput?: PipelineOutput
  /** Entity type */
  entity: 'domain' | 'blueprint' | 'work' | 'task' | 'proof'
  /** File path */
  filePath: string
  /** Source hash mapping */
  mapping?: SourceHashMapping
}

/** Adapter output */
export interface OxlMdAdapterResult {
  /** Kernel Schema (CompiledBlueprint) */
  kernel: CompiledBlueprint
  /** First part's XenonMeta */
  meta: XenonMeta
  /** Actual format used */
  preferred: PreferredFormat
  /** hash mismatch? */
  hashMismatch: boolean
  /** Compiled .oxn text (for backward compat) */
  compiledOxn?: string
  /** Convert time (ms) */
  convertTime: number
}

// ========================
// Main entry
// ========================

/**
 * .md adapter (v0.7.0: only .md supported)
 */
export function adaptOxlMd(input: OxlMdAdapterInput): OxlMdAdapterResult {
  const startTime = Date.now()

  if (!input.mdContent || !input.mdContentHash) {
    throw new OxlMdAdapterError('No .md content provided', input.entity)
  }

  // 1. mdast parse (reuse input.mdPipelineOutput if provided)
  if (!input.mdPipelineOutput) {
    runMdPipeline({
      content: input.mdContent,
      entity: input.entity,
      filePath: input.filePath,
    })
  }

  // 2. mdast → Kernel
  const kernelResult = mdastToKernel({
    entity: input.entity,
    filePath: input.filePath,
    content: input.mdContent,
  } as MdastToKernelContext)

  // 3. Compile .oxn (for backward compat)
  const parseResult = getParseResultByEntity(input.mdContent, input.entity, input.filePath)
  const compiledOxn = parseResult
    ? compileMdToOxn(parseResult, {
        entity: input.entity,
        mdContentHash: input.mdContentHash,
      }).oxn
    : undefined

  // 4. Hash mismatch detection
  let hashMismatch = false
  if (input.mapping) {
    const result = detectHashMismatch(input.mapping, input.mdContentHash)
    hashMismatch = result.mismatch
  }

  return {
    kernel: kernelResult.frozen,
    meta: kernelResult.meta,
    preferred: '.md',
    hashMismatch,
    compiledOxn,
    convertTime: Date.now() - startTime,
  }
}

// ========================
// Helper functions
// ========================

/**
 * Get parse result by entity type (for compiler)
 */
function getParseResultByEntity(
  pipeline: PipelineOutput | string,
  entity: 'domain' | 'blueprint' | 'work' | 'task' | 'proof',
  filePath?: string,
): ReturnType<typeof parseDomainMd> | ReturnType<typeof parseBlueprintMd> | ReturnType<typeof parseWorkMd> | null {
  try {
    const content = typeof pipeline === 'string' ? pipeline : ''
    const path = typeof pipeline === 'string' ? filePath : (pipeline.filePath ?? '')

    switch (entity) {
      case 'domain':
        return parseDomainMd(content, path)
      case 'blueprint':
        return parseBlueprintMd(content, path)
      case 'work':
        return parseWorkMd(content, path)
      default:
        return null
    }
  } catch {
    return null
  }
}

// ========================
// Error types
// ========================

export class OxlMdAdapterError extends Error {
  constructor(
    message: string,
    public entity: string,
  ) {
    super(`[oxl-md-adapter] ${message}`)
    this.name = 'OxlMdAdapterError'
  }
}

// ========================
// Compile file helper
// ========================

/**
 * Compile a .md file to Kernel Schema
 */
export function compileMdFile(
  mdContent: string,
  entity: 'domain' | 'blueprint' | 'work' | 'task' | 'proof',
  filePath: string,
  mdContentHash: string,
): OxlMdAdapterResult {
  return adaptOxlMd({
    mdContent,
    mdContentHash,
    entity,
    filePath,
  })
}
