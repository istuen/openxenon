/**
 * langium-driver/ — DEPRECATED DIRECTORY（v0.6.1 PR-4）
 *
 * ⚠️ v0.7.0 切割：本目录将被 `git rm` 完全删除
 * - src/oxl/langium-driver/langium-oxl-driver.ts
 * - src/oxl/langium-driver/oxn-services.ts
 * - src/oxl/langium-driver/oxn-document-builder.ts
 * - src/oxl/langium-driver/oxn.langium（grammar 源）
 * - src/oxl/langium-driver/generated/（langium 自动生成的 parser/ast/grammar）
 *
 * 同时卸 npm dep：`langium ^4.3.0` + `langium-cli ^4.3.0`（package.json）
 *
 * 切到 mdast + EntityCompiler 路径（packages/engine/src/oxl/md-bridge/）
 * 详见：.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md (D9)
 */

throw new Error(
  'langium-driver/ is deprecated. Use mdast + EntityCompiler (src/oxl/md-bridge/). ' +
    'See md-native-grammar-rfc.md D9 for v0.7.0 cutover plan.',
)
