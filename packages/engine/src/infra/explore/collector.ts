/**
 * Exploration Collector - 数据采集与报告写入
 * 触碰文件系统，是唯一的 I/O 层
 */

import { mkdir, readdir, readFile, writeFile } from '../filesystem-async'
import { glob } from 'glob'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import { PROBE_CATALOG } from '@openxenon/engine/kernel/index'

interface RawProjectDir {
  path: string
  fileCount: number
  hasTests: boolean
  depth: number
}

interface RawProbeInfo {
  type: string
  pattern: string
  source: 'builtin' | 'canonical' | 'draft'
}

interface RawBlueprintProbeRef {
  type: string
  count: number
}

interface RawTraceSummary {
  totalStages: number
  passRate: number
  probeStats: Record<string, { total: number; passed: number }>
}

interface RawExplorationAsset {
  name: string
  description: string
  scope: string[]
  output: string
  rules: Array<{
    name: string
    description: string
    level: 'info' | 'warning' | 'error'
    condition: string
    message: string
    suggestion?: string
  }>
}

interface RawExplorationContext {
  projectFiles: string[]
  projectDirs: RawProjectDir[]
  probes: RawProbeInfo[]
  blueprintProbeRefs: RawBlueprintProbeRef[]
  traceSummary?: RawTraceSummary
}

/**
 * 采集探索上下文 (返回原始数据, L1 仅做 I/O)
 */
export async function collectRawContext(projectRoot: string): Promise<RawExplorationContext> {
  const projectFiles = await scanProjectFiles(projectRoot)
  const projectDirs = aggregateDirs(projectFiles)
  const probes = await collectProbes(projectRoot)
  const blueprintProbeRefs = await collectBlueprintRefs(projectRoot)
  const traceSummary = await collectTraceSummary(projectRoot)

  return {
    projectFiles,
    projectDirs,
    probes,
    blueprintProbeRefs,
    traceSummary,
  }
}

/**
 * 扫描项目文件
 */
async function scanProjectFiles(projectRoot: string): Promise<string[]> {
  try {
    const files = await glob('src/**/*.ts', { cwd: projectRoot })
    return files
  } catch {
    return []
  }
}

/**
 * 聚合目录信息
 */
function aggregateDirs(files: string[]): RawProjectDir[] {
  const dirMap = new Map<string, { files: string[]; hasTests: boolean }>()

  for (const file of files) {
    // 只取 src/ 下的一级子目录
    const parts = file.split('/')
    let dirPath: string

    if (parts.length >= 3 && parts[0] === 'src') {
      dirPath = `${parts[0]}/${parts[1]}`
    } else if (parts.length >= 2) {
      dirPath = parts.slice(0, -1).join('/')
    } else {
      continue
    }

    const entry = dirMap.get(dirPath) || { files: [], hasTests: false }
    entry.files.push(file)
    if (file.includes('.test.') || file.includes('.spec.')) {
      entry.hasTests = true
    }
    dirMap.set(dirPath, entry)
  }

  return Array.from(dirMap.entries()).map(([path, data]) => ({
    path,
    fileCount: data.files.length,
    hasTests: data.hasTests,
    depth: path.split('/').length,
  }))
}

/**
 * 扫描 Arsenal 探针
 */
async function collectProbes(projectRoot: string): Promise<RawProbeInfo[]> {
  const coverages: RawProbeInfo[] = []

  // 扫描项目 Arsenal
  const arsenalDir = join(projectRoot, '.openxenon', 'arsenals')
  try {
    const probeDirs = await readdir(join(arsenalDir, 'probes'))
    for (const name of probeDirs) {
      const probePath = join(arsenalDir, 'probes', name)
      const stat = await readdir(probePath)
      if (stat.includes('canonical.yaml')) {
        const content = await readFile(join(probePath, 'canonical.yaml'), 'utf-8')
        const parsed = parseYaml(content) as Record<string, unknown>
        coverages.push({
          type: (parsed.type as string) || '',
          pattern:
            (parsed.props as Array<{ name: string; value?: string }>)?.find((p) => p.name === 'pattern')?.value || '',
          source: 'canonical' as const,
        })
      } else if (stat.includes('draft.yaml')) {
        const content = await readFile(join(probePath, 'draft.yaml'), 'utf-8')
        const parsed = parseYaml(content) as Record<string, unknown>
        coverages.push({
          type: (parsed.type as string) || '',
          pattern:
            (parsed.props as Array<{ name: string; value?: string }>)?.find((p) => p.name === 'pattern')?.value || '',
          source: 'draft' as const,
        })
      }
    }
  } catch {
    // Arsenal 目录可能不存在
  }

  // v1.1: 内置探针从 PROBE_CATALOG 单一真相源生成（之前 hardcoded 4 条会随 catalog 漂移）
  const builtinProbes: RawProbeInfo[] = PROBE_CATALOG.filter((p) => p.builtin === 'oxn').map((p) => {
    // 简易 pattern 推导：取 semanticName 第一个 example 的 path 或 command
    const firstExample = p.examples[0]
    const inputs = firstExample?.inputs ?? {}
    const pattern = (inputs.path as string) ?? (inputs.url as string) ?? (inputs.command as string) ?? p.semanticName
    return { type: p.semanticName.replace(/-/g, '_'), pattern, source: 'builtin' }
  })
  coverages.push(...builtinProbes)

  return coverages
}

/**
 * 解析 Blueprint 引用
 */
async function collectBlueprintRefs(projectRoot: string): Promise<RawBlueprintProbeRef[]> {
  const refMap = new Map<string, number>()
  const taskDir = join(projectRoot, '.openxenon', 'tasks')

  try {
    const taskDirs = await readdir(taskDir)
    for (const taskId of taskDirs) {
      const blueprintPath = join(taskDir, taskId, 'blueprint.yaml')
      try {
        const content = await readFile(blueprintPath, 'utf-8')
        const parsed = parseYaml(content) as Record<string, unknown>
        if (parsed.parts) {
          for (const part of parsed.parts as Array<{ probes?: Array<{ type: string }> }>) {
            if (part.probes) {
              for (const probe of part.probes) {
                refMap.set(probe.type, (refMap.get(probe.type) || 0) + 1)
              }
            }
          }
        }
      } catch {
        // blueprint 不存在或解析失败
      }
    }
  } catch {
    // tasks 目录不存在
  }

  return Array.from(refMap.entries()).map(([type, count]) => ({
    type,
    count,
  }))
}

/**
 * 采集 Trace 汇总
 */
async function collectTraceSummary(_projectRoot: string): Promise<RawTraceSummary | undefined> {
  // Phase 1 暂不实现 Trace 分析
  return undefined
}

/**
 * 加载探索器资产
 */
export async function loadExplorationAssets(projectRoot: string, names?: string[]): Promise<RawExplorationAsset[]> {
  const assets: RawExplorationAsset[] = []
  const explorationsDir = join(projectRoot, 'src', 'arsenals', 'explorations')

  try {
    const explorationNames = names || (await readdir(explorationsDir))

    for (const name of explorationNames) {
      if (names && !names.includes(name)) continue

      const assetPath = join(explorationsDir, name, 'canonical.yaml')
      try {
        const content = await readFile(assetPath, 'utf-8')
        const parsed = parseYaml(content) as Record<string, unknown>
        assets.push({
          name: (parsed.name as string) || '',
          description: (parsed.description as string) || '',
          scope: (parsed.scope as string[]) || [],
          output: (parsed.output as string) || '',
          rules: (parsed.rules as RawExplorationAsset['rules']) || [],
        })
      } catch {
        // 资产不存在
      }
    }
  } catch {
    // explorations 目录不存在
  }

  return assets
}

/**
 * 写入探索报告
 */
export async function saveReport(projectRoot: string, filename: string, markdown: string): Promise<string> {
  const dir = join(projectRoot, '.openxenon', 'explore')
  await mkdir(dir, { recursive: true })
  const filepath = join(dir, filename)
  await writeFile(filepath, markdown, 'utf-8')
  return filepath
}
