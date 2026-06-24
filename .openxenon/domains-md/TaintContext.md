---
entity: domain
version: 0.3.0
name: TaintContext
---

# Domain: TaintContext

> Probe Signal Taint v2 限界上下文: 12 项信号污损标记 + 3 IO 原语 + ProviderRegistry + 沙箱验证 + Daemon 冷加载

## Terms

### InterferenceFlag
- desc: 12 项污损信号标记 (8 RED + 4 YELLOW), 由 Provider 在物理 IO 时填充, Kernel verdict.ts 据此判定 INCONCLUSIVE

### IOPrimitive
- desc: 3 个最基础 IO 操作抽象: io.stat (元数据查询) / io.read (内容读取) / io.exec (进程执行)

### TrustBaseline
- desc: 12 项 InterferenceFlag 的信任基线配置: RED flag (8 项) 短路返回 INCONCLUSIVE, YELLOW flag (4 项) 透传记录

### ProbeVerdict
- desc: 三态判决: PASS (全部通过) / FAIL (至少一个失败) / INCONCLUSIVE (至少一个命中毒染信号)

### Provider
- desc: IO 执行器, 实现 InfraProvider 接口 (ioStat / ioRead / ioExec), 返回 {result, interference.flags}

### ProviderRegistry
- desc: Provider 注册中心: 4 个内置 Provider (file/http/shell/git) + bootstrapFromDisk + checkWorkDependencies

### Sandbox
- desc: vm.SourceTextModule 沙箱引擎: Bun.Transpiler + 严格白名单 context + 10 个 FORBIDDEN_MODULES + 7 个 FORBIDDEN_GLOBALS

### WorkPrecheck
- desc: Work 解析/启动前调 ProviderRegistry.checkWorkDependencies 精准阻断**该 Work** (v2 核心倒置: 不阻断 Daemon)

### Bootstrap
- desc: Daemon 启动期只读 .openxenon/probes/registry.json + 校验 Hash; CORRUPTED/MISSING 标状态不抛错

### Scheme
- desc: Provider URI 前缀 (file:// / http:// / shell:// / git://), OXL grammar 可选字段, 15 个 builtin probe 模板已迁移

### ProbeValidator
- desc: 编译时校验: scheme 格式 scheme:// / scheme 已在 registry 注册 / scheme 与 target URI 前缀一致

## Bans

### forbidden-constructs
- items:
  - Signal
  - Flag
  - TaintMark
  - Corruption
  - Pollution
- desc: Signal, Flag, TaintMark, Corruption, Pollution

## Invariants

### inv-1
- value: 8 项 RED flag (waf_detected/just_modified/detached_head/shallow_clone/sandbox_violation/network_timeout/response_truncated/permission_denied/unknown) 触发 INCONCLUSIVE

### inv-2
- value: 4 项 YELLOW flag (cdn_cache/cache_path/symlink) 透传记录, 不改变 verdict

### inv-3
- value: FileProvider.ioExec 必须抛 IAPError (file provider does not implement io.exec; use shell:// URI)

### inv-4
- value: HttpProvider WAF 头黑名单 6 项硬编码 (cf-ray/x-sucuri-id/x-akamai-transformed/x-imperva-id/x-azure-ref/x-aws-waf-token)

### inv-5
- value: 沙箱 context 禁动态代码生成 (codeGeneration: { strings: false, wasm: false })

### inv-6
- value: ProviderRegistry.bootstrapFromDisk 遇 CORRUPTED/MISSING 不抛错, 仅标 status 计数

### inv-7
- value: workPrecheck 仅阻断该 Work (v2 核心倒置: 其他 Work 不受影响)

### inv-8
- value: daemonStartup 启动期只读 + 不触网 (v2 核心倒置: CORRUPTED 标状态不阻断 Daemon)
