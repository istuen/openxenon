# v0.4 端到端测试项目 (oxn-v040-test)

> v0.4 收官时创建的 0-到-1 测试项目, 验证 IAP 三轴全链路:
> Domain (业务 Intent) + Blueprint (技术 Intent) + Work (Align) + Proof (证据)

## 流程

```bash
# 1. 全新目录
mkdir -p /tmp/oxn-v040-test && cd /tmp/oxn-v040-test
git init -q && git config user.email "test@oxn.dev" && git config user.name "test"

# 2. oxn init
oxn init -f

# 3. 创建 2 个 Domain (含 ## Stack, PR-A)
oxn domain create MemberContext
# 编辑 .openxenon/domains/MemberContext.oxn (term/ban/invariant)
oxn domain validate MemberContext

oxn domain create OrderContext
# 编辑 .openxenon/domains/OrderContext.oxn
oxn domain validate OrderContext

# 4. 创建 Blueprint (复制项目仓库 dev-workflow)
cp /Users/issac/pro/openxenon/.openxenon/blueprints/dev-workflow.oxn \
   .openxenon/blueprints/dev-workflow.oxn
oxn blueprint validate dev-workflow

# 5. 创建 Work + 添加 Tasks (8 阶段 v1.1)
oxn work create register-member-flow --blueprint dev-workflow
# 编辑 .openxenon/works/register-member-flow/work.oxn
oxn work add-task register-member-flow --task build --blueprint dev-workflow --domain MemberContext
oxn work add-task register-member-flow --task develop --blueprint dev-workflow --domain MemberContext
oxn work add-task register-member-flow --task test --blueprint dev-workflow --domain MemberContext
oxn work add-task register-member-flow --task verify --blueprint dev-workflow --domain MemberContext

# 6. Validate → Lock
oxn work validate register-member-flow
oxn work lock register-member-flow  # 写 .work + 4-hash planLock

# 7. 创建 Proof (含 `// proofs-target-work:` 注释, PR-B Q4-A)
oxn proof create register-member-validity
# 编辑 proof.oxn, 加 probes + proofs-target-work

# 8. Run proof (自动 snapshot proof.md + work-hash.txt)
oxn proof run register-member-validity
# 预期: PASSED + 写出 proof.md (0o444) + work-hash.txt + frozen.json

# 9. Verify (PR-B Q4-A hash drift detection)
oxn proof verify register-member-validity
# 预期: status=match (work.oxn 未改)
# 修改 work.oxn 后再 verify → status=drift, E_PROOF_WORKHASH_DRIFT
# 再 run proof → 自动重新 snapshot, verify 恢复 match

# 10. Show verdict (最终判决书, 人类可读)
oxn proof show register-member-validity
# 预期: ✅ PASSED (3/3 probes)
```

## 验证清单

| PR | 验证内容 | 状态 |
|---|---|---|
| PR-A | Domain ## Stack H2 extract (3 stack entries) | ✅ |
| PR-B Q4-A | proof.md (0o444) + work-hash.txt 自动生成 | ✅ |
| PR-B Q4-A | hash drift 检测 (match → drift → match) | ✅ |
| PR-B Q5 | work.md canonical (## Context + ## Tasks H2) | ✅ |
| PR-C1 | md-pipeline utils (parseMarkdown, collectListFields) | ✅ |
| PR-C2 | 5 unified transformers (extractDomainIR 等) | ✅ |
| PR-C3 | remark-canonical (12 E_MD_*) | ✅ |
| PR-C4 | driver-registry/extract-* 删除 + driver.ts 新建 | ✅ |
| 兼容 | v0.3 8 阶段流程 (create/validate/lock/run) | ✅ |
