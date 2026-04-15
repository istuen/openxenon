import { mkdirSync, existsSync } from 'fs'
import { 
  GLOBAL_BOUNDARY_PATH, 
  CORE_DB_PATH, 
  GLOBAL_PROOFS_PATH,
  COMMON_PROOFS_PATH,
  TEMPLATES_PATH 
} from './global'
import { initCoreDb } from '../db/init'
import type { Database } from 'bun:sqlite'

export function ensureGlobalBoundary(): Database {
  if (!existsSync(GLOBAL_BOUNDARY_PATH)) {
    mkdirSync(GLOBAL_BOUNDARY_PATH, { recursive: true })
  }
  
  if (!existsSync(GLOBAL_PROOFS_PATH)) {
    mkdirSync(GLOBAL_PROOFS_PATH, { recursive: true })
  }
  
  if (!existsSync(COMMON_PROOFS_PATH)) {
    mkdirSync(COMMON_PROOFS_PATH, { recursive: true })
  }
  
  if (!existsSync(TEMPLATES_PATH)) {
    mkdirSync(TEMPLATES_PATH, { recursive: true })
  }
  
  return initCoreDb(CORE_DB_PATH)
}
