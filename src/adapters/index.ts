import type { SkillAdapter } from './types'
import { OpenCodeAdapter } from './opencode.adapter'

const adapters: Map<string, SkillAdapter> = new Map()

export function registerAdapter(adapter: SkillAdapter): void {
  adapters.set(adapter.toolId, adapter)
}

export function getAdapter(toolId: string): SkillAdapter | undefined {
  return adapters.get(toolId)
}

export function listAdapters(): string[] {
  return Array.from(adapters.keys())
}

export function hasAdapter(toolId: string): boolean {
  return adapters.has(toolId)
}

registerAdapter(new OpenCodeAdapter())

export { OpenCodeAdapter } from './opencode.adapter'
export type { SkillAdapter } from './types'
