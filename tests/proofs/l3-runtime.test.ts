import { describe, test, expect } from 'bun:test'
import { executeProof } from '../../src/core/proof-dispatcher'
import type { ProofExecutionContext } from '../../src/types/proof'

describe('L3 Runtime State Proofs', () => {
  const context: ProofExecutionContext = {
    projectRoot: process.cwd()
  }
  
  describe('env_exists', () => {
    test('should return true for existing environment variable', async () => {
      process.env.TEST_VAR = 'test_value'
      
      const result = await executeProof(
        'env_exists',
        { key: 'TEST_VAR' },
        context
      )
      
      expect(result.passed).toBe(true)
      expect(result.output?.success).toBe(true)
      
      delete process.env.TEST_VAR
    })
    
    test('should return false for non-existing environment variable', async () => {
      const result = await executeProof(
        'env_exists',
        { key: 'NON_EXISTING_VAR_12345' },
        context
      )
      
      expect(result.passed).toBe(false)
      expect(result.output?.success).toBe(false)
    })
  })
  
  describe('db_query_bool', () => {
    test.skip('should return true for truthy query result', async () => {
      // This test requires a database connection
      // Skipped in unit tests, should be tested in integration tests
    })
    
    test.skip('should return false for falsy query result', async () => {
      // This test requires a database connection
      // Skipped in unit tests, should be tested in integration tests
    })
  })
})
