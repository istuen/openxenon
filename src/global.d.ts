// src/global.d.ts — barrel for all global type augmentations + module shims
// 解决 git 2.53 + 不同 OS tsc 对 .d.ts in nested dirs 解析不一致的问题:
// 显式 reference 所有 .d.ts, 强制 tsc 在 include 阶段就拉进来
/// <reference path="./infra/runtime/deno-global.d.ts" />
/// <reference path="./infra/runtime/which.d.ts" />
