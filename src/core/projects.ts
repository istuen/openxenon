import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'fs'
import { dirname } from 'path'
import { CORE_PROJECTS_PATH } from './global'

export interface ProjectRecord {
  id: string
  path: string
  name: string
  status: 'active' | 'inactive'
  lastHeartbeat: number
  createdAt: number
  updatedAt: number
}

interface ProjectsJson {
  version: 1
  projects: ProjectRecord[]
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    import('fs').then(({ mkdirSync }) => mkdirSync(dir, { recursive: true }))
  }
}

function atomicWrite(filePath: string, data: string): void {
  const tmpPath = filePath + '.tmp'
  ensureDir(filePath)
  writeFileSync(tmpPath, data, 'utf-8')
  if (process.platform === 'win32' && existsSync(filePath)) {
    unlinkSync(filePath)
  }
  renameSync(tmpPath, filePath)
}

function readProjects(): ProjectRecord[] {
  if (!existsSync(CORE_PROJECTS_PATH)) {
    return []
  }
  try {
    const content = readFileSync(CORE_PROJECTS_PATH, 'utf-8')
    const data = JSON.parse(content) as ProjectsJson
    return data.projects ?? []
  } catch {
    return []
  }
}

function writeProjects(projects: ProjectRecord[]): void {
  const data: ProjectsJson = { version: 1, projects }
  atomicWrite(CORE_PROJECTS_PATH, JSON.stringify(data, null, 2))
}

export function registerProject(projectRoot: string, name: string): ProjectRecord {
  const projects = readProjects()
  const existing = projects.find(p => p.path === projectRoot)
  const now = Date.now()

  if (existing) {
    existing.lastHeartbeat = now
    existing.updatedAt = now
    writeProjects(projects)
    return existing
  }

  const newProject: ProjectRecord = {
    id: crypto.randomUUID(),
    path: projectRoot,
    name,
    status: 'active',
    lastHeartbeat: now,
    createdAt: now,
    updatedAt: now
  }

  projects.push(newProject)
  writeProjects(projects)
  return newProject
}

export function getAllProjects(): ProjectRecord[] {
  return readProjects()
}

export function getProjectByPath(projectPath: string): ProjectRecord | undefined {
  const projects = readProjects()
  return projects.find(p => p.path === projectPath)
}

export function updateProjectHeartbeat(projectPath: string): void {
  const projects = readProjects()
  const project = projects.find(p => p.path === projectPath)
  if (project) {
    project.lastHeartbeat = Date.now()
    project.updatedAt = Date.now()
    writeProjects(projects)
  }
}
