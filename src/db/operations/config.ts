import type { Database } from 'bun:sqlite'

export function getConfig(db: Database, key: string): string | null {
  const stmt = db.prepare('SELECT value FROM config WHERE key = ?')
  const row = stmt.get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setConfig(db: Database, key: string, value: string): void {
  const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
  stmt.run(key, value)
}

export function getSpaceMode(db: Database): 'PRODUCTION' | 'SANDBOX' {
  const mode = getConfig(db, 'mode')
  return (mode as 'PRODUCTION' | 'SANDBOX') || 'PRODUCTION'
}

export function setSpaceMode(db: Database, mode: 'PRODUCTION' | 'SANDBOX'): void {
  setConfig(db, 'mode', mode)
}