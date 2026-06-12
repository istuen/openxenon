## 1. 修改 scanArsenalsDirectory 函数

- [x] 1.1 在 `scanArsenalsDirectory` 中添加全局目录扫描
- [x] 1.2 从 `global.ts` 导入 `ARSENALS_ROOT`
- [x] 1.3 合并项目级和全局扫描结果
- [x] 1.4 添加 `directoryExists` 函数处理 macOS APFS 大小写不敏感文件系统

## 2. 验证修复

- [x] 2.1 测试 `oxn arsenal list` 显示全局 draft 资产
- [x] 2.2 测试 `oxn arsenal inspect` 显示全局资产
- [x] 2.3 修复 `arsenal-list.ts` 中 `blueprints` 类型缺失问题