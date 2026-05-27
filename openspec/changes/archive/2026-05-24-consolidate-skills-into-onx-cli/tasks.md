## 1. 创建 onx-cli 技能目录

- [x] 1.1 创建 `.opencode/skills/onx-cli/` 目录
- [x] 1.2 读取所有 11 个现有 oxn-* 技能的 SKILL.md 内容

## 2. 设计 onx-cli 技能结构

- [x] 2.1 确定子命令分组（arsenal/task/work/forge/system）
- [x] 2.2 设计 SKILL.md 的整体结构
- [x] 2.3 定义每个子命令的处理模式

## 3. 编写 onx-cli SKILL.md

- [x] 3.1 编写 arsenal 子命令路由（list/inspect）
- [x] 3.2 编写 task 子命令路由（new/list/next/verify）
- [x] 3.3 编写 work 子命令路由（init/resume/complete/list）
- [x] 3.4 编写 forge 子命令路由（probe/blueprint/part）
- [x] 3.5 编写 system 子命令路由（init/stop/status/trace/resume）
- [x] 3.6 更新 src/skills/loader.ts 指向 onx-cli

## 4. 测试技能完整性

- [ ] 4.1 验证所有 11 个原有技能的功能都能通过 onx-cli 访问
- [ ] 4.2 验证子命令帮助信息正确显示

## 5. 清理旧技能目录

- [ ] 5.1 删除 src/skills/locales/zh-CN/ 下的 oxn-* 目录
- [ ] 5.2 删除 .opencode/skills/ 下的 oxn-* 目录