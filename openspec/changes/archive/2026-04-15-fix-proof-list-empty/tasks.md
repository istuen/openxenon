## 1. 修改 API Handler

- [x] 1.1 修改 `src/api/handlers/proofs-list.ts` 导入，使用 `listAllProofs` 替代 `scanProjectProofs`
- [x] 1.2 更新响应结构，增加 `category` 和 `layer` 字段

## 2. 验证

- [x] 2.1 运行现有测试确保无回归
- [x] 2.2 验证 API 返回包含 built-in proofs
