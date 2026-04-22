/**
 * 旧数据迁移服务
 *
 * 将旧的 tasks.playbook JSON Blob 迁移到新的三表扁平结构
 * - 旧: tasks 表包含 playbook JSON (内嵌 blueprint + stages)
 * - 新: tasks, blueprints, stages 三表扁平拓扑
 */

import type { Database } from 'bun:sqlite'
import { randomUUID } from 'crypto'

interface OldPlaybook {
  task: string
  stages: Array<{
    name: string
    spec: string
    proof: string
    targetState?: string
  }>
}

interface OldTaskRow {
  id: string
  name: string
  playbook: string
  status: string
  created_at: number
  updated_at: number
}

export interface MigrationResult {
  success: boolean
  tasksMigrated: number
  blueprintsCreated: number
  stagesCreated: number
  errors: string[]
}

/**
 * 检测是否为旧版本数据库（tasks 表有 playbook 列）
 */
export function isOldSchema(db: Database): boolean {
  try {
    const result = db.query("SELECT playbook FROM tasks LIMIT 1").get()
    return result !== undefined
  } catch {
    return false
  }
}

/**
 * 迁移所有旧数据到新 Schema
 */
export function migrateAllOldData(db: Database): MigrationResult {
  const result: MigrationResult = {
    success: true,
    tasksMigrated: 0,
    blueprintsCreated: 0,
    stagesCreated: 0,
    errors: []
  }

  // 1. 获取所有旧任务
  const oldTasks = db.query('SELECT * FROM tasks').all() as OldTaskRow[]

  for (const oldTask of oldTasks) {
    try {
      // 解析 playbook JSON
      const playbook: OldPlaybook = JSON.parse(oldTask.playbook)

      // 创建新的 Blueprint
      const blueprintId = randomUUID()
      const now = Math.floor(Date.now() / 1000)

      db.prepare(`
        INSERT INTO blueprints (id, task_id, name, status, created_at)
        VALUES (?, ?, ?, 'CANONICAL', ?)
      `).run(blueprintId, oldTask.id, `${oldTask.name}-blueprint`, now)

      result.blueprintsCreated++

      // 创建新的 Stages
      for (const oldStage of playbook.stages) {
        const stageId = randomUUID()

        db.prepare(`
          INSERT INTO stages (id, blueprint_id, name, deps, target, spec, proof, status, created_at)
          VALUES (?, ?, ?, '[]', ?, ?, ?, 'PENDING', ?)
        `).run(
          stageId,
          blueprintId,
          oldStage.name,
          oldStage.targetState || '',
          oldStage.spec,
          oldStage.proof,
          now
        )

        result.stagesCreated++
      }

      // 更新 Task 的 active_blueprint_id
      db.prepare(`
        UPDATE tasks SET active_blueprint_id = ? WHERE id = ?
      `).run(blueprintId, oldTask.id)

      result.tasksMigrated++
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      result.errors.push(`Failed to migrate task ${oldTask.id}: ${errMsg}`)
    }
  }

  result.success = result.errors.length === 0
  return result
}

/**
 * 迁移单个任务（如果只需要部分迁移）
 */
export function migrateTask(
  db: Database,
  taskId: string
): { success: boolean; error?: string } {
  try {
    const task = db.query('SELECT * FROM tasks WHERE id = ?').get(taskId) as OldTaskRow | undefined

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    const playbook: OldPlaybook = JSON.parse(task.playbook)
    const blueprintId = randomUUID()
    const now = Math.floor(Date.now() / 1000)

    // 创建 Blueprint
    db.prepare(`
      INSERT INTO blueprints (id, task_id, name, status, created_at)
      VALUES (?, ?, ?, 'CANONICAL', ?)
    `).run(blueprintId, task.id, `${task.name}-blueprint`, now)

    // 创建 Stages
    for (const oldStage of playbook.stages) {
      const stageId = randomUUID()
      db.prepare(`
        INSERT INTO stages (id, blueprint_id, name, deps, target, spec, proof, status, created_at)
        VALUES (?, ?, ?, '[]', ?, ?, ?, 'PENDING', ?)
      `).run(
        stageId,
        blueprintId,
        oldStage.name,
        oldStage.targetState || '',
        oldStage.spec,
        oldStage.proof,
        now
      )
    }

    // 更新 Task
    db.prepare(`
      UPDATE tasks SET active_blueprint_id = ? WHERE id = ?
    `).run(blueprintId, task.id)

    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e)
    }
  }
}
