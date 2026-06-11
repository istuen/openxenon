// src/cli/config-loader.ts
//
// Configuration loader for the dual-track CLI.
//
// Resolution priority (highest first):
//   1. CLI flag `--leader-mode=<reference|mvp>`  (handled in src/cli/index.ts)
//   2. Environment variable `OXN_LEADER_MODE`
//   3. Project config file `./.oxnrc`           (auto-loaded from CWD)
//   4. Default: `reference`
//
// The .oxnrc file is a small JSON document that lets a project pin its
// preferred leader track. Example:
//   {
//     "version": 1,
//     "leaderMode": "mvp"
//   }
//
// On a malformed .oxnrc the loader falls back to "no project config" and
// the resolution chain continues with env / default. The error is logged
// to stderr so the user knows to fix the file, but no error is returned.

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR } from '../kernel/index'

export type LeaderMode = 'reference' | 'mvp'

export const VALID_LEADER_MODES: readonly LeaderMode[] = ['reference', 'mvp']

export const DEFAULT_LEADER_MODE: LeaderMode = 'reference'

export interface OxnConfig {
  version: 1
  leaderMode?: LeaderMode
  [key: string]: unknown
}

export const OXN_RC_FILENAME = '.oxnrc'

/**
 * Try to load and parse a .oxnrc from the project root. Returns `null` when
 * the file does not exist or cannot be parsed. Parse errors are surfaced via
 * the `warning` string so callers can decide whether to log them.
 */
export function loadOxnRc(projectRoot: string): { config: OxnConfig | null; warning?: string } {
  const path = join(projectRoot, OXN_RC_FILENAME)
  if (!existsSync(path)) return { config: null }
  let content: string
  try {
    content = readFileSync(path, 'utf-8')
  } catch (err) {
    return { config: null, warning: `${path}: ${err instanceof Error ? err.message : String(err)}` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (err) {
    return { config: null, warning: `${path}: invalid JSON (${err instanceof Error ? err.message : String(err)})` }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { config: null, warning: `${path}: top-level value must be a JSON object` }
  }
  const obj = parsed as Record<string, unknown>
  if (obj.version !== 1) {
    return { config: null, warning: `${path}: unsupported version ${JSON.stringify(obj.version)} (expected 1)` }
  }
  const config: OxnConfig = { version: 1, ...obj }
  if (config.leaderMode !== undefined && !VALID_LEADER_MODES.includes(config.leaderMode)) {
    return {
      config: null,
      warning: `${path}: invalid leaderMode ${JSON.stringify(config.leaderMode)} (expected one of ${VALID_LEADER_MODES.join(', ')})`,
    }
  }
  return { config }
}

/**
 * Normalize a raw leader-mode string. Returns `null` for invalid input
 * (empty, unknown value) so the caller can fall through to the next source.
 */
export function normalizeLeaderMode(raw: string | undefined): LeaderMode | null {
  if (!raw) return null
  const v = raw.toLowerCase()
  if (v === 'reference' || v === 'mvp') return v
  return null
}

/**
 * Resolve which leader track to use. Higher-priority sources win.
 *
 *   cliFlag        — value of --leader-mode from argv
 *   envValue       — value of OXN_LEADER_MODE
 *   projectConfig  — .oxnrc (already loaded by the caller)
 *
 * Returns the resolved mode and the *source* it came from, which is useful
 * for `oxn config show` and for diagnostics on first invocation.
 */
export interface ResolvedLeader {
  mode: LeaderMode
  source: 'cli' | 'env' | 'project' | 'default'
}

export function resolveLeaderMode(opts: {
  cliFlag?: string
  envValue?: string
  projectConfig?: OxnConfig | null
}): ResolvedLeader {
  const fromCli = normalizeLeaderMode(opts.cliFlag)
  if (fromCli) return { mode: fromCli, source: 'cli' }
  const fromEnv = normalizeLeaderMode(opts.envValue)
  if (fromEnv) return { mode: fromEnv, source: 'env' }
  if (opts.projectConfig?.leaderMode) {
    return { mode: opts.projectConfig.leaderMode, source: 'project' }
  }
  return { mode: DEFAULT_LEADER_MODE, source: 'default' }
}

void BOUNDARY_DIR
