// =============================================================================
// archiver.ts (v0.2 T14 — Daemon PR-4 trace archiver)
// =============================================================================
import { join } from 'node:path'

export interface ArchiveOptions {
  maxLines: number
  archiveDir: string
}

const DEFAULT_OPTIONS: ArchiveOptions = { maxLines: 10_000, archiveDir: '.openxenon/daemon/archive' }

/** 读取 trace.jsonl, 当行数超过阈值时归档 */
export async function archiveIfNeeded(
  tracePath: string,
  projectRoot: string,
  opts?: Partial<ArchiveOptions>,
): Promise<{ archived: boolean; archivePath?: string }> {
  const { maxLines, archiveDir } = { ...DEFAULT_OPTIONS, ...opts }
  const { readFile, mkdir, writeFile } = await import('node:fs/promises')

  let content: string
  try {
    content = await readFile(tracePath, 'utf-8')
  } catch {
    return { archived: false }
  }

  const lines = content.split('\n').filter((l) => l.trim())
  if (lines.length < maxLines) return { archived: false }

  // 归档前 maxLines/2 行, 保留剩余
  const splitIdx = Math.floor(maxLines / 2)
  const toArchive = lines.slice(0, splitIdx)
  const remaining = lines.slice(splitIdx)

  const archiveDirPath = join(projectRoot, archiveDir)
  await mkdir(archiveDirPath, { recursive: true })
  const archiveName = `trace-${Date.now()}.jsonl`
  const archivePath = join(archiveDirPath, archiveName)
  await writeFile(archivePath, toArchive.join('\n') + '\n', { mode: 0o644 })

  // 重写 trace.jsonl 为剩余部分
  await writeFile(tracePath, remaining.join('\n'), { mode: 0o644 })

  return { archived: true, archivePath }
}
