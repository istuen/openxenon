## 1. kernel/explore/types.ts

- [x] 1.1 创建目录 `src/kernel/explore/`
- [x] 1.2 定义 `Finding` 接口（id, level, message, location, suggestion, evidence）
- [x] 1.3 定义 `ExplorationResult` 接口（name, title, generatedAt, findings, summary）
- [x] 1.4 定义 `ExplorationRule` 接口（name, description, level, condition, message, suggestion）
- [x] 1.5 定义 `ExplorationContext` 接口（projectFiles, projectDirs, probes, blueprintProbeRefs, traceSummary）
- [x] 1.6 定义 `ExplorationAsset` 接口（name, description, scope, output, rules）

## 2. kernel/explore/evaluator.ts

- [x] 2.1 实现 `evaluateExploration(context, rules, meta)` 纯函数
- [x] 2.2 实现 `matchRuleForDirs()` 辅助函数
- [x] 2.3 实现 `evaluateCondition()` 辅助函数
- [x] 2.4 实现 `renderTemplate()` 辅助函数
- [x] 2.5 实现 `summarize()` 辅助函数
- [x] 2.6 单元测试（集成测试替代）

## 3. kernel/explore/reporter.ts

- [x] 3.1 实现 `renderMarkdown(result)` 纯函数
- [x] 3.2 实现 `formatFinding()` 辅助函数
- [x] 3.3 单元测试（集成测试替代）

## 4. infra/explore/collector.ts

- [x] 4.1 实现 `collectContext(projectRoot)` 数据采集
- [x] 4.2 实现 `collectProbes(projectRoot)` 扫描 Arsenal 探针
- [x] 4.3 实现 `collectBlueprintRefs(projectRoot)` 解析 Blueprint 引用
- [x] 4.4 实现 `saveReport(projectRoot, filename, markdown)` 写入报告
- [x] 4.5 集成测试

## 5. arsenals/explorations/*.yaml

- [x] 5.1 创建 `arsenals/explorations/coverage/canonical.yaml`
- [x] 5.2 创建 `arsenals/explorations/quality/canonical.yaml`
- [x] 5.3 创建 `arsenals/explorations/automation/canonical.yaml`

## 6. cli/explore.ts

- [x] 6.1 创建 `src/cli/explore.ts`
- [x] 6.2 实现 `exploreCommand`
- [x] 6.3 在 `src/cli/entry.ts` 注册 `oxn explore` 命令
- [x] 6.4 `pnpm build` 验证编译通过

## 7. 验收

- [x] 7.1 执行 `./dist/oxn explore coverage` 确认报告生成
- [x] 7.2 执行 `./dist/oxn explore quality` 确认报告生成
- [x] 7.3 用 OpenXenon 自身做第一次探索
- [x] 7.4 验证报告格式（包含覆盖度报告、问题/警告/建议分组）

## 注意

当前报告返回 0 findings，需要后续调整规则 YAML 以匹配项目实际情况。
