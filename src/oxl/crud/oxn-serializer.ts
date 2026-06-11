/**
 * OxnSerializer - 手写模板字符串拼接
 *
 * MVP 阶段使用手写映射，将 JSON 配置转换为 OXL 文本。
 * 基于 CST 坐标计算插入点，直接 string.substring 拼接。
 */

export interface ProbeConfig {
  name: string
  type: 'HttpProbe' | 'ShellProbe' | 'FsProbe'
  ref?: string
  params?: Record<string, string | number | boolean>
}

export function serializeProbeToOxnText(probeConfig: ProbeConfig, indent: string): string {
  const lines: string[] = []

  lines.push(`${indent}probe ${probeConfig.name}`)

  if (probeConfig.ref) {
    lines.push(` ref "${probeConfig.ref}"`)
  }

  if (probeConfig.params && Object.keys(probeConfig.params).length > 0) {
    const paramPairs: string[] = []
    for (const [key, value] of Object.entries(probeConfig.params)) {
      const valStr = typeof value === 'string' ? `"${value}"` : String(value)
      paramPairs.push(`${key} = ${valStr}`)
    }
    lines.push(` { params = { ${paramPairs.join(', ')} } }`)
  } else {
    lines.push(' {}')
  }

  return lines.join('')
}

export function serializeProbeListToOxnText(probes: ProbeConfig[], baseIndent: string): string {
  if (probes.length === 0) return ''

  const probeTexts = probes.map((p) => serializeProbeToOxnText(p, baseIndent))
  return probeTexts.join('\n')
}
