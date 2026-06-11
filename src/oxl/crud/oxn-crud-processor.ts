/**
 * OxnCrudProcessor - 纯计算引擎
 *
 * 接收结构化指令 + LangiumDocument，输出 TextEdit[]。
 * 绝不直接操作文件系统。
 */

import type { TextEdit } from 'vscode-languageserver-types'
import type { LangiumDocument } from 'langium'
import type { PartDeclaration, BlueprintDeclaration } from '../generated/ast.js'
import { isBlueprintDeclaration } from '../generated/ast.js'
import { serializeProbeToOxnText, type ProbeConfig } from './oxn-serializer.js'

export interface AddProbeIntent {
  blueprint_name: string
  part_name: string
  probe_config: ProbeConfig
}

export interface CrudResult {
  edits: TextEdit[]
  warnings: string[]
}

export class OxnCrudProcessor {
  calculateTextEdits(intent: AddProbeIntent, document: LangiumDocument): CrudResult {
    const root = document.parseResult?.value
    if (!root) {
      return { edits: [], warnings: ['Empty document'] }
    }

    const blueprint = this.findBlueprint(root, intent.blueprint_name)
    if (!blueprint) {
      return { edits: [], warnings: [`Blueprint "${intent.blueprint_name}" not found`] }
    }

    const part = this.findPart(blueprint, intent.part_name)
    if (!part) {
      return { edits: [], warnings: [`Part "${intent.part_name}" not found in Blueprint "${intent.blueprint_name}"`] }
    }

    const edit = this._createProbeInsertEdit(part, intent.probe_config)
    return { edits: [edit], warnings: [] }
  }

  private findBlueprint(root: unknown, name: string): BlueprintDeclaration | null {
    if (!isBlueprintDeclaration(root)) return null
    if (root.name !== name) return null
    return root
  }

  private findPart(_blueprint: BlueprintDeclaration, _name: string): PartDeclaration | null {
    return null
  }

  private _createProbeInsertEdit(part: PartDeclaration, probeConfig: ProbeConfig): TextEdit {
    const indent = this._inferIndent(part)
    const probeText = serializeProbeToOxnText(probeConfig, indent)

    const cstNode = part.$cstNode
    if (!cstNode) {
      return {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        newText: probeText,
      }
    }

    const endOffset = cstNode.range.end
    const doc = cstNode.root?.text || ''
    const lines = doc.split('\n')
    const lineContent = lines[endOffset.line] || ''
    const existingIndent = lineContent.match(/^\s*/)?.[0] || '  '

    const insertPos = {
      line: endOffset.line + 1,
      character: 0,
    }

    return {
      range: { start: insertPos, end: insertPos },
      newText: `\n${existingIndent}${probeText}`,
    }
  }

  private _inferIndent(_node: { $cstNode?: { range: { start: { line: number; character: number } } } }): string {
    return '  '
  }
}

export function createOxnCrudProcessor(): OxnCrudProcessor {
  return new OxnCrudProcessor()
}
