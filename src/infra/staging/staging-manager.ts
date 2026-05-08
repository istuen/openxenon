import { mkdirSync, rmSync, existsSync, cpSync, readdirSync } from 'fs'
import { join } from 'path'

export class StagingManager {
  constructor(
    private taskPath: string
  ) {}

  private get stagingPath(): string {
    return join(this.taskPath, 'staging')
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

  moveToSrc(projectRoot: string): void {
    if (!existsSync(this.stagingPath)) {
      return
    }

    const destDir = join(projectRoot, 'src')
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
