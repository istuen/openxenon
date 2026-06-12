## 1. 实现 YAML 解析支持

- [x] 1.1 检查 yaml 包是否已存在（package.json）
- [x] 1.2 修改 createDraftProbe 函数：JSON 失败后降级到 YAML 解析

## 2. 验证

- [x] 2.1 运行 pnpm build 确认编译通过
- [x] 2.2 测试 `oxn forge probe -s` with YAML 输入
- [x] 2.3 确认 JSON 格式仍正常工作
