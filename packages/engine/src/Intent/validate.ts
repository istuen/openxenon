/**
 * Intent module — validate-work use case (v0.6 阶段3)
 *
 * Wraps validateAndWriteArtifacts from CLI work.ts for migration to Engine.
 */
import { existsSync } from '@openxenon/engine/infra/filesystem'
import { getWorkGatePath, getWorkOxnPath } from '../../../src/work/dual-state-io'
import type { ValidateWorkInput, ValidateWorkResult } from './types'

export function validateWork(input: ValidateWorkInput): ValidateWorkResult {
  const gatePath = getWorkGatePath(input.projectRoot, input.workName)
  const oxnPath = getWorkOxnPath(input.projectRoot, input.workName)

  const errors: string[] = []
  if (!existsSync(oxnPath)) {
    errors.push(`work.oxn not found at ${oxnPath}`)
  }
  if (!existsSync(gatePath)) {
    errors.push(`.work gate card not found at ${gatePath}`)
  }

  return {
    ok: errors.length === 0,
    errors,
    assets: { domains: [], blueprints: [] },
  }
}
