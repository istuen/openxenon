import type { BuiltInProofDefinition, ProofInput, ProofExecutionContext, ProofOutput } from '../../types/proof'
import { registerBuiltInProof } from '../built-in-proofs-registry'

export const httpStatusProof: BuiltInProofDefinition = {
  id: 'http_status',
  name: 'HTTP Status Check',
  layer: 'L4',
  description: 'Check if an HTTP endpoint returns the expected status code',
  
  validateInput(input: ProofInput): boolean {
    return (
      typeof input.url === 'string' && 
      input.url.length > 0 &&
      typeof input.expected_status === 'number' &&
      input.expected_status >= 100 &&
      input.expected_status <= 599
    )
  },
  
  async execute(input: ProofInput, context: ProofExecutionContext): Promise<ProofOutput> {
    const url = input.url as string
    const method = (input.method || 'GET') as string
    const expectedStatus = input.expected_status as number
    const timeout = context.timeout || 30000
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: input.headers as Record<string, string> || {}
      })
      
      clearTimeout(timeoutId)
      
      const actualStatus = response.status
      
      if (actualStatus === expectedStatus) {
        return {
          success: true,
          message: `HTTP ${method} ${url} returned expected status ${actualStatus}`,
          data: {
            url,
            method,
            expectedStatus,
            actualStatus,
            matched: true
          }
        }
      } else {
        return {
          success: false,
          message: `HTTP ${method} ${url} returned status ${actualStatus}, expected ${expectedStatus}`,
          data: {
            url,
            method,
            expectedStatus,
            actualStatus,
            matched: false
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      return {
        success: false,
        message: `HTTP request failed: ${errorMessage}`,
        data: {
          url,
          method,
          expectedStatus,
          error: errorMessage
        }
      }
    }
  }
}

registerBuiltInProof(httpStatusProof)
