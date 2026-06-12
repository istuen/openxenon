// =============================================================================
// deps-resolved handler (v0.1.6 — 走 runtime 适配层)
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §9 清单 #15
//
// v0.1.6: 走 openFile().text() 替代直接 readFileSync（适配层抽象）
// 纯 JS，无 spawn。复 ProgramContext.Package term。
// =============================================================================

import { join } from 'path'
import type { ProbeContextBase } from '../../kernel/index'
import { openFile } from '../runtime/index'

export interface ProbeContext extends ProbeContextBase {}

export interface DepsResolvedParams {
  /** package.json 路径（默认项目根的 package.json） */
  packageJson?: string
  /** lockfile 路径（默认自动检测：bun.lock > bun.lockb > package-lock.json > pnpm-lock.yaml） */
  lockfile?: string
}

export interface PackageJson {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

export interface DepsResolvedResult {
  /** 是否有缺失依赖 */
  missing: string[]
  /** package.json 声明的所有依赖（dep → version range） */
  declared: Record<string, string>
  /** lockfile 实际解析的依赖（如果 lockfile 存在） */
  resolved?: Record<string, string>
  /** 错误信息 */
  error?: string
  /** 使用的 lockfile 路径（如果检测到） */
  lockfilePath?: string
}

export async function executeDepsResolved(
  params: DepsResolvedParams,
  context: ProbeContext,
): Promise<DepsResolvedResult> {
  const pkgPath = params.packageJson ?? join(context.projectRoot, 'package.json')
  const lockfilePath = params.lockfile ?? (await detectLockfile(context.projectRoot))

  // 1. 读 package.json — v0.1.6 走 openFile().text()
  let pkg: PackageJson
  try {
    const pkgFile = await openFile(pkgPath)
    const content = await pkgFile.text()
    pkg = JSON.parse(content) as PackageJson
  } catch (err) {
    return {
      missing: [],
      declared: {},
      error: `Failed to read/parse ${pkgPath}: ${(err as Error).message}`,
    }
  }

  // 2. 收集所有声明的依赖（dependencies + devDependencies + optionalDependencies + peerDependencies）
  const declared: Record<string, string> = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  }

  // 3. 读 lockfile（如果存在）解析 resolved 依赖
  let resolved: Record<string, string> = {}
  if (lockfilePath) {
    const lockFile = await openFile(lockfilePath)
    if (await lockFile.exists()) {
      try {
        const lockContent = await lockFile.text()
        resolved = parseLockfile(lockfilePath, lockContent)
      } catch (err) {
        return {
          missing: [],
          declared,
          error: `Failed to read ${lockfilePath}: ${(err as Error).message}`,
          lockfilePath,
        }
      }
    }
  }

  // 4. 对比：声明但未解析
  const missing = Object.keys(declared).filter((dep) => !(dep in resolved))

  return {
    missing,
    declared,
    resolved: Object.keys(resolved).length > 0 ? resolved : undefined,
    lockfilePath: lockfilePath ?? undefined,
  }
}

/** 自动检测 lockfile（优先级：bun.lock > bun.lockb > package-lock.json > pnpm-lock.yaml） */
async function detectLockfile(projectRoot: string): Promise<string | undefined> {
  const candidates = [
    join(projectRoot, 'bun.lock'),
    join(projectRoot, 'bun.lockb'),
    join(projectRoot, 'package-lock.json'),
    join(projectRoot, 'pnpm-lock.yaml'),
    join(projectRoot, 'yarn.lock'),
  ]
  for (const p of candidates) {
    const f = await openFile(p)
    if (await f.exists()) return p
  }
  return undefined
}

/** 解析 lockfile → 依赖名 → 版本映射
 *
 * 支持格式：
 *  - package-lock.json: JSON 顶层 packages / dependencies
 *  - bun.lock: JSON 顶层 packages 数组（每项含 name, version）
 *  - pnpm-lock.yaml / yarn.lock: 简化解析（按行扫 "name: version"）
 */
function parseLockfile(path: string, content: string): Record<string, string> {
  const result: Record<string, string> = {}

  if (path.endsWith('package-lock.json')) {
    try {
      const json = JSON.parse(content) as {
        packages?: Record<string, { version?: string }>
        dependencies?: Record<string, { version?: string }>
      }
      // lockfileVersion 2/3: packages[""] + packages["node_modules/foo"]
      if (json.packages) {
        for (const [key, val] of Object.entries(json.packages)) {
          if (key === '' || !val?.version) continue
          // key 形如 "node_modules/foo" 或 "node_modules/@scope/bar"
          const m = key.match(/node_modules\/(.+)/)
          if (m) result[m[1]!] = val.version
        }
      }
      // lockfileVersion 1: dependencies 树
      if (Object.keys(result).length === 0 && json.dependencies) {
        for (const [name, val] of Object.entries(json.dependencies)) {
          if (val?.version) result[name] = val.version
        }
      }
    } catch {
      // ignore
    }
  } else if (path.endsWith('bun.lock')) {
    try {
      const json = JSON.parse(content) as {
        packages?: Record<string, { version?: string }> | Array<{ name: string; version: string }>
      }
      // bun.lock v0/v1: 对象 { "name@version": { ... } }
      if (json.packages && !Array.isArray(json.packages)) {
        for (const [key, val] of Object.entries(json.packages)) {
          if (!val?.version) continue
          const m = key.match(/^(.+?)@/)
          if (m) result[m[1]!] = val.version
        }
      } else if (Array.isArray(json.packages)) {
        for (const p of json.packages) {
          if (p.name && p.version) result[p.name] = p.version
        }
      }
    } catch {
      // ignore
    }
  } else if (path.endsWith('pnpm-lock.yaml') || path.endsWith('yarn.lock')) {
    // 简化解析：扫 "  name: version" 行（YAML 简化）
    for (const line of content.split('\n')) {
      const m = line.match(/^\s+"?(@?[^@\s"]+?)@([^"]+)"?:\s*$/)
      if (m) result[m[1]!] = m[2]!
    }
  }

  return result
}
