/**
 * Roadmap module — v0.6.x scene-based Roadmap engine
 *
 * Exports:
 *   - parseRoadmapMd: .md file → Roadmap AST
 *   - suggestAssets: scene-scoped jaccard keyword suggest
 *   - syncRoadmap: detect dangling/outdated links (dry-run by default)
 *
 * Replaces deprecated .oxn-based path for AI Agent
 * consumption.
 */

export { parseRoadmapMd, parseRoadmapMdContent } from './parser.js'
export { suggestAssets, tokenize, jaccard } from './suggest.js'
export { syncRoadmap } from './sync.js'
export type { Roadmap, RoadmapScene, RoadmapLink, RoadmapParseResult } from './types.js'
export type { SuggestInput, SuggestOutput } from './suggest.js'
export type { SyncOptions, SyncReport } from './sync.js'
