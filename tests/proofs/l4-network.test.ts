import { describe, test, expect } from 'bun:test'
import { executeProof } from '../../src/core/proof-dispatcher'
import type { ProofExecutionContext } from '../../src/types/proof'

describe('L4 Network Proofs', () => {
  const context: ProofExecutionContext = {
    projectRoot: process.cwd()
  }
  
  describe('http_status', () => {
    test('should return true for expected status code', async () => {
      const result = await executeProof(
        'http_status',
        { 
          url: 'https://httpbin.org/status/200',
          method: 'GET',
          expected_status: 200
        },
        { ...context, timeout: 10000 }
      )
      
      expect(result.passed).toBe(true)
      expect(result.output?.success).toBe(true)
    }, 15000)
    
    test('should return false for unexpected status code', async () => {
      const result = await executeProof(
        'http_status',
        { 
          url: 'https://httpbin.org/status/404',
          method: 'GET',
          expected_status: 200
        },
        { ...context, timeout: 10000 }
      )
      
      expect(result.passed).toBe(false)
      expect(result.output?.success).toBe(false)
    }, 15000)
    
    test('should return false for invalid URL', async () => {
      const result = await executeProof(
        'http_status',
        { 
          url: 'https://invalid-url-12345.com',
          method: 'GET',
          expected_status: 200
        },
        { ...context, timeout: 5000 }
      )
      
      expect(result.passed).toBe(false)
    }, 10000)
  })
})
