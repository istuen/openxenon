/**
 * md-pipeline/transformers/index.ts — 5 unified transformer plugins 统一出口
 *
 * 取代 src/oxl/md-bridge/compilers/{domain,blueprint,work,task,proof}-compiler.ts
 * 的 parse() 方法 (compat 期间未删, 由本目录提供新实现)
 *
 * 5 plugins (unified-native):
 *   - remarkDomainExtractor()    →  tree.data.domain
 *   - remarkBlueprintExtractor() →  tree.data.blueprint
 *   - remarkWorkExtractor()      →  tree.data.work
 *   - remarkTaskExtractor()      →  tree.data.task
 *   - remarkProofExtractor()     →  tree.data.proof
 *
 * 用法:
 * ```ts
 * import { unified } from 'unified'
 * import remarkParse from 'remark-parse'
 * import remarkFrontmatter from 'remark-frontmatter'
 * import { remarkDomainExtractor } from './transformers'
 *
 * const tree = unified()
 *   .use(remarkParse)
 *   .use(remarkFrontmatter)
 *   .use(remarkDomainExtractor())
 *   .parse(md)
 * processor.runSync(tree)
 * const ir = tree.data.domain
 * ```
 *
 * 或直接调纯函数:
 * ```ts
 * import { parseMarkdown } from '../utils'
 * import { extractDomainIR } from './domain'
 *
 * const root = parseMarkdown(md)
 * const ir = extractDomainIR(root, frontmatter)
 * ```
 */

export {
  extractDomainIR,
  remarkDomainExtractor,
  DOMAIN_CATEGORIES,
  type DomainCategory,
  type DomainIR,
  type DomainTerm,
  type DomainBan,
  type DomainInvariant,
  type DomainStackEntry,
} from './domain'

export {
  extractBlueprintIR,
  remarkBlueprintExtractor,
  BLUEPRINT_CATEGORIES,
  type BlueprintCategory,
  type BlueprintIR,
  type BlueprintUse,
  type BlueprintBoundary,
} from './blueprint'

export {
  extractWorkIR,
  remarkWorkExtractor,
  WORK_CATEGORIES,
  type WorkCategory,
  type WorkIR,
  type WorkContext,
  type WorkRef,
  type WorkTaskIR,
  type WorkPart,
} from './work'

export {
  extractTaskIR,
  remarkTaskExtractor,
  TASK_CATEGORIES,
  type TaskCategory,
  type TaskIR,
  type TaskPart,
  type TaskProbe,
} from './task'

export {
  extractProofIR,
  remarkProofExtractor,
  type ProofIR,
  type ProofProbeIR,
} from './proof'

export {
  extractStackIR,
  STACK_CATEGORIES,
  type StackCategory,
  type StackIR,
  type StackToolIR,
  type StackOperationIR,
} from './stack'
