## Why

当前项目没有配置任何 Git 远程仓库，无法：
1. 推送代码到远程进行备份
2. 与其他开发者协作
3. 利用 GitHub/Gitea 等平台的 CI/CD 功能

## What Changes

1. 添加远程仓库 `yuheng-forgejo` -> `ssh://git@forgejo.yuheng.chat/issac/openxenon.git`
2. 首次推送当前分支（dev）到远程仓库

## Impact

- 可以将代码推送到远程仓库
- 启用远程备份和协作基础

## High Risk

- SSH 连接配置是否正确
- 远程仓库是否存在且有权限