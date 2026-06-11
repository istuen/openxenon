import { join, resolve as pathResolve } from 'node:path'
import type { PathPort } from '../kernel/index'

export const pathPort: PathPort = {
  join(...segments: string[]): string {
    return join(...segments)
  },
  resolve(base: string, ...segments: string[]): string {
    return pathResolve(base, ...segments)
  },
}
