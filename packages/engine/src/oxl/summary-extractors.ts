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

export type ExternalEntry = {
  name: string
  url?: string | null
  path?: string | null
  kind: string
  ttl?: string | null
  auth?: string | null
  summary?: string | null
}

export type DomainFileSummary = {
  name: string
  description?: string
  language?: {
    terms: Array<{ name: string; desc: string }>
    ban: string[]
    invariant: string[]
  }
  externals?: ExternalEntry[]
} | null

export type TaskProbeDecl = {
  name: string
  ref?: string
  params?: Record<string, string>
}

export type TaskFileSummary = {
  name: string
  domain?: string
  blueprint?: string
  parts: Array<{
    name: string
    skillContext?: string
    probes: Array<{ name: string; ref: string; params?: Record<string, string> }>
  }>
  /** 顶层 ## Probes 段声明的真实 probe（带 ref + params），供 submit --run-probes 执行 */
  probes?: TaskProbeDecl[]
  deps: string[]
} | null

export function readDomainFile(filePath: string): DomainFileSummary {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

  // .md format: "# Domain: X" or .oxn format: 'domain "X"'
  const nameMatch = content.match(/^# Domain:\s*(.+)$/m) ?? content.match(/domain\s+"([^"]+)"/)
  if (!nameMatch) return null
  const name = (nameMatch[1] ?? nameMatch[0] ?? '').trim()

  // .md blockquote "> ..." or .oxn 'description = "..."'
  const descMatch = content.match(/^>\s*(.+)$/m) ?? content.match(/description\s*=\s*"((?:[^"\\]|\\.)*)"/)

  // Parse ## Terms section (H3 entries with - desc: ...)
  const terms: Array<{ name: string; desc: string }> = []
  const termsSection = content.match(/## Terms\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (termsSection) {
    const termBlocks = termsSection[1]!.matchAll(/^### (.+)$\n([\s\S]*?)(?=\n### |\n## |\n# |$)/gm)
    for (const m of termBlocks) {
      const termName = m[1]!.trim()
      const descMatch = m[2]!.match(/- desc:\s*(.+)$/m)
      if (descMatch) terms.push({ name: termName, desc: descMatch[1]!.trim() })
    }
  }

  // Parse .oxn format fallback: term { "X": "Y" }
  if (terms.length === 0) {
    const termBlock = content.match(/term\s*\{([\s\S]*?)\}/)
    if (termBlock) {
      const termMatches = termBlock[1]!.matchAll(/"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)
      for (const m of termMatches) {
        terms.push({ name: m[1]!, desc: m[2]!.replace(/\\"/g, '"') })
      }
    }
  }

  // Parse ## Bans section (H3 entries with - items: / - desc:)
  const ban: string[] = []
  const bansSection = content.match(/## Bans\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (bansSection) {
    const banDescs = bansSection[1]!.matchAll(/- desc:\s*(.+)$/gm)
    for (const m of banDescs) {
      ban.push(m[1]!.trim())
    }
  }

  // Parse .oxn format fallback: ban { "X" }
  if (ban.length === 0) {
    const banBlock = content.match(/ban\s*\{([\s\S]*?)\}/)
    if (banBlock) {
      const banMatches = banBlock[1]!.matchAll(/"([^"]+)"/g)
      for (const m of banMatches) {
        ban.push(m[1]!)
      }
    }
  }

  // Parse ## Invariants section (H3 entries with - value:)
  const invariant: string[] = []
  const invSection = content.match(/## Invariants\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (invSection) {
    const invValues = invSection[1]!.matchAll(/- value:\s*(.+)$/gm)
    for (const m of invValues) {
      invariant.push(m[1]!.trim())
    }
  }

  // Parse .oxn format fallback: invariant { "X" }
  if (invariant.length === 0) {
    for (const invBlock of content.matchAll(/invariant\s*\{([\s\S]*?)\}/g)) {
      const invMatches = invBlock[1]!.matchAll(/"([^"]+)"/g)
      for (const m of invMatches) {
        invariant.push(m[1]!)
      }
    }
  }

  // Parse ## Externals section (H3 entries with - url/path/kind/summary)
  const externals: ExternalEntry[] = []
  const extSection = content.match(/## Externals\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (extSection) {
    const blocks = extSection[1]!.split(/\n(?=### )/)
    for (const block of blocks) {
      if (!block.startsWith('### ')) continue
      const lines = block.split('\n')
      const extName = lines[0]!.replace(/^### /, '').trim()
      const body = lines.slice(1).join('\n')
      const stripQuotes = (s: string | undefined): string | null =>
        s === undefined ? null : s.trim().replace(/^"(.*)"$/, '$1')
      const url = stripQuotes(body.match(/- url:\s*(.+)$/m)?.[1])
      const path = stripQuotes(body.match(/- path:\s*(.+)$/m)?.[1])
      const kind = stripQuotes(body.match(/- kind:\s*(.+)$/m)?.[1]) ?? ''
      const ttl = stripQuotes(body.match(/- ttl:\s*(.+)$/m)?.[1])
      const auth = stripQuotes(body.match(/- auth:\s*(.+)$/m)?.[1])
      const summary = stripQuotes(body.match(/- summary:\s*(.+)$/m)?.[1])
      externals.push({ name: extName, url, path, kind, ttl, auth, summary })
    }
  }

  return {
    name,
    ...(descMatch ? { description: descMatch[1]!.trim() } : {}),
    ...(terms.length > 0 || ban.length > 0 || invariant.length > 0 ? { language: { terms, ban, invariant } } : {}),
    ...(externals.length > 0 ? { externals } : {}),
  }
}

export function readTaskFile(filePath: string): TaskFileSummary {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

  // .md format: '# Task: X' + frontmatter, or .oxn format: 'task "X" { ... }'
  const isMd = content.startsWith('---') || /^# Task:/m.test(content)

  if (isMd) {
    return readTaskFileMd(content)
  }
  return readTaskFileOxn(content)
}

/** 解析 MD-native task.md（frontmatter + H1 + ## Parts / ## Refs） */
function readTaskFileMd(content: string): TaskFileSummary {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  let fmName: string | undefined
  if (fmMatch) {
    for (const line of fmMatch[1]!.split('\n')) {
      const kv = line.match(/^name:\s*(.+)$/)
      if (kv) fmName = kv[1]!.trim()
    }
  }

  const nameMatch = content.match(/^# Task:\s*(.+)$/m)
  const name = fmName ?? nameMatch?.[1]?.trim()
  if (!name) return null

  // ## Refs: - blueprint: X / - domain: Y
  let blueprint: string | undefined
  let domain: string | undefined
  const refsSection = content.match(/## Refs\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (refsSection) {
    blueprint = refsSection[1]!.match(/- blueprint:\s*(.+)$/m)?.[1]?.trim()
    domain = refsSection[1]!.match(/- domain:\s*(.+)$/m)?.[1]?.trim()
  }

  // ## Parts: ### <part> + - skill_context: ... + inline - probe: ...
  const parts: Array<{
    name: string
    skillContext?: string
    probes: Array<{ name: string; ref: string; params?: Record<string, string> }>
  }> = []
  const partsSection = content.match(/## Parts\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (partsSection) {
    const partBlocks = partsSection[1]!.split(/\n(?=### )/)
    for (const block of partBlocks) {
      if (!block.startsWith('### ')) continue
      const lines = block.split('\n')
      const partName = lines[0]!.replace(/^### /, '').trim()
      const body = lines.slice(1).join('\n')
      const skillContext = body.match(/- skill_context:\s*(.+)$/m)?.[1]?.trim()

      const probes: Array<{ name: string; ref: string; params?: Record<string, string> }> = []
      for (const pm of body.matchAll(/- probe:\s*(\S+)/g)) {
        const raw = pm[1]!
        // 支持内联 ref：`- probe: @oxn/probes/shell-exec` 或 `- probe: name`（ref 留空待 catalog 解析）
        if (raw.startsWith('@oxn/probes/') || raw.startsWith('@oxn/probe/')) {
          probes.push({ name: raw.replace(/^@oxn\/probes?\//, ''), ref: raw })
        } else {
          probes.push({ name: raw, ref: '' })
        }
      }

      parts.push({ name: partName, ...(skillContext ? { skillContext } : {}), probes })
    }
  }

  // 顶层 ## Probes 段：声明真实 probe（带 ref + params），供 submit --run-probes 执行
  const probes: TaskProbeDecl[] = []
  const probesSection = content.match(/## Probes\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (probesSection) {
    const probeBlocks = probesSection[1]!.split(/\n(?=### )/)
    for (const block of probeBlocks) {
      if (!block.startsWith('### ')) continue
      const lines = block.split('\n')
      const probeName = lines[0]!.replace(/^### /, '').trim()
      const body = lines.slice(1).join('\n')
      const ref = body.match(/- ref:\s*(\S+)/m)?.[1]?.trim()
      const params: Record<string, string> = {}
      for (const p of body.matchAll(/- params:\s*\n((?:\s+- \S+:\s*.+\n?)+)/g)) {
        for (const pl of p[1]!.matchAll(/- (\S+):\s*(.+)$/gm)) {
          params[pl[1]!] = pl[2]!.trim()
        }
      }
      probes.push({ name: probeName, ...(ref ? { ref } : {}), ...(Object.keys(params).length > 0 ? { params } : {}) })
    }
  }

  return {
    name,
    ...(domain ? { domain } : {}),
    ...(blueprint ? { blueprint } : {}),
    parts,
    ...(probes.length > 0 ? { probes } : {}),
    deps: [],
  }
}

/** 解析 .oxn legacy task 语法（v0.6.x fallback） */
function readTaskFileOxn(content: string): TaskFileSummary {
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
