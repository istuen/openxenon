import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { executeProof } from '../../src/verification/proof-executor'

describe('Proof Executor', () => {
  const testDir = join(process.cwd(), 'test-temp')

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should return error for non-existent proof', async () => {
    const result = await executeProof(join(testDir, 'non-existent.ts'))
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('should execute a successful proof script', async () => {
    const proofPath = join(testDir, 'success-proof.ts')
    writeFileSync(proofPath, 'console.log("Proof passed"); process.exit(0);')
    
    const result = await executeProof(proofPath)
    
    expect(result.success).toBe(true)
    expect(result.output).toContain('Proof passed')
  })

  it('should handle proof script failure', async () => {
    const proofPath = join(testDir, 'fail-proof.ts')
    writeFileSync(proofPath, 'console.error("Proof failed"); process.exit(1);')
    
    const result = await executeProof(proofPath)
    
    expect(result.success).toBe(false)
  })
})
