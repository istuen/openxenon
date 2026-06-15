// =============================================================================
// GitProvider (v0.2 Sprint 3c T6 — Probe Signal Taint v2 PR-3)
//
// L1-Infra 层 — git:// scheme 的 IO Provider
// 物理路径: src/infra/providers/git-provider.ts
// 父文档: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2 §5.4 (委派 PoC)
//
// 实现 InfraProvider 接口 (3 个 IO Primitive, 全部委派):
//   - ioStat: 委派 src/infra/probes/git-status-clean.ts (查 working tree 状态)
//     → exists = true (git repo 存在), isFile = false, flags = [detached_head | shallow_clone]
//   - ioRead: 委派 src/infra/probes/git-branch-exists.ts (查分支)
//     → 把 boolean 转成 IOReadResult.text ('true' | 'false')
//   - ioExec: 委派 src/infra/probes/git-merge-feasible.ts (合并可行性)
//     → MergeFeasibilityResult 序列化成 stdout, exitCode 由 decision 映射
//
// interference flag (从 git 探针结果 + 物理观测派生):
//   - detached_head: git status 输出含 "HEAD detached" (从 stdout 文本检测)
//   - shallow_clone: .git/shallow 存在
//   - unknown: git 执行失败 (error 字段非空)
// =============================================================================

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { IAPError, IAPAction } from '../../kernel/index'
import type { ProbeContextBase } from '../../kernel/contracts/probe-port'
import type {
  IOExecRequest,
  IOExecResult,
  IOInterference,
  IOReadRequest,
  IOReadResult,
  IOStatRequest,
  IOStatResult,
  InterferenceFlag,
} from '../../kernel/contracts/io-primitive'
import type { InfraProvider, ProviderManifest } from '../registry/provider-registry'
import { executeGitBranchExists } from '../probes/git-branch-exists'
import { executeGitMergeFeasible } from '../probes/git-merge-feasible'
import { executeGitStatusClean } from '../probes/git-status-clean'

// ───────── GitProvider ─────────

export class GitProvider implements InfraProvider {
  readonly name = 'git'
  readonly schemes: readonly string[] = ['git://']

  private readonly context: ProbeContextBase

  constructor(context: ProbeContextBase) {
    this.context = context
  }

  async ioStat(req: IOStatRequest): Promise<{ result: IOStatResult; interference: IOInterference }> {
    // ioStat 借用 path 字段: 相对 projectRoot 的子路径 (空 = 根)
    const subpath = req.path === 'git://' ? '' : req.path.replace(/^git:\/\//, '')

    // 1. 委派 git-status-clean: 查 working tree 是否有未提交改动
    let statusResult: Awaited<ReturnType<typeof executeGitStatusClean>>
    try {
      statusResult = await executeGitStatusClean({ path: subpath }, this.context)
    } catch {
      return {
        result: { exists: false, isFile: false, isDir: false, mtimeMs: null, size: null, symlink: false },
        interference: { flags: ['unknown'] },
      }
    }

    if (!statusResult.ok) {
      return {
        result: { exists: false, isFile: false, isDir: false, mtimeMs: null, size: null, symlink: false },
        interference: { flags: ['unknown'] },
      }
    }

    // 2. 派生 interference flags (从 stdout 检测 detached_head)
    const flags: InterferenceFlag[] = []
    if (statusResult.stdout.includes('HEAD detached') || statusResult.stdout.toLowerCase().includes('detached')) {
      flags.push('detached_head')
    }

    // 3. 附加 shallow_clone 检测: .git/shallow 存在
    if (existsSync(join(this.context.projectRoot, '.git', 'shallow'))) {
      flags.push('shallow_clone')
    }

    return {
      result: { exists: true, isFile: false, isDir: true, mtimeMs: null, size: null, symlink: false },
      interference: { flags },
    }
  }

  async ioRead(req: IOReadRequest): Promise<{ result: IOReadResult; interference: IOInterference }> {
    // ioRead 借用 path: 'git://<branch-name>' 形式
    const branchName = req.path.replace(/^git:\/\//, '').replace(/\?.*$/, '')
    if (!branchName) {
      return {
        result: { bytes: 0, text: '', truncated: false },
        interference: { flags: [] },
      }
    }

    let r: Awaited<ReturnType<typeof executeGitBranchExists>>
    try {
      r = await executeGitBranchExists({ branch: branchName }, this.context)
    } catch {
      return {
        result: { bytes: 0, text: '', truncated: false },
        interference: { flags: ['unknown'] },
      }
    }

    if (!r.ok) {
      return {
        result: { bytes: 0, text: '', truncated: false },
        interference: { flags: ['unknown'] },
      }
    }

    const text = r.exists ? 'true' : 'false'
    return {
      result: { bytes: text.length, text, truncated: false },
      interference: { flags: [] },
    }
  }

  async ioExec(req: IOExecRequest): Promise<{ result: IOExecResult; interference: IOInterference }> {
    // ioExec 委派 git-merge-feasible: 校验 (work, target) 合并性
    // IOExecRequest.command = 'work-branch:target-branch' 形式
    const [workBranch, targetBranch] = req.command.split(':')
    if (!workBranch || !targetBranch) {
      throw new IAPError(
        'INFRA',
        'PROVIDER_UNSUPPORTED',
        IAPAction.YIELD_TO_HUMAN,
        'git provider ioExec requires "work:target" form in command',
        { component: 'git-provider', method: 'ioExec', command: req.command },
      )
    }

    const r = await executeGitMergeFeasible({ workBranch, targetBranch }, this.context)
    const exitCode = r.status === 'can_ff_merge' || r.status === 'can_merge_clean' ? 0 : 1
    return {
      result: {
        exitCode,
        stdout: JSON.stringify(r),
        stderr: r.error ?? '',
        durationMs: 0,
      },
      interference: { flags: [] },
    }
  }
}

// ───────── Manifest ─────────

export const GIT_PROVIDER_MANIFEST: ProviderManifest = {
  name: 'git',
  version: '0.1.0',
  schemes: ['git://'],
  source: 'builtin',
  expectedHash: '',
  cachePath: '',
  registeredAt: Date.now(),
}
