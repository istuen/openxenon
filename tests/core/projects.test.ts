import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { registerProject, getAllProjects, getProjectByPath } from '../../src/core/projects'

const TEST_DIR = '/tmp/oxn-projects-test'

describe('Projects JSON CRUD', () => {
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

  describe('registerProject', () => {
    it('should register a new project', () => {
      const project = registerProject(TEST_DIR, 'test-project')
      expect(project.id).toBeDefined()
      expect(project.path).toBe(TEST_DIR)
      expect(project.name).toBe('test-project')
      expect(project.status).toBe('active')
    })

    it('should update existing project heartbeat', () => {
      const first = registerProject(TEST_DIR, 'test-project')
      const second = registerProject(TEST_DIR, 'test-project')
      expect(first.id).toBe(second.id)
      expect(second.lastHeartbeat).toBeGreaterThanOrEqual(first.lastHeartbeat)
    })
  })

  describe('getAllProjects', () => {
    it('should return empty array when no projects exist', () => {
      const projects = getAllProjects()
      expect(Array.isArray(projects)).toBe(true)
    })
  })

  describe('getProjectByPath', () => {
    it('should return undefined for non-existent project', () => {
      const project = getProjectByPath('/non/existent/path')
      expect(project).toBeUndefined()
    })
  })
})
