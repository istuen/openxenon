import { glob } from 'glob'

export interface ProbeContext {
  projectRoot: string
}

export async function executeFsNotExists(
  pattern: string,
  context: ProbeContext
): Promise<string[]> {
  const fullPattern = pattern.startsWith('/')
    ? pattern
    : `${context.projectRoot}/${pattern}`

  const files = await glob(fullPattern, {
    absolute: true
  })

  return files
}
