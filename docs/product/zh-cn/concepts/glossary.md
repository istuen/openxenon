---
title: 术语表
entity: glossary
generated-by: scripts/sync-domain-glossary.ts
synced-at: 2026-08-08
---

# 术语表

> 本页是 OpenXenon 项目的对外术语词典，**单一权威源**。
>
> 内部定义来自 `.openxenon/assets/domains/`（Asset 视角），本页是面向用户的精简字典。
> 修改术语请编辑 Asset Domain 文件，本页通过 sync 脚本自动重建。
>
> **多 Domain 定义说明**：同名 term 在多个 Domain 视角下可能有不同描述。**冲突判定由工程师 + AI 负责**，sync 脚本仅如实合并。

## 字母速查
- [A-E](#a-e)
- [F-L](#f-l)
- [M-R](#m-r)
- [S-Z](#s-z)

<!-- SYNC:START -->
## A-E

### Affected Package Family


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#affected-package-family) — 受同一维护者账号控制的包簇。本事件中 keyv maintainer 同时拥有
keyv / flat-cache / file-entry-cache / cacheable-request / cacheable / @cacheable/* /
cache-manager / ecto，任一成员被攻陷意味着整簇失守。

### Align


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#align) — 

### Artifact


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#artifact) — 

### Asset


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#asset) — 
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#asset) — 
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#asset) — 

### AssetCheck


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetcheck) — 

### AssetKind


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetkind) — 

### AssetMap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetmap) — 
- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#assetmap) — 

### AssetPaper


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#assetpaper) — 

### BirthCert


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#birthcert) — 

### Boundary


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#boundary) — 

### BuiltinAsset


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#builtinasset) — 

### Ceiling


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#ceiling) — 

### Citation


- [oxn-insight-domain](/openxenon/assets/domains/oxn-insight-domain.md#citation) — 

### CliInputError


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#cliinputerror) — 

### Command


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#command) — 

### Community Spread


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#community-spread) — 蠕虫利用第一代受害者机器上已经获取的 npm publish token，
把自己重新打包成 math_init.js 版本 + 加 preinstall，再以该 token 的发布权 push 到所有
该 token 有权发布的包。因此社区扩散感染的目标包与原 keyv 家族无业务关系
（如 @picsart/ai-sdk / @qlik/embed-runtime），但发布时间仍是 2026-08-04~05。

### CompanionAsset


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#companionasset) — 

### Compromised Version


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#compromised-version) — 已被官方或权威来源（GitHub Security Advisory / npm audit / Aikido Intel）标注为恶意的具体包版本号。
本事件覆盖 16 个包 × 精确版本（11 原生感染 + 5 社区扩散）。

### Daemon


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#daemon) — 
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#daemon) — 

### DefinitionalModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#definitionalmodality) — 

### DescriptiveModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#descriptivemodality) — 

### DevVersion


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#devversion) — 

### Distribution


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#distribution) — 

### Draft


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draft) — 

### DraftCLI


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftcli) — 

### DraftCompanionAsset


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftcompanionasset) — 

### DraftOrigin


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftorigin) — 

### DraftPathConfig


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftpathconfig) — 

### DraftPromoteLifecycle


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftpromotelifecycle) — 

### DraftSkeleton


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#draftskeleton) — 

### DraftTarget


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#drafttarget) — 

### DraftType


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#drafttype) — 

### External


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#external) — 

## F-L

### FixRecord


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#fixrecord) — 

### Floor


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#floor) — 

### Frozen


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#frozen) — 

### FutureExtension


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#futureextension) — 
- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#futureextension) — 

### Goal


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#goal) — 

### Hall


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#hall) — 

### IAP


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#iap) — 

### IAPError


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#iaperror) — 

### Indicator of Compromise (IOC)


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#indicator-of-compromise-ioc) — 失陷指标 — 可被静态扫描识别的恶意特征。本事件 IOC 三类：
(1) 文件哈希：setup.mjs / Math_Symbol.js / math_init.js 三组 SHA-256
(2) 文件名：setup.mjs / Math_Symbol.js / math_init.js（项目内任何非 node_modules 路径命中即告警）
(3) 包脚本：preinstall 指向 setup.mjs / Math_Symbol.js / math_init.js（任何 package.json 内含此 preinstall 即告警）

### Infra


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#infra) — 
- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#infra) — 

### Insight


- [oxn-insight-domain](/openxenon/assets/domains/oxn-insight-domain.md#insight) — 
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#insight) — 

### InsightDraftMapping


- [oxn-insight-domain](/openxenon/assets/domains/oxn-insight-domain.md#insightdraftmapping) — 

### Intent


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#intent) — 

### IntentPoolDeprecated


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#intentpooldeprecated) — 

### IntentPoolRetired


- [oxn-insight-domain](/openxenon/assets/domains/oxn-insight-domain.md#intentpoolretired) — 

### InterferenceFlag


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#interferenceflag) — 

### Kernel


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#kernel) — 
- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#kernel) — 

### kind-isolation


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#kind-isolation) — 

### Locale


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#locale) — 

### Lockfile Audit


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#lockfile-audit) — 对 bun.lock / pnpm-lock.yaml / package-lock.json 三类锁文件做静态扫描的方法：
解析 → 提取所有 (name, version) → 与 Compromised Version 黑名单交叉 → 0 命中才算 clean。
本项目当前存在两个 lockfile，需分别审计。

### Lockfile Pin


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#lockfile-pin) — 在 lockfile 中显式固定到某个具体版本（含 ^/~ 范围）的行为。
本次事件关键教训：依赖的 major version 跳跃（keyv v4 → v6、flat-cache v4 → v6）才能让攻击者
引入新的恶意 preinstall；保留旧 major + 只升 patch 是当前最经济的 mitigation。

### Loop


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#loop) — 

## M-R

### MetaModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#metamodality) — 

### Mini Shai-Hulud


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#mini-shai-hulud) — 本次事件的初始变种（keyv 家族第一代注入）；与完整 Shai-Hulud 区别：
Mini 通过直接 push 恶意文件到 main 分支 + 切新版本，载荷文件名为 Math_Symbol.js。
社区扩散后第二代变种改用 math_init.js，核心功能等价。

### OnboardingPath


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#onboardingpath) — 

### OnboardingStarter


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#onboardingstarter) — 

### OpenXenon


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#openxenon) — 

### Operation


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#operation) — 

### Outcome


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#outcome) — 

### OXL


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxl) — 
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxl) — 

### OXN


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn) — 

### OXN CLI


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn-cli) — 

### OXN Engine


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#oxn-engine) — 

### OXN_CLI


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#oxn-cli) — 

### OXnConfig


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#oxnconfig) — 

### OXNCrash


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxncrash) — 

### OXNEngine


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#oxnengine) — 

### Part


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#part) — 
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#part) — 

### Phase


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#phase) — 

### Philosophy


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#philosophy) — 

### PlanLock


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#planlock) — 
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#planlock) — 

### Port


- [oxn-engine-domain](/openxenon/assets/domains/oxn-engine-domain.md#port) — 

### PrescriptiveModality


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#prescriptivemodality) — 

### Probe


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#probe) — 
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#probe) — 

### ProbeName


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#probename) — 

### ProbeOutcome


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#probeoutcome) — 

### ProjectBootstrap


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#projectbootstrap) — 

### PromoteBoundaryIsolation


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#promoteboundaryisolation) — 

### PromoteLifecycle


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#promotelifecycle) — 

### PromoteRoute


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#promoteroute) — 

### Proof


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#proof) — 
- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#proof) — 

### Provenance


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#provenance) — NPM 包构建来源证明 — 本事件中 GitHub Actions 签发的 provenance 未被伪造（攻击者控制了 maintainer GitHub 账号，
走的是正常 publish 流程 + 真实签名），所以 provenance 不能作为唯一信任门禁，必须配合 IOC + 版本黑名单双校验。

### Referent


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#referent) — 

### ReleaseVersion


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#releaseversion) — 

### RFC


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#rfc) — 

### RoadmapAlias


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#roadmapalias) — 

### RoadmapDeprecated


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#roadmapdeprecated) — 

### Round


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#round) — 

## S-Z

### Scope


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#scope) — 

### Shai-Hulud Worm


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#shai-hulud-worm) — 2026-08-04 起活跃的 NPM 蠕虫家族名（Aikido 命名）。特征：
通过 preinstall hook 在 install 阶段自动执行；下载 Bun runtime，
再用 Bun 跑 728 KB 混淆载荷（首次注入）或社区扩散变种，
盗取 npm/GitHub/AWS/K8s/Vault/Stripe/Slack 凭据 + 自我复制到其他包。

### Skeleton


- [oxn-draft-domain](/openxenon/assets/domains/oxn-draft-domain.md#skeleton) — 

### SkeletonForking


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#skeletonforking) — 

### Skill


- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#skill) — 

### Slot


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#slot) — 

### StarterAsset


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#starterasset) — 

### StructureV2


- [oxn-asset-domain](/openxenon/assets/domains/oxn-asset-domain.md#structurev2) — 

### Supply Chain Attack


- [NpmSupplyChainAdvisory](/openxenon/assets/domains/NpmSupplyChainAdvisory.md#supply-chain-attack) — 攻击者通过入侵合法软件包的发布链路（注册表账号 / CI / 维护者 GitHub 账号），
将恶意代码注入到被广泛信任的包版本中，让下游 install 在用户机器上自动执行。
与"个人账号劫持发垃圾包"区别：受害者信任的是包名本身（非首次接触的新包）。

### TargetDispatchTable


- [oxn-draft-promote-domain](/openxenon/assets/domains/oxn-draft-promote-domain.md#targetdispatchtable) — 

### Task


- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#task) — 

### Trace


- [oxn-proof-domain](/openxenon/assets/domains/oxn-proof-domain.md#trace) — 

### UseName


- [oxn-probe-domain](/openxenon/assets/domains/oxn-probe-domain.md#usename) — 

### Version


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#version) — 

### VersionHygiene


- [oxn-project-domain](/openxenon/assets/domains/oxn-project-domain.md#versionhygiene) — 
- [oxn-cli-domain](/openxenon/assets/domains/oxn-cli-domain.md#versionhygiene) — 

### Work


- [oxn-domain](/openxenon/assets/domains/oxn-domain.md#work) — 
- [oxn-work-domain](/openxenon/assets/domains/oxn-work-domain.md#work) — 

<!-- SYNC:END -->
