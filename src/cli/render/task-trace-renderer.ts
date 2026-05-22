import type { TraceEvent } from '../../kernel/lib/types/task-trace'
import type { TaskTraceState, PartState } from '../../kernel/lib/types/task-trace'

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

  const taskDuration = state.completedAt ? state.completedAt - state.startedAt : Date.now() - state.startedAt

  const parts = Array.from(state.parts.values())
  const failedProbes = parts.flatMap((s) => s.probes.filter((p) => p.result === 'FAILED'))
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
      parts,
    }),
  })
}

function reduceTraceEventsFromContent(content: string): TaskTraceState | null {
  if (!content.trim()) return null

  const lines = content.split('\n').filter((line) => line.trim())
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
    parts: new Map(),
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

    case 'PART_START':
      state.parts.set(event.partId, {
        partId: event.partId,
        partName: event.partName,
        status: 'PENDING',
        probes: [],
        startedAt: event.timestamp,
      })
      break

    case 'PART_COMPLETE': {
      const part = state.parts.get(event.partId)
      if (part) {
        part.status = event.status
        part.completedAt = event.timestamp
      }
      break
    }

    case 'PROBE_RESULT': {
      const part = state.parts.get(event.partId)
      if (part) {
        part.probes.push({
          probeType: event.probeType,
          params: (event as any).params || {},
          result: event.result,
          duration: (event as any).duration || 0,
          output: event.output,
          error: event.error,
          executedAt: event.timestamp,
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
    body: `<div class="error">${escapeHtml(message)}</div>`,
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
      .parts { display: flex; flex-direction: column; gap: 16px; }
      .part {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .part-header {
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #eee;
      }
      .part-header h2 {
        font-size: 16px;
        font-weight: 600;
      }
      .part-duration {
        font-size: 13px;
        color: #666;
      }
      .part-duration.running { color: #3b82f6; }
      .part-duration.passed { color: #22c55e; }
      .part-duration.failed { color: #ef4444; }
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
  parts: PartState[]
}

function renderTaskTraceBody(opts: TaskTraceBodyOptions): string {
  const { taskId, taskName, status, duration, startedAt, parts } = opts
  const startDate = new Date(startedAt).toLocaleString()

  const partCards = parts.map((part) => renderPartCard(part)).join('\n')

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

      <div class="parts">
        ${partCards}
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

function renderPartCard(part: PartState): string {
  const duration =
    part.completedAt && part.startedAt
      ? part.completedAt - part.startedAt
      : part.startedAt
        ? Date.now() - part.startedAt
        : 0

  const statusClass = part.status === 'RUNNING' ? 'running' : part.status.toLowerCase()

  const probeCards =
    part.probes.length > 0
      ? part.probes.map((probe, idx) => renderProbeCard(probe, part.partId, idx)).join('\n')
      : '<div class="skipped">No probes executed</div>'

  return `
    <div class="part">
      <div class="part-header">
        <h2>${escapeHtml(part.partName)}</h2>
        <span class="part-duration ${statusClass}">${formatDuration(duration)}</span>
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

function renderProbeCard(probe: ProbeResult, partId: string, probeIndex: number): string {
  const { probeType, result, output, error } = probe
  const errorId = `error-${partId}-${probeIndex}`

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
