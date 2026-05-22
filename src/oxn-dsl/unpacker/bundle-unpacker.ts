/**
 * Task 2.4 — OXN 解包器
 *
 * oxn unpack <bundle.oxn> 命令实现：
 *   安全解压至隔离目录，严禁自动覆盖本地同名资产。
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, basename, dirname } from 'path'

export interface UnpackOptions {
  /** 输出目录（默认：bundle 文件同级的目录） */
  outputDir?: string
  /** 是否覆盖已有文件（默认 false，安全模式） */
  force?: boolean
}

export interface UnpackResult {
  /** 解包的目标目录 */
  targetDir: string
  /** 写入的文件列表 */
  files: string[]
  /** 跳过的文件（已存在且未 force） */
  skipped: string[]
}

export class BundleUnpacker {
  /**
   * 解包 .bundle.oxn 文件到隔离目录
   *
   * 策略：
   * - 默认创建 bundle 同名的目录 + "-unpacked" 后缀
   * - 非 force 模式下已存在文件自动跳过
   * - 解包结构保留原始类型分类
   */
  unpack(bundlePath: string, options?: UnpackOptions): UnpackResult {
    if (!existsSync(bundlePath)) {
      throw new Error(`Bundle 文件不存在: ${bundlePath}`)
    }

    const content = readFileSync(bundlePath, 'utf-8')
    const bundleName = basename(bundlePath)
      .replace(/\.bundle\.oxn$/, '')
      .replace(/\.oxn$/, '')

    const targetDir = options?.outputDir || join(dirname(bundlePath), `${bundleName}-unpacked`)
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    const result: UnpackResult = { targetDir, files: [], skipped: [] }

    // 写入原始 bundle 内容
    const outputPath = join(targetDir, `${bundleName}.oxn`)
    if (!existsSync(outputPath) || options?.force) {
      writeFileSync(outputPath, content, 'utf-8')
      result.files.push(outputPath)
    } else {
      result.skipped.push(outputPath)
    }

    // 如果存在对应的 assembly.json，一并解包
    const assemblyPath = bundlePath.replace(/\.oxn$/, '.assembly.json')
    if (existsSync(assemblyPath)) {
      const assemblyDest = join(targetDir, 'assembly.json')
      if (!existsSync(assemblyDest) || options?.force) {
        writeFileSync(assemblyDest, readFileSync(assemblyPath, 'utf-8'), 'utf-8')
        result.files.push(assemblyDest)
      } else {
        result.skipped.push(assemblyDest)
      }
    }

    // 如果存在 schema，一并解包
    const schemaPath = bundlePath.replace(/\.oxn$/, '.assembly.schema.json')
    if (existsSync(schemaPath)) {
      const schemaDest = join(targetDir, 'assembly.schema.json')
      if (!existsSync(schemaDest) || options?.force) {
        writeFileSync(schemaDest, readFileSync(schemaPath, 'utf-8'), 'utf-8')
        result.files.push(schemaDest)
      } else {
        result.skipped.push(schemaDest)
      }
    }

    return result
  }

  /**
   * 强制覆盖模式解包
   */
  unpackForce(bundlePath: string, outputDir?: string): UnpackResult {
    return this.unpack(bundlePath, { outputDir, force: true })
  }
}

export function unpackBundle(bundlePath: string, options?: UnpackOptions): UnpackResult {
  return new BundleUnpacker().unpack(bundlePath, options)
}
