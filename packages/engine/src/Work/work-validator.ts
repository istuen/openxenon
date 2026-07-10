import { join } from 'path'
import type { WorkDeclaration } from '../oxl'
import { getWorkOxnPath, getWorkGatePath } from './dual-state-io'
import {
  buildPerWorkDomainsIndex,
  writePerWorkDomainsIndex,
  getPerWorkDomainsJsonPath,
} from './per-work-domains-merger'
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
  type DomainAssetEntry,
  type BlueprintAssetEntry,
} from './birth-cert'
import { hashFile } from './plan-hash'

interface UnresolvedRef {
  kind: 'domain' | 'blueprint'
  name: string
  ref: string | null
  reason: string
}

export interface ValidateArtifactsResult {
  ok: boolean
  artifacts?: {
    domainsJsonPath: string
    blueprintsJsonPath: string
    workFilePath: string
    assetCounts: { domains: number; blueprints: number; tasks: number }
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
  const domainsIdx = await buildPerWorkDomainsIndex({ projectRoot, workName, workOxnPath })
  const blueprintsIdx = buildPerWorkBlueprintsIndex({ projectRoot, workName, workOxnPath })

  const unresolved: UnresolvedRef[] = []
  for (const d of domainsIdx.domains) {
    if (d.status === 'invalid') {
      unresolved.push({
        kind: 'domain',
        name: d.name,
        ref: d.ref,
        reason: d.errors[0] ?? 'invalid',
      })
    }
  }
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

  const domainsJsonPath = getPerWorkDomainsJsonPath(projectRoot, workName)
  const blueprintsJsonPath = getPerWorkBlueprintsJsonPath(projectRoot, workName)
  await writePerWorkDomainsIndex({ projectRoot, workName, workOxnPath, outPath: domainsJsonPath })
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

  const domainAssets: DomainAssetEntry[] = domainsIdx.domains.map((d) => ({
    name: d.name,
    scope: d.scope,
    version: 1,
    fileHash: hashFile(join(projectRoot, d.file)) ?? '',
  }))
  const blueprintAssets: BlueprintAssetEntry[] = blueprintsIdx.blueprints.map((b) => ({
    name: b.name,
    version: b.version,
    fileHash: hashFile(join(projectRoot, b.file)) ?? '',
    domainRefs: [], // Phase 1: 已合并到 blueprints slim index；BirthCert 暂不重复存（drift 检测靠 blueprints.json）
    workflowRefs: [],
    stackRefs: [],
  }))

  for (const a of [...domainAssets, ...blueprintAssets]) {
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
    assets: { domains: domainAssets, blueprints: blueprintAssets },
  })
  if (existing.ok) {
    cert.createdAt = existing.cert.createdAt
  }
  writeWorkFile(projectRoot, workName, cert)

  return {
    ok: true,
    artifacts: {
      domainsJsonPath,
      blueprintsJsonPath,
      workFilePath: getWorkGatePath(projectRoot, workName),
      assetCounts: {
        domains: domainAssets.length,
        blueprints: blueprintAssets.length,
        tasks: (work.tasks ?? []).length,
      },
    },
    warnings,
  }
}
