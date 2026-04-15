import { daemonLogger } from './logger'

export interface HealthCheckResult {
  success: boolean
  elapsedMs: number
}

export async function waitForHealth(
  baseUrl: string,
  timeout: number = 5000
): Promise<HealthCheckResult> {
  const start = Date.now()
  const healthUrl = `${baseUrl}/api/v1/health`
  
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(healthUrl)
      if (response.ok) {
        const elapsedMs = Date.now() - start
        daemonLogger.info(`Daemon health check passed in ${elapsedMs}ms`)
        return { success: true, elapsedMs }
      }
    } catch {
      // Server not ready yet, continue polling
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  const elapsedMs = Date.now() - start
  daemonLogger.error(`Daemon health check timed out after ${elapsedMs}ms`)
  return { success: false, elapsedMs }
}
