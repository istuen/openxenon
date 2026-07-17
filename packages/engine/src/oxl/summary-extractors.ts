import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { parseMarkdown } from './md-pipeline/utils'
import { extractDomainIR } from './md-pipeline/transformers/domain'

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

/**
 * 🆕 v0.7.3 P2 (RFC §4 P2 phased landing + ADR-0061 §D7):
 * 重写为 mdast-based 实现：
 *   - .md 走 parseMarkdown + extractDomainIR（修 ## Terms: 后缀 + multiline - desc: | 两个 bug）
 *   - .oxn 保留 regex fallback（向后兼容 v0.6.x legacy work）
 *   - Externals 仍走 regex（extractDomainIR 不覆盖）
 */
export function readDomainFile(filePath: string): DomainFileSummary {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

  const isMd = content.startsWith('---') || /^# Domain:/m.test(content)
  const isOxn = /^domain\s+"/m.test(content)

  if (isMd && !isOxn) {
    return readDomainFileMd(content)
  }
  return readDomainFileOxn(content)
}

/** .md 格式：parseMarkdown + extractDomainIR（v0.7.3 P2） */
function readDomainFileMd(content: string): DomainFileSummary {
  let tree
  let frontmatter: Record<string, unknown> = {}
  try {
    const parsed = parseMarkdown(content)
    tree = parsed.tree
    frontmatter = parsed.frontmatter
  } catch {
    return null
  }

  const ir = extractDomainIR(tree, frontmatter)

  // 名称优先级：frontmatter.name > H1 抽取 > ir.name
  const h1NameMatch = content.match(/^# Domain:\s*(.+)$/m)
  const h1Name = h1NameMatch?.[1]?.trim() ?? ''
  const name = (typeof frontmatter.name === 'string' && frontmatter.name) || h1Name || ir.name || ''
  if (!name) return null

  const terms: Array<{ name: string; desc: string }> = ir.terms.map((t) => ({
    name: t.name,
    desc: t.desc,
  }))

  // Bans 注入：items + desc 全部归入 ban[]（语义：ban = 完整禁用列表，含项名 + 文字描述）
  //   - 旧 regex parser 只捕获 - desc: 单行；新 parser 把 items + desc 都暴露
  //   - 兼容：旧格式（无 items）→ ban = [desc]（去重：itemsFromItemsList=false 时不再额外推 desc）
  const ban: string[] = []
  for (const b of ir.bans) {
    if (b.itemsFromItemsList && b.items.length > 0) {
      ban.push(...b.items)
    }
    if (b.desc) {
      ban.push(b.desc)
    }
  }

  // Invariants 注入：value 优先（与原 parser 行为一致）
  const invariant: string[] = ir.invariants.map((iv) => iv.value || iv.desc).filter((v): v is string => Boolean(v))

  // Externals 仍走 regex（extractDomainIR 不覆盖；保留原 parser 行为）
  const externals = parseDomainExternals(content)

  return {
    name,
    ...(ir.description ? { description: ir.description } : {}),
    ...(terms.length > 0 || ban.length > 0 || invariant.length > 0 ? { language: { terms, ban, invariant } } : {}),
    ...(externals.length > 0 ? { externals } : {}),
  }
}

/** 抽取 ## Externals 段（H3 条目 + url/path/kind/ttl/auth/summary）——保留原 regex parser */
function parseDomainExternals(content: string): ExternalEntry[] {
  const externals: ExternalEntry[] = []
  const extSection = content.match(/## Externals\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (!extSection) return externals
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
  return externals
}

/** .oxn 格式：保留原 regex parser（向后兼容 v0.6.x legacy work） */
function readDomainFileOxn(content: string): DomainFileSummary {
  const nameMatch = content.match(/domain\s+"([^"]+)"/)
  if (!nameMatch) return null
  const name = nameMatch[1]!.trim()

  const descMatch = content.match(/description\s*=\s*"((?:[^"\\]|\\.)*)"/)

  const terms: Array<{ name: string; desc: string }> = []
  const termBlock = content.match(/term\s*\{([\s\S]*?)\}/)
  if (termBlock) {
    const termMatches = termBlock[1]!.matchAll(/"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)
    for (const m of termMatches) {
      terms.push({ name: m[1]!, desc: m[2]!.replace(/\\"/g, '"') })
    }
  }

  const ban: string[] = []
  const banBlock = content.match(/ban\s*\{([\s\S]*?)\}/)
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
    name,
    ...(descMatch ? { description: descMatch[1]!.replace(/\\"/g, '"') } : {}),
    ...(terms.length > 0 || ban.length > 0 || invariant.length > 0 ? { language: { terms, ban, invariant } } : {}),
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
