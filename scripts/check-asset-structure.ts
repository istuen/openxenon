#!/usr/bin/env bun
// =============================================================================
// check-asset-structure.ts — Asset 结构 v2/v3 守门
//
// version: 0.7.7
// synced-at: 2026-08-11
//
// v3.2 升级（2026-08-11）：
// - 新增 Asset → RFC/ADR 反向引用守门：E_ASSET_RFC_ADR_CITATION
//   （Asset 正文不得含 RFC-NNNN / ADR-NNNN 编号；Asset 自身即 SSOT，RFC/ADR 是扩展阅读）
//
// v3.1 升级（2026-08-11）：
// - 新增 Axiom 首 bullet 变更标注守门：E_ASSET_ANNOTATION_FIRST_BULLET
//   （🆕 vX.Y.Z ... 注解不得作为 Axiom 首 bullet——污染 glossary desc）
//
// v3.0 升级（2026-08-09）：
// - 新增 Axiom 扁平化守门：E_ASSET_AXIOM_HAS_TABLE / HAS_CODE_FENCE / HAS_SUBNESTED_LIST
// - Blueprint 顶层 ### Scope / ### Context Template 强制（移除 H2 兼容）
// - BP_FIELD_LOAD_GROUPS 豁免（Slot / SubTargetDispatch / Use <type>）
//
// 角色：
// - 扫 .openxenon/assets/{domains,workflows,stacks,blueprints,assetmaps}/*.md
// - 校验 Asset 正文结构：
//   - 通用 Asset（domain / workflow / stack / assetmap）:
//     ## Group → ### Axiom → - Theorem（形态 A / B / C 均合法）
//   - Blueprint 特例: ## Use <Asset Type> + ## Slot + 顶层 ### Scope / ### Context Template
//     （兼容旧 ## Use 单段 / ## Scope / ## Context Template H2 形式）
// - 校验 Axiom / Group 唯一性 + 必填 frontmatter
// - 退出码: 0 = 全部通过; 1 = 有 violation
//
// 接入:
// - lefthook pre-commit（与 check-heading-skeleton / check-doc-boundary 并列）
// - package.json scripts：`bun run check:asset-structure`
// - CI（与现有 4 个守门脚本并列）
//
// 扩展点：
// - H2/H3 解析：H2_RE / H3_RE 正则
// - 形态合法性：checkGeneric / checkBlueprint
// - Blueprint 特例：BP_TOP_AXIOMS / BLUEPRINT_CATEGORIES
// - 字段负载识别：LIST_RE / `field: value` 模式
//
// 设计参考:
// - .openxenon/drafts/design-asset-structure-unification.md
// - docs/dev/zh-cn/asset-structure-v2.md
// - .openxenon/assets/blueprints/bug-fix-blueprint.md（PR-2 标杆）
// =============================================================================

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

// ========================
// 类型
// ========================

type AssetKind = 'domain' | 'workflow' | 'stack' | 'blueprint' | 'assetmap'

type ViolationCode =
  | 'E_ASSET_KIND_INVALID'
  | 'E_ASSET_MISSING_FRONTMATTER'
  | 'E_ASSET_MISSING_NAME'
  | 'E_ASSET_MISSING_ENTITY'
  | 'E_ASSET_DUPLICATE_GROUP'
  | 'E_ASSET_DUPLICATE_AXIOM'
  | 'E_ASSET_BLANK_AXIOM'
  | 'E_ASSET_INVALID_AXIOM_BODY'
  | 'E_ASSET_INVALID_GROUP_BODY'
  | 'E_ASSET_AXIOM_HAS_TABLE'
  | 'E_ASSET_AXIOM_HAS_CODE_FENCE'
  | 'E_ASSET_AXIOM_HAS_SUBNESTED_LIST'
  | 'E_ASSET_BLUEPRINT_USE_KIND_MISSING'
  | 'E_ASSET_BLUEPRINT_USE_KIND_UNKNOWN'
  | 'E_ASSET_BLUEPRINT_DUPLICATE_USE_TYPE'
  | 'E_ASSET_BLUEPRINT_MISSING_USE_OR_SLOT'
  | 'E_ASSET_BLUEPRINT_MISSING_SCOPE'
  | 'E_ASSET_BLUEPRINT_SCOPE_NOT_TOP_LEVEL'
  | 'E_ASSET_BLUEPRINT_CONTEXT_TEMPLATE_NOT_TOP_LEVEL'
  | 'E_ASSET_BLUEPRINT_INVALID_TOP_LEVEL'
  | 'E_ASSET_BLUEPRINT_SLOT_MISSING_DEPS'
  | 'E_ASSET_ANNOTATION_FIRST_BULLET'
  | 'E_ASSET_RFC_ADR_CITATION'

interface Violation {
  file: string
  code: ViolationCode
  message: string
  line?: number
  context?: string
}

interface AssetFrontmatter {
  entity?: string
  name?: string
}

interface GroupEntry {
  title: string
  line: number
  level: 2
}

interface AxiomEntry {
  title: string
  line: number
  level: 3
}

interface ParsedAsset {
  file: string
  kind: AssetKind
  frontmatter: AssetFrontmatter
  bodyStart: number
  groups: GroupEntry[]
  axioms: AxiomEntry[]
  bodyLines: string[]
  allGroupTitles: string[]
  topLevelAxioms: AxiomEntry[] // 与 ## Group 同级的 ### 标题
}

interface CheckReport {
  projectRoot: string
  assetsDir: string
  checked: number
  passed: number
  violations: Violation[]
}

// ========================
// 解析 frontmatter（最小实现）
// ========================

function parseFrontmatter(content: string): { fm: AssetFrontmatter; bodyStart: number } {
  const lines = content.split('\n')
  if (lines[0] !== '---') return { fm: {}, bodyStart: 0 }
  let endIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endIdx = i
      break
    }
  }
  if (endIdx === -1) return { fm: {}, bodyStart: 0 }

  const fm: AssetFrontmatter = {}
  for (let i = 1; i < endIdx; i++) {
    const m = lines[i]!.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/)
    if (!m) continue
    const key = m[1]!
    const raw = m[2]!.trim()
    const value = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw
    if (key === 'entity') fm.entity = value
    else if (key === 'name') fm.name = value
  }
  return { fm, bodyStart: endIdx + 1 }
}

// ========================
// 解析 Asset body（H2 / H3 / 列表项）
// ========================

const H2_RE = /^##\s+(?!#)(.+?)\s*$/
const H3_RE = /^###\s+(?!#)(.+?)\s*$/
const LIST_RE = /^[-*]\s+(.+)$/

function parseAsset(file: string, content: string, kind: AssetKind): ParsedAsset | null {
  const { fm, bodyStart } = parseFrontmatter(content)
  const bodyLines = content.split('\n').slice(bodyStart)

  const groups: GroupEntry[] = []
  const axioms: AxiomEntry[] = []
  const allGroupTitles: string[] = []
  const topLevelAxioms: AxiomEntry[] = []

  let currentH2: string | null = null
  for (let i = 0; i < bodyLines.length; i++) {
    const raw = bodyLines[i] ?? ''
    const lineNo = bodyStart + i + 1
    const h2m = raw.match(H2_RE)
    const h3m = raw.match(H3_RE)
    if (h2m) {
      currentH2 = h2m[1]!.trim()
      groups.push({ title: currentH2, line: lineNo, level: 2 })
      allGroupTitles.push(currentH2)
      continue
    }
    if (h3m) {
      const title = h3m[1]!.trim()
      const entry: AxiomEntry = { title, line: lineNo, level: 3 }
      axioms.push(entry)
      if (currentH2 === null) {
        topLevelAxioms.push(entry)
      } else if (kind === 'blueprint' && BP_TOP_AXIOMS.has(title)) {
        // Blueprint 特例：### Scope / ### Context Template 即使紧跟 ## Slot 也算 top-level
        topLevelAxioms.push(entry)
      }
    }
  }

  return {
    file,
    kind,
    frontmatter: fm,
    bodyStart,
    groups,
    axioms,
    bodyLines,
    allGroupTitles,
    topLevelAxioms,
  }
}

// ========================
// 校验逻辑
// ========================

const VALID_USE_KINDS: ReadonlySet<AssetKind> = new Set(['domain', 'workflow', 'stack', 'blueprint', 'assetmap'])

// Blueprint 特例：顶层 ### Scope / ### Context Template 即使紧跟 ## Slot 也算 top-level
const BP_TOP_AXIOMS = new Set(['Scope', 'Context Template'])

// Blueprint field-load Group（field 字段负载 Axiom 豁免 sub-bullet）
const BP_FIELD_LOAD_GROUPS = new Set(['Slot', 'SubTargetDispatch'])

const ENTITY_TO_KIND: Record<string, AssetKind> = {
  domain: 'domain',
  workflow: 'workflow',
  stack: 'stack',
  blueprint: 'blueprint',
  assetmap: 'assetmap', // 🆕 v0.6.4: canonical entity value
  roadmap: 'assetmap', // legacy alias (deprecated v0.6.4)
}

function isBlankLine(line: string): boolean {
  return line.trim().length === 0
}

/**
 * v0.7.4: 带状态的行类型识别（追踪 fenced code block 上下文）。
 * - 在 fenced code block（```...```）内：所有行视为合法（代码内容）
 * - fenced 之外：识别 comment / table / blank 三类合法非结构行
 */
function isFenceOpen(line: string): boolean {
  const t = line.trim()
  return t.startsWith('```')
}

function isCommentLine(line: string): boolean {
  const t = line.trim()
  return t.startsWith('<!--') || t.startsWith('>') || t.startsWith('```')
}

/**
 * 判断行是否为「延续行」：
 * - 缩进 ≥ 2 空格的非 `-` 开头行 → 视为前一条 list 项的延续
 * - 这覆盖 `- desc: |` + 多行 YAML 块 风格
 */
function isListContinuation(line: string): boolean {
  if (line.length === 0) return false
  if (line[0] === ' ' || line[0] === '\t') {
    const trimmed = line.trim()
    if (trimmed.length === 0) return false
    return !H2_RE.test(trimmed) && !H3_RE.test(trimmed)
  }
  return false
}

/**
 * 校验某个 Group 下内容时考虑 Markdown table 行
 * - Markdown 表格行（首字符为 `|`）视为合法（roadmap 等导航场景常用）
 */
function isTableLine(line: string): boolean {
  const t = line.trim()
  return t.startsWith('|')
}

/**
 * 检测 Axiom body 内是否含 sub-bullet（缩进 2+ 空格 + `-`）
 * - 用于「Axiom 扁平化」守门
 * - Stack Tool / Blueprint Slot / Scope / Context Template / Use <type> 豁免（field-load Axiom 天然需要嵌套）
 */
function isSubBullet(line: string): boolean {
  return /^ {2,}-\s/.test(line)
}

/**
 * Axiom 扁平化守门（v3.0 新约束）：
 * - Axiom body 内禁止 inline 表格、code fence、sub-bullet
 * - 豁免：
 *   - Stack `## Tools` / `## Foundation` Group（Tool 字段负载如 operations 需嵌套）
 *   - Blueprint `## Slot` Group（Slot observe/operate/deps 字段负载）
 *   - Blueprint `## Use <type>` Group（Asset 引用 path/kind 字段负载）
 *   - 顶层 ### Scope / ### Context Template（Blueprint 顶层字段负载）
 *
 * 调用方传 axiomBody 数组（已 slice 到 Axiom 范围）；返回 violation 列表。
 */
function checkAxiomBodyComplexity(
  file: string,
  axiomName: string,
  parentGroup: string | null,
  axiomBody: string[],
  bodyStartLine: number,
  kind: AssetKind,
): Violation[] {
  const violations: Violation[] = []

  // 判定豁免：field-load Axiom 允许嵌套（operations/observe/path 等）
  const isFieldLoadAxiom =
    (kind === 'stack' && (parentGroup === 'Tools' || parentGroup === 'Foundation')) ||
    (kind === 'blueprint' &&
      (BP_FIELD_LOAD_GROUPS.has(parentGroup ?? '') || (parentGroup !== null && /^Use\b/.test(parentGroup)))) ||
    (kind === 'blueprint' && parentGroup === null && BP_TOP_AXIOMS.has(axiomName))

  let inFence = false
  for (let j = 0; j < axiomBody.length; j++) {
    const line = axiomBody[j] ?? ''
    const lineNo = bodyStartLine + j + 1

    // 检测 code fence（任意 Axiom 内都触发，除非 field-load）
    if (isFenceOpen(line)) {
      inFence = !inFence
      if (!isFieldLoadAxiom) {
        violations.push({
          file,
          code: 'E_ASSET_AXIOM_HAS_CODE_FENCE',
          message: `### ${axiomName}（${parentGroup ?? '顶层'} Group）内含 code fence —— Axiom 扁平化要求纯 bullet（拆 Axiom 或转 prose）`,
          line: lineNo,
        })
      }
      continue
    }

    // 在 fence 内的行视为 fence 一部分；fence 检测已在上方触发
    if (inFence) continue

    // 检测 inline 表格（任意 Axiom 内都触发，除非 field-load）
    if (isTableLine(line)) {
      if (!isFieldLoadAxiom) {
        violations.push({
          file,
          code: 'E_ASSET_AXIOM_HAS_TABLE',
          message: `### ${axiomName}（${parentGroup ?? '顶层'} Group）内含表格 —— Axiom 扁平化要求纯 bullet（转 bullet 列表保留信息）`,
          line: lineNo,
        })
      }
      continue
    }

    // 检测 sub-bullet（缩进 2+ 空格 + -）
    if (isSubBullet(line)) {
      if (!isFieldLoadAxiom) {
        violations.push({
          file,
          code: 'E_ASSET_AXIOM_HAS_SUBNESTED_LIST',
          message: `### ${axiomName}（${parentGroup ?? '顶层'} Group）内含 sub-bullet（缩进 ${line.match(/^ +/)?.[0].length ?? 0} 空格 + -）—— Axiom 扁平化要求纯 bullet`,
          line: lineNo,
        })
      }
    }
  }

  return violations
}

/**
 * 校验通用 Asset（domain / workflow / stack / assetmap）。
 * - frontmatter 含 entity + name
 * - ## Group 唯一
 * - ### Axiom 唯一
 * - Group 下可仅含 Axiom（B）/ 仅含 List（C）/ Axiom + List（A）；混排 OK
 * - List 行只能含 `field: value` 或 free-form 文本
 */
function checkGeneric(parsed: ParsedAsset): Violation[] {
  const violations: Violation[] = []
  const { file, frontmatter, groups, bodyLines } = parsed

  if (!frontmatter.entity) {
    violations.push({ file, code: 'E_ASSET_MISSING_ENTITY', message: 'frontmatter 缺 entity 字段' })
  } else if (!ENTITY_TO_KIND[frontmatter.entity]) {
    violations.push({
      file,
      code: 'E_ASSET_KIND_INVALID',
      message: `frontmatter entity "${frontmatter.entity}" 不在 5 AssetKind 内`,
    })
  }
  if (!frontmatter.name) {
    violations.push({ file, code: 'E_ASSET_MISSING_NAME', message: 'frontmatter 缺 name 字段' })
  }
  if (groups.length === 0) {
    violations.push({
      file,
      code: 'E_ASSET_INVALID_GROUP_BODY',
      message: 'Asset 正文无任何 ## Group；至少需 1 个 ## Group',
    })
    return violations
  }

  // 1. Group 唯一性
  const seenGroup = new Map<string, number>()
  for (const g of groups) {
    const prev = seenGroup.get(g.title)
    if (prev !== undefined) {
      violations.push({
        file,
        code: 'E_ASSET_DUPLICATE_GROUP',
        message: `## ${g.title} 重复出现（首次 line ${prev}）`,
        line: g.line,
        context: g.title,
      })
    }
    seenGroup.set(g.title, g.line)
  }

  // 2. Axiom 唯一性 + 形态校验
  const seenAxiom = new Map<string, number>()
  let currentGroup: string | null = null
  const h2Indices = new Map<string, number>() // title -> bodyLines idx
  const h3Indices = new Map<string, { line: number; parentGroup: string | null; idx: number }>()

  for (let i = 0; i < bodyLines.length; i++) {
    const raw = bodyLines[i] ?? ''
    const h2m = raw.match(H2_RE)
    const h3m = raw.match(H3_RE)
    if (h2m) {
      currentGroup = h2m[1]!.trim()
      h2Indices.set(currentGroup, i)
      continue
    }
    if (h3m) {
      const title = h3m[1]!.trim()
      h3Indices.set(`${currentGroup ?? ''}###${title}`, {
        line: parsed.bodyStart + i + 1,
        parentGroup: currentGroup,
        idx: i,
      })

      // 全局唯一（同一 Asset 内 Axiom 名唯一）
      const prev = seenAxiom.get(title)
      if (prev !== undefined) {
        violations.push({
          file,
          code: 'E_ASSET_DUPLICATE_AXIOM',
          message: `### ${title} 重复出现（首次 line ${prev}）`,
          line: parsed.bodyStart + i + 1,
          context: title,
        })
      }
      seenAxiom.set(title, parsed.bodyStart + i + 1)
    }
  }

  // 3. Axiom 形态校验（A / B / C）：
  //   - 收集每个 Group 的内容（首个 list / 下一个 ## Group 之间）
  //   - 校验 group body 内只有 H3 / list / 缩进延续行 / 空行 / comment / code fence / table / blockquote
  for (const g of groups) {
    const gIdx = h2Indices.get(g.title)!
    const nextGIdx = [...h2Indices.values()].find((idx) => idx > gIdx) ?? bodyLines.length
    const slice = bodyLines.slice(gIdx + 1, nextGIdx)
    let inFence = false
    for (let i = 0; i < slice.length; i++) {
      const line = slice[i] ?? ''
      // 跟踪 fenced code block 状态（开/关翻转）
      if (isFenceOpen(line)) {
        inFence = !inFence
        continue
      }
      if (inFence) {
        // 在 fence 内所有行视为合法
        continue
      }
      if (isBlankLine(line) || isCommentLine(line)) continue
      const isH3 = H3_RE.test(line)
      const isList = LIST_RE.test(line)
      const isCont = isListContinuation(line)
      if (isH3) {
      } else if (isList) {
      } else if (isCont) {
      } else if (isTableLine(line)) {
      } else {
        violations.push({
          file,
          code: 'E_ASSET_INVALID_GROUP_BODY',
          message: `## ${g.title} 下出现非 ### Axiom / - List 行: "${line.slice(0, 60)}"`,
          line: parsed.bodyStart + gIdx + 1 + i,
          context: line.slice(0, 60),
        })
      }
    }
    // 形态 A/B/C 都合法；本函数仅报告非法内容（已上）
  }

  // 4. Axiom 体内容校验（A 形态）：
  //   - 形态 A: ### Axiom 下必须有 ≥1 个 list 行
  //   - 形态 B: ### Axiom 下可以为空（基础术语 Axiom）
  //   - 形态 C: 跨公理规则 → Group 下直接 -（在 Group 校验已覆盖）
  for (const [, info] of h3Indices) {
    if (info.parentGroup === null) continue // 顶层 Axiom 不在这里校验（Blueprint 特例）
    const parentGroupEnd =
      [...h2Indices.entries()].filter(([, idx]) => idx > info.idx).map(([, idx]) => idx)[0] ?? bodyLines.length
    const siblingH3Indices = [...h3Indices.values()]
      .filter((v) => v.parentGroup === info.parentGroup && v.idx > info.idx)
      .map((v) => v.idx)
    const sliceEnd = siblingH3Indices[0] ?? parentGroupEnd
    const slice = bodyLines.slice(info.idx + 1, sliceEnd)
    // 列表项 + 缩进延续都视为 Axiom 体内容（兼容 `- desc: |` 多行 YAML）
    const listItems = slice.filter((line) => LIST_RE.test(line) || isListContinuation(line))
    if (listItems.length === 0) {
      violations.push({
        file,
        code: 'E_ASSET_BLANK_AXIOM',
        message: `### ${info.parentGroup ? `${info.parentGroup} / ` : ''}(Axiom at line ${info.line}) 下无任何 - List 行（形态 B 允许空 Axiom；当前视为 warning，仅当 Group 内同时无 Axiom 体才报错）`,
        line: info.line,
      })
    }
  }

  // 5. Axiom 首 bullet 不得为变更标注（v3.1 新约束）：
  //    🆕 vX.Y.Z ... 注解不得作为 Axiom 的首条 bullet——
  //    注解记录的是迁移历史（信息已在 git log / RFC / changelog），
  //    作为首 bullet 会污染 glossary（sync-domain-glossary 取首 bullet 作 desc）。
  //    修正方式：删除注解行（信息已在 git log），或把注解挪到定义 bullet 之后。
  for (const [key, info] of h3Indices) {
    if (info.parentGroup === null) continue // 顶层 Axiom 留给 checkBlueprint 处理
    const title = key.split('###')[1] ?? ''
    const parentGroupEnd =
      [...h2Indices.entries()].filter(([, idx]) => idx > info.idx).map(([, idx]) => idx)[0] ?? bodyLines.length
    const siblingH3Indices = [...h3Indices.values()]
      .filter((v) => v.parentGroup === info.parentGroup && v.idx > info.idx)
      .map((v) => v.idx)
    const sliceEnd = siblingH3Indices[0] ?? parentGroupEnd
    const axiomBody = bodyLines.slice(info.idx + 1, sliceEnd)
    const firstBullet = axiomBody.find((line) => LIST_RE.test(line))
    if (firstBullet && /^🆕\s/.test(firstBullet.replace(/^\s*-\s+/, ''))) {
      violations.push({
        file,
        code: 'E_ASSET_ANNOTATION_FIRST_BULLET',
        message: `### ${info.parentGroup ? `${info.parentGroup} / ` : ''}${title} 首 bullet 是变更标注（🆕 v...）；注解污染 glossary desc，应删除或后置`,
        line: info.line,
      })
    }
  }

  // 6. Axiom 扁平化守门（v3.0 新约束）：Axiom body 内禁止 table / code fence / sub-bullet
  //    豁免：Stack Tool (Tools/Foundation Group) / Blueprint Slot (Slot Group) / Blueprint Use / 顶层 Scope / Context Template
  for (const [key, info] of h3Indices) {
    if (info.parentGroup === null) continue // 顶层 Axiom 留给 checkBlueprint 处理
    const title = key.split('###')[1] ?? ''
    const parentGroupEnd =
      [...h2Indices.entries()].filter(([, idx]) => idx > info.idx).map(([, idx]) => idx)[0] ?? bodyLines.length
    const siblingH3Indices = [...h3Indices.values()]
      .filter((v) => v.parentGroup === info.parentGroup && v.idx > info.idx)
      .map((v) => v.idx)
    const sliceEnd = siblingH3Indices[0] ?? parentGroupEnd
    const axiomBody = bodyLines.slice(info.idx + 1, sliceEnd)
    violations.push(
      ...checkAxiomBodyComplexity(file, title, info.parentGroup, axiomBody, parsed.bodyStart + info.idx, parsed.kind),
    )
  }

  // 7. Asset 不得引用 RFC/ADR 编号文档（v3.2 新约束）：
  //    Asset 作为 SSOT 自身就是出处；RFC/ADR 是这些 SSOT 的扩展阅读或描述。
  //    引用方向：RFC → Asset（landing-files），Asset 不反向引用 RFC/ADR。
  //    豁免：
  //    - RFC-XXXX 占位符（doc-md-domain 追踪标记）
  //    - docs/rfc/zh-cn/RFC-XXXX-<theme>.md 路径模板（概念定义位置）
  //    - 无编号的 "RFC" / "ADR" 字样（如 ### RFC 术语定义、PR-X 标识）
  //    - 🆕 v3.2.1: RFC-NNNN/ADR-NNNN 后面紧跟 D[0-9]+ Decision 引用（如 RFC-0032 D25）
  //      （这是「指向决策点」而非「反向引用文档」，是合法的历史溯源）
  //    正则只匹配 RFC/ADR + 数字编号 + 后面不是 D-section，避免误伤决策点引用。
  const RFC_ADR_NUMBERED = /\b(?:RFC|ADR)-\d{3,4}(?!\s+D\d{1,3})\b/
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i] ?? ''
    if (RFC_ADR_NUMBERED.test(line)) {
      violations.push({
        file,
        code: 'E_ASSET_RFC_ADR_CITATION',
        message: `Asset 正文引用了 RFC/ADR 编号文档（${line.match(RFC_ADR_NUMBERED)?.[0]}）；Asset 不反向引用 RFC/ADR（v3.2 引用方向守门）。Asset 自身即 SSOT，删除此引用或降级为概念术语提及。`,
        line: parsed.bodyStart + i,
      })
    }
  }

  return violations
}

/**
 * 校验 Blueprint 特例结构。
 * - ## Use <Asset Type>（type ∈ {workflow, domain, stack, blueprint, assetmap}）
 * - ## Slot（单一 H2）
 * - 顶层 ### Scope / ### Context Template（与 ## 同级）
 * - Use 下 ### Axiom 必须含 path / kind 字段负载
 */
function checkBlueprint(parsed: ParsedAsset): Violation[] {
  const violations: Violation[] = []
  const { file, frontmatter, groups, bodyLines, topLevelAxioms } = parsed

  if (!frontmatter.entity) {
    violations.push({ file, code: 'E_ASSET_MISSING_ENTITY', message: 'frontmatter 缺 entity 字段' })
  } else if (frontmatter.entity !== 'blueprint') {
    violations.push({
      file,
      code: 'E_ASSET_KIND_INVALID',
      message: `Blueprint entity 应为 "blueprint"，当前 "${frontmatter.entity}"`,
    })
  }
  if (!frontmatter.name) {
    violations.push({ file, code: 'E_ASSET_MISSING_NAME', message: 'frontmatter 缺 name 字段' })
  }

  // 1. ## Use <type> + ## Slot 至少 1 个；Blueprint 兼容旧形态 ## Use（无 type 后缀）
  const useGroups = groups.filter((g) => /^Use\s+/.test(g.title))
  const slotGroups = groups.filter((g) => g.title === 'Slot')
  const legacyUseGroup = groups.find((g) => g.title === 'Use')
  const seenUseType = new Map<string, number>()
  for (const g of useGroups) {
    const m = g.title.match(/^Use\s+(\S+)\s*$/)
    const type = m?.[1]
    if (!type) {
      violations.push({
        file,
        code: 'E_ASSET_BLUEPRINT_USE_KIND_MISSING',
        message: `## ${g.title} 缺 Asset Type（应为 "Use <kind>"）`,
        line: g.line,
      })
      continue
    }
    if (!VALID_USE_KINDS.has(type as AssetKind)) {
      violations.push({
        file,
        code: 'E_ASSET_BLUEPRINT_USE_KIND_UNKNOWN',
        message: `## Use ${type} 的 Asset Type 不在 5 AssetKind 内`,
        line: g.line,
      })
    }
    const prev = seenUseType.get(type)
    if (prev !== undefined) {
      violations.push({
        file,
        code: 'E_ASSET_BLUEPRINT_DUPLICATE_USE_TYPE',
        message: `## Use ${type} 重复（首次 line ${prev}）`,
        line: g.line,
      })
    }
    seenUseType.set(type, g.line)
  }
  if (useGroups.length === 0 && slotGroups.length === 0 && !legacyUseGroup) {
    violations.push({
      file,
      code: 'E_ASSET_BLUEPRINT_MISSING_USE_OR_SLOT',
      message: 'Blueprint 至少需要 1 个 ## Use <type> / ## Use / ## Slot',
    })
  }

  // 2. Use 下 ### Axiom 必须含 path / kind 字段负载
  for (const g of groups) {
    if (!/^Use\s+/.test(g.title)) continue
    const gStart = bodyLines.findIndex((line) => H2_RE.test(line) && new RegExp(`^##\\s+${g.title}\\s*$`).test(line))
    if (gStart === -1) continue
    const nextH2 = bodyLines.slice(gStart + 1).findIndex((line) => H2_RE.test(line))
    const sliceEnd = nextH2 === -1 ? bodyLines.length : gStart + 1 + nextH2
    const slice = bodyLines.slice(gStart + 1, sliceEnd)
    let lastH3: string | null = null
    for (const line of slice) {
      const h3m = line.match(H3_RE)
      if (h3m) lastH3 = h3m[1]!.trim()
      if (LIST_RE.test(line) && lastH3 !== null) {
        const text = line.replace(LIST_RE, '$1')
        // 允许 - path: / - kind: / - workflow: / - domain: / - stack: / - blueprint: / - assetmap:
        if (!/^(path|kind|workflow|domain|stack|blueprint|assetmap)\s*:/.test(text)) {
          violations.push({
            file,
            code: 'E_ASSET_INVALID_AXIOM_BODY',
            message: `## Use ${g.title.replace(/^Use\s+/, '')} / ### ${lastH3} 下缺 path/kind 字段负载: "${text.slice(0, 60)}"`,
          })
        }
      }
    }
  }

  // 3. ## Slot 下 ### Axiom 必须含 deps 字段负载（observe / operate 可选）
  //    Scope / Context Template 是 Blueprint 顶层字段特例，豁免 deps 校验
  for (const _g of slotGroups) {
    const gStart = bodyLines.findIndex((line) => H2_RE.test(line) && /^##\s+Slot\s*$/.test(line))
    if (gStart === -1) continue
    const nextH2 = bodyLines.slice(gStart + 1).findIndex((line) => H2_RE.test(line))
    const sliceEnd = nextH2 === -1 ? bodyLines.length : gStart + 1 + nextH2
    const slice = bodyLines.slice(gStart + 1, sliceEnd)
    let lastH3: string | null = null
    const hasDeps: Record<string, boolean> = {}
    for (const line of slice) {
      const h3m = line.match(H3_RE)
      if (h3m) {
        lastH3 = h3m[1]!.trim()
        hasDeps[lastH3] = false
        continue
      }
      const listm = line.match(LIST_RE)
      if (listm && lastH3 !== null) {
        const text = listm[1]!
        if (/^deps\s*:/.test(text)) hasDeps[lastH3] = true
      }
    }
    for (const [name, ok] of Object.entries(hasDeps)) {
      if (!ok && !BP_TOP_AXIOMS.has(name)) {
        violations.push({
          file,
          code: 'E_ASSET_BLUEPRINT_SLOT_MISSING_DEPS',
          message: `## Slot / ### ${name} 缺 deps 字段负载`,
        })
      }
    }
  }

  // 4. v2.1+ 严格：Blueprint 必须有顶层 ### Scope + ### Context Template
  //    旧形态 ## Scope / ## Context Template H2 触发升级提示
  const topScope = topLevelAxioms.find((a) => a.title === 'Scope')
  const topCtxTpl = topLevelAxioms.find((a) => a.title === 'Context Template')
  const legacyScopeH2 = groups.find((g) => g.title === 'Scope')
  const legacyCtxTplH2 = groups.find((g) => g.title === 'Context Template')

  if (!topScope) {
    if (legacyScopeH2) {
      violations.push({
        file,
        code: 'E_ASSET_BLUEPRINT_SCOPE_NOT_TOP_LEVEL',
        message: 'Blueprint ## Scope 应升为顶层 ### Scope（v2.1+ 强制；Blueprint 特例字段必须顶层）',
        line: legacyScopeH2.line,
      })
    } else {
      violations.push({
        file,
        code: 'E_ASSET_BLUEPRINT_MISSING_SCOPE',
        message: 'Blueprint 需顶层 ### Scope（allow / forbid 文件 glob）',
      })
    }
  }
  if (!topCtxTpl) {
    if (legacyCtxTplH2) {
      violations.push({
        file,
        code: 'E_ASSET_BLUEPRINT_CONTEXT_TEMPLATE_NOT_TOP_LEVEL',
        message: 'Blueprint ## Context Template 应升为顶层 ### Context Template（v2.1+ 强制）',
        line: legacyCtxTplH2.line,
      })
    } else {
      violations.push({
        file,
        code: 'E_ASSET_BLUEPRINT_MISSING_SCOPE',
        message: 'Blueprint 需顶层 ### Context Template（Work Context / Task Context 字段负载）',
      })
    }
  }

  // 5. 顶层 ### 只允许 Scope / Context Template（Blueprint 特例白名单）
  for (const a of topLevelAxioms) {
    if (a.title !== 'Scope' && a.title !== 'Context Template') {
      violations.push({
        file,
        code: 'E_ASSET_BLUEPRINT_INVALID_TOP_LEVEL',
        message: `Blueprint 顶层 ### ${a.title} 不在白名单（仅允许 Scope / Context Template）`,
        line: a.line,
      })
    }
  }

  // 6. Axiom 扁平化守门（v3.0 新约束）：Blueprint Axiom body 内禁止 table / code fence / sub-bullet
  //    豁免：## Use <type> / ## Slot Group（含 field-load Axiom）；顶层 Scope / Context Template
  for (const a of topLevelAxioms) {
    if (!BP_TOP_AXIOMS.has(a.title)) continue
    // 顶层 Axiom body 切片：到下一个 H2 / H3 / EOF
    let endIdx = bodyLines.length
    for (let j = a.line - parsed.bodyStart; j < bodyLines.length; j++) {
      const line = bodyLines[j] ?? ''
      if (j > a.line - parsed.bodyStart && /^#{2,3}\s/.test(line)) {
        endIdx = j
        break
      }
    }
    const axiomBody = bodyLines.slice(a.line - parsed.bodyStart + 1, endIdx)
    violations.push(
      ...checkAxiomBodyComplexity(
        file,
        a.title,
        null,
        axiomBody,
        parsed.bodyStart + a.line - parsed.bodyStart,
        parsed.kind,
      ),
    )
  }

  // 6b. ## Use <type> + ## Slot 内的 Axiom body 扁平化（field-load Axiom 自动豁免）
  for (const g of groups) {
    const isUseGroup = /^Use\s/.test(g.title)
    const isSlotGroup = g.title === 'Slot'
    if (!isUseGroup && !isSlotGroup) continue
    const gStart = bodyLines.findIndex((line) => H2_RE.test(line) && new RegExp(`^##\\s+${g.title}\\s*$`).test(line))
    if (gStart === -1) continue
    const nextH2 = bodyLines.slice(gStart + 1).findIndex((line) => H2_RE.test(line))
    const sliceEnd = nextH2 === -1 ? bodyLines.length : gStart + 1 + nextH2
    const slice = bodyLines.slice(gStart + 1, sliceEnd)
    // 切片内逐 ### 划分 Axiom body
    let lastH3Title: string | null = null
    let lastH3Start = -1
    for (let j = 0; j < slice.length; j++) {
      const line = slice[j] ?? ''
      const h3m = line.match(H3_RE)
      if (h3m) {
        if (lastH3Title !== null && lastH3Start !== -1) {
          const axiomBody = slice.slice(lastH3Start + 1, j)
          violations.push(
            ...checkAxiomBodyComplexity(
              file,
              lastH3Title,
              g.title,
              axiomBody,
              parsed.bodyStart + gStart + 1 + lastH3Start,
              parsed.kind,
            ),
          )
        }
        lastH3Title = h3m[1]!.trim()
        lastH3Start = j
      }
    }
    if (lastH3Title !== null && lastH3Start !== -1) {
      const axiomBody = slice.slice(lastH3Start + 1)
      violations.push(
        ...checkAxiomBodyComplexity(
          file,
          lastH3Title,
          g.title,
          axiomBody,
          parsed.bodyStart + gStart + 1 + lastH3Start,
          parsed.kind,
        ),
      )
    }
  }

  return violations
}

// ========================
// 主扫描 + 报告
// ========================

const ASSET_DIR_MAP: Record<AssetKind, string> = {
  domain: 'domains',
  workflow: 'workflows',
  stack: 'stacks',
  blueprint: 'blueprints',
  assetmap: 'assetmaps',
}

const ENTITY_DIR_HINT: Record<string, AssetKind> = {
  domain: 'domain',
  workflow: 'workflow',
  stack: 'stack',
  blueprint: 'blueprint',
  assetmap: 'assetmap', // 🆕 v0.6.4: canonical entity value
  roadmap: 'assetmap', // legacy alias (deprecated v0.6.4)
}

function listAssetFiles(assetsDir: string): Array<{ file: string; kind: AssetKind }> {
  const out: Array<{ file: string; kind: AssetKind }> = []
  for (const [kind, sub] of Object.entries(ASSET_DIR_MAP)) {
    const dir = join(assetsDir, sub)
    if (!existsSync(dir)) continue
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      continue
    }
    for (const name of entries) {
      if (!name.endsWith('.md')) continue
      if (name.startsWith('.')) continue
      const full = join(dir, name)
      try {
        if (!statSync(full).isFile()) continue
      } catch {
        continue
      }
      out.push({ file: full, kind: kind as AssetKind })
    }
  }
  return out
}

export function checkAssetStructure(projectRoot: string): CheckReport {
  const assetsDir = join(projectRoot, '.openxenon', 'assets')
  const violations: Violation[] = []
  let checked = 0
  let passed = 0

  if (!existsSync(assetsDir)) {
    return { projectRoot, assetsDir, checked: 0, passed: 0, violations: [] }
  }

  for (const { file, kind } of listAssetFiles(assetsDir)) {
    checked++
    let content: string
    try {
      content = readFileSync(file, 'utf-8')
    } catch (err) {
      violations.push({
        file: relative(projectRoot, file),
        code: 'E_ASSET_MISSING_FRONTMATTER',
        message: `read failed: ${err instanceof Error ? err.message : String(err)}`,
      })
      continue
    }

    const parsed = parseAsset(file, content, kind)
    if (!parsed) {
      violations.push({
        file: relative(projectRoot, file),
        code: 'E_ASSET_MISSING_FRONTMATTER',
        message: 'frontmatter 缺失或格式错误',
      })
      continue
    }

    // frontmatter.entity 与目录归属一致性校验
    const fmEntity = parsed.frontmatter.entity
    const dirKind = ENTITY_DIR_HINT[fmEntity ?? '']
    if (fmEntity && dirKind && dirKind !== kind) {
      violations.push({
        file: relative(projectRoot, file),
        code: 'E_ASSET_KIND_INVALID',
        message: `frontmatter entity="${fmEntity}" 应归属目录 ${ASSET_DIR_MAP[dirKind]}/，但实际在 ${ASSET_DIR_MAP[kind]}/`,
      })
    }

    const fileViolations = kind === 'blueprint' ? checkBlueprint(parsed) : checkGeneric(parsed)
    if (fileViolations.length === 0) passed++
    violations.push(...fileViolations)
  }

  return { projectRoot, assetsDir, checked, passed, violations }
}

// ========================
// CLI 入口
// ========================

function formatReport(report: CheckReport): string {
  const lines: string[] = []
  lines.push(
    `[asset-structure] checked=${report.checked} passed=${report.passed} violations=${report.violations.length}`,
  )
  if (report.violations.length === 0) return lines.join('\n')
  for (const v of report.violations) {
    const where = v.line !== undefined ? `${v.file}:${v.line}` : v.file
    lines.push(`  ✗ [${v.code}] ${where}: ${v.message}`)
  }
  return lines.join('\n')
}

async function main(): Promise<void> {
  const projectRoot = resolve(process.cwd())
  const report = checkAssetStructure(projectRoot)
  console.log(formatReport(report))
  process.exit(report.violations.length === 0 ? 0 : 1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
}
