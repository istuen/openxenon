import { describe, it, expect, beforeAll } from 'bun:test'
import { extractAnnotations, generateAiTools } from '../ai-tools/generator/index'
import { readFileSync } from 'fs'

const TEST_GRAMMAR_WITH_ANNOTATION = `
grammar OXN

/**
 * @oxn-ai-tool
 * {
 *   "name": "add_probe_to_part",
 *   "description": "给 Part 添加探针实例",
 *   "example": { "blueprint_name": "WebServer", "part_name": "Nginx", "probe_config": { "name": "http" } }
 * }
 */
PartDeclaration:
    'part' name=STRING '{'
        (probes+=PartProbeDeclaration)*
    '}';

PartProbeDeclaration:
    'probe' name=ID ('ref' ref=STRING)? '{'
        ('params' '=' params=ParamsBlock)?
    '}';
`

const TEST_GRAMMAR_WITHOUT_ANNOTATION = `
grammar OXN

PartDeclaration:
    'part' name=STRING '{'
        (probes+=PartProbeDeclaration)*
    '}';
`

describe('AI Tools Generator', () => {
  describe('extractAnnotations', () => {
    it('should extract annotation from grammar with tool', () => {
      const results = extractAnnotations(TEST_GRAMMAR_WITH_ANNOTATION)

      expect(results.length).toBe(1)
      expect(results[0].annotation.name).toBe('add_probe_to_part')
      expect(results[0].annotation.description).toBe('给 Part 添加探针实例')
      expect(results[0].ruleName).toBe('PartDeclaration')
    })

    it('should return empty array for grammar without annotation', () => {
      const results = extractAnnotations(TEST_GRAMMAR_WITHOUT_ANNOTATION)

      expect(results.length).toBe(0)
    })

    it('should return empty array for invalid JSON (silently continues)', () => {
      const invalidGrammar = `
      grammar OXN

      /**
       * @oxn-ai-tool
       * {
       *   "name": invalid json
       * }
       */
      PartDeclaration:
          'part' name=STRING;
      `

      const results = extractAnnotations(invalidGrammar)
      expect(results.length).toBe(0)
    })
  })

  describe('generateAiTools', () => {
    it('should generate valid JSON Schema and validators', async () => {
      const tempDir = '/tmp/ai-tools-test'
      const tempGrammar = '/tmp/test-grammar.langium'

      await Bun.write(tempGrammar, TEST_GRAMMAR_WITH_ANNOTATION)

      generateAiTools({
        oxnLangiumPath: tempGrammar,
        outputDir: tempDir,
      })

      const schemaPath = `${tempDir}/schema.json`
      const validatorsPath = `${tempDir}/validators.ts`

      const schemaExists = await Bun.file(schemaPath).exists()
      const validatorsExists = await Bun.file(validatorsPath).exists()

      expect(schemaExists).toBe(true)
      expect(validatorsExists).toBe(true)

      const schemaText = readFileSync(schemaPath, 'utf-8')
      const schema = JSON.parse(schemaText)
      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#')
      expect(schema.definitions.add_probe_to_part).toBeDefined()

      const validators = readFileSync(validatorsPath, 'utf-8')
      expect(validators).toContain('AddProbeToPartSchema')
      expect(validators).toContain('add_probe_to_part')
    })
  })
})
