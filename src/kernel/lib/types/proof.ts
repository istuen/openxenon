import type { ProofType } from './core'

export type ProofLayer = 'L1' | 'L2' | 'L3' | 'L4'

export type ProofCategory = 'built-in' | 'project' | 'global'

export interface ProofMetadata {
  id: string
  name: string
  layer: ProofLayer
  category: ProofCategory
  description: string
}

export interface Proof {
  id: string
  name: string
  type: ProofType
  path: string
  layer?: ProofLayer
  category?: ProofCategory
  description?: string
}

export interface XnProof extends Proof {
  layer: ProofLayer;
}

export interface ProofInput {
  [key: string]: unknown
}

export interface ProofOutput {
  success: boolean
  message?: string
  data?: unknown
}

export interface ProofResult {
  proofId: string
  passed: boolean
  output?: ProofOutput
  error?: string
  executionTime?: number
}

export interface ProofExecutionContext {
  projectRoot: string
  timeout?: number
  env?: Record<string, string>
}

export interface BuiltInProofDefinition {
  id: string
  name: string
  layer: ProofLayer
  description: string
  execute: (input: ProofInput, context: ProofExecutionContext) => Promise<ProofOutput>
  validateInput?: (input: ProofInput) => boolean
}

export interface CustomProofConfig {
  id: string
  name: string
  path: string
  category: 'project' | 'global'
  timeout?: number
}

export const FORBIDDEN_PROOF_TYPES = [
  'llm_judge',
  'complex_business_logic_check',
  'code_style_score'
] as const

export type ForbiddenProofType = typeof FORBIDDEN_PROOF_TYPES[number]

export interface ProofNotFoundError extends Error {
  name: 'ProofNotFoundError'
  proofId: string
  searchPaths: string[]
}

export class ProofNotFoundError extends Error {
  constructor(
    public proofId: string,
    public searchPaths: string[]
  ) {
    super(`Proof not found: ${proofId}. Searched paths: ${searchPaths.join(', ')}`)
    this.name = 'ProofNotFoundError'
  }
}

export interface ProofExecutionError extends Error {
  name: 'ProofExecutionError'
  proofId: string
  reason: string
}

export class ProofExecutionError extends Error {
  constructor(
    public proofId: string,
    public reason: string
  ) {
    super(`Proof execution failed: ${proofId}. Reason: ${reason}`)
    this.name = 'ProofExecutionError'
  }
}

export interface ProofTimeoutError extends Error {
  name: 'ProofTimeoutError'
  proofId: string
  timeout: number
}

export class ProofTimeoutError extends Error {
  constructor(
    public proofId: string,
    public timeout: number
  ) {
    super(`Proof execution timed out after ${timeout}ms: ${proofId}`)
    this.name = 'ProofTimeoutError'
  }
}
