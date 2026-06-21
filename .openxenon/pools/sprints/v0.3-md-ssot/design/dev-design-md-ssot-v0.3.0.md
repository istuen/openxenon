---
name: dev-design-md-ssot
version: 0.3.0
type: dev-design
status: current
author: opencode
date: 2026-06-20
---

# Development Design: v0.3.0 MD-SSOT 体系

> **版本**：v0.3.0
> **状态**：current
> **目的**：定义 v0.3.0 阶段的实施路径、代码结构、迁移策略
> **关联**：[`req-md-ssot-v0.3.0.md`](./req-md-ssot-v0.3.0.md) | [`arch-md-ssot-v0.3.0.md`](./arch-md-ssot-v0.3.0.md) | [`test-design-md-ssot-v0.3.0.md`](./test-design-md-ssot-v0.3.0.md)

---

## 1. 实施阶段（v0.3.0 路线图）

| 阶段 | 周次 | 内容 | 关键交付 | 状态 |
|---|---|---|---|---|
| **0** | W0 | 路线 C v2 + 阶段文档 | `pools/design/req/dev-design/test-design/product/arch` 5 篇 | **本批次** |
| **1** | W1-3 | mdast 解析器 | `src/oxl/md-bridge/remark-to-kernel.ts` + 5 类 E_MD_xxx | 待启动 |
| **2** | W4-6 | 14 builtin probe MD 化 | 14 probe 模板 .oxn → .md | 待启动 |
| **3** | W7-9 | forges/ → pools/ 迁移 | `scripts/migrate-forges.ts` + 51 文档迁移 | 待启动 |
| **4** | W10-12 | 5 个 scripts + lefthook | version-aggregate/release + audit-completeness | 待启动 |
| **5** | W13-14 | forges/ 物理删除 | `rm -rf forges/` + `_archive/2026-06-forges/` 备份 | 待启动 |
| **6** | W15-18 | oxn-md CLI 完整化 | `oxn domain --md` + oxn-md-renderer | 待启动 |

---

## 2. 阶段 1 实施：mdast 解析器

### 2.1 文件结构

```
src/oxl/md-bridge/
├── remark-to-kernel.ts       # mdast → Kernel Schema 主入口
├── mdast-validator.ts        # 5 类 E_MD_xxx 错误校验
├── directive-extractor.ts    # 提取 `:::intent` 容器指令
├── frontmatter-parser.ts     # YAML frontmatter 解析
└── __tests__/
    ├── remark-to-kernel.test.ts
    ├── mdast-validator.test.ts
    └── fixtures/
        ├── domain/OrderContext.md
        ├── blueprint/dev-workflow.md
        └── work/v0-3-md-ssot.md
```

### 2.2 `remark-to-kernel.ts` 核心实现

```ts
// src/oxl/md-bridge/remark-to-kernel.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { validateMdStructure } from './mdast-validator';
import { parseFrontmatter } from './frontmatter-parser';
import { extractDirectives } from './directive-extractor';
import type { KernelSchema } from '../../kernel/contracts/io-primitive';

export async function remarkToKernel(mdPath: string): Promise<KernelSchema> {
  const text = await readFile(mdPath);  // L1-Infra/filesystem.ts

  // 1. 5 类 E_MD_xxx 结构校验
  const errors = await validateMdStructure(text);
  if (errors.length > 0) {
    throw new AggregateError('MD validation failed', errors);
  }

  // 2. mdast 解析
  const ast = unified().use(remarkParse).use(remarkDirective).parse(text);

  // 3. 提取 frontmatter
  const frontmatter = parseFrontmatter(ast);

  // 4. 提取 `:::intent` 容器指令
  const directives = extractDirectives(ast);

  // 5. 构造 Kernel Schema
  return {
    name: frontmatter.name ?? 'unnamed',
    version: frontmatter.version ?? '0.0.0',
    type: frontmatter.type ?? 'domain',
    content: toString(ast),
    directives,
  };
}
```

### 2.3 `mdast-validator.ts` 5 类错误

```ts
// src/oxl/md-bridge/mdast-validator.ts
import { visit } from 'unist-util-visit';
import type { Root, Heading, Table, ContainerDirective } from 'mdast';

export async function validateMdStructure(text: string): Promise<ValidationError[]> {
  const ast = parseMdast(text);
  const errors: ValidationError[] = [];

  // E_MD_MULTIPLE_H1
  const h1Count = countH1(ast);
  if (h1Count > 1) {
    errors.push({ code: 'E_MD_MULTIPLE_H1', location: getLocation(ast, 'h1') });
  }

  // E_MD_ORPHAN_H2
  visit(ast, 'heading', (node) => {
    if (node.depth === 2 && !hasParentH1(node)) {
      errors.push({ code: 'E_MD_ORPHAN_H2', location: node.position });
    }
  });

  // E_MD_CROSS_AGGREGATE
  // E_MD_TABLE_OUT_OF_AGGREGATE
  // E_MD_INVARIANT_OUT_OF_SCOPE

  return errors;
}
```

### 2.4 依赖注入（package.json）

```json
{
  "dependencies": {
    "unified": "^11.0.4",
    "remark-parse": "^11.0.0",
    "remark-directive": "^3.0.0",
    "unist-util-visit": "^5.0.0",
    "mdast-util-to-string": "^4.0.0",
    "yaml": "^2.5.0"  // frontmatter
  }
}
```

### 2.5 阶段 1 测试用例

```ts
// src/oxl/md-bridge/__tests__/remark-to-kernel.test.ts
describe('remarkToKernel', () => {
  it('parses Domain MD with `:::intent` blocks', async () => {
    const result = await remarkToKernel('fixtures/domain/OrderContext.md');
    expect(result.directives).toHaveLength(2);
    expect(result.directives[0].type).toBe('invariant');
  });

  it('throws E_MD_MULTIPLE_H1 on multiple # headings', async () => {
    await expect(remarkToKernel('fixtures/bad/multiple-h1.md'))
      .rejects.toThrow('E_MD_MULTIPLE_H1');
  });

  it('throws E_MD_ORPHAN_H2 on H2 without H1 parent', async () => {
    await expect(remarkToKernel('fixtures/bad/orphan-h2.md'))
      .rejects.toThrow('E_MD_ORPHAN_H2');
  });
});
```

---

## 3. 阶段 2 实施：14 builtin probe MD 化

### 3.1 迁移映射

**14 builtin probe 模板**（`src/builtin/probes/*.oxn`）→ **14 MD 模板**（`src/builtin/probes/*.md`）

| 旧 .oxn 模板 | 新 .md 模板 |
|---|---|
| `fs-exists.oxn` | `fs-exists.md` |
| `fs-not-exists.oxn` | `fs-not-exists.md` |
| `fs-content-match.oxn` | `fs-content-match.md` |
| `fs-parseable.oxn` | `fs-parseable.md` |
| `shell-exec.oxn` | `shell-exec.md` |
| `http-responds.oxn` | `http-responds.md` |
| `ts-compiles.oxn` | `ts-compiles.md` |
| `lint-check.oxn` | `lint-check.md` |
| `test-pass.oxn` | `test-pass.md` |
| `deps-resolved.oxn` | `deps-resolved.md` |
| `file-exports.oxn` | `file-exports.md` |
| `git-status-clean.oxn` | `git-status-clean.md` |
| `git-clean.oxn` | `git-clean.md` |
| `git-branch-exists.oxn` | `git-branch-exists.md` |
| `git-merge-feasible.oxn` | `git-merge-feasible.md` |

### 3.2 MD 模板示例

```markdown
---
name: fs-exists
version: 0.3.0
type: probe
scheme: fs://...
---

# Probe: fs-exists

> 检查路径是否存在

## Props

| name | type | required | default | desc |
| :--- | :--- | :--- | :--- | :--- |
| path | string | yes | - | 文件路径 |

## Output

| name | type | desc |
| :--- | :--- | :--- |
| exists | boolean | true = 路径存在 |
| isSymlink | boolean | true = 软链接 |

:::intent{#fs-exists-invariant-1 type="invariant" scope="probe"}
- path 必须存在
- path 必须是绝对路径或 cwd 相对
:::
```

### 3.3 渐进替换策略

```
阶段 2a: 1-2 probe 试点（fs 系列）
   ↓ 验证
阶段 2b: 5 probe 渐进
   ↓ 验证
阶段 2c: 14 probe 全部重写
   ↓ 验证
阶段 5: 物理删除 .oxn 模板
```

**关键不变量**：probe 函数体不变（adapter 模式）

---

## 4. 阶段 3 实施：forges/ → pools/ 迁移

### 4.1 迁移脚本

```ts
// scripts/migrate-forges.ts
import { spawn } from 'bun';
import { readFileSync, readdirSync } from '../src/infra/filesystem';

interface MigrationEntry {
  src: string;       // .openxenon/forges/<path>.md
  dst: string;       // pools/<type>/<slug>.md
  pool: string;      // research/design/issue/audit/journal
  slug: string;      // kebab-case
  title: string;     // H1 标题
}

const MIGRATION_MAP: MigrationEntry[] = [
  // 27 → pools/audit/
  { src: 'forges/sprints/sprint-1/*.md', dst: 'pools/audit/retro-v0.2.0-sprint-1/', pool: 'audit', slug: 'retro-v0-2-0-sprint-1', title: '...' },
  // 13 → pools/design/
  { src: 'forges/2026-06-11-infra-io-layer-reorg.md', dst: 'pools/design/dev-design-infra-io-layer-reorg-v0.2.0.md', pool: 'design', slug: '...', title: '...' },
  // ...
];

async function migrate(opts: { phase: 'A' | 'B' | 'C'; dryRun: boolean }) {
  if (opts.phase === 'A') await prependDeprecationHeaders();
  if (opts.phase === 'B') await copyToPools(opts.dryRun);
  if (opts.phase === 'C') await deleteForges(opts.dryRun);
}

async function copyToPools(dryRun: boolean) {
  for (const entry of MIGRATION_MAP) {
    const content = readFileSync(join('.openxenon', entry.src));
    const title = extractTitle(content);
    const cmd = ['bun', 'src/cli/index.ts', 'pool', 'create', entry.pool, entry.slug, '--title', title, '--content', content];
    if (!dryRun) await spawn({ cmd }).exited;
  }
}
```

### 4.2 51 文档映射表（完整）

参见 [`process-forges-deprecation-migration.md`](../process-forges-deprecation-migration.md) §2

### 4.3 阶段 3 三步执行

```bash
# 阶段 A：DEPRECATED 标头
bun run scripts/migrate-forges.ts --phase A --dry-run
bun run scripts/migrate-forges.ts --phase A

# 阶段 B：复制到 pools/
bun run scripts/migrate-forges.ts --phase B --dry-run
bun run scripts/migrate-forges.ts --phase B

# 备份 forges/
cp -r .openxenon/forges _archive/2026-06-forges/

# 阶段 C：物理删除 forges/
bun run scripts/migrate-forges.ts --phase C --dry-run
bun run scripts/migrate-forges.ts --phase C
```

---

## 5. 阶段 4 实施：5 个 scripts

### 5.1 `scripts/version-aggregate.ts`

```ts
// 扫描 .openxenon/** 聚合 → design/changelog/v0.X.md
import { glob } from 'bun';
import { readFileSync } from '../src/infra/filesystem';

async function aggregate(version: string, sinceVersion: string | null) {
  const changes = {
    domain: await scanChanges('.openxenon/domains', sinceVersion),
    blueprint: await scanChanges('.openxenon/blueprints', sinceVersion),
    pools: await scanChanges('.openxenon/pools', sinceVersion),
    works: await scanChanges('.openxenon/works', sinceVersion),
    proofs: await scanChanges('.openxenon/proofs', sinceVersion),
    audit: await scanChanges('.openxenon/pools/audit', sinceVersion),
    journal: await scanChanges('.openxenon/pools/journal', sinceVersion),
  };

  return renderChangelog({ version, changes });
}
```

### 5.2 `scripts/version-release.ts`

```ts
async function release(version: string) {
  // 1. check
  await runCheck();
  // 2. aggregate
  await runAggregate(version);
  // 3. release notes draft
  const notes = await generateReleaseNotes(version);
  // 4. bump + tag
  await bumpPackageJson(version);
  await createGitTag(`v${version}`, notes);
  // 5. archive
  await archiveOldChanges();
}
```

### 5.3 `scripts/audit-completeness.ts`

```ts
async function auditWork(work: Work): Promise<AuditCheck> {
  return {
    work,
    hasRequirements: hasFile(`pools/design/req-*.md`),
    hasDesign: hasFile(`pools/design/dev-design-*.md`),
    hasTestDesign: hasFile(`pools/design/test-design-*.md`),
    hasDomain: hasFile(`.openxenon/domains/<Name>.md`),
    hasBlueprint: hasFile(`.openxenon/blueprints/<name>.md`),
    hasProof: hasFile(`.openxenon/proofs/<proof>/verdict.md`),
    hasAudit: hasFile(`.openxenon/pools/audit/<v>-*.md`),
    hasJournal: hasFile(`.openxenon/pools/journal/<date>-*.md`),
  };
}
```

### 5.4 `scripts/check-naming.ts`

参见 [`naming-system.md`](../naming-system.md) §7

### 5.5 package.json scripts

```json
{
  "version:check": "bun run scripts/version-check.ts",
  "version:sync": "bun run scripts/version-sync.ts",
  "version:aggregate": "bun run scripts/version-aggregate.ts",
  "version:release": "bun run scripts/version-release.ts",
  "version:parse-mdast": "bun run scripts/parse-mdast.ts",
  "audit:completeness": "bun run scripts/audit-completeness.ts",
  "check:naming": "bun run scripts/check-naming.ts",
  "migrate:forges": "bun run scripts/migrate-forges.ts"
}
```

### 5.6 lefthook pre-commit/pre-push

```yaml
pre-commit:
  commands:
    version:check:
      run: bun run version:check
    check:naming:
      glob: ".openxenon/{design,intent,align,proof}/**/*.md"
      run: bun run scripts/check-naming.ts {staged_files}

pre-push:
  commands:
    audit:completeness:
      run: bun run scripts/audit-completeness.ts
    bun:test:
      run: bun test
```

---

## 6. 阶段 5 实施：forges/ 物理删除

### 6.1 删除序列

```bash
# 1. 备份 forges/ 到 _archive/
cp -r .openxenon/forges _archive/2026-06-forges/

# 2. 物理删除 forges/
rm -rf .openxenon/forges

# 3. 更新 .gitignore（删除 forges/ 行）
# 原：
# .openxenon/forges/
# 删除该行

# 4. lefthook 移除 forges/ 相关守卫
# 5. 提交删除
git add -A
git commit -m "release: 0.3.0 — 物理删除 forges/，全部迁至 pools/"
```

### 6.2 验证

```bash
ls .openxenon/
# 预期：无 forges/ 目录
ls _archive/2026-06-forges/
# 预期：仍保留 51 文档
```

---

## 7. 阶段 6 实施：oxn-md CLI 完整化

### 7.1 `--md` flag 改造

```ts
// src/cli/domain.ts
import { defineCommand } from 'citty';

export default defineCommand({
  meta: { name: 'domain', description: '...' },
  args: {
    'md': { type: 'boolean', description: 'Create MD format (v0.3+)' },
    // ... existing args
  },
  async run({ args }) {
    if (args.md) {
      await createDomainAsMd(args);
    } else {
      await createDomainAsOxn(args);  // 向后兼容
    }
  },
});
```

### 7.2 oxn-md-renderer（基础版）

```ts
// src/oxl/md-bridge/md-renderer.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

export async function renderMd(mdText: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(mdText);
  return String(file);
}
```

---

## 8. 风险与缓解

| 风险 | 阶段 | 缓解 |
|---|---|---|
| mdast 解析 1MB < 500ms | 1 | 性能测试 + 缓存 |
| 14 probe 重写回归 | 2 | 双轨期 + 1393 测试守住 |
| 51 文档迁移遗漏 | 3 | migrate-forges 自动化 + _archive/ 备份 |
| 5 类 E_MD_xxx 不覆盖 Langium | 4 | 单元测试 + 全量回归 |
| forges/ 物理删除后回溯成本 | 5 | _archive/ 永久保留 |

---

## 9. 关键文件清单

| 文件 | 阶段 | 工作量 |
|---|---|---|
| `src/oxl/md-bridge/remark-to-kernel.ts` | 1 | 1 周 |
| `src/oxl/md-bridge/mdast-validator.ts` | 1 | 0.5 周 |
| `src/oxl/md-bridge/directive-extractor.ts` | 1 | 0.5 周 |
| `src/oxl/md-bridge/frontmatter-parser.ts` | 1 | 0.3 周 |
| 14 builtin probe MD 化 | 2 | 2 周 |
| `scripts/migrate-forges.ts` | 3 | 1 周 |
| `scripts/version-aggregate.ts` | 4 | 1 周 |
| `scripts/version-release.ts` | 4 | 0.5 周 |
| `scripts/audit-completeness.ts` | 4 | 0.5 周 |
| `scripts/check-naming.ts` | 4 | 0.3 周 |
| forges/ 物理删除 | 5 | 0.5 天 |
| oxn-md CLI 完整化 | 6 | 2 周 |
| **总计** | | **~10 周** |

---

**关联文档**：
- [`req-md-ssot-v0.3.0.md`](./req-md-ssot-v0.3.0.md) — 需求
- [`arch-md-ssot-v0.3.0.md`](./arch-md-ssot-v0.3.0.md) — 架构
- [`test-design-md-ssot-v0.3.0.md`](./test-design-md-ssot-v0.3.0.md) — 测试
- [`product-md-ssot-overview-v0.3.0.md`](./product-md-ssot-overview-v0.3.0.md) — 产品
- [`v0.3.0-roadmap.md`](../v0.3.0-roadmap.md) — 路线图
- [`l0-l3-alignment.md`](../l0-l3-alignment.md) — 架构护身咒
