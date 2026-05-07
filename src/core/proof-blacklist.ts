import { FORBIDDEN_PROOF_TYPES } from '../types/proof'
import type { ForbiddenProofType } from '../types/proof'

export { FORBIDDEN_PROOF_TYPES }
export type { ForbiddenProofType }

export function isForbiddenProof(proofId: string): boolean {
  return FORBIDDEN_PROOF_TYPES.includes(proofId as ForbiddenProofType)
}

export function validateProofType(proofId: string): {
  valid: boolean
  reason?: string
} {
  if (isForbiddenProof(proofId)) {
    return {
      valid: false,
      reason: getForbiddenReason(proofId as ForbiddenProofType)
    }
  }
  
  return { valid: true }
}

export function getForbiddenReason(proofType: ForbiddenProofType): string {
  switch (proofType) {
    case 'llm_judge':
      return 'LLM judging proofs are forbidden. Using an LLM to judge another LLM\'s output is logically circular and unreliable.'
    
    case 'complex_business_logic_check':
      return 'Complex business logic checks are forbidden. They exceed atomic proof scope and should be decomposed into specific L1-L4 atomic proofs.'
    
    case 'code_style_score':
      return 'Code style scoring proofs are forbidden. Proofs must return absolute boolean values (0 or 1), not fuzzy scores.'
    
    default:
      return `Proof type '${proofType}' is forbidden.`
  }
}

export function filterForbiddenProofs(proofIds: string[]): string[] {
  return proofIds.filter(id => !isForbiddenProof(id))
}

export function getForbiddenProofTypes(): readonly ForbiddenProofType[] {
  return FORBIDDEN_PROOF_TYPES
}
