import { join } from 'path'
import type { WorkDeclaration } from '../oxl'
import { getWorkOxnPath, getWorkGatePath } from './dual-state-io'
// 🆕 v0.6.1-alpha.4 Phase B: 删 buildPerWorkDomainsIndex/writePerWorkDomainsIndex/getPerWorkDomainsJsonPath import
import {
  buildPerWorkBlueprintsIndex,
  writePerWorkBlueprintsIndex,
  getPerWorkBlueprintsJsonPath,
} from './per-work-blueprints-merger'
import {
  createBirthCert,
  readWorkFile as readBirthCert,
  writeWorkFile,
  type BirthCert,
  type BlueprintAssetEntry,
} from './birth-cert'
import { hashFile } from './plan-hash'

interface UnresolvedRef {
  kind: 'blueprint' // 🆕 Phase B: 删 domain（Domain 引用走 Blueprint ## Refs）
  name: string
  ref: string | null
  reason: string
}

export interface ValidateArtifactsResult {
  ok: boolean
  artifacts?: {
    // 🆕 Phase B: 删 domainsJsonPath
    blueprintsJsonPath: string
    workFilePath: string
    // 🆕 Phase B: 删 domains 计数
    assetCounts: { blueprints: number; tasks: number }
  }
  unresolved?: UnresolvedRef[]
  warnings: string[]
}

export async function validateAndWriteArtifacts(params: {
  projectRoot: string
  workName: string
  work: WorkDeclaration
  missingTaskOxn: string[]
}): Promise<ValidateArtifactsResult> {
  const { projectRoot, workName, work, missingTaskOxn } = params
  const warnings: string[] = []

  const workOxnPath = getWorkOxnPath(projectRoot, workName)
  // 🆕 v0.6.1-alpha.4 Phase B: 删 buildPerWorkDomainsIndex 调用（Domain 引用走 Blueprint ## Refs）
  const blueprintsIdx = buildPerWorkBlueprintsIndex({ projectRoot, workName, workOxnPath })

  const unresolved: UnresolvedRef[] = []
  // 🆕 Phase B: 删 domain invalid ref 收集（Domain 通过 Blueprint ## Refs 解析，drift 由 blueprint 覆盖）
  for (const b of blueprintsIdx.blueprints) {
    if (b.status === 'invalid') {
      unresolved.push({
        kind: 'blueprint',
        name: b.name,
        ref: b.ref,
        reason: b.errors[0] ?? 'invalid',
      })
    }
  }
  for (const t of missingTaskOxn) {
    unresolved.push({
      kind: 'blueprint',
      name: t,
      ref: null,
      reason: `task "${t}" declared in work.oxn but tasks/${t}/task.oxn missing`,
    })
  }

  if (unresolved.length > 0) {
    return { ok: false, unresolved, warnings }
  }

  // 🆕 Phase B: 删 writePerWorkDomainsIndex 调用（不再写 domains.json）
  const blueprintsJsonPath = getPerWorkBlueprintsJsonPath(projectRoot, workName)
  writePerWorkBlueprintsIndex({
    projectRoot,
    workName,
    workOxnPath,
    outPath: blueprintsJsonPath,
  })

  const existing = readBirthCert(projectRoot, workName)
  if (existing.ok && existing.cert.planLock !== null) {
    return {
      ok: false,
      warnings: [
        ...warnings,
        `work is locked (planLock.lockedAt=${existing.cert.planLock.lockedAt}); ` +
          `validate refuses to overwrite .work. Run \`oxn work unlock ${workName}\` first.`,
      ],
    }
  }

  // 🆕 Phase B: 删 domainAssets 构造（Domain 引用走 Blueprint ## Refs，由 blueprintAssets.domainRefs 携带）
  const blueprintAssets: BlueprintAssetEntry[] = blueprintsIdx.blueprints.map((b) => ({
    name: b.name,
    version: b.version,
    fileHash: hashFile(join(projectRoot, b.file)) ?? '',
    // 🆕 Phase B.5: 真实 fileHash 来自 parseBlueprintSlim（toSlim 调 resolveBoundaryAssetFile 算 hash）
    domainRefs: b.domainRefs ?? [],
    workflowRefs: b.workflowRefs ?? [],
    stackRefs: b.stackRefs ?? [],
  }))

  // 🆕 Phase B: 删 domainAssets 引用（仅 blueprintAssets 包含 Domain 引用 via blueprintAssets.domainRefs）
  for (const a of [...blueprintAssets]) {
    if (!/^[0-9a-f]{64}$/.test(a.fileHash)) {
      return {
        ok: false,
        warnings: [...warnings, `fileHash missing for ${a.name} (file unreadable after resolve)`],
      }
    }
  }

  const goal = work.context?.goal ?? ''
  const constraints = work.context?.constraints ?? []
  const maxIterations = (work as { loopPolicy?: { maxIterations?: number } }).loopPolicy?.maxIterations ?? 3

  const cert: BirthCert = createBirthCert({
    workName,
    goal,
    constraints,
    maxIterations,
    // 🆕 Phase B: 删 assets.domains（Domain 引用完全由 Blueprint ## Refs 承担）
    assets: { blueprints: blueprintAssets },
  })
  if (existing.ok) {
    cert.createdAt = existing.cert.createdAt
  }
  writeWorkFile(projectRoot, workName, cert)

  return {
    ok: true,
    artifacts: {
      // 🆕 Phase B: 删 domainsJsonPath（Domain 引用走 Blueprint ## Refs）
      blueprintsJsonPath,
      workFilePath: getWorkGatePath(projectRoot, workName),
      assetCounts: {
        // 🆕 Phase B: 删 domains 计数（Domain 引用走 Blueprint ## Refs）
        blueprints: blueprintAssets.length,
        tasks: (work.tasks ?? []).length,
      },
    },
    warnings,
  }
}
