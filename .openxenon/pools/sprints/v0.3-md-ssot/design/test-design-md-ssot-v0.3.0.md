---
name: test-design-md-ssot
version: 0.3.0
type: test-design
status: current
author: opencode
date: 2026-06-20
---

# Test Design: v0.3.0 MD-SSOT 体系

> **版本**：v0.3.0
> **状态**：current
> **目的**：定义 v0.3.0 阶段的测试策略、测试用例、覆盖率目标
> **关联**：[`req-md-ssot-v0.3.0.md`](./req-md-ssot-v0.3.0.md) | [`dev-design-md-ssot-v0.3.0.md`](./dev-design-md-ssot-v0.3.0.md)

---

## 1. 测试策略

| 维度 | 策略 |
|---|---|
| **单元测试** | 每个新模块（mdast 解析器、5 类 E_MD_xxx、scripts）独立测试 |
| **集成测试** | mdast → Kernel Schema → 14 probe → Verdict 端到端 |
| **回归测试** | 现有 1393 测试全绿；T10/T11/T12 done 任务无回归 |
| **属性测试** | 5 类 E_MD_xxx 对照 Langium 全部错误场景 |
| **迁移测试** | forges/ → pools/ 51 文档等价性 |
| **CI 集成** | lefthook pre-commit + pre-push + GitHub Actions |

---

## 2. 测试维度

### 2.1 R1: mdast 替代 Langium

#### 2.1.1 单元测试

| 测试点 | 文件 | 预期 |
|---|---|---|
| `remarkToKernel` 解析简单 MD | `src/oxl/md-bridge/__tests__/remark-to-kernel.test.ts` | 返回 Kernel Schema |
| 解析含 `:::intent` 块的 MD | 同上 | 提取所有 directives |
| 解析含 frontmatter 的 MD | 同上 | frontmatter 字段映射 |
| 解析多 H1（错误场景）| `mdast-validator.test.ts` | 抛 `E_MD_MULTIPLE_H1` |
| 解析孤立 H2（错误场景）| 同上 | 抛 `E_MD_ORPHAN_H2` |
| 解析含 table 越界 | 同上 | 抛 `E_MD_TABLE_OUT_OF_AGGREGATE` |
| 解析含 `:::intent` 在 scope 外 | 同上 | 抛 `E_MD_INVARIANT_OUT_OF_SCOPE` |
| 解析含跨 aggregate `:::intent` ID | 同上 | 抛 `E_MD_CROSS_AGGREGATE` |

#### 2.1.2 集成测试

| 测试点 | 文件 | 预期 |
|---|---|---|
| mdast 解析 → Kernel Schema → 14 probe 端到端 | `src/builtin/probes/__tests__/e2e-mdast.test.ts` | 全部 PASS |
| 1MB MD 解析 < 500ms | `src/oxl/md-bridge/__tests__/perf.test.ts` | < 500ms |

#### 2.1.3 回归测试

| 测试点 | 现有 | 预期 |
|---|---|---|
| 14 builtin probe 透传 | `src/builtin/probes/__tests__/*.test.ts` | 0 fail |
| 5 类 E_MD_xxx 对照 v0.2 全部错误场景 | `scripts/test-e-md-coverage.ts` | 100% 覆盖 |
| Langium AST 兼容测试 | `src/oxl/__tests__/examples-parsing.test.ts` | 0 fail |

#### 2.1.4 覆盖率目标

| 模块 | 目标 |
|---|---|
| `remark-to-kernel.ts` | ≥ 90% |
| `mdast-validator.ts` | ≥ 95%（5 类 E_MD_xxx 必覆盖）|
| `directive-extractor.ts` | ≥ 85% |
| `frontmatter-parser.ts` | ≥ 90% |

---

### 2.2 R2: pools/ 5 池内容填充

#### 2.2.1 单元测试

| 测试点 | 文件 | 预期 |
|---|---|---|
| `oxn pool create research test` | `src/cli/__tests__/pool-create.test.ts` | 创建 `pools/research/test.md` |
| `oxn pool create` 5 池全部 | 同上 | 5 池各创建 1 个 |
| 重复 slug（错误场景）| 同上 | 抛 `PROVIDER_DUPLICATE` |
| 无效 pool 类型（错误场景）| 同上 | 抛 `Invalid pool` |
| 错误 slug 格式（错误场景）| 同上 | 抛 `must match` |

#### 2.2.2 集成测试

| 测试点 | 文件 | 预期 |
|---|---|---|
| 51 forges/ → pools/ 端到端 | `src/cli/__tests__/migrate-forges-e2e.test.ts` | 51 文档成功迁移 |
| 迁移前后内容等价 | 同上 | MD 内容字节级相同（除 frontmatter）|
| 5 池统计 | `src/cli/__tests__/pool-list.test.ts` | `pools/design` count ≥ 13 |

#### 2.2.3 覆盖率目标

| 模块 | 目标 |
|---|---|
| `scripts/migrate-forges.ts` | ≥ 80% |
| `src/infra/frozen/pool-writer.ts` | ≥ 90% |

---

### 2.3 R3: version:aggregate/release 自动化

#### 2.3.1 单元测试

| 测试点 | 文件 | 预期 |
|---|---|---|
| `aggregate("0.3.0", "0.2.0")` | `scripts/__tests__/version-aggregate.test.ts` | 生成 `design/changelog/v0.3.0.md` |
| 扫描 5 类目录 | 同上 | 收集 domains/blueprints/pools/works/proofs 全部 |
| 渲染 7 段（Domain/Blueprint/Pools/Work/Proof/Audit/Journal）| 同上 | 每段按时间排序 |
| `version:check` 验证一致性 | `scripts/__tests__/version-check.test.ts` | package.json vs .openxenon 全部 MD |
| `audit:completeness <work>` | `scripts/__tests__/audit-completeness.test.ts` | 输出 8 项检查 |
| `check:naming` | `scripts/__tests__/check-naming.test.ts` | 校验 6+ 个目录模式 |

#### 2.3.2 集成测试

| 测试点 | 文件 | 预期 |
|---|---|---|
| 完整 release 流程 | `scripts/__tests__/version-release-e2e.test.ts` | check + aggregate + bump + tag + archive |
| 1MB `.openxenon` 扫描 < 500ms | `scripts/__tests__/version-aggregate-perf.test.ts` | < 500ms |

#### 2.3.3 覆盖率目标

| 模块 | 目标 |
|---|---|
| `version-aggregate.ts` | ≥ 85% |
| `version-release.ts` | ≥ 80% |
| `audit-completeness.ts` | ≥ 80% |
| `check-naming.ts` | ≥ 90% |

---

### 2.4 R4: forges/ 物理删除

#### 2.4.1 集成测试

| 测试点 | 文件 | 预期 |
|---|---|---|
| 阶段 A：DEPRECATED 标头 | `scripts/__tests__/migrate-forges-e2e.test.ts` | 51 文档头部加标头 |
| 阶段 B：复制到 pools/ | 同上 | 51 文档成功复制 |
| 备份到 _archive/ | 同上 | `_archive/2026-06-forges/` 含 51 文档 |
| 阶段 C：物理删除 | 同上 | forges/ 目录不存在 |
| .gitignore 更新 | 同上 | `forges/` 行已删 |

#### 2.4.2 回归测试

| 测试点 | 现有 | 预期 |
|---|---|---|
| 1393 现有测试 | `bun test` | 0 fail |
| lefthook 守卫 | `.lefthook.yml` | forges/ 守卫已删 |

#### 2.4.3 验收标准

- [ ] forges/ 物理删除
- [ ] _archive/2026-06-forges/ 备份完整
- [ ] .gitignore 不再含 `forges/` 行
- [ ] git log 中 forges/ 历史完整
- [ ] lefthook 移除 forges/ 相关守卫

---

### 2.5 R5: oxn-md CLI 完整化

#### 2.5.1 单元测试

| 测试点 | 文件 | 预期 |
|---|---|---|
| `oxn domain --md` | `src/cli/__tests__/domain-md.test.ts` | 创建 `*.md`（不是 `.oxn`）|
| `oxn blueprint --md` | 同上 | 同上 |
| `oxn work --md` | 同上 | 同上 |
| `oxn proof --md` | 同上 | 同上 |
| `oxn pool create` (已实施) | `src/cli/__tests__/pool-create.test.ts` | 同上 |
| 兼容：原 `oxn domain create` | 同上 | 创建 `.oxn`（v0.2 兼容）|

#### 2.5.2 集成测试

| 测试点 | 文件 | 预期 |
|---|---|---|
| `:::intent` → HTML 渲染 | `src/oxl/md-bridge/__tests__/md-renderer.test.ts` | Notion/GitHub 友好 |
| 完整 IAP 生命周期 | `src/cli/__tests__/iap-md-e2e.test.ts` | domain → blueprint → work → proof 全部 MD |

#### 2.5.3 覆盖率目标

| 模块 | 目标 |
|---|---|
| `src/cli/domain.ts --md` | ≥ 85% |
| `src/cli/blueprint.ts --md` | ≥ 85% |
| `src/cli/work.ts --md` | ≥ 85% |
| `src/oxl/md-bridge/md-renderer.ts` | ≥ 70%（基础版）|

---

## 3. 关键测试场景（端到端）

### 3.1 场景 1：完整 IAP 生命周期（MD 版）

```ts
describe('IAP lifecycle (MD version)', () => {
  it('creates domain, blueprint, work, proof all as MD', async () => {
    // 1. 创建 Domain MD
    await runCLI('domain', 'create', 'OrderContext', '--md');
    expect(await fileExists('.openxenon/domains/OrderContext.md')).toBe(true);

    // 2. 创建 Blueprint MD
    await runCLI('blueprint', 'create', 'dev-workflow', '--md');
    expect(await fileExists('.openxenon/blueprints/dev-workflow.md')).toBe(true);

    // 3. 创建 Work MD
    await runCLI('work', 'create', 'v0-3-test', '--md', '--blueprint', 'dev-workflow');
    expect(await fileExists('.openxenon/works/v0-3-test/work.md')).toBe(true);

    // 4. 创建 Proof MD
    await runCLI('proof', 'create', 'auth-impl', '--md');
    expect(await fileExists('.openxenon/proofs/auth-impl/verdict.md')).toBe(true);

    // 5. 验证全链路
    expect(await runCLI('pool', 'list')).toContain('design');
  });
});
```

### 3.2 场景 2：5 类 E_MD_xxx 错误拦截

```ts
describe('5-class E_MD_xxx error interception', () => {
  it('intercepts E_MD_MULTIPLE_H1', async () => {
    const bad = '# H1\n# Another H1\n## Term\n';
    await expect(parseDomain(bad)).rejects.toThrow('E_MD_MULTIPLE_H1');
  });

  it('intercepts E_MD_ORPHAN_H2', async () => {
    const bad = '## Term\n';  // no # Domain
    await expect(parseDomain(bad)).rejects.toThrow('E_MD_ORPHAN_H2');
  });

  it('intercepts E_MD_CROSS_AGGREGATE', async () => {
    const bad = ':::intent{#order-invariant-1 type="invariant"}\nReference to Customer.aggregate\n:::';
    await expect(parseDomain(bad)).rejects.toThrow('E_MD_CROSS_AGGREGATE');
  });

  it('intercepts E_MD_TABLE_OUT_OF_AGGREGATE', async () => {
    const bad = '| A | B |\n| 1 | 2 |\n';  // no # Domain
    await expect(parseDomain(bad)).rejects.toThrow('E_MD_TABLE_OUT_OF_AGGREGATE');
  });

  it('intercepts E_MD_INVARIANT_OUT_OF_SCOPE', async () => {
    const bad = ':::intent{#x type="invariant"}\nstuff\n:::\n';  // no # Domain
    await expect(parseDomain(bad)).rejects.toThrow('E_MD_INVARIANT_OUT_OF_SCOPE');
  });
});
```

### 3.3 场景 3：forges/ → pools/ 51 文档迁移

```ts
describe('forges/ → pools/ migration (51 docs)', () => {
  it('migrates sprints to audit', async () => {
    await runCLI('migrate:forges', '--phase', 'B');
    expect(await fileExists('.openxenon/pools/audit/retro-v0-2-0-sprint-1/')).toBe(true);
  });

  it('preserves content byte-for-byte', async () => {
    const before = await readFile('.openxenon/forges/2026-06-11-infra-io-layer-reorg.md');
    const after = await readFile('.openxenon/pools/design/dev-design-infra-io-layer-reorg-v0.2.0.md');
    expect(after).toContain(before);  // 内容保留
  });

  it('phase C: deletes forges/ after backup', async () => {
    await runCLI('migrate:forges', '--phase', 'C');
    expect(await dirExists('.openxenon/forges')).toBe(false);
    expect(await dirExists('_archive/2026-06-forges')).toBe(true);
  });
});
```

### 3.4 场景 4：version:aggregate 端到端

```ts
describe('version:aggregate end-to-end', () => {
  it('aggregates all 5 categories from .openxenon/', async () => {
    await runCLI('version:aggregate', '--version', '0.3.0');
    const chg = await readFile('design/changelog/v0.3.0.md');
    expect(chg).toContain('Added (Domain)');
    expect(chg).toContain('Added (Blueprint)');
    expect(chg).toContain('Added (Pools)');
    expect(chg).toContain('Added (Work)');
    expect(chg).toContain('Verified (Proof)');
  });

  it('runs 1MB .openxenon scan in <500ms', async () => {
    const start = Date.now();
    await runCLI('version:aggregate', '--version', '0.3.0');
    expect(Date.now() - start).toBeLessThan(500);
  });
});
```

### 3.5 场景 5：L0–L3 架构护身咒保持

```ts
describe('L0–L3 architectural guardrails preserved', () => {
  it('L0-Processor has no fs/net/child_process imports', async () => {
    const files = await glob('src/kernel/**/*.ts');
    for (const f of files) {
      const content = await readFile(f);
      expect(content).not.toMatch(/from\s+['"]node:fs/);
      expect(content).not.toMatch(/from\s+['"]node:net/);
      expect(content).not.toMatch(/from\s+['"]node:child_process/);
    }
  });

  it('L1-OXL md-bridge does not import Langium', async () => {
    const files = await glob('src/oxl/md-bridge/**/*.ts');
    for (const f of files) {
      const content = await readFile(f);
      expect(content).not.toMatch(/from\s+['"]langium/);
    }
  });
});
```

---

## 4. 回归测试基线

| 项目 | 当前 v0.2.0 | v0.3.0 目标 |
|---|---|---|
| 现有测试 | 1393 pass | 1393 pass（0 回归）|
| 新增测试 | 0 | +80-100 case |
| 总测试 | 1393 | ~1500 |
| 通过率 | 100% | 100% |

---

## 5. CI 集成

### 5.1 lefthook pre-commit

```yaml
pre-commit:
  commands:
    check:naming:
      glob: ".openxenon/{design,intent,align,proof}/**/*.md"
      run: bun run scripts/check-naming.ts {staged_files}
    version:check:
      run: bun run version:check
    parse:mdast:
      glob: ".openxenon/{domains,blueprints,works,proofs,pools}/**/*.md"
      run: bun run scripts/parse-mdast.ts {staged_files}
```

### 5.2 lefthook pre-push

```yaml
pre-push:
  commands:
    audit:completeness:
      run: bun run scripts/audit-completeness.ts
    bun:test:
      run: bun test
```

### 5.3 GitHub Actions

```yaml
# .github/workflows/v0.3-ci.yml
name: v0.3 MD-SSOT CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun test
      - run: bun run version:check
      - run: bun run check:naming
      - run: bun run audit:completeness
```

---

## 6. 关键测试用例

### 6.1 5 类 E_MD_xxx 触发矩阵

| 错误码 | 输入 | 预期错误位置 |
|---|---|---|
| `E_MD_MULTIPLE_H1` | `# A\n# B` | 第 2 个 `#` |
| `E_MD_ORPHAN_H2` | `## Term` (无 # Domain) | `##` 行 |
| `E_MD_CROSS_AGGREGATE` | `:::intent{...ref=Customer.x}` | `ref` 跨 aggregate |
| `E_MD_TABLE_OUT_OF_AGGREGATE` | `| A |` (无 # Domain) | table 行 |
| `E_MD_INVARIANT_OUT_OF_SCOPE` | `:::intent{...}` (无 # Domain) | directive 行 |

### 6.2 14 builtin probe 透传测试

| probe | MD 模板 | 透传测试 |
|---|---|---|
| fs-exists | `src/builtin/probes/fs-exists.md` | `src/builtin/probes/__tests__/fs-exists.test.ts` |
| fs-not-exists | `fs-not-exists.md` | `fs-not-exists.test.ts` |
| fs-content-match | `fs-content-match.md` | `fs-content-match.test.ts` |
| ... | ... | ... |

### 6.3 51 文档迁移等价性

| 类别 | 数量 | 等价性测试 |
|---|---|---|
| sprints → audit | 17 | `migrate-forges-e2e.test.ts` |
| design → design | 13 | 同上 |
| audit → audit | 10 | 同上 |
| blueprint | 1 | 同上 |
| work journal → works | 2 | 同上 |
| 废弃 → _archive/ | 3 | 同上 |
| 设计稿基石 → design | 2 | 同上 |

---

## 7. 性能基准

| 测试 | 目标 | 测量 |
|---|---|---|
| mdast 解析 1MB MD | < 500ms | `perf.test.ts` |
| `version:aggregate` 扫描 .openxenon | < 500ms | `version-aggregate-perf.test.ts` |
| `migrate-forges` 51 文档 | < 5s | `migrate-forges-perf.test.ts` |
| `check:naming` 100 文件 | < 100ms | `check-naming-perf.test.ts` |

---

## 8. 验收标准

### 8.1 测试通过

- [ ] 1393 现有测试全绿
- [ ] +80-100 新增测试全绿
- [ ] 5 类 E_MD_xxx 全部触发
- [ ] 14 builtin probe 透传
- [ ] 51 文档迁移等价
- [ ] L0–L3 边界保持

### 8.2 覆盖率

- [ ] `src/oxl/md-bridge/` ≥ 90%
- [ ] `scripts/` ≥ 80%
- [ ] 端到端场景 5 个

### 8.3 性能

- [ ] mdast 1MB < 500ms
- [ ] aggregate < 500ms
- [ ] migrate 51 文档 < 5s

### 8.4 CI

- [ ] lefthook pre-commit 通过
- [ ] lefthook pre-push 通过
- [ ] GitHub Actions 通过

---

**关联文档**：
- [`req-md-ssot-v0.3.0.md`](./req-md-ssot-v0.3.0.md) — 需求
- [`arch-md-ssot-v0.3.0.md`](./arch-md-ssot-v0.3.0.md) — 架构
- [`dev-design-md-ssot-v0.3.0.md`](./dev-design-md-ssot-v0.3.0.md) — 实施
- [`product-md-ssot-overview-v0.3.0.md`](./product-md-ssot-overview-v0.3.0.md) — 产品
- [`v0.3.0-roadmap.md`](../v0.3.0-roadmap.md) — 路线图
