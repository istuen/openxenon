import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { type Scope, resolveArsenalRoot, resolveForgeRoot, GLOBAL_ARSENALS_PROBES, GLOBAL_ARSENALS_STAGES, GLOBAL_ARSENALS_BLUEPRINTS, GLOBAL_FORGES_PROBES, GLOBAL_FORGES_STAGES, GLOBAL_FORGES_BLUEPRINTS } from '../infra/paths'

export function ensureArsenalsDirectories(scope: Scope, cwd?: string): void {
  const dirs = scope === 'global'
    ? [GLOBAL_ARSENALS_PROBES, GLOBAL_ARSENALS_STAGES, GLOBAL_ARSENALS_BLUEPRINTS]
    : [
        join(resolveArsenalRoot(scope, cwd), 'probes'),
        join(resolveArsenalRoot(scope, cwd), 'stages'),
        join(resolveArsenalRoot(scope, cwd), 'blueprints')
      ]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

export function ensureForgesDirectories(scope: Scope, cwd?: string): void {
  const dirs = scope === 'global'
    ? [GLOBAL_FORGES_PROBES, GLOBAL_FORGES_STAGES, GLOBAL_FORGES_BLUEPRINTS]
    : [
        join(resolveForgeRoot(scope, cwd), 'probes'),
        join(resolveForgeRoot(scope, cwd), 'stages'),
        join(resolveForgeRoot(scope, cwd), 'blueprints')
      ]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

export function isArsenalsDirectoryReady(_scope: Scope = 'project', _cwd?: string): boolean {
  return [GLOBAL_ARSENALS_PROBES, GLOBAL_ARSENALS_STAGES, GLOBAL_ARSENALS_BLUEPRINTS].every(dir => existsSync(dir))
}