// =============================================================================
// FileProvider (v0.2 Sprint 3c T6 — Probe Signal Taint v2 PR-3)
//
// L1-Infra 层 — file:// scheme 的 IO Provider
// 物理路径: src/infra/providers/file-provider.ts
// 父文档: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2 §5.2
//
// 实现 InfraProvider 接口 (3 个 IO Primitive):
//   - ioStat: fs.statSync + symlink / cache_path / just_modified / permission_denied 检测
//   - ioRead: fs.readFileSync + maxBytes 截断
//   - ioExec: 抛 IAPError (file provider 不实现 io.exec; 用 shell:// URI)
//
// 干涉 flag 检测 (detectFlags):
//   - symlink: stat.isSymbolicLink()
//   - cache_path: CACHE_PATH_PATTERNS 3 项 (.cache / node_modules / .git/objects)
//   - just_modified: mtimeMs 距 now < 1000ms (构建残留)
//   - permission_denied: mode & 0o400 === 0 (不可读)
//
// L1-Infra 允许依赖: L0-Contract (IO Primitive) + L1-Infra 自身 (filesystem)
// =============================================================================

import { lstatSync, readFileSync, statSync } from 'node:fs'
import { IAPError, IAPAction } from '../../kernel/index'
import type {
  IOExecRequest,
  IOExecResult,
  IOInterference,
  IOReadEncoding,
  IOReadRequest,
  IOReadResult,
  IOStatRequest,
  IOStatResult,
  InterferenceFlag,
} from '../../kernel/contracts/io-primitive'
import type { InfraProvider, ProviderManifest } from '../registry/provider-registry'

// ───────── Cache path patterns (3 项) ─────────

const CACHE_PATH_PATTERNS = [/(^|\/)\.cache(\/|$)/, /(^|\/)node_modules(\/|$)/, /(^|\/)\.git\/objects(\/|$)/]

const JUST_MODIFIED_THRESHOLD_MS = 1000

// ───────── detectFlags: 4 项 flag ─────────

function detectFlags(req: IOStatRequest, stat: import('node:fs').Stats): InterferenceFlag[] {
  const flags: InterferenceFlag[] = []
  if (stat.isSymbolicLink()) flags.push('symlink')
  if (Date.now() - stat.mtimeMs < JUST_MODIFIED_THRESHOLD_MS) flags.push('just_modified')
  if (CACHE_PATH_PATTERNS.some((p) => p.test(req.path))) flags.push('cache_path')
  if ((stat.mode & 0o400) === 0) flags.push('permission_denied')
  return flags
}

// ───────── FileProvider ─────────

export class FileProvider implements InfraProvider {
  readonly name = 'file'
  readonly schemes: readonly string[] = ['file://']

  async ioStat(req: IOStatRequest): Promise<{ result: IOStatResult; interference: IOInterference }> {
    // 用 lstatSync 而非 statSync: 需要检测 symlink (statSync 会跟随链接)
    let lstat: import('node:fs').Stats
    try {
      lstat = lstatSync(req.path)
    } catch {
      // 不存在 / 权限拦截等: 返 exists=false, flags=[]
      return {
        result: { exists: false, isFile: false, isDir: false, mtimeMs: null, size: null, symlink: false },
        interference: { flags: [] },
      }
    }

    const flags = detectFlags(req, lstat)
    // isFile/isDir 需要跟随 symlink: 用 statSync (symlink 指向文件时 isFile=true)
    let isFile = false
    let isDir = false
    if (!lstat.isSymbolicLink()) {
      isFile = lstat.isFile()
      isDir = lstat.isDirectory()
    } else {
      try {
        const s = statSync(req.path)
        isFile = s.isFile()
        isDir = s.isDirectory()
      } catch {
        // dangling symlink
      }
    }
    return {
      result: {
        exists: true,
        isFile,
        isDir,
        mtimeMs: lstat.mtimeMs,
        size: lstat.size,
        symlink: lstat.isSymbolicLink(),
      },
      interference: { flags },
    }
  }

  async ioRead(req: IOReadRequest): Promise<{ result: IOReadResult; interference: IOInterference }> {
    // 同步读 + maxBytes 截断
    // 注: 真实 maxBytes 截断需要 Buffer 截断, 此处用字符串前缀; base64 用 Buffer.from().toString('base64')
    const maxBytes = req.maxBytes ?? Infinity
    const encoding: IOReadEncoding = req.encoding ?? 'utf-8'

    let raw: Buffer
    try {
      raw = readFileSync(req.path)
    } catch {
      return {
        result: { bytes: 0, text: '', truncated: false },
        interference: { flags: [] },
      }
    }

    const truncated = raw.length > maxBytes
    const slice = truncated ? raw.subarray(0, maxBytes) : raw
    const text = encoding === 'base64' ? slice.toString('base64') : slice.toString('utf-8')

    // ioRead 自己也跑 detectFlags (ioStat + ioRead 共享同一物理 stat 调用)
    let lstat: import('node:fs').Stats | null = null
    try {
      lstat = lstatSync(req.path)
    } catch {
      // ignore
    }
    const flags: InterferenceFlag[] = lstat ? detectFlags({ path: req.path }, lstat) : []

    return {
      result: {
        bytes: slice.length,
        text,
        truncated,
      },
      interference: { flags },
    }
  }

  async ioExec(_req: IOExecRequest): Promise<{ result: IOExecResult; interference: IOInterference }> {
    // 父文档 §5.2 明确: file provider 不实现 io.exec, 用 shell:// URI
    throw new IAPError(
      'INFRA',
      'PROVIDER_UNSUPPORTED',
      IAPAction.YIELD_TO_HUMAN,
      'file provider does not implement io.exec; use shell:// URI',
      {
        component: 'file-provider',
        method: 'ioExec',
      },
    )
  }
}

// ───────── Manifest (builtin, 无 cachePath 校验需求 — 直接 OK) ─────────

export const FILE_PROVIDER_MANIFEST: ProviderManifest = {
  name: 'file',
  version: '0.1.0',
  schemes: ['file://'],
  source: 'builtin',
  expectedHash: '',
  cachePath: '',
  registeredAt: Date.now(),
}
