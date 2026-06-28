// =============================================================================
// probe-add.ts (v0.2 Sprint 3d T7)
//
// `oxn probe add <source> --name <name> --schemes <s1>,<s2>` CLI 主命令
// 物理路径: src/cli/probe-add.ts
// 父文档: .openxenon/forges/sprints/sprint-3d/2026-06-15-probe-taint-sandbox-cli-pr4.md
//
// 4 步流程:
//   1. 拉取源 (本地或 URL)
//   2. 沙箱验证 ("用 Probe 证明 Probe" — 沙箱内加载 → 探测 InfraProvider 接口 + schemes)
//   3. 落盘 (写 0o644 立即 0o444, 参照 frozen-immutable 写权独占)
//   4. 写 registry.json
//
// L3-CLI 层 — 由 src/cli/index.ts subCommands 注册
// 纯洁性约束: 可依赖 L0-Contract + L1-Infra 异步 fs + L3 自身 (output, defineCommand)
//            不得 import 上层
// =============================================================================

import { mkdir } from '@openxenon/engine/infra/filesystem-async'
import { join } from 'node:path'
import { defineCommand } from 'citty'
import { IAPError, IAPAction } from '@openxenon/engine/kernel'
import { getProviderRegistry } from '@openxenon/engine/infra/registry/provider-registry'
import { registryUpsert, getCachePath } from './probe-registry-store'
import { sandboxValidate, sha256OfFile, writeProviderSource } from './probe-sandbox'
import { output } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

/** 拉取源 (本地 TS 路径或 http(s) URL) */
async function fetchSource(source: string): Promise<string> {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const r = await fetch(source)
    if (!r.ok) {
      throw new IAPError('PROOF', 'PROBE_INVALID', IAPAction.YIELD_TO_HUMAN, `fetch source failed: HTTP ${r.status}`, {
        component: 'probe-add',
        source,
      })
    }
    return r.text()
  }
  // 本地路径
  const { readFile } = await import('@openxenon/engine/infra/filesystem-async')
  try {
    return await readFile(source, 'utf-8')
  } catch (err) {
    throw new IAPError(
      'PROOF',
      'PROBE_INVALID',
      IAPAction.YIELD_TO_HUMAN,
      `read local source failed: ${(err as Error).message}`,
      {
        component: 'probe-add',
        source,
      },
    )
  }
}

export const probeAddSubcommand = defineCommand({
  meta: {
    name: 'probe-add',
    description: 'Add a third-party Probe Provider (sandbox-validated)',
  },
  args: {
    source: { type: 'positional', required: true, description: 'Local TS path or remote URL' },
    name: { type: 'string', required: true, description: 'Provider name (lowercase, alphanumeric)' },
    schemes: { type: 'string', required: true, description: 'Comma-separated URI schemes' },
  },
  async run({ args }) {
    if (!args.source || !args.name || !args.schemes) {
      throw new IAPError(
        'PROOF',
        'PROBE_INVALID',
        IAPAction.YIELD_TO_HUMAN,
        'oxn probe add: --source / --name / --schemes all required',
        {
          component: 'probe-add',
        },
      )
    }
    if (!/^[a-z0-9_-]+$/.test(args.name)) {
      throw new IAPError(
        'PROOF',
        'PROBE_INVALID',
        IAPAction.YIELD_TO_HUMAN,
        `provider name "${args.name}" must match [a-z0-9_-]+`,
        {
          component: 'probe-add',
        },
      )
    }
    const projectRoot = getProjectRoot()
    const cachePath = getCachePath(projectRoot, args.name)
    const expectedSchemes = args.schemes
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    // 0. 校验 provider 尚未注册
    const registry = getProviderRegistry()
    if (registry.getManifest(args.name)) {
      throw new IAPError(
        'INFRA',
        'PROVIDER_DUPLICATE',
        IAPAction.YIELD_TO_HUMAN,
        `provider "${args.name}" already registered`,
        {
          component: 'probe-add',
          name: args.name,
        },
      )
    }

    // 1. 拉取源
    const raw = await fetchSource(args.source)

    // 1.5 先落盘 (沙箱验证需要 sourcePath)
    await mkdir(join(projectRoot, '.openxenon', '.cache', 'third-party-probes'), { recursive: true })
    await writeProviderSource(cachePath, raw)

    // 2. 沙箱验证 ("用 Probe 证明 Probe")
    const validation = await sandboxValidate(cachePath, expectedSchemes)
    if (!validation.ok) {
      // 失败回滚: 删 cachePath
      const { unlink } = await import('@openxenon/engine/infra/filesystem-async')
      try {
        await unlink(cachePath)
      } catch {
        /* ignore */
      }
      throw new IAPError('PROOF', 'PROBE_INVALID', IAPAction.YIELD_TO_HUMAN, validation.reason ?? 'sandbox rejected', {
        component: 'probe-add',
        source: args.source,
        name: args.name,
        schemes: expectedSchemes,
        flags: validation.flags,
      })
    }

    // 3. 算 hash + 4. 写 registry.json
    const hash = await sha256OfFile(cachePath)
    await registryUpsert(projectRoot, {
      name: args.name,
      version: '0.0.0', // CLI add 不强制 version; 后续 update 子命令补
      schemes: expectedSchemes,
      source: 'cli-add',
      expectedHash: hash,
      cachePath,
      registeredAt: Date.now(),
    })

    // 5. 注入运行时 registry (这样下一次 ProviderRegistry.list() 看到)
    registry.register(validation.provider!, {
      name: args.name,
      version: '0.0.0',
      schemes: expectedSchemes,
      source: 'cli-add',
      expectedHash: hash,
      cachePath,
      registeredAt: Date.now(),
    })

    output({
      ok: true,
      message: `Done. Project now supports ${expectedSchemes.join(', ')} scheme.`,
      name: args.name,
      schemes: expectedSchemes,
      cachePath,
    })
  },
})
