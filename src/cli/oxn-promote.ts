/**
 * Task 3.3 — OXN Promote 回流命令
 *
 * oxn promote <task_dir>        → Fork 同名覆盖（进化修正）
 * oxn promote <task_dir> --as-new <name>  → Fork 新名扩展（涌现创造）
 *
 * 将沙箱源态的资产提升至全局 Arsenal 源态。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import { parse as parseYaml } from 'yaml'
import { BOUNDARY_DIR } from '../kernel/constants'
import type { OxnAssemblyIR } from '../kernel/schemas/oxn-assembly.schema'

export interface PromoteOptions {
  /** 强制覆盖已有资产 */
  force?: boolean
  /** Fork 新名称（涌现模式） */
  asNew?: string
}

export interface PromoteResult {
  success: boolean
  sourcePath: string
  destPath: string
  /** 版本号 */
  version: number
  /** 是否为涌现（新名称） */
  emergent: boolean
}

export class OxnPromoter {
  /**
   * 将沙箱 Task 中的 Blueprint 提升至全局 Arsenal
   */
  promote(taskDir: string, projectRoot: string, options?: PromoteOptions): PromoteResult {
    const sandboxDir = join(taskDir, 'sandbox')
    const blueprintPath = join(sandboxDir, 'blueprint.oxn')
    const assemblyPath = join(sandboxDir, 'blueprint.assembly.json')

    if (!existsSync(blueprintPath) && !existsSync(assemblyPath)) {
      throw new Error(`沙箱中未找到 Blueprint 文件: ${sandboxDir}`)
    }

    const sourcePath = existsSync(blueprintPath) ? blueprintPath : assemblyPath
    const content = readFileSync(sourcePath, 'utf-8')

    // 提取名称和版本
    let bpName: string
    let bpVersion: number

    if (sourcePath.endsWith('.json')) {
      const ir = JSON.parse(content) as OxnAssemblyIR
      bpName = options?.asNew || ir.name
      bpVersion = (ir._version || 1) + 1
    } else {
      const parsed = parseYaml(content) as Record<string, unknown>
      bpName = options?.asNew || ((parsed.name || parsed.id || basename(taskDir)) as string)
      bpVersion = ((parsed._version || 1) as number) + 1
    }

    const emergent = Boolean(options?.asNew)

    const arsenalDir = join(projectRoot, BOUNDARY_DIR, 'arsenals', 'blueprints', bpName)
    if (!existsSync(arsenalDir)) {
      mkdirSync(arsenalDir, { recursive: true })
    }

    const destPath = join(arsenalDir, 'canonical.yaml')

    if (existsSync(destPath) && !options?.force) {
      throw new Error(`目标资产已存在: ${destPath}。使用 --force 覆盖`)
    }

    // 写入资产文件
    if (sourcePath.endsWith('.json')) {
      // 更新版本号后重新写入
      const ir = JSON.parse(content) as OxnAssemblyIR
      ir._version = bpVersion
      ir.assembly_at = new Date().toISOString()
      writeFileSync(destPath, JSON.stringify(ir, null, 2), 'utf-8')
    } else {
      writeFileSync(destPath, content, 'utf-8')
    }

    return { success: true, sourcePath, destPath, version: bpVersion, emergent }
  }

  /**
   * Fork 新名扩展（涌现）
   */
  promoteAsNew(taskDir: string, projectRoot: string, newName: string): PromoteResult {
    return this.promote(taskDir, projectRoot, { asNew: newName, force: true })
  }
}

export function promoteBlueprint(taskDir: string, projectRoot: string, options?: PromoteOptions): PromoteResult {
  return new OxnPromoter().promote(taskDir, projectRoot, options)
}
