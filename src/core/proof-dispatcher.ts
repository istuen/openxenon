import './built-in-proofs'
import type { ProofInput, ProofOutput, ProofExecutionContext, ProofResult } from '../types/proof'
import { ProofNotFoundError } from '../types/proof'
import { hasBuiltInProof, executeBuiltInProof, getAllBuiltInProofs } from './built-in-proofs-registry'
import { findCustomProof, getAllCustomProofs } from './custom-proofs-scanner'
import { executeCustomProofSafe } from '../verification/custom-proof-executor'
import { validateProofInput } from './proof-parameters'
import { FORBIDDEN_PROOF_TYPES } from '../types/proof'
import { type Proof } from '../types/arsenal/blueprint'
import { routeProbeToBuiltin, type ProbeResult } from './arsenal-probe-router'

export interface ProofDispatchResult {
  proofId: string
  found: boolean
  category?: 'built-in' | 'project' | 'global'
  path?: string
  result?: ProofOutput
  error?: string
  searchPaths?: string[]
}

export async function dispatchProof(
  proofId: string,
  input: ProofInput,
  context: ProofExecutionContext
): Promise<ProofDispatchResult> {
  const searchPaths: string[] = []
  
  if (FORBIDDEN_PROOF_TYPES.includes(proofId as any)) {
    return {
      proofId,
      found: false,
      error: `Forbidden proof type: ${proofId}. This proof type is not allowed.`,
      searchPaths: []
    }
  }
  
  const validation = validateProofInput(proofId, input)
  if (!validation.valid) {
    return {
      proofId,
      found: false,
      error: `Invalid input: ${validation.errors?.join('; ')}`,
      searchPaths: []
    }
  }
  
  if (hasBuiltInProof(proofId)) {
    try {
      const result = await executeBuiltInProof(proofId, input, context)
      return {
        proofId,
        found: true,
        category: 'built-in',
        result,
        searchPaths: ['built-in-memory-dict']
      }
    } catch (error) {
      return {
        proofId,
        found: true,
        category: 'built-in',
        error: error instanceof Error ? error.message : String(error),
        searchPaths: ['built-in-memory-dict']
      }
    }
  }
  
  searchPaths.push('built-in-memory-dict')
  
  const customProof = findCustomProof(proofId, context.projectRoot)
  
  if (!customProof) {
    searchPaths.push(
      `${context.projectRoot}/.openxenon/proofs/`,
      '~/.openxenon/custom-proofs/'
    )
    
    const error = new ProofNotFoundError(proofId, searchPaths)
    return {
      proofId,
      found: false,
      error: error.message,
      searchPaths
    }
  }
  
  try {
    const result = await executeCustomProofSafe({
      proof: customProof,
      input,
      context
    })
    
    return {
      proofId,
      found: true,
      category: customProof.category,
      path: customProof.path,
      result,
      searchPaths: [customProof.path]
    }
  } catch (error) {
    return {
      proofId,
      found: true,
      category: customProof.category,
      path: customProof.path,
      error: error instanceof Error ? error.message : String(error),
      searchPaths: [customProof.path]
    }
  }
}

export async function executeProof(
  proofId: string,
  input: ProofInput,
  context: ProofExecutionContext
): Promise<ProofResult> {
  const startTime = Date.now()
  const dispatchResult = await dispatchProof(proofId, input, context)
  const executionTime = Date.now() - startTime
  
  if (!dispatchResult.found) {
    const error = new ProofNotFoundError(proofId, dispatchResult.searchPaths || [])
    return {
      proofId,
      passed: false,
      error: error.message,
      executionTime
    }
  }
  
  if (dispatchResult.error) {
    return {
      proofId,
      passed: false,
      error: dispatchResult.error,
      executionTime,
      output: dispatchResult.result
    }
  }
  
  return {
    proofId,
    passed: dispatchResult.result?.success || false,
    output: dispatchResult.result,
    executionTime
  }
}

export function listAllProofs(projectRoot: string): Array<{
  id: string
  name: string
  category: 'built-in' | 'project' | 'global'
  layer?: string
  description?: string
}> {
  const builtInProofs = getAllBuiltInProofs().map(p => ({
    id: p.id,
    name: p.name,
    category: 'built-in' as const,
    layer: p.layer,
    description: p.description
  }))
  
  const customProofs = getAllCustomProofs(projectRoot).map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    path: p.path
  }))
  
  const projectProofIds = new Set(
    customProofs.filter(p => p.category === 'project').map(p => p.id)
  )
  
  const filteredCustomProofs = customProofs.filter(
    p => p.category === 'project' || !projectProofIds.has(p.id)
  )
  
  return [...builtInProofs, ...filteredCustomProofs]
}

export function hasProof(proofId: string, projectRoot: string): boolean {
  if (hasBuiltInProof(proofId)) {
    return true
  }

  const customProof = findCustomProof(proofId, projectRoot)
  return customProof !== undefined
}

export interface ArsenalProofResult {
  passed: boolean
  probeResults: ProbeResult[]
  errors: string[]
}

export async function dispatchArsenalProof(
  proof: Proof,
  context: ProofExecutionContext
): Promise<ArsenalProofResult> {
  const probeResults: ProbeResult[] = []
  const errors: string[] = []

  for (const probe of proof.probes) {
    const result = await routeProbeToBuiltin(probe, context)
    probeResults.push(result)
    if (result.error) {
      errors.push(result.error)
    }
  }

  const passed = probeResults.every(r => r.passed)

  return { passed, probeResults, errors }
}
