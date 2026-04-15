import { describe, test, expect } from 'bun:test'
import { executeProof } from '../../src/core/proof-dispatcher'
import type { ProofExecutionContext } from '../../src/types/proof'

describe('L2 Process Execution Proofs', () => {
  const context: ProofExecutionContext = {
    projectRoot: process.cwd()
  }
  
  describe('exec_exit_zero', () => {
    test('should return true for successful command', async () => {
      const result = await executeProof(
        'exec_exit_zero',
        { command: 'echo test' },
        context
      )
      
      expect(result.passed).toBe(true)
      expect(result.output?.success).toBe(true)
    })
    
    test('should return false for failing command', async () => {
      const result = await executeProof(
        'exec_exit_zero',
        { command: 'exit 1' },
        context
      )
      
      expect(result.passed).toBe(false)
      expect(result.output?.success).toBe(false)
    })
  })
  
  describe('exec_stdout_match', () => {
    test('should match stdout with regex pattern', async () => {
      const result = await executeProof(
        'exec_stdout_match',
        { command: 'echo "Hello World"', pattern: 'Hello.*World' },
        context
      )
      
      expect(result.passed).toBe(true)
      expect(result.output?.success).toBe(true)
    })
    
    test('should fail when pattern does not match stdout', async () => {
      const result = await executeProof(
        'exec_stdout_match',
        { command: 'echo "Different output"', pattern: 'Hello.*World' },
        context
      )
      
      expect(result.passed).toBe(false)
      expect(result.output?.success).toBe(false)
    })
  })
})
