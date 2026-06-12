## 1. 追加 system 子命令到 onx-cli instruction.md

- [x] 1.1 读取 `src/skills/locales/zh-CN/onx-cli/instruction.md` 现有内容
- [x] 1.2 追加 `## onx-cli system` 子命令章节（init/status/stop/trace/arsenal）

## 2. 更新 src/skills/loader.ts

- [x] 2.1 从 skillMeta 数组中移除 oxn-init、oxn-status、oxn-stop、oxn-trace、oxn-arsenal
- [x] 2.2 移除对应的 import 语句
- [x] 2.3 移除 skillContents 中对应的条目

## 3. 验证迁移

- [x] 3.1 运行 `bun run typecheck` 确保无编译错误
- [x] 3.2 已在 onx-cli instruction.md 中整合 system 子命令（原本就在）
- [x] 3.3 loader.ts 已更新为 6 个技能（onx-cli, oxn-task, oxn-work, oxn-forge, oxn-explore, oxn-plan）

## 4. 清理旧文件

- [x] 4.1 删除 `src/skills/locales/zh-CN/oxn-init/` 目录
- [x] 4.2 删除 `src/skills/locales/zh-CN/oxn-status/` 目录
- [x] 4.3 删除 `src/skills/locales/zh-CN/oxn-stop/` 目录
- [x] 4.4 删除 `src/skills/locales/zh-CN/oxn-trace/` 目录
- [x] 4.5 删除 `src/skills/locales/zh-CN/oxn-arsenal/` 目录