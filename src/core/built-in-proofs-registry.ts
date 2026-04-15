import type { 
  BuiltInProofDefinition, 
  ProofInput, 
  ProofExecutionContext,
  ProofOutput,
  ProofLayer
} from '../types/proof'
import { ProofNotFoundError } from '../types/proof'

class BuiltInProofRegistry {
  private proofs: Map<string, BuiltInProofDefinition> = new Map()
  private layerIndex: Map<ProofLayer, Set<string>> = new Map([
    ['L1', new Set()],
    ['L2', new Set()],
    ['L3', new Set()],
    ['L4', new Set()]
  ])

  register(definition: BuiltInProofDefinition): void {
    if (this.proofs.has(definition.id)) {
      throw new Error(`Proof already registered: ${definition.id}`)
    }

    this.proofs.set(definition.id, definition)
    this.layerIndex.get(definition.layer)?.add(definition.id)
  }

  has(proofId: string): boolean {
    return this.proofs.has(proofId)
  }

  get(proofId: string): BuiltInProofDefinition | undefined {
    return this.proofs.get(proofId)
  }

  getAll(): BuiltInProofDefinition[] {
    return Array.from(this.proofs.values())
  }

  getByLayer(layer: ProofLayer): BuiltInProofDefinition[] {
    const ids = this.layerIndex.get(layer)
    if (!ids) return []
    
    return Array.from(ids)
      .map(id => this.proofs.get(id))
      .filter((p): p is BuiltInProofDefinition => p !== undefined)
  }

  async execute(
    proofId: string, 
    input: ProofInput, 
    context: ProofExecutionContext
  ): Promise<ProofOutput> {
    const proof = this.proofs.get(proofId)
    
    if (!proof) {
      throw new ProofNotFoundError(proofId, ['built-in-memory-dict'])
    }

    if (proof.validateInput && !proof.validateInput(input)) {
      return {
        success: false,
        message: `Invalid input for proof: ${proofId}`
      }
    }

    return proof.execute(input, context)
  }

  list(): string[] {
    return Array.from(this.proofs.keys())
  }
}

export const builtInProofRegistry = new BuiltInProofRegistry()

export function registerBuiltInProof(definition: BuiltInProofDefinition): void {
  builtInProofRegistry.register(definition)
}

export function getBuiltInProof(proofId: string): BuiltInProofDefinition | undefined {
  return builtInProofRegistry.get(proofId)
}

export function hasBuiltInProof(proofId: string): boolean {
  return builtInProofRegistry.has(proofId)
}

export async function executeBuiltInProof(
  proofId: string,
  input: ProofInput,
  context: ProofExecutionContext
): Promise<ProofOutput> {
  return builtInProofRegistry.execute(proofId, input, context)
}

export function listBuiltInProofs(): string[] {
  return builtInProofRegistry.list()
}

export function getBuiltInProofsByLayer(layer: ProofLayer): BuiltInProofDefinition[] {
  return builtInProofRegistry.getByLayer(layer)
}

export function getAllBuiltInProofs(): BuiltInProofDefinition[] {
  return builtInProofRegistry.getAll()
}
