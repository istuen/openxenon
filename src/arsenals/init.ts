import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import {
  GLOBAL_ARSENAL_BLUEPRINTS,
  GLOBAL_ARSENAL_PARTS,
  GLOBAL_ARSENAL_PROBES,
  resolveArsenalRoot,
  type Scope,
} from './paths'

export function ensureArsenalDirectories(scope: Scope, cwd?: string): void {
  const baseRoot = resolveArsenalRoot(scope, cwd)
  const dirs =
    scope === 'global'
      ? [
          join(GLOBAL_ARSENAL_PROBES, 'drafts'),
          join(GLOBAL_ARSENAL_BLUEPRINTS, 'drafts'),
          join(GLOBAL_ARSENAL_PARTS, 'drafts'),
        ]
      : [join(baseRoot, 'probes', 'drafts'), join(baseRoot, 'blueprints', 'drafts'), join(baseRoot, 'parts', 'drafts')]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

export function isArsenalDirectoryReady(_scope: Scope = 'project', _cwd?: string): boolean {
  return [GLOBAL_ARSENAL_PROBES, GLOBAL_ARSENAL_BLUEPRINTS, GLOBAL_ARSENAL_PARTS].every((dir) => existsSync(dir))
}
