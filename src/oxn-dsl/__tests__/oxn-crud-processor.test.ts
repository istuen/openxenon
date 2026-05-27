import { describe, it, expect } from 'bun:test'
import { OxnCrudProcessor, type AddProbeIntent } from '../crud/oxn-crud-processor'
import { serializeProbeToOxnText, type ProbeConfig } from '../crud/oxn-serializer'

describe('OxnSerializer', () => {
  describe('serializeProbeToOxnText', () => {
    it('should serialize basic probe', () => {
      const config: ProbeConfig = {
        name: 'http',
        type: 'HttpProbe',
      }

      const result = serializeProbeToOxnText(config, '  ')
      expect(result).toContain('probe http')
      expect(result).toContain('{}')
    })

    it('should serialize probe with ref', () => {
      const config: ProbeConfig = {
        name: 'http-check',
        type: 'HttpProbe',
        ref: 'HttpProbe',
      }

      const result = serializeProbeToOxnText(config, '  ')
      expect(result).toContain('probe http-check')
      expect(result).toContain('ref "HttpProbe"')
    })

    it('should serialize probe with params', () => {
      const config: ProbeConfig = {
        name: 'http-check',
        type: 'HttpProbe',
        params: { path: '/health', timeout: '3000' },
      }

      const result = serializeProbeToOxnText(config, '  ')
      expect(result).toContain('params = { path = "/health", timeout = "3000" }')
    })
  })
})

describe('OxnCrudProcessor', () => {
  describe('calculateTextEdits', () => {
    it('should return empty edits for empty document', () => {
      const processor = new OxnCrudProcessor()

      const mockDocument = {
        parseResult: {
          value: null,
        },
      } as any

      const intent: AddProbeIntent = {
        blueprint_name: 'WebServer',
        part_name: 'Nginx',
        probe_config: { name: 'http', type: 'HttpProbe' },
      }

      const result = processor.calculateTextEdits(intent, mockDocument)
      expect(result.edits.length).toBe(0)
    })

    it('should return warning for non-matching blueprint', () => {
      const processor = new OxnCrudProcessor()

      const mockDocument = {
        parseResult: {
          value: { $type: 'OXNDocument', name: 'OtherBlueprint' },
        },
      } as any

      const intent: AddProbeIntent = {
        blueprint_name: 'WebServer',
        part_name: 'Nginx',
        probe_config: { name: 'http', type: 'HttpProbe' },
      }

      const result = processor.calculateTextEdits(intent, mockDocument)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })
})
