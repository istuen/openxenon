import type { ProjectStatus } from './core'

export interface Project {
  id: string
  path: string
  name: string
  status: ProjectStatus
  lastHeartbeat: number
  createdAt: number
  updatedAt: number
}
