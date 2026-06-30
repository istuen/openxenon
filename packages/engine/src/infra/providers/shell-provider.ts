// =============================================================================
// ShellProvider (v0.2 Sprint 3c T6 — Probe Signal Taint v2 PR-3)
//
// L1-Infra 层 — shell:// scheme 的 IO Provider
// 物理路径: src/infra/providers/shell-provider.ts
// 父文档: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2 §5.4 (委派 PoC)
//
// 实现 InfraProvider 接口 (3 个 IO Primitive):
//   - ioStat: 抛 IAPError (shell provider 不实现 io.stat; 用 file://)
//   - ioRead: 抛 IAPError (shell provider 不实现 io.read; 用 file://)
//   - ioExec: 委派 src/infra/probes/shell-exec.ts:executeShellExec
//     转换 ShellExecResult (success/stdout/stderr/exitCode/durationMs/error) →
//            IOExecResult (exitCode/stdout/stderr/durationMs) + IOInterference
//
// interference flag:
//   - sandbox_violation: validationError 命中 (DANGEROUS_PATTERNS)
//   - network_timeout: timeout 触发 (executeShellExec 内部 spawn 处理)
//   - unknown: 其他 error 路径
// =============================================================================

import { IAPError, IAPAction } from '@openxenon/engine/kernel/index'
import type { ProbeContextBase } from '@openxenon/engine/kernel/contracts/probe-port'
import type {
  IOExecRequest,
  IOExecResult,
  IOInterference,
  IOReadRequest,
  IOReadResult,
  IOStatRequest,
  IOStatResult,
  InterferenceFlag,
} from '@openxenon/engine/kernel/contracts/io-primitive'
import type { InfraProvider, ProviderManifest } from '../registry/provider-registry'
import { executeShellExec } from '../probes/shell-exec'

// ───────── ShellProvider ─────────

export class ShellProvider implements InfraProvider {
  readonly name = 'shell'
  readonly schemes: readonly string[] = ['shell://']

  /** 真实 ProbeContext (含 projectRoot). 调用方注入 (无 projectRoot 时用 process.cwd) */
  private readonly context: ProbeContextBase

  constructor(context: ProbeContextBase) {
    this.context = context
  }

  async ioStat(_req: IOStatRequest): Promise<{ result: IOStatResult; interference: IOInterference }> {
    throw new IAPError(
      'INFRA',
      'PROVIDER_UNSUPPORTED',
      IAPAction.YIELD_TO_HUMAN,
      'shell provider does not implement io.stat; use file:// URI',
      {
        component: 'shell-provider',
        method: 'ioStat',
      },
    )
  }

  async ioRead(_req: IOReadRequest): Promise<{ result: IOReadResult; interference: IOInterference }> {
    throw new IAPError(
      'INFRA',
      'PROVIDER_UNSUPPORTED',
      IAPAction.YIELD_TO_HUMAN,
      'shell provider does not implement io.read; use file:// URI',
      {
        component: 'shell-provider',
        method: 'ioRead',
      },
    )
  }

  async ioExec(req: IOExecRequest): Promise<{ result: IOExecResult; interference: IOInterference }> {
    // 委派: 把 IOExecRequest.command 转成 shell-exec 的 command string
    // 注: IOExecRequest 也支持 args 数组, 但 shell-exec 走 sh -c, 所以 args 拼到 command 后面
    let command = req.command
    if (req.args && req.args.length > 0) {
      command = `${req.command} ${req.args.map((a) => shellQuote(a)).join(' ')}`
    }

    const r = await executeShellExec(command, this.context, req.timeoutMs)

    // 转换: ShellExecResult → IOExecResult + IOInterference
    const flags: InterferenceFlag[] = []
    if (r.error) {
      if (r.error.includes('Invalid command')) {
        flags.push('sandbox_violation')
      } else if (r.error.includes('timeout')) {
        flags.push('network_timeout')
      } else {
        flags.push('unknown')
      }
    }

    return {
      result: {
        exitCode: r.exitCode,
        stdout: r.stdout,
        stderr: r.stderr,
        durationMs: r.durationMs ?? 0,
      },
      interference: { flags },
    }
  }
}

/** 简易 shell quote (单引号包裹 + 转义单引号) */
function shellQuote(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`
}

// ───────── Manifest ─────────

export const SHELL_PROVIDER_MANIFEST: ProviderManifest = {
  name: 'shell',
  version: '0.1.0',
  schemes: ['shell://'],
  source: 'builtin',
  expectedHash: '',
  cachePath: '',
  registeredAt: Date.now(),
}
