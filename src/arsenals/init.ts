import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import {
  GLOBAL_ARSENALS_BLUEPRINTS,
  GLOBAL_ARSENALS_PARTS,
  GLOBAL_ARSENALS_PROBES,
  GLOBAL_FORGES_BLUEPRINTS,
  GLOBAL_FORGES_PARTS,
  GLOBAL_FORGES_PROBES,
  resolveArsenalRoot,
  resolveForgeRoot,
  type Scope,
} from '../infra/paths'

export function ensureArsenalsDirectories(scope: Scope, cwd?: string): void {
  const dirs =
    scope === 'global'
      ? [GLOBAL_ARSENALS_PROBES, GLOBAL_ARSENALS_BLUEPRINTS, GLOBAL_ARSENALS_PARTS]
      : [
          join(resolveArsenalRoot(scope, cwd), 'probes'),
          join(resolveArsenalRoot(scope, cwd), 'blueprints'),
          join(resolveArsenalRoot(scope, cwd), 'parts'),
        ]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

export function ensureForgesDirectories(scope: Scope, cwd?: string): void {
  const dirs =
    scope === 'global'
      ? [GLOBAL_FORGES_PROBES, GLOBAL_FORGES_BLUEPRINTS, GLOBAL_FORGES_PARTS]
      : [
          join(resolveForgeRoot(scope, cwd), 'probes'),
          join(resolveForgeRoot(scope, cwd), 'blueprints'),
          join(resolveForgeRoot(scope, cwd), 'parts'),
        ]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

export function isArsenalsDirectoryReady(_scope: Scope = 'project', _cwd?: string): boolean {
  return [GLOBAL_ARSENALS_PROBES, GLOBAL_ARSENALS_BLUEPRINTS, GLOBAL_ARSENALS_PARTS].every((dir) => existsSync(dir))
}
