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

  const nameMatch = content.match(/task\s+"([^"]+)"/)
  if (!nameMatch) return null

  const domainMatch = content.match(/domain\s+"([^"]+)"/)
  const blueprintMatch = content.match(/blueprint\s+"([^"]+)"/)

  const parts: Array<{
    name: string
    skillContext?: string
    probes: Array<{ name: string; ref: string; params?: Record<string, string> }>
  }> = []
  const partBlocks = Array.from(content.matchAll(/part\s+"([^"]+)"\s*\{([\s\S]*?)\}/g))
  for (const m of partBlocks) {
    const partName = m[1]!
    const partBody = m[2]!

    const skillMatch = partBody.match(/skill_context\s*=\s*"((?:[^"\\]|\\.)*)"/)
    const skillContext = skillMatch ? skillMatch[1]!.replace(/\\"/g, '"') : undefined

    const probes: Array<{ name: string; ref: string; params?: Record<string, string> }> = []
    const probeBlocks = Array.from(partBody.matchAll(/probe\s+"([^"]+)"\s*\{([\s\S]*?)\}/g))
    for (const pm of probeBlocks) {
      const probeName = pm[1]!
      const probeBody = pm[2]!
      const refMatch = probeBody.match(/ref\s+"([^"]+)"/)
      const ref = refMatch?.[1] ?? ''

      const params: Record<string, string> = {}
      const paramsBlock = probeBody.match(/params\s*=\s*\{([\s\S]*?)\}/)
      if (paramsBlock) {
        const paramMatches = paramsBlock[1]!.matchAll(/(\w+)\s*=\s*"([^"]*)"/g)
        for (const p of paramMatches) {
          params[p[1]!] = p[2]!
        }
      }

      probes.push({ name: probeName, ref, ...(Object.keys(params).length > 0 ? { params } : {}) })
    }

    parts.push({ name: partName, skillContext, probes })
  }

  const depsMatch = content.match(/deps\s*=\s*\[([^\]]*)\]/)
  const deps = depsMatch ? Array.from(depsMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!) : []

  return {
    name: nameMatch[1]!,
    domain: domainMatch?.[1],
    blueprint: blueprintMatch?.[1],
    parts,
    deps,
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
