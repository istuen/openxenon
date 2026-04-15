import { describe, it, expect } from 'bun:test'
import type { TaskStatus, StepStatus, ArtifactType, ProofType, ProjectStatus } from '../../src/types/core'

describe('Core Types', () => {
  it('should define valid TaskStatus values', () => {
    const status: TaskStatus = 'pending'
    expect(['pending', 'running', 'completed', 'failed']).toContain(status)
  })

  it('should define valid StepStatus values', () => {
    const status: StepStatus = 'pending'
    expect(['pending', 'running', 'passed', 'failed']).toContain(status)
  })

  it('should define valid ArtifactType values', () => {
    const type: ArtifactType = 'code'
    expect(['code', 'config', 'document', 'test']).toContain(type)
  })

  it('should define valid ProofType values', () => {
    const type: ProofType = 'validation'
    expect(['validation', 'lint', 'test']).toContain(type)
  })

  it('should define valid ProjectStatus values', () => {
    const status: ProjectStatus = 'active'
    expect(['active', 'archived']).toContain(status)
  })
})
