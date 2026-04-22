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

export interface MigrationStats {
  totalTasks: number
  totalBlueprints: number
  totalStages: number
}

/**
 * 检测是否为旧版本数据库（tasks 表有 playbook 列）
 */
export function isOldSchema(db: Database): boolean {
  try {
    const result = db.query("SELECT playbook FROM tasks LIMIT 1").get() as { playbook?: string } | null
    return result !== null && 'playbook' in result
  } catch {
    return false
  }
}

/**
 * 获取迁移预览统计信息（dry-run）
 */
export function getMigrationStats(db: Database): MigrationStats {
  const oldTasks = db.query('SELECT * FROM tasks').all() as OldTaskRow[]

  let totalBlueprints = 0
  let totalStages = 0

  for (const task of oldTasks) {
    totalBlueprints++
    try {
      const playbook: OldPlaybook = JSON.parse(task.playbook || '{}')
      totalStages += playbook.stages?.length || 0
    } catch {
      totalStages += 0
    }
  }

  return {
    totalTasks: oldTasks.length,
    totalBlueprints,
    totalStages
  }
}

/**
 * 迁移所有旧数据到新 Schema（带事务）
 */
export function migrateAllOldData(db: Database): MigrationResult {
  const result: MigrationResult = {
    success: true,
    tasksMigrated: 0,
    blueprintsCreated: 0,
    stagesCreated: 0,
    errors: []
  }

  // 使用事务确保原子性
  db.run('BEGIN TRANSACTION')

  try {
    // 1. 获取所有旧任务
    const oldTasks = db.query('SELECT * FROM tasks').all() as OldTaskRow[]

    for (const oldTask of oldTasks) {
      try {
        const migrateResult = migrateTaskToNewSchema(db, oldTask)
        if (migrateResult.success) {
          result.tasksMigrated++
          result.blueprintsCreated++
          result.stagesCreated += migrateResult.stagesCreated
        } else {
          result.errors.push(`Failed to migrate task ${oldTask.id}: ${migrateResult.error}`)
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e)
        result.errors.push(`Failed to migrate task ${oldTask.id}: ${errMsg}`)
      }
    }

    // 删除旧的 playbook 列
    try {
      db.run('ALTER TABLE tasks DROP COLUMN playbook')
    } catch {
      // 列可能不存在或已删除，忽略
    }

    if (result.errors.length > 0) {
      result.success = false
      db.run('ROLLBACK')
    } else {
      db.run('COMMIT')
    }
  } catch (e) {
    db.run('ROLLBACK')
    result.success = false
    result.errors.push(`Migration failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  return result
}

/**
 * 迁移单个任务到新 Schema
 */
export function migrateTaskToNewSchema(
  db: Database,
  oldTask: OldTaskRow
): { success: boolean; stagesCreated: number; error?: string } {
  // 解析 playbook JSON
  let playbook: OldPlaybook
  try {
    playbook = JSON.parse(oldTask.playbook || '{}')
  } catch {
    playbook = { task: oldTask.name, stages: [] }
  }

  const blueprintId = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  // 创建新的 Blueprint
  db.prepare(`
    INSERT INTO blueprints (id, task_id, name, status, created_at)
    VALUES (?, ?, ?, 'CANONICAL', ?)
  `).run(blueprintId, oldTask.id, `${oldTask.name}-blueprint`, now)

  let stagesCreated = 0

  // 创建新的 Stages
  const stages = playbook.stages || []
  for (const oldStage of stages) {
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

    stagesCreated++
  }

  // 更新 Task 的 active_blueprint_id
  db.prepare(`
    UPDATE tasks SET active_blueprint_id = ?, updated_at = ? WHERE id = ?
  `).run(blueprintId, now, oldTask.id)

  return { success: true, stagesCreated }
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

    const result = migrateTaskToNewSchema(db, task)
    return { success: result.success, error: result.error }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e)
    }
  }
}

/**
 * 执行项目数据库完整迁移
 */
export function migrateProjectDb(db: Database): MigrationResult {
  if (!isOldSchema(db)) {
    return {
      success: true,
      tasksMigrated: 0,
      blueprintsCreated: 0,
      stagesCreated: 0,
      errors: []
    }
  }

  return migrateAllOldData(db)
}