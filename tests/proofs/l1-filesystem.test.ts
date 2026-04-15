import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { executeProof } from '../../src/core/proof-dispatcher'
import type { ProofExecutionContext } from '../../src/types/proof'

const TEST_DIR = join(process.cwd(), 'test-temp-fs-proofs')

describe('L1 Filesystem Proofs', () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true })
    }
  })
  
  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
  })
  
  const context: ProofExecutionContext = {
    projectRoot: TEST_DIR
  }
  
  describe('fs_exists', () => {
    test('should return true when file exists', async () => {
      const testFile = join(TEST_DIR, 'exists.txt')
      writeFileSync(testFile, 'test content')
      
      const result = await executeProof('fs_exists', { path: 'exists.txt' }, context)
      
      expect(result.passed).toBe(true)
      expect(result.output?.success).toBe(true)
    })
    
    test('should return false when file does not exist', async () => {
      const result = await executeProof('fs_exists', { path: 'nonexistent.txt' }, context)
      
      expect(result.passed).toBe(false)
      expect(result.output?.success).toBe(false)
    })
  })
  
  describe('fs_not_exists', () => {
    test('should return true when file does not exist', async () => {
      const result = await executeProof('fs_not_exists', { path: 'nonexistent.txt' }, context)
      
      expect(result.passed).toBe(true)
      expect(result.output?.success).toBe(true)
    })
    
    test('should return false when file exists', async () => {
      const testFile = join(TEST_DIR, 'should-not-exist.txt')
      writeFileSync(testFile, 'test content')
      
      const result = await executeProof('fs_not_exists', { path: 'should-not-exist.txt' }, context)
      
      expect(result.passed).toBe(false)
      expect(result.output?.success).toBe(false)
    })
  })
  
  describe('fs_content_match', () => {
    test('should match content with regex pattern', async () => {
      const testFile = join(TEST_DIR, 'match.txt')
      writeFileSync(testFile, 'Hello World\nTest Line')
      
      const result = await executeProof(
        'fs_content_match',
        { path: 'match.txt', pattern: 'Hello.*World' },
        context
      )
      
      expect(result.passed).toBe(true)
      expect(result.output?.success).toBe(true)
    })
    
    test('should fail when pattern does not match', async () => {
      const testFile = join(TEST_DIR, 'no-match.txt')
      writeFileSync(testFile, 'Different content')
      
      const result = await executeProof(
        'fs_content_match',
        { path: 'no-match.txt', pattern: 'Hello.*World' },
        context
      )
      
      expect(result.passed).toBe(false)
      expect(result.output?.success).toBe(false)
    })
  })
  
  describe('fs_parseable', () => {
    test('should validate JSON syntax', async () => {
      const testFile = join(TEST_DIR, 'valid.json')
      writeFileSync(testFile, '{"key": "value"}')
      
      const result = await executeProof(
        'fs_parseable',
        { path: 'valid.json', parser: 'json' },
        context
      )
      
      expect(result.passed).toBe(true)
      expect(result.output?.success).toBe(true)
    })
    
    test('should fail on invalid JSON', async () => {
      const testFile = join(TEST_DIR, 'invalid.json')
      writeFileSync(testFile, '{invalid json}')
      
      const result = await executeProof(
        'fs_parseable',
        { path: 'invalid.json', parser: 'json' },
        context
      )
      
      expect(result.passed).toBe(false)
      expect(result.output?.success).toBe(false)
    })
  })
})
