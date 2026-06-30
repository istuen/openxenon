/**
 * Intent module — attach/detach asset use case (v0.6 PR-5b实现)
 */
import { readFileSync, writeFileSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { getWorkOxnPath } from '@openxenon/engine/Work/dual-state-io'
import { IAPError, IAPAction } from '@openxenon/engine/errors'

export function attachAsset(
  projectRoot: string, workName: string,
  kind: 'domain' | 'blueprint', name: string, ref: string,
): { ok: boolean } {
  const oxnPath = getWorkOxnPath(projectRoot, workName)
  if (!existsSync(oxnPath)) {
    throw new IAPError('ALIGN', 'CHECKLIST_MISSING', IAPAction.YIELD_TO_HUMAN, `work.oxn not found: ${oxnPath}`)
  }
  let content = readFileSync(oxnPath, 'utf-8')
  const line = kind === 'domain'
    ? `  domain "${name}" ref "${ref}";`
    : `  blueprint "${name}" ref "${ref}";`
  // Insert before the first task declaration or before the closing }
  if (content.includes('task "')) {
    content = content.replace(/(\s*)task\s+"/, `${line}\n\$1task "`)
  } else {
    content = content.replace(/(\s*)}/, `${line}\n\$1}`)
  }
  writeFileSync(oxnPath, content, 'utf-8')
  return { ok: true }
}

export function detachAsset(
  projectRoot: string, workName: string,
  kind: 'domain' | 'blueprint', name: string,
): { ok: boolean } {
  const oxnPath = getWorkOxnPath(projectRoot, workName)
  if (!existsSync(oxnPath)) {
    throw new IAPError('ALIGN', 'CHECKLIST_MISSING', IAPAction.YIELD_TO_HUMAN, `work.oxn not found: ${oxnPath}`)
  }
  let content = readFileSync(oxnPath, 'utf-8')
  const pattern = kind === 'domain'
    ? new RegExp(`\\s*domain\\s+"${name}"\\s+ref\\s+"[^"]+";\\n`, 'g')
    : new RegExp(`\\s*blueprint\\s+"${name}"\\s+ref\\s+"[^"]+";\\n`, 'g')
  content = content.replace(pattern, '')
  writeFileSync(oxnPath, content, 'utf-8')
  return { ok: true }
}
