import { registerRoute } from '../router'
import { hallEmitter, type HallEvent } from '../../hall'
import { daemonLogger } from '../../logger'

function formatSSE(event: HallEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

async function handleEventStream(
  _request: Request,
  projectPath: string
): Promise<Response> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: HallEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)))
        } catch {
        }
      }

      const onStageStarted = (data: HallEvent) => sendEvent(data)
      const onStageCompleted = (data: HallEvent) => sendEvent(data)
      const onStageFailed = (data: HallEvent) => sendEvent(data)
      const onStageTimeout = (data: HallEvent) => sendEvent(data)
      const onTaskCreated = (data: HallEvent) => sendEvent(data)
      const onTaskRunning = (data: HallEvent) => sendEvent(data)
      const onTaskCompleted = (data: HallEvent) => sendEvent(data)
      const onTaskFailed = (data: HallEvent) => sendEvent(data)
      const onProbeResult = (data: HallEvent) => sendEvent(data)

      hallEmitter.on('stage:started', onStageStarted)
      hallEmitter.on('stage:completed', onStageCompleted)
      hallEmitter.on('stage:failed', onStageFailed)
      hallEmitter.on('stage:timeout', onStageTimeout)
      hallEmitter.on('task:created', onTaskCreated)
      hallEmitter.on('task:running', onTaskRunning)
      hallEmitter.on('task:completed', onTaskCompleted)
      hallEmitter.on('task:failed', onTaskFailed)
      hallEmitter.on('probe:result', onProbeResult)

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`))

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30000)

      _request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        hallEmitter.off('stage:started', onStageStarted)
        hallEmitter.off('stage:completed', onStageCompleted)
        hallEmitter.off('stage:failed', onStageFailed)
        hallEmitter.off('stage:timeout', onStageTimeout)
        hallEmitter.off('task:created', onTaskCreated)
        hallEmitter.off('task:running', onTaskRunning)
        hallEmitter.off('task:completed', onTaskCompleted)
        hallEmitter.off('task:failed', onTaskFailed)
        hallEmitter.off('probe:result', onProbeResult)
        daemonLogger.info('SSE client disconnected')
        controller.close()
      })
    }
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}

registerRoute('GET', '/api/v1/events/stream', handleEventStream)

export { handleEventStream }