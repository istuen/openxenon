import type { TraceEvent } from '../../kernel/lib/types/task-trace'
import type { TaskTraceState, StageState } from '../../kernel/lib/types/task-trace'

export interface TaskTraceRendererOptions {
  taskId: string
  traceContent: string
}

export function taskTraceToHtml(options: TaskTraceRendererOptions): string {
  const { taskId, traceContent } = options

  const state = reduceTraceEventsFromContent(traceContent)
  if (!state) {
    return renderErrorHtml(`无法解析 task-trace: ${taskId}`)
  }

  const taskDuration = state.completedAt
    ? state.completedAt - state.startedAt
    : Date.now() - state.startedAt

  const stages = Array.from(state.stages.values())
  const failedProbes = stages.flatMap(s => s.probes.filter(p => p.result === 'FAILED'))
  const overallStatus = state.status === 'COMPLETED' && failedProbes.length === 0 ? 'PASSED' : 'FAILED'

  return renderHtmlDocument({
    title: `Task Report: ${taskId}`,
    head: renderTaskTraceHead(),
    body: renderTaskTraceBody({
      taskId,
      taskName: state.taskName,
      status: overallStatus,
      duration: taskDuration,
      startedAt: state.startedAt,
      stages
    })
  })
}

function reduceTraceEventsFromContent(content: string): TaskTraceState | null {
  if (!content.trim()) return null

  const lines = content.split('\n').filter(line => line.trim())
  const events: TraceEvent[] = []

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      events.push(JSON.parse(line) as TraceEvent)
    } catch {
      // Skip malformed lines
    }
  }

  if (events.length === 0) return null

  const state: TaskTraceState = {
    taskId: '',
    taskName: '',
    status: 'NOT_FOUND',
    startedAt: 0,
    stages: new Map()
  }

  for (const event of events) {
    applyEvent(state, event)
  }

  return state
}

function applyEvent(state: TaskTraceState, event: TraceEvent): void {
  switch (event.type) {
    case 'TASK_START':
      state.taskId = event.taskId
      state.taskName = event.taskName
      state.startedAt = event.timestamp
      state.status = 'RUNNING'
      break

    case 'TASK_STATUS':
      state.status = event.status
      if (event.status !== 'RUNNING') {
        state.completedAt = event.timestamp
      }
      break

    case 'STAGE_START':
      state.stages.set(event.stageId, {
        stageId: event.stageId,
        stageName: event.stageName,
        status: 'PENDING',
        probes: [],
        startedAt: event.timestamp
      })
      break

    case 'STAGE_COMPLETE': {
      const stage = state.stages.get(event.stageId)
      if (stage) {
        stage.status = event.status
        stage.completedAt = event.timestamp
      }
      break
    }

    case 'PROBE_RESULT': {
      const stage = state.stages.get(event.stageId)
      if (stage) {
        stage.probes.push({
          probeType: event.probeType,
          result: event.result,
          output: event.output,
          error: event.error,
          executedAt: event.timestamp
        })
      }
      break
    }
  }
}

function renderErrorHtml(message: string): string {
  return renderHtmlDocument({
    title: 'Error',
    head: '',
    body: `<div class="error">${escapeHtml(message)}</div>`
  })
}

function renderTaskTraceHead(): string {
  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f5f5f5;
        color: #333;
        line-height: 1.6;
        padding: 20px;
      }
      .container {
        max-width: 900px;
        margin: 0 auto;
      }
      .header {
        background: white;
        border-radius: 8px;
        padding: 24px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .header.passed { border-left: 4px solid #22c55e; }
      .header.failed { border-left: 4px solid #ef4444; }
      .header h1 {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .header .meta {
        display: flex;
        gap: 16px;
        font-size: 14px;
        color: #666;
      }
      .status-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .status-badge.passed { background: #dcfce7; color: #166534; }
      .status-badge.failed { background: #fee2e2; color: #991b1b; }
      .stages { display: flex; flex-direction: column; gap: 16px; }
      .stage {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .stage-header {
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #eee;
      }
      .stage-header h2 {
        font-size: 16px;
        font-weight: 600;
      }
      .stage-duration {
        font-size: 13px;
        color: #666;
      }
      .stage-duration.running { color: #3b82f6; }
      .stage-duration.passed { color: #22c55e; }
      .stage-duration.failed { color: #ef4444; }
      .probes { padding: 12px 20px; }
      .probe {
        padding: 12px;
        margin: 8px 0;
        border-radius: 6px;
        background: #f9f9f9;
        border-left: 3px solid #ddd;
      }
      .probe.passed { border-left-color: #22c55e; }
      .probe.failed { border-left-color: #ef4444; background: #fef2f2; }
      .probe-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 6px;
      }
      .probe-type {
        font-family: monospace;
        font-size: 13px;
        color: #333;
        font-weight: 500;
      }
      .probe-result {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .probe-result.passed { color: #22c55e; }
      .probe-result.failed { color: #ef4444; }
      .probe-output {
        font-family: monospace;
        font-size: 12px;
        color: #666;
        background: #f0f0f0;
        padding: 8px;
        border-radius: 4px;
        margin-top: 8px;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .probe-error {
        font-family: monospace;
        font-size: 12px;
        color: #991b1b;
        background: #fee2e2;
        padding: 8px;
        border-radius: 4px;
        margin-top: 8px;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .probe-actions {
        margin-top: 8px;
        display: flex;
        gap: 8px;
      }
      .btn {
        padding: 4px 10px;
        font-size: 12px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        background: #e5e5e5;
        color: #333;
        transition: background 0.2s;
      }
      .btn:hover { background: #d5d5d5; }
      .btn.copy { background: #3b82f6; color: white; }
      .btn.copy:hover { background: #2563eb; }
      .skipped {
        padding: 16px 20px;
        color: #666;
        font-style: italic;
      }
      .actions {
        margin-top: 20px;
        display: flex;
        gap: 12px;
      }
      .actions .btn {
        padding: 10px 20px;
        font-size: 14px;
      }
      .actions .btn.primary {
        background: #22c55e;
        color: white;
      }
      .actions .btn.primary:hover { background: #16a34a; }
      .error {
        background: #fee2e2;
        color: #991b1b;
        padding: 20px;
        border-radius: 8px;
        font-family: monospace;
      }
      @media (max-width: 600px) {
        body { padding: 10px; }
        .header { padding: 16px; }
        .header .meta { flex-direction: column; gap: 4px; }
      }
    </style>
  `
}

interface TaskTraceBodyOptions {
  taskId: string
  taskName: string
  status: 'PASSED' | 'FAILED'
  duration: number
  startedAt: number
  stages: StageState[]
}

function renderTaskTraceBody(opts: TaskTraceBodyOptions): string {
  const { taskId, taskName, status, duration, startedAt, stages } = opts
  const startDate = new Date(startedAt).toLocaleString()

  const stageCards = stages.map(stage => renderStageCard(stage)).join('\n')

  return `
    <div class="container">
      <div class="header ${status.toLowerCase()}">
        <h1>Task: ${escapeHtml(taskId)}</h1>
        <div class="meta">
          <span>Name: ${escapeHtml(taskName)}</span>
          <span>Started: ${startDate}</span>
          <span>Duration: ${formatDuration(duration)}</span>
          <span class="status-badge ${status.toLowerCase()}">${status}</span>
        </div>
      </div>

      <div class="stages">
        ${stageCards}
      </div>

      <div class="actions">
        <button class="btn primary" onclick="window.close()">Close</button>
      </div>
    </div>

    <script>
      function copyError(text) {
        navigator.clipboard.writeText(text).then(() => {
          alert('Error copied to clipboard');
        });
      }

      function toggleStacktrace(id) {
        const el = document.getElementById(id);
        if (el.style.display === 'none') {
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      }
    </script>
  `
}

function renderStageCard(stage: StageState): string {
  const duration = stage.completedAt && stage.startedAt
    ? stage.completedAt - stage.startedAt
    : stage.startedAt ? Date.now() - stage.startedAt : 0

  const statusClass = stage.status === 'RUNNING' ? 'running' : stage.status.toLowerCase()

  const probeCards = stage.probes.length > 0
    ? stage.probes.map((probe, idx) => renderProbeCard(probe, stage.stageId, idx)).join('\n')
    : '<div class="skipped">No probes executed</div>'

  return `
    <div class="stage">
      <div class="stage-header">
        <h2>${escapeHtml(stage.stageName)}</h2>
        <span class="stage-duration ${statusClass}">${formatDuration(duration)}</span>
      </div>
      <div class="probes">
        ${probeCards}
      </div>
    </div>
  `
}

interface ProbeResult {
  probeType: string
  result: 'PASSED' | 'FAILED'
  output?: string
  error?: string
}

function renderProbeCard(probe: ProbeResult, stageId: string, probeIndex: number): string {
  const { probeType, result, output, error } = probe
  const errorId = `error-${stageId}-${probeIndex}`

  let outputHtml = ''
  if (output) {
    outputHtml = `<div class="probe-output">${escapeHtml(output)}</div>`
  }

  let errorHtml = ''
  if (error) {
    errorHtml = `
      <div id="${errorId}">
        <div class="probe-error">${escapeHtml(error)}</div>
        <div class="probe-actions">
          <button class="btn copy" onclick="copyError(${JSON.stringify(error)})">Copy Error</button>
        </div>
      </div>
    `
  }

  return `
    <div class="probe ${result.toLowerCase()}">
      <div class="probe-header">
        <span class="probe-type">${escapeHtml(probeType)}</span>
        <span class="probe-result ${result.toLowerCase()}">${result}</span>
      </div>
      ${outputHtml}
      ${errorHtml}
    </div>
  `
}

function renderHtmlDocument(opts: { title: string; head: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(opts.title)}</title>
  ${opts.head}
</head>
<body>
  ${opts.body}
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}