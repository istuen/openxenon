import { parse as parseYaml } from 'yaml'
import type { Blueprint, Part } from '../../kernel/schemas/validators/blueprint.schema'
import { type DagNode, topologicalSort } from '../../kernel/schemas/validators/dag-validator'

export interface BlueprintRendererOptions {
  blueprintName: string
  blueprintContent: string
}

export function blueprintToDagHtml(options: BlueprintRendererOptions): string {
  const { blueprintName, blueprintContent } = options

  let blueprint: Blueprint
  try {
    const parsed = parseYaml(blueprintContent)
    blueprint = parsed as unknown as Blueprint
  } catch {
    return renderErrorHtml(`无法解析 Blueprint: ${blueprintName}`)
  }

  if (!blueprint.parts || blueprint.parts.length === 0) {
    return renderErrorHtml(`Blueprint 没有定义任何 Part: ${blueprintName}`)
  }

  const dagNodes: DagNode[] = blueprint.parts.map((p) => ({
    id: p.id,
    deps: p.deps || [],
  }))

  let sortedIds: string[]
  try {
    sortedIds = topologicalSort(dagNodes)
  } catch {
    return renderErrorHtml(`Blueprint DAG 拓扑排序失败: ${blueprintName}`)
  }

  const partById: Record<string, Part> = {}
  for (const part of blueprint.parts) {
    partById[part.id] = part
  }

  const svgWidth = 700
  const nodeWidth = 200
  const nodeHeight = 120
  const nodeGapY = 60
  const headerHeight = 50

  const svgContent = renderDagSvg({
    sortedIds,
    partById,
    nodeWidth,
    nodeHeight,
    nodeGapY,
    headerHeight,
    svgWidth,
  })

  return renderHtmlDocument({
    title: `Blueprint: ${blueprintName}`,
    head: renderBlueprintHead(),
    body: renderBlueprintBody({
      blueprintName,
      svgContent,
      svgWidth,
    }),
  })
}

interface DagsSvgOptions {
  sortedIds: string[]
  partById: Record<string, Part>
  nodeWidth: number
  nodeHeight: number
  nodeGapY: number
  headerHeight: number
  svgWidth: number
}

interface DagEdge {
  fromId: string
  toId: string
  x1: number
  y1: number
  x2: number
  y2: number
}

function renderDagSvg(opts: DagsSvgOptions): string {
  const { sortedIds, partById, nodeWidth, nodeHeight, nodeGapY, headerHeight, svgWidth } = opts

  const nodes: { id: string; x: number; y: number; part: Part }[] = []

  for (let i = 0; i < sortedIds.length; i++) {
    const id = sortedIds[i]!
    const part = partById[id]!
    nodes.push({
      id,
      x: (svgWidth - nodeWidth) / 2,
      y: headerHeight + i * (nodeHeight + nodeGapY),
      part,
    })
  }

  const edges: DagEdge[] = []
  for (const node of nodes) {
    const deps = node.part.deps || []
    for (const depId of deps) {
      const depNode = nodes.find((n) => n.id === depId)
      if (depNode) {
        edges.push({
          fromId: depId,
          toId: node.id,
          x1: depNode.x + nodeWidth / 2,
          y1: depNode.y + nodeHeight,
          x2: node.x + nodeWidth / 2,
          y2: node.y,
        })
      }
    }
  }

  const svgHeight = headerHeight + sortedIds.length * (nodeHeight + nodeGapY) + nodeGapY
  let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`

  const markerIdMap: Record<string, number> = {}
  for (const edge of edges) {
    if (!(edge.fromId in markerIdMap)) {
      markerIdMap[edge.fromId] = Object.keys(markerIdMap).length
    }
  }

  for (const edge of edges) {
    const markerId = markerIdMap[edge.fromId]
    svg += `
      <defs>
        <marker id="arrowhead-${markerId}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#666"/>
        </marker>
      </defs>
    `
  }

  for (const edge of edges) {
    const markerId = markerIdMap[edge.fromId]
    svg += `<line x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}" stroke="#666" stroke-width="2" marker-end="url(#arrowhead-${markerId})" />`
  }

  for (const node of nodes) {
    const probesHtml = renderProbesHtml(node.part)

    svg += `
      <g class="node" data-id="${node.id}">
        <rect x="${node.x}" y="${node.y}" width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="white" stroke="#ddd" stroke-width="2"/>
        <rect x="${node.x}" y="${node.y}" width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="rgba(255,255,255,0.9)"/>
        <text x="${node.x + 12}" y="${node.y + 28}" font-family="sans-serif" font-size="14" font-weight="600" fill="#333">${escapeHtml(node.id)}</text>
        <line x1="${node.x}" y1="${node.y + 40}" x2="${node.x + nodeWidth}" y2="${node.y + 40}" stroke="#eee" stroke-width="1"/>
        <foreignObject x="${node.x + 12}" y="${node.y + 48}" width="${nodeWidth - 24}" height="${nodeHeight - 56}">
          <div xmlns="http://www.w3.org/1999/xhtml" class="probe-list">
            ${probesHtml}
          </div>
        </foreignObject>
      </g>
    `
  }

  svg += '</svg>'
  return svg
}

function renderProbesHtml(part: Part): string {
  if (!part.probes || part.probes.length === 0) {
    return '<div class="no-probes">No probes</div>'
  }

  return part.probes
    .map((probe) => {
      const pattern = probe.pattern || ''
      return `<div class="probe-tag">${escapeHtml(probe.type || '')}${pattern ? ` ${escapeHtml(pattern)}` : ''}</div>`
    })
    .join('')
}

function renderBlueprintHead(): string {
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
        border-left: 4px solid #3b82f6;
      }
      .header h1 {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .header .meta {
        font-size: 14px;
        color: #666;
      }
      .dag-container {
        background: white;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        overflow-x: auto;
      }
      .dag-container svg {
        display: block;
        margin: 0 auto;
      }
      .node rect {
        cursor: pointer;
        transition: stroke 0.2s, fill 0.2s;
      }
      .node:hover rect {
        stroke: #3b82f6;
        stroke-width: 2;
      }
      .probe-list {
        font-family: monospace;
        font-size: 11px;
        color: #666;
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow: hidden;
      }
      .probe-tag {
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .no-probes {
        color: #999;
        font-style: italic;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .btn {
        padding: 10px 20px;
        font-size: 14px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .btn.primary { background: #22c55e; color: white; }
      .btn.primary:hover { background: #16a34a; }
      .btn.secondary { background: #e5e5e5; color: #333; }
      .btn.secondary:hover { background: #d5d5d5; }
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
      }
    </style>
  `
}

interface BlueprintBodyOptions {
  blueprintName: string
  svgContent: string
  svgWidth: number
}

function renderBlueprintBody(opts: BlueprintBodyOptions): string {
  const { blueprintName, svgContent } = opts

  return `
    <div class="container">
      <div class="header">
        <h1>Blueprint: ${escapeHtml(blueprintName)}</h1>
        <div class="meta">Draft 预览 · Promote 前审阅</div>
      </div>

      <div class="dag-container">
        ${svgContent}
      </div>

      <div class="actions">
        <button class="btn primary" onclick="window.location.href='oxn://arsenal/promote?name=${encodeURIComponent(blueprintName)}'">Promote to Canonical</button>
        <button class="btn secondary" onclick="window.close()">Close</button>
      </div>
    </div>
  `
}

function renderErrorHtml(message: string): string {
  return renderHtmlDocument({
    title: 'Error',
    head: '',
    body: `<div class="error">${escapeHtml(message)}</div>`,
  })
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
