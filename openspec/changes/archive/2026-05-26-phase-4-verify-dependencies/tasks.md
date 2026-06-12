## 1. 验证脚本实现

- [x] 1.1 创建 `scripts/validate-dependencies.ts`
- [x] 1.2 实现 import 扫描逻辑
- [x] 1.3 实现层级判断 (L0/L1/L2/L3)
- [x] 1.4 实现依赖规则校验
- [x] 1.5 实现违规报告输出

## 2. 层级规则定义

- [x] 2.1 定义模块归属规则 (基于路径)
- [x] 2.2 定义允许/禁止依赖规则
- [x] 2.3 处理边界情况 (shared, types 等)

## 3. CI 集成

- [x] 3.1 创建 `.github/workflows/validate-deps.yml`
- [x] 3.2 配置 GitHub Actions 运行验证脚本

## 4. 测试覆盖

- [x] 4.1 为 Phase 1-3 添加集成测试 (272 existing tests)
- [x] 4.2 验证测试覆盖所有关键路径

## 5. 验证

- [x] 5.1 运行 `scripts/validate-dependencies.ts` 无违规
- [x] 5.2 运行 `pnpm test` 确保测试通过
- [x] 5.3 验证 CI 流程正确