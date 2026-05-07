import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { getSpaceMode, setSpaceMode } from '../../src/core/config'

const TEST_DIR = '/tmp/oxn-config-test'

describe('Config JSON CRUD', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  describe('getSpaceMode', () => {
    it('should return PRODUCTION as default when no config exists', () => {
      const mode = getSpaceMode(TEST_DIR)
      expect(mode).toBe('PRODUCTION')
    })
  })

  describe('setSpaceMode', () => {
    it('should set space mode to SANDBOX', () => {
      setSpaceMode(TEST_DIR, 'SANDBOX')
      const mode = getSpaceMode(TEST_DIR)
      expect(mode).toBe('SANDBOX')
    })

    it('should set space mode back to PRODUCTION', () => {
      setSpaceMode(TEST_DIR, 'PRODUCTION')
      const mode = getSpaceMode(TEST_DIR)
      expect(mode).toBe('PRODUCTION')
    })
  })
})
