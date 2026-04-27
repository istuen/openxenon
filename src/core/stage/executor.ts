import { StagingManager } from '../staging'

export class StageExecutor {
  private projectRoot: string
  private taskId: string

  constructor(projectRoot: string, taskId: string) {
    this.projectRoot = projectRoot
    this.taskId = taskId
  }

  async execute(stageId: string, passed: boolean): Promise<void> {
    const staging = new StagingManager(this.projectRoot, this.taskId)

    try {
      staging.ensureStagingDir()

      if (passed) {
        staging.moveToSrc()
      } else {
        staging.cleanup()
      }
    } catch (error) {
      staging.cleanup()
      console.error(`Stage ${stageId} failed:`, error)
    }
  }
}