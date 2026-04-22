import { describe, expect, test } from 'bun:test'
import { TaskSchema, BlueprintSchema, StageSchema } from '../../src/types/schemas'

describe('Zod Schemas', () => {
  describe('TaskSchema', () => {
    test('valid task', () => {
      const task = {
        id: 'task-1',
        name: 'Test Task',
        status: 'PENDING' as const,
        createdAt: '2024-01-01T00:00:00.000Z'
      }
      const result = TaskSchema.safeParse(task)
      expect(result.success).toBe(true)
    })

    test('valid task with activeBlueprintId', () => {
      const task = {
        id: 'task-1',
        name: 'Test Task',
        status: 'RUNNING' as const,
        activeBlueprintId: 'bp-1',
        createdAt: '2024-01-01T00:00:00.000Z'
      }
      const result = TaskSchema.safeParse(task)
      expect(result.success).toBe(true)
    })

    test('invalid task - missing required field', () => {
      const task = {
        id: 'task-1',
        name: 'Test Task'
        // missing status and createdAt
      }
      const result = TaskSchema.safeParse(task)
      expect(result.success).toBe(false)
    })

    test('invalid task - invalid status', () => {
      const task = {
        id: 'task-1',
        name: 'Test Task',
        status: 'INVALID' as any,
        createdAt: '2024-01-01T00:00:00.000Z'
      }
      const result = TaskSchema.safeParse(task)
      expect(result.success).toBe(false)
    })
  })

  describe('BlueprintSchema', () => {
    test('valid blueprint', () => {
      const blueprint = {
        id: 'bp-1',
        taskId: 'task-1',
        name: 'Test Blueprint',
        status: 'DRAFT' as const,
        createdAt: '2024-01-01T00:00:00.000Z'
      }
      const result = BlueprintSchema.safeParse(blueprint)
      expect(result.success).toBe(true)
    })

    test('valid blueprint with ABANDONED status', () => {
      const blueprint = {
        id: 'bp-1',
        taskId: 'task-1',
        name: 'Test Blueprint',
        status: 'ABANDONED' as const,
        createdAt: '2024-01-01T00:00:00.000Z'
      }
      const result = BlueprintSchema.safeParse(blueprint)
      expect(result.success).toBe(true)
    })

    test('invalid blueprint - invalid status', () => {
      const blueprint = {
        id: 'bp-1',
        taskId: 'task-1',
        name: 'Test Blueprint',
        status: 'OLD_STATUS' as any,
        createdAt: '2024-01-01T00:00:00.000Z'
      }
      const result = BlueprintSchema.safeParse(blueprint)
      expect(result.success).toBe(false)
    })
  })

  describe('StageSchema', () => {
    test('valid stage', () => {
      const stage = {
        id: 'stage-1',
        blueprintId: 'bp-1',
        name: 'Test Stage',
        deps: [],
        target: 'Implement feature X',
        spec: 'Use TypeScript',
        proof: 'eslint'
      }
      const result = StageSchema.safeParse(stage)
      expect(result.success).toBe(true)
    })

    test('valid stage with deps', () => {
      const stage = {
        id: 'stage-2',
        blueprintId: 'bp-1',
        name: 'Test Stage',
        deps: ['stage-1'],
        target: 'Implement feature Y',
        spec: 'Use TypeScript',
        proof: 'eslint'
      }
      const result = StageSchema.safeParse(stage)
      expect(result.success).toBe(true)
    })

    test('valid stage with array proof', () => {
      const stage = {
        id: 'stage-1',
        blueprintId: 'bp-1',
        name: 'Test Stage',
        deps: [],
        target: 'Implement feature X',
        spec: 'Use TypeScript',
        proof: ['eslint', 'test']
      }
      const result = StageSchema.safeParse(stage)
      expect(result.success).toBe(true)
    })

    test('valid stage with action', () => {
      const stage = {
        id: 'stage-1',
        blueprintId: 'bp-1',
        name: 'Test Stage',
        deps: [],
        target: 'Implement feature X',
        spec: 'Use TypeScript',
        action: 'Follow TDD methodology',
        proof: 'eslint'
      }
      const result = StageSchema.safeParse(stage)
      expect(result.success).toBe(true)
    })

    test('invalid stage - missing required field', () => {
      const stage = {
        id: 'stage-1',
        name: 'Test Stage'
        // missing blueprintId, target, spec, proof
      }
      const result = StageSchema.safeParse(stage)
      expect(result.success).toBe(false)
    })
  })
})
