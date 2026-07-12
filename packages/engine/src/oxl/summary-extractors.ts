import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'

export type WorkFileSummary = {
  name: string
  goal?: string
  constraints: string[]
  domains: Array<{ name: string; ref?: string }>
  blueprints: Array<{ name: string; ref?: string }>
  parts: Array<{ name: string; ref?: string }>
  probes: Array<{ name: string; ref?: string }>
  tasks: Array<{ name: string; domain?: string; blueprint?: string; deps: string[] }>
}

export type DomainFileSummary = {
  name: string
  description?: string
  language?: {
    terms: Array<{ name: string; desc: string }>
    ban: string[]
    invariant: string[]
  }
} | null

export type TaskFileSummary = {
  name: string
  domain?: string
  blueprint?: string
  parts: Array<{
    name: string
    skillContext?: string
    probes: Array<{ name: string; ref: string; params?: Record<string, string> }>
  }>
  deps: string[]
} | null

export function readDomainFile(filePath: string): DomainFileSummary {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

  const nameMatch = content.match(/domain\s+"([^"]+)"/)
  if (!nameMatch) return null

  const descMatch = content.match(/description\s*=\s*"((?:[^"\\]|\\.)*)"/)

  const termBlock = content.match(/term\s*\{([\s\S]*?)\}/)
  const terms: Array<{ name: string; desc: string }> = []
  if (termBlock) {
    const termMatches = termBlock[1]!.matchAll(/"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)
    for (const m of termMatches) {
      terms.push({ name: m[1]!, desc: m[2]!.replace(/\\"/g, '"') })
    }
  }

  const banBlock = content.match(/ban\s*\{([\s\S]*?)\}/)
  const ban: string[] = []
  if (banBlock) {
    const banMatches = banBlock[1]!.matchAll(/"([^"]+)"/g)
    for (const m of banMatches) {
      ban.push(m[1]!)
    }
  }

  const invariant: string[] = []
  for (const invBlock of content.matchAll(/invariant\s*\{([\s\S]*?)\}/g)) {
    const invMatches = invBlock[1]!.matchAll(/"([^"]+)"/g)
    for (const m of invMatches) {
      invariant.push(m[1]!)
    }
  }

  return {
    name: nameMatch[1]!,
    ...(descMatch ? { description: descMatch[1]!.replace(/\\"/g, '"') } : {}),
    ...(terms.length > 0 || ban.length > 0 || invariant.length > 0 ? { language: { terms, ban, invariant } } : {}),
  }
}

export function readTaskFile(filePath: string): TaskFileSummary {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

  // v0.7.0+: MD-native format
  // --- frontmatter ---
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const fm = fmMatch?.[1] ?? ''
  const nameMatch = fm.match(/^name:\s*(.+)$/m)
  if (!nameMatch) return null
  const name = nameMatch[1]!.trim()

  // ## Refs section
  const refsSection = content.match(/## Refs\n([\s\S]*?)(?=\n## |\n*$)/)
  const refsText = refsSection?.[1] ?? ''
  const blueprintMatch = refsText.match(/- blueprint:\s*(.+)$/m)
  const domainMatch = refsText.match(/- domain:\s*(.+)$/m)
  const depsMatch = refsText.match(/- deps:\s*\[(.+)\]/)

  // ## Parts section
  const partsSection = content.match(/## Parts\n([\s\S]*?)(?=\n## |\n*$)/)
  const partsText = partsSection?.[1] ?? ''
  const parts: Array<{
    name: string
    skillContext?: string
    probes: Array<{ name: string; ref: string; params?: Record<string, string> }>
  }> = []

  const partBlocks = Array.from(partsText.matchAll(/### (.+)\n([\s\S]*?)(?=### |\n## |\n*$)/g))
  for (const m of partBlocks) {
    const partName = m[1]!.trim()
    const partBody = m[2]!
    const skillMatch = partBody.match(/- skill_context:\s*["']?([^"'\n]+)["']?/)
    const skillContext = skillMatch?.[1]?.trim()

    // ## Probes section (per-part probes if any)
    const probes: Array<{ name: string; ref: string; params?: Record<string, string> }> = []

    parts.push({ name: partName, skillContext, probes })
  }

  // ## Probes section (top-level)
  const probesSection = content.match(/## Probes\n([\s\S]*?)(?=\n## |\n*$)/)
  const probesText = probesSection?.[1] ?? ''
  // Attach top-level probes to first part if any
  if (parts.length > 0 && probesText) {
    const probeBlocks = Array.from(probesText.matchAll(/### (.+)\n([\s\S]*?)(?=### |\n## |\n*$)/g))
    for (const pm of probeBlocks) {
      const probeName = pm[1]!.trim()
      const probeBody = pm[2]!
      const refMatch = probeBody.match(/- ref:\s*(.+)$/m)
      const ref = refMatch?.[1]?.trim() ?? ''
      const paramsMatch = probeBody.match(/- params:\s*\{(.+)\}/)
      const params: Record<string, string> = {}
      if (paramsMatch) {
        for (const p of paramsMatch[1]!.matchAll(/(\w+):\s*["']?([^"',\n]+)["']?/g)) {
          params[p[1]!] = p[2]!.trim()
        }
      }
      parts[0]!.probes.push({ name: probeName, ref, ...(Object.keys(params).length > 0 ? { params } : {}) })
    }
  }

  return {
    name,
    domain: domainMatch?.[1]?.trim(),
    blueprint: blueprintMatch?.[1]?.trim(),
    parts,
    deps: depsMatch ? Array.from(depsMatch[1]!.matchAll(/["']?([^"',\s]+)["']?/g)).map((m) => m[1]!) : [],
  }
}

export function readWorkFileFromText(content: string, _sourcePath: string): WorkFileSummary | null {
  const nameMatch = content.match(/work\s+"([^"]+)"/)
  if (!nameMatch) return null

  const domains: Array<{ name: string; ref?: string }> = []
  const domainMatches = Array.from(content.matchAll(/domain\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g))
  for (const m of domainMatches) {
    domains.push({ name: m[1]!, ...(m[2] ? { ref: m[2] } : {}) })
  }

  const blueprints: Array<{ name: string; ref?: string }> = []
  const bpMatches = Array.from(content.matchAll(/blueprint\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g))
  for (const m of bpMatches) {
    blueprints.push({ name: m[1]!, ...(m[2] ? { ref: m[2] } : {}) })
  }

  const parts: Array<{ name: string; ref?: string }> = []
  const partMatches = Array.from(content.matchAll(/part\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g))
  for (const m of partMatches) {
    parts.push({ name: m[1]!, ...(m[2] ? { ref: m[2] } : {}) })
  }

  const probes: Array<{ name: string; ref?: string }> = []
  const probeMatches = Array.from(content.matchAll(/probe\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g))
  for (const m of probeMatches) {
    probes.push({ name: m[1]!, ...(m[2] ? { ref: m[2] } : {}) })
  }

  const ctxBlock = content.match(/context\s*\{([\s\S]*?)\}/)
  let goal: string | undefined
  let constraints: string[] = []
  if (ctxBlock) {
    const gMatch = ctxBlock[1]!.match(/goal\s*=\s*"((?:[^"\\]|\\.)*)"/)
    if (gMatch) goal = gMatch[1]!.replace(/\\"/g, '"')
    const cMatch = ctxBlock[1]!.match(/constraints\s*=\s*\[([^\]]*)\]/)
    if (cMatch) {
      constraints = Array.from(cMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!)
    }
  }

  const tasks: Array<{ name: string; domain?: string; blueprint?: string; deps: string[] }> = []
  const taskBlocks = Array.from(content.matchAll(/task\s+"([^"]+)"\s*\{([\s\S]*?)\}/g))
  for (const m of taskBlocks) {
    const taskName = m[1]!
    const taskBody = m[2]!
    const taskDomainMatch = taskBody.match(/domain\s+"([^"]+)"/)
    const taskBpMatch = taskBody.match(/blueprint\s+"([^"]+)"/)
    const taskDepsMatch = taskBody.match(/deps\s*=\s*\[([^\]]*)\]/)
    const taskDeps = taskDepsMatch ? Array.from(taskDepsMatch[1]!.matchAll(/"([^"]+)"/g)).map((dm) => dm[1]!) : []
    tasks.push({
      name: taskName,
      domain: taskDomainMatch?.[1],
      blueprint: taskBpMatch?.[1],
      deps: taskDeps,
    })
  }

  return { name: nameMatch[1]!, goal, constraints, domains, blueprints, parts, probes, tasks }
}

export function readWorkFile(filePath: string): WorkFileSummary | null {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')
  return readWorkFileFromText(content, filePath)
}

/**
 * v0.7.0+: Convert WorkIR (from MD parser) directly to WorkFileSummary.
 * Skips the OXN serialization round-trip.
 */
export function workIRToSummary(ir: {
  name: string
  context?: { goal?: string; constraints?: string[] }
  refs?: Array<{ kind: string; name: string; ref: string }>
  tasks?: Array<{ name: string; domain?: string | null; blueprint?: string | null; parts?: unknown[] }>
}): WorkFileSummary {
  return {
    name: ir.name,
    goal: ir.context?.goal,
    constraints: ir.context?.constraints ?? [],
    domains: (ir.refs ?? []).filter((r) => r.kind === 'domain').map((r) => ({ name: r.name, ref: r.ref })),
    blueprints: (ir.refs ?? []).filter((r) => r.kind === 'blueprint').map((r) => ({ name: r.name, ref: r.ref })),
    parts: (ir.refs ?? []).filter((r) => r.kind === 'stack').map((r) => ({ name: r.name, ref: r.ref })),
    probes: [],
    tasks: (ir.tasks ?? []).map((t) => ({
      name: t.name,
      domain: t.domain ?? undefined,
      blueprint: t.blueprint ?? undefined,
      deps: [],
    })),
  }
}
