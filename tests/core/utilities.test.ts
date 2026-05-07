import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import {
  getProjectBoundaryPath,
  getProjectConfigPath,
  getTasksPath,
  getTaskPath,
  getStepManifestPath,
  getTaskTracePath
} from '../../src/core/project'
import { createEmptyStepManifest, readStepManifest, writeStepManifest } from '../../src/core/manifest'

describe('Core Utilities', () => {
  const testProjectRoot = join(process.cwd(), 'test-project')

  beforeEach(() => {
    if (!existsSync(testProjectRoot)) {
      mkdirSync(testProjectRoot, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(testProjectRoot)) {
      rmSync(testProjectRoot, { recursive: true, force: true })
    }
  })

  describe('Project Path Utilities', () => {
    it('should return correct project boundary path', () => {
      const path = getProjectBoundaryPath(testProjectRoot)
      expect(path).toBe(join(testProjectRoot, '.openxenon'))
    })

    it('should return correct project config path', () => {
      const path = getProjectConfigPath(testProjectRoot)
      expect(path).toBe(join(testProjectRoot, '.openxenon', 'config.json'))
    })

    it('should return correct tasks path', () => {
      const path = getTasksPath(testProjectRoot)
      expect(path).toBe(join(testProjectRoot, '.openxenon', 'tasks'))
    })

    it('should return correct task path', () => {
      const path = getTaskPath(testProjectRoot, 'task-123')
      expect(path).toBe(join(testProjectRoot, '.openxenon', 'tasks', 'task-123'))
    })

    it('should return correct step manifest path', () => {
      const path = getStepManifestPath(testProjectRoot, 'task-123')
      expect(path).toBe(join(testProjectRoot, '.openxenon', 'tasks', 'task-123', 'step-manifest.json'))
    })

    it('should return correct task trace path', () => {
      const path = getTaskTracePath(testProjectRoot, 'task-123')
      expect(path).toBe(join(testProjectRoot, '.openxenon', 'tasks', 'task-123', 'task-trace.yaml'))
    })
  })

  describe('Manifest Utilities', () => {
    it('should create empty step manifest', () => {
      const manifest = createEmptyStepManifest('task-123')
      
      expect(manifest.taskId).toBe('task-123')
      expect(manifest.status).toBe('PENDING')
      expect(manifest.artifacts).toEqual([])
    })

    it('should write and read step manifest', () => {
      const manifestPath = join(testProjectRoot, 'manifest.json')
      const manifest = createEmptyStepManifest('task-123')
      manifest.stepId = 'step-1'
      manifest.status = 'RUNNING'
      
      writeStepManifest(manifestPath, manifest)
      const read = readStepManifest(manifestPath)
      
      expect(read).toBeDefined()
      expect(read?.taskId).toBe('task-123')
      expect(read?.stepId).toBe('step-1')
      expect(read?.status).toBe('RUNNING')
    })

    it('should return null for non-existent manifest', () => {
      const manifest = readStepManifest(join(testProjectRoot, 'non-existent.json'))
      expect(manifest).toBeNull()
    })
  })
})
