/**
 * Roadmap module — v0.6.x scene-based Roadmap types
 *
 * Roadmap = AssetKind=roadmap with 6 builtin scenes (doc/dev/debug/test/release/onboard).
 * Each scene contains a flat list of links (kind + name + description).
 * Roadmap lives at `.openxenon/assets/roadmaps/<name>.md` (canonical).
 *
 * Scope: project-specific (per user decision A). Does NOT participate in Asset references DAG.
 */

import type { AssetKind } from '../infra/paths.js'

/**
 * A single Roadmap link (kind + name + description).
 * `kind` is the Asset kind (e.g. 'domain', 'blueprint').
 * `name` is the Asset name (e.g. 'WorkOrchestrationContext').
 * `description` is a one-line summary pulled from the Asset's abstract (sync) or authored manually (initial).
 */
export interface RoadmapLink {
  kind: AssetKind
  name: string
  description: string
}

/**
 * A single Roadmap scene (e.g. 'doc', 'dev').
 * `description` is a short summary of when this scene applies.
 */
export interface RoadmapScene {
  name: string
  description: string
  links: RoadmapLink[]
}

/**
 * Parsed Roadmap (in-memory representation).
 * Mirrors the scene-based .md structure.
 */
export interface Roadmap {
  name: string
  version: number
  abstract: string
  scenes: RoadmapScene[]
}

/**
 * Parse result: Roadmap + warnings (non-fatal issues like empty scenes).
 */
export interface RoadmapParseResult {
  roadmap: Roadmap
  warnings: string[]
}
