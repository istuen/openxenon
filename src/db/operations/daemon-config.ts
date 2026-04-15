import type { Database } from 'bun:sqlite'

export function getDaemonAddress(db: Database): string | null {
  const stmt = db.prepare('SELECT value FROM daemon_config WHERE key = ?')
  const result = stmt.get('daemon_address') as { value: string } | undefined
  return result?.value ?? null
}

export function setDaemonAddress(db: Database, address: string): void {
  db.run(
    `INSERT INTO daemon_config (key, value, updated_at) 
     VALUES ('daemon_address', ?, strftime('%s', 'now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [address]
  )
}

export function clearDaemonAddress(db: Database): void {
  db.run("DELETE FROM daemon_config WHERE key = 'daemon_address'")
}
