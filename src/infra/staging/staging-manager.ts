import { mkdirSync, rmSync, existsSync, cpSync, readdirSync } from 'fs'
import { join } from 'path'
import { getTaskPath } from '../../kernel'

export class StagingManager {
  constructor(
    private projectRoot: string,
    private taskId: string
  ) {}

  private get stagingPath(): string {
    return join(getTaskPath(this.projectRoot, this.taskId), 'staging')
  }

  ensureStagingDir(): void {
    if (!existsSync(this.stagingPath)) {
      mkdirSync(this.stagingPath, { recursive: true })
    }
  }

  getStagingPath(): string {
    return this.stagingPath
  }

  cleanup(): void {
    if (existsSync(this.stagingPath)) {
      rmSync(this.stagingPath, { recursive: true, force: true })
    }
  }

  moveToSrc(): void {
    if (!existsSync(this.stagingPath)) {
      return
    }

    const destDir = join(this.projectRoot, 'src')
    mkdirSync(destDir, { recursive: true })

    const entries = readdirSync(this.stagingPath)
    for (const entry of entries) {
      const srcPath = join(this.stagingPath, entry)
      const destPath = join(destDir, entry)

      if (entry === 'src' && existsSync(srcPath)) {
        const srcEntries = readdirSync(srcPath)
        for (const srcEntry of srcEntries) {
          const innerSrc = join(srcPath, srcEntry)
          const innerDest = join(destDir, srcEntry)
          cpSync(innerSrc, innerDest, { recursive: true, force: true })
        }
      } else {
        cpSync(srcPath, destPath, { recursive: true, force: true })
      }
    }
  }

  isEmpty(): boolean {
    if (!existsSync(this.stagingPath)) {
      return true
    }
    return readdirSync(this.stagingPath).length === 0
  }
}
