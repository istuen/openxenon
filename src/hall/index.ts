import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { TaskState } from '../cli/task-filesystem'

export interface HallStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  runningTasks: number
  pendingTasks: number
  draftAssets: number
  canonicalAssets: number
  arsenalProbes: number
  arsenalStages: number
  arsenalBlueprints: number
  recentTasks: Array<{
    taskId: string
    taskName: string
    status: string
    updatedAt: number
  }>
}

export interface ForgeDraft {
  name: string
  type: string
  path: string
  updatedAt: number
}

export interface ArsenalAsset {
  name: string
  type: 'probes' | 'blueprints' | 'parts'
  state: 'canonical' | 'draft'
  path: string
  updatedAt: number
}

export function ensureHallDirectory(projectRoot: string): void {
  const hallPath = join(projectRoot, 'hall')
  if (!existsSync(hallPath)) {
    mkdirSync(hallPath, { recursive: true })
  }
  const assetsPath = join(hallPath, 'assets')
  if (!existsSync(assetsPath)) {
    mkdirSync(assetsPath, { recursive: true })
  }
}

export function getHallPath(projectRoot: string): string {
  return join(projectRoot, 'hall')
}

export function scanProjectTasks(projectRoot: string): TaskState[] {
  const tasksDir = join(projectRoot, 'tasks')
  if (!existsSync(tasksDir)) {
    return []
  }

  const tasks: TaskState[] = []
  const entries = readdirSync(tasksDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const taskId = entry.name
    const statePath = join(tasksDir, taskId, 'state.json')
    if (existsSync(statePath)) {
      try {
        const content = readFileSync(statePath, 'utf-8')
        const state = JSON.parse(content) as TaskState
        tasks.push(state)
      } catch {
        // ignore invalid state files
      }
    }
  }

  return tasks
}

export function scanForgeDrafts(projectRoot: string): ForgeDraft[] {
  const forgesDir = join(projectRoot, 'forges')
  if (!existsSync(forgesDir)) {
    return []
  }

  const drafts: ForgeDraft[] = []
  const assetTypes = ['probes', 'blueprints', 'parts']

  for (const type of assetTypes) {
    const typePath = join(forgesDir, type)
    if (!existsSync(typePath)) continue

    const entries = readdirSync(typePath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const draftPath = join(typePath, entry.name, 'draft.yaml')
      if (existsSync(draftPath)) {
        try {
          const stat = require('fs').statSync(draftPath)
          drafts.push({
            name: entry.name,
            type,
            path: draftPath,
            updatedAt: stat.mtimeMs
          })
        } catch {
          // ignore
        }
      }
    }
  }

  return drafts
}

export function scanArsenalAssets(projectRoot: string): ArsenalAsset[] {
  const arsenalsDir = join(projectRoot, 'arsenals')
  if (!existsSync(arsenalsDir)) {
    return []
  }

  const assets: ArsenalAsset[] = []
  const assetTypes: Array<'probes' | 'blueprints' | 'parts'> = ['probes', 'blueprints', 'parts']

  for (const type of assetTypes) {
    const typePath = join(arsenalsDir, type)
    if (!existsSync(typePath)) continue

    const entries = readdirSync(typePath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const canonicalPath = join(typePath, entry.name, 'canonical.yaml')
      if (existsSync(canonicalPath)) {
        try {
          const stat = require('fs').statSync(canonicalPath)
          assets.push({
            name: entry.name,
            type,
            state: 'canonical',
            path: canonicalPath,
            updatedAt: stat.mtimeMs
          })
        } catch {
          // ignore
        }
      }
    }
  }

  return assets
}

export function getHallStats(projectRoot: string): HallStats {
  const tasks = scanProjectTasks(projectRoot)
  const arsenalAssets = scanArsenalAssets(projectRoot)
  const forgeDrafts = scanForgeDrafts(projectRoot)

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' && Object.values(t.stages).every(s => s === 'PASSED')).length
  const failedTasks = tasks.filter(t => t.status === 'COMPLETED' && Object.values(t.stages).some(s => s === 'FAILED')).length
  const runningTasks = tasks.filter(t => t.status === 'RUNNING').length

  const recentTasks = tasks.slice(0, 10).map(t => ({
    taskId: t.taskId,
    taskName: t.taskName,
    status: t.status,
    updatedAt: Date.now()
  }))

  return {
    totalTasks: tasks.length,
    completedTasks,
    failedTasks,
    runningTasks,
    pendingTasks: tasks.filter(t => t.status === 'PENDING').length,
    draftAssets: forgeDrafts.length,
    canonicalAssets: arsenalAssets.length,
    arsenalProbes: arsenalAssets.filter(a => a.type === 'probes').length,
    arsenalParts: arsenalAssets.filter(a => a.type === 'parts').length,
    arsenalBlueprints: arsenalAssets.filter(a => a.type === 'blueprints').length,
    recentTasks
  }
}

export interface ProbeDetail {
  probeType: string
  result: 'PASSED' | 'FAILED'
  output?: string
  error?: string
}

export interface PartDetail {
  partId: string
  partName: string
  status: string
  probes: ProbeDetail[]
}

export interface TaskDetails {
  taskId: string
  taskName: string
  status: string
  currentPart: string | null
  parts: Record<string, string>
  frozenPath: string | null
  tracePath: string | null
  partDetails?: PartDetail[]
}

function readTaskTrace(tracePath: string | null): Map<string, PartDetail> {
  const parts = new Map<string, PartDetail>()

  if (!tracePath || !existsSync(tracePath)) {
    return stages
  }

  try {
    const content = readFileSync(tracePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    for (const line of lines) {
      try {
        const event = JSON.parse(line)
        if (event.type === 'PART_START') {
          parts.set(event.partId, {
            partId: event.partId,
            partName: event.partName,
            status: 'PENDING',
            probes: []
          })
        } else if (event.type === 'PART_COMPLETE') {
          const part = parts.get(event.partId)
          if (part) {
            part.status = event.status
          }
        } else if (event.type === 'PROBE_RESULT') {
          const part = parts.get(event.partId)
          if (part) {
            part.probes.push({
              probeType: event.probeType,
              result: event.result,
              output: event.output,
              error: event.error
            })
          }
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // ignore read errors
  }

  return parts
}

export function scanProjectTasksDetailed(projectRoot: string): TaskDetails[] {
  const tasksDir = join(projectRoot, 'tasks')
  if (!existsSync(tasksDir)) {
    return []
  }

  const tasks: TaskDetails[] = []
  const entries = readdirSync(tasksDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const taskId = entry.name
    const statePath = join(tasksDir, taskId, 'state.json')
    const frozenPath = join(tasksDir, taskId, 'blueprint.frozen.json')
    const tracePath = join(tasksDir, taskId, 'task-trace.jsonl')

    if (existsSync(statePath)) {
      try {
        const content = readFileSync(statePath, 'utf-8')
        const state = JSON.parse(content) as TaskState
        const partDetails = readTaskTrace(tracePath)

        tasks.push({
          taskId: state.taskId,
          taskName: state.taskName,
          status: state.status,
          currentStage: state.currentStage,
          stages: state.stages,
          frozenPath: existsSync(frozenPath) ? frozenPath : null,
          tracePath: existsSync(tracePath) ? tracePath : null,
          partDetails: Array.from(partDetails.values())
        })
      } catch {
        // ignore invalid state files
      }
    }
  }

  return tasks
}

export function generateHallIndexHtml(projectRoot: string): string {
  const stats = getHallStats(projectRoot)
  const drafts = scanForgeDrafts(projectRoot)
  const arsenalAssets = scanArsenalAssets(projectRoot)
  const tasks = scanProjectTasksDetailed(projectRoot)

  const tasksJson = JSON.stringify(tasks.map(t => ({
    taskId: t.taskId,
    taskName: t.taskName,
    status: t.status,
    currentStage: t.currentStage,
    stages: t.stages,
    partDetails: t.partDetails || []
  })))

  const arsenalJson = JSON.stringify(arsenalAssets.map(a => ({
    name: a.name,
    type: a.type,
    state: a.state,
    path: a.path
  })))

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenXenon Hall - 研讨厅</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #e0e0e0; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #333; }
    h1 { color: #fff; font-size: 1.5rem; }
    .badge { background: #1a1a1a; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.875rem; border: 1px solid #333; }

    .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #1a1a1a; border: 1px solid #333; border-radius: 0.5rem; padding: 1.25rem; }
    .stat-card h3 { color: #888; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .stat-card .value { font-size: 2rem; font-weight: 600; color: #fff; }
    .stat-card .value.running { color: #22c55e; }
    .stat-card .value.failed { color: #ef4444; }
    .stat-card .value.completed { color: #3b82f6; }

    .section { background: #1a1a1a; border: 1px solid #333; border-radius: 0.5rem; margin-bottom: 1.5rem; }
    .section-header { padding: 1rem 1.25rem; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
    .section-title { font-size: 1rem; font-weight: 500; color: #fff; }
    .section-count { background: #333; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; }

    .item-list { list-style: none; }
    .item { padding: 0.75rem 1.25rem; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; }
    .item:last-child { border-bottom: none; }
    .item-info { display: flex; align-items: center; gap: 0.75rem; }
    .item-name { font-weight: 500; }
    .item-type { font-size: 0.75rem; color: #888; background: #252525; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
    .item-status { font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 0.25rem; }
    .status-running { background: #22c55e20; color: #22c55e; }
    .status-completed { background: #3b82f620; color: #3b82f6; }
    .status-failed { background: #ef444420; color: #ef4444; }
    .status-pending { background: #888820; color: #facc15; }

    .empty-state { padding: 3rem; text-align: center; color: #666; }
    .empty-state-icon { font-size: 3rem; margin-bottom: 1rem; }

    .actions { display: flex; gap: 0.5rem; }
    .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; cursor: pointer; border: 1px solid #333; background: #252525; color: #e0e0e0; text-decoration: none; display: inline-block; }
    .btn:hover { background: #333; }
    .btn-primary { background: #3b82f6; border-color: #3b82f6; }
    .btn-primary:hover { background: #2563eb; }

    .dag-container { padding: 1.5rem; }
    .dag-svg { display: block; margin: 0 auto; }

    .task-detail { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 100; }
    .task-detail.active { display: flex; align-items: center; justify-content: center; }
    .task-detail-content { background: #1a1a1a; border: 1px solid #333; border-radius: 0.5rem; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto; }
    .task-detail-header { padding: 1rem 1.25rem; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
    .task-detail-body { padding: 1.5rem; }
    .stage-list { list-style: none; }
    .part-item { padding: 0.75rem; border-bottom: 1px solid #222; display: flex; align-items: center; gap: 1rem; }
    .part-item:last-child { border-bottom: none; }
    .part-indicator { width: 10px; height: 10px; border-radius: 50%; }
    .part-indicator.passed { background: #22c55e; }
    .part-indicator.failed { background: #ef4444; }
    .part-indicator.running { background: #3b82f6; }
    .part-indicator.pending { background: #888; }
    .close-btn { background: none; border: none; color: #888; font-size: 1.5rem; cursor: pointer; }
    .close-btn:hover { color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🏛️ OpenXenon Hall</h1>
      <span class="badge">研讨厅</span>
    </header>

    <div class="dashboard">
      <div class="stat-card">
        <h3>总任务数</h3>
        <div class="value">${stats.totalTasks}</div>
      </div>
      <div class="stat-card">
        <h3>运行中</h3>
        <div class="value running">${stats.runningTasks}</div>
      </div>
      <div class="stat-card">
        <h3>已完成</h3>
        <div class="value completed">${stats.completedTasks}</div>
      </div>
      <div class="stat-card">
        <h3>失败</h3>
        <div class="value failed">${stats.failedTasks}</div>
      </div>
      <div class="stat-card">
        <h3>🔧 Arsenal 资产</h3>
        <div class="value">${stats.canonicalAssets}</div>
        <div style="font-size: 0.75rem; color: #888; margin-top: 0.25rem;">
          Probes: ${stats.arsenalProbes} | Stages: ${stats.arsenalStages} | Blueprints: ${stats.arsenalBlueprints}
        </div>
      </div>
      <div class="stat-card">
        <h3>📝 Forge Draft</h3>
        <div class="value">${stats.draftAssets}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">📋 待审查 Draft</span>
        <span class="section-count">${drafts.length}</span>
      </div>
      ${drafts.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>暂无待审查的 Draft 资产</p>
        </div>
      ` : `
        <ul class="item-list">
          ${drafts.map(d => `
            <li class="item">
              <div class="item-info">
                <span class="item-name">${d.name}</span>
                <span class="item-type">${d.type}</span>
              </div>
              <div class="actions">
                <button class="btn">审查</button>
              </div>
            </li>
          `).join('')}
        </ul>
      `}
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">🔧 Arsenal 资产</span>
        <span class="section-count">${arsenalAssets.length}</span>
      </div>
      ${arsenalAssets.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <p>暂无 Arsenal 资产</p>
        </div>
      ` : `
        <ul class="item-list">
          ${arsenalAssets.map(a => `
            <li class="item">
              <div class="item-info">
                <span class="item-name">${a.name}</span>
                <span class="item-type">${a.type}</span>
              </div>
              <div class="actions">
                <button class="btn" onclick="showArsenalDetail('${a.name}')">查看</button>
              </div>
            </li>
          `).join('')}
        </ul>
      `}
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">📊 任务列表</span>
        <span class="section-count">${tasks.length}</span>
      </div>
      ${tasks.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>暂无任务</p>
          <p style="font-size: 0.875rem; margin-top: 0.5rem;">使用 /oxn-task 发起新任务</p>
        </div>
      ` : `
        <ul class="item-list">
          ${tasks.map(t => {
            const statusClass = t.status === 'RUNNING' ? 'status-running' : t.status === 'COMPLETED' ? (Object.values(t.stages).some(s => s === 'FAILED') ? 'status-failed' : 'status-completed') : 'status-pending'
            return `
              <li class="item" onclick="showTaskDetail('${t.taskId}')" style="cursor: pointer;">
                <div class="item-info">
                  <span class="item-name">${t.taskName}</span>
                  <span class="item-type">${t.taskId}</span>
                </div>
                <div class="item-status ${statusClass}">${t.status}</div>
              </li>
            `
          }).join('')}
        </ul>
      `}
    </div>
  </div>

  <div id="taskDetail" class="task-detail">
    <div class="task-detail-content">
      <div class="task-detail-header">
        <h2 id="taskDetailTitle">任务详情</h2>
        <button class="close-btn" onclick="closeTaskDetail()">&times;</button>
      </div>
      <div class="task-detail-body">
        <h3 style="color: #888; font-size: 0.75rem; margin-bottom: 1rem;">STAGE DAG</h3>
        <div id="dagContainer" class="dag-container"></div>
        <h3 style="color: #888; font-size: 0.75rem; margin: 1.5rem 0 1rem;">STAGES</h3>
        <ul id="partList" class="stage-list"></ul>
      </div>
    </div>
  </div>

  <script type="text/javascript">
    const tasksData = ${tasksJson};
    const arsenalData = ${arsenalJson};

    function showArsenalDetail(name) {
      const asset = arsenalData.find(a => a.name === name);
      if (!asset) return;
      const msg = '资产: ' + asset.name + ' | 类型: ' + asset.type + ' | 路径: ' + asset.path;
      alert(msg);
    }

    function showTaskDetail(taskId) {
      const task = tasksData.find(t => t.taskId === taskId);
      if (!task) return;

      document.getElementById('taskDetailTitle').textContent = task.taskName + ' (' + task.taskId + ')';

      const dagContainer = document.getElementById('dagContainer');
      dagContainer.innerHTML = generateDag(task.parts);

      const partList = document.getElementById('partList');
      const partDetails = task.partDetails || [];

      partList.innerHTML = Object.entries(task.parts).map(([name, status]) => {
        const indicatorClass = status.toLowerCase();
        const partDetail = partDetails.find(s => s.partName === name || s.partId === name);

        let probeHtml = '';
        if (partDetail && partDetail.probes && partDetail.probes.length > 0) {
          probeHtml = '<div class="probe-list" style="margin-top: 0.5rem; padding-left: 1.5rem;">' +
            partDetail.probes.map(p => {
              const probeClass = p.result === 'PASSED' ? 'passed' : 'failed';
              const probeIcon = p.result === 'PASSED' ? '✓' : '✗';
              const probeOutput = p.output ? '<span style="color: #888; font-size: 0.75rem; margin-left: 0.5rem;">' + escapeHtml(String(p.output).substring(0, 50)) + '</span>' : '';
              const probeError = p.error ? '<span style="color: #ef4444; font-size: 0.7rem; margin-left: 0.5rem;">' + escapeHtml(String(p.error).substring(0, 50)) + '</span>' : '';
              return '<div class="probe-item" style="display: flex; align-items: center; margin: 0.25rem 0; font-size: 0.8rem;">' +
                '<span style="color: ' + (p.result === 'PASSED' ? '#22c55e' : '#ef4444') + '; margin-right: 0.25rem;">' + probeIcon + '</span>' +
                '<span style="color: #888;">' + p.probeType + '</span>' +
                probeOutput + probeError +
              '</div>';
            }).join('') +
            '</div>';
        }

        return '<li class="part-item" style="flex-direction: column; align-items: flex-start;">' +
          '<div style="display: flex; align-items: center; gap: 1rem;">' +
            '<span class="part-indicator ' + indicatorClass + '"></span>' +
            '<span>' + name + '</span>' +
            '<span style="color: #888; margin-left: auto;">' + status + '</span>' +
          '</div>' +
          probeHtml +
        '</li>';
      }).join('');

      document.getElementById('taskDetail').classList.add('active');
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function closeTaskDetail() {
      document.getElementById('taskDetail').classList.remove('active');
    }

    function generateDag(parts) {
      const partNames = Object.keys(parts);
      if (partNames.length === 0) return '';

      const nodeWidth = 120;
      const nodeHeight = 40;
      const gapX = 60;
      const gapY = 30;
      const cols = Math.min(4, partNames.length);
      const rows = Math.ceil(partNames.length / cols);

      const width = cols * nodeWidth + (cols - 1) * gapX + 40;
      const height = rows * nodeHeight + (rows - 1) * gapY + 40;

      let svg = '<svg class="dag-svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';

      partNames.forEach((name, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 20 + col * (nodeWidth + gapX);
        const y = 20 + row * (nodeHeight + gapY);

        const status = parts[name];
        let bgColor = '#333';
        let textColor = '#888';
        let borderColor = '#444';

        if (status === 'PASSED') {
          bgColor = '#22c55e20';
          borderColor = '#22c55e';
          textColor = '#22c55e';
        } else if (status === 'FAILED') {
          bgColor = '#ef444420';
          borderColor = '#ef4444';
          textColor = '#ef4444';
        } else if (status === 'RUNNING') {
          bgColor = '#3b82f620';
          borderColor = '#3b82f6';
          textColor = '#3b82f6';
        }

        svg += '<g>' +
          '<rect x="' + x + '" y="' + y + '" width="' + nodeWidth + '" height="' + nodeHeight + '" rx="6" fill="' + bgColor + '" stroke="' + borderColor + '" stroke-width="1.5"/>' +
          '<text x="' + (x + nodeWidth / 2) + '" y="' + (y + nodeHeight / 2 + 5) + '" text-anchor="middle" fill="' + textColor + '" font-size="12" font-family="system-ui">' + name + '</text>' +
        '</g>';
      });

      svg += '</svg>';
      return svg;
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeTaskDetail();
    });
  </script>
</body>
</html>`
}

export function renderHall(projectRoot: string): string {
  ensureHallDirectory(projectRoot)
  const html = generateHallIndexHtml(projectRoot)
  const indexPath = join(getHallPath(projectRoot), 'index.html')
  writeFileSync(indexPath, html, 'utf-8')
  return indexPath
}