/**
 * Roadmap/suggest.ts — scene-scoped jaccard keyword suggest
 *
 * Per user decision: --scene is REQUIRED for suggest (avoid AI Agent searching whole Roadmap).
 *
 * Algorithm:
 *   score(link) = 0.6 * jaccard(goal_tokens, link.name_tokens)
 *              + 0.4 * jaccard(goal_tokens, link.description_tokens)
 *   Sort by score desc, return topK
 *
 * Future (v0.8): upgrade to BM25 or LLM-embedding for semantic match.
 */

import type { Roadmap, RoadmapLink } from './types.js'

export interface SuggestInput {
  goal: string
  roadmap: Roadmap
  /** Scene name — REQUIRED. Caller must validate before calling. */
  scene: string
  /** Defaults to 5 */
  topK?: number
}

export interface SuggestOutput {
  scene: string
  matches: Array<{
    kind: string
    name: string
    description: string
    score: number
    rationale: string
  }>
}

export function suggestAssets(input: SuggestInput): SuggestOutput {
  if (!input.scene || input.scene.trim() === '') {
    throw new Error('suggestAssets: --scene is required (must be non-empty)')
  }
  if (!input.goal || input.goal.trim() === '') {
    throw new Error('suggestAssets: --goal is required (must be non-empty)')
  }
  const scene = input.roadmap.scenes.find((s) => s.name === input.scene)
  if (!scene) {
    const known = input.roadmap.scenes.map((s) => s.name).join(', ')
    throw new Error(`Scene '${input.scene}' not found in Roadmap '${input.roadmap.name}'. Known scenes: ${known}`)
  }

  const goalTokens = tokenize(input.goal)
  const topK = input.topK ?? 5

  const scored = scene.links.map((link) => {
    const nameTokens = tokenize(link.name)
    const descTokens = tokenize(link.description)
    const nameScore = jaccard(goalTokens, nameTokens)
    const descScore = jaccard(goalTokens, descTokens)
    const score = 0.6 * nameScore + 0.4 * descScore
    return {
      kind: link.kind,
      name: link.name,
      description: link.description,
      score,
      rationale: explainMatch(goalTokens, link, nameScore, descScore),
    }
  })

  scored.sort((a, b) => b.score - a.score)
  return { scene: scene.name, matches: scored.slice(0, topK) }
}

/**
 * Tokenize: lowercase, split on non-alphanumeric (English + CJK aware), drop 1-char noise.
 * Supports basic CJK: each Han character becomes a single token.
 */
export function tokenize(text: string): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const tokens: string[] = []
  // ASCII words
  const asciiMatches = lower.match(/[a-z][a-z0-9_-]*/g)
  if (asciiMatches) tokens.push(...asciiMatches.filter((t) => t.length > 1))
  // CJK chars (basic Han range + Japanese Hiragana/Katakana + Korean)
  const cjkMatches = lower.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g)
  if (cjkMatches) tokens.push(...cjkMatches)
  return tokens
}

/**
 * Jaccard similarity: |A ∩ B| / |A ∪ B|. Returns 0 if both empty.
 */
export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

function explainMatch(goalTokens: string[], link: RoadmapLink, nameScore: number, descScore: number): string {
  const matchedName = goalTokens.filter((t) => link.name.toLowerCase().includes(t))
  const matchedDesc = goalTokens.filter((t) => link.description.toLowerCase().includes(t))
  const parts: string[] = []
  if (matchedName.length > 0) parts.push(`name hit: ${matchedName.join(',')}`)
  if (matchedDesc.length > 0) parts.push(`desc hit: ${matchedDesc.slice(0, 3).join(',')}`)
  if (parts.length === 0) {
    parts.push(`low overlap (name=${nameScore.toFixed(2)}, desc=${descScore.toFixed(2)})`)
  }
  return parts.join('; ')
}
