/**
 * src/infra/project-config.ts (engine L1-Infra)
 *
 * ProjectConfig loader — 读 `.openxenon/config.json`（canonical SSOT）。
 *
 * v0.6.2 I-6 fix: 之前 Asset/* 6 个调用点全传 config=null，导致 .oxnrc / config.json
 * 里的 assetRoot 配置被忽略。本模块提供 engine 层 loader，让 Asset 模块能读到配置。
 *
 * 分层：
 *   - canonical SSOT: .openxenon/config.json (ProjectConfig)
 *   - fallback: .oxnrc (OxnConfig，v0.5 旧项目兼容)
 *
 * 为什么不复用 CLI 的 readProjectConfig：
 *   - engine 层不能 import CLI 层（违反 L1→L3 边界）
 *   - 但 ProjectConfig 类型已在 engine/infra/paths.ts 定义
 *   - 加载逻辑 engine 层自包含是合规的
 */

import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import type { ProjectConfig } from './paths'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'

export const PROJECT_CONFIG_FILENAME = 'config.json'

/**
 * 加载项目配置 — SSOT 是 `.openxenon/config.json`。
 *
 * 找不到 / 解析失败 → 返回 null（与 CLI readProjectConfig 行为对齐）。
 *
 * 不读 `.oxnrc`：那是 LeaderMode / boundaryDir 等少量字段，assetRoot 应当在 config.json 里。
 * 若需 .oxnrc 兼容，调用方应分别调 loadOxnRc() 并 merge。
 */
export function loadProjectConfig(projectRoot: string): ProjectConfig | null {
  const configPath = join(projectRoot, BOUNDARY_DIR, PROJECT_CONFIG_FILENAME)
  if (!existsSync(configPath)) return null
  try {
    const content = readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(content) as ProjectConfig
    // 最小校验：必须有 version: 1
    if (parsed.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}
