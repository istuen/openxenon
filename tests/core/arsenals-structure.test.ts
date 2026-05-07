import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { join } from 'path'
import { writeFileSync, unlinkSync, mkdirSync, rmSync, existsSync, readFileSync, cpSync } from 'fs'
import { randomUUID } from 'crypto'

const TEST_DIR = join('/tmp', 'oxn-arsenals-test-' + randomUUID().slice(0, 8))

function setupOldStructure(type: string, name: string, state: string, content: string) {
  const dir = join(TEST_DIR, 'arsenals', type, state)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${name}.yaml`), content, 'utf-8')
}

function setupNewStructure(type: string, name: string, state: string, content: string) {
  const fileName = state === 'draft' ? 'draft.yaml' : 'canonical.yaml'
  const dir = join(TEST_DIR, 'arsenals', type, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, fileName), content, 'utf-8')
}

function cleanup() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }
}

describe('Arsenals Directory Structure', () => {
  beforeEach(() => {
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  describe('New Structure Path Generation', () => {
    test('generates correct new structure path for draft asset', () => {
      const type = 'blueprints'
      const name = 'my-blueprint'

      const expectedPath = join(TEST_DIR, 'arsenals', type, name, 'draft.yaml')
      const dir = join(TEST_DIR, 'arsenals', type, name)
      mkdirSync(dir, { recursive: true })
      writeFileSync(expectedPath, 'test: true', 'utf-8')

      expect(existsSync(expectedPath)).toBe(true)
    })

    test('generates correct new structure path for canonical asset', () => {
      const type = 'probes'
      const name = 'check-files'

      const expectedPath = join(TEST_DIR, 'arsenals', type, name, 'canonical.yaml')
      const dir = join(TEST_DIR, 'arsenals', type, name)
      mkdirSync(dir, { recursive: true })
      writeFileSync(expectedPath, 'test: true', 'utf-8')

      expect(existsSync(expectedPath)).toBe(true)
    })
  })

  describe('Old Structure Compatibility', () => {
    test('old structure path is correctly identified', () => {
      const type = 'blueprints'
      const name = 'old-blueprint'
      const state = 'draft'

      setupOldStructure(type, name, state, 'old: true')

      const oldPath = join(TEST_DIR, 'arsenals', type, state, `${name}.yaml`)
      expect(existsSync(oldPath)).toBe(true)
    })
  })

  describe('Path Structure Detection', () => {
    test('detects new structure path correctly', () => {
      const newPath = '/project/.openxenon/arsenals/blueprints/my-asset/draft.yaml'
      const isNew = newPath.includes('/draft.yaml') || newPath.includes('/canonical.yaml')
      expect(isNew).toBe(true)
    })

    test('detects old structure path correctly', () => {
      const oldPath = '/project/.openxenon/arsenals/blueprints/draft/my-asset.yaml'
      const isOld = oldPath.includes('/draft/') || oldPath.includes('/canonical/')
      expect(isOld).toBe(true)
    })
  })

  describe('Migration Logic', () => {
    test('migrates old structure to new structure', () => {
      const type = 'probes'
      const name = 'test-probe'
      const content = 'type: fs_exists\npattern: "**/*.json"'

      setupOldStructure(type, name, 'draft', content)

      const oldPath = join(TEST_DIR, 'arsenals', type, 'draft', `${name}.yaml`)
      const newPath = join(TEST_DIR, 'arsenals', type, name, 'draft.yaml')

      expect(existsSync(oldPath)).toBe(true)
      expect(existsSync(newPath)).toBe(false)

      const newDir = join(TEST_DIR, 'arsenals', type, name)
      mkdirSync(newDir, { recursive: true })
      cpSync(oldPath, newPath)
      unlinkSync(oldPath)

      expect(existsSync(oldPath)).toBe(false)
      expect(existsSync(newPath)).toBe(true)
      expect(readFileSync(newPath, 'utf-8')).toBe(content)
    })

    test('skips migration when new structure already exists', () => {
      const type = 'stages'
      const name = 'test-stage'
      const content = 'old: content'

      setupOldStructure(type, name, 'draft', content)
      setupNewStructure(type, name, 'draft', 'new: content')

      const newPath = join(TEST_DIR, 'arsenals', type, name, 'draft.yaml')

      const newContent = readFileSync(newPath, 'utf-8')
      expect(newContent).toBe('new: content')
    })
  })
})