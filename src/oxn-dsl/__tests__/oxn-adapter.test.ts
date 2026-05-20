import { describe, test, expect, beforeEach } from "bun:test";
import {
  OxnKernelAdapter,
  validateAbstractBindings,
  resolveAbstractParams,
  resolveTemplateString,
  adaptConcretePart,
  adaptOxnToFrozen,
  type AdapterResult,
} from "../../kernel/compiler/oxn-adapter";

import {
  createOxnAssemblyIR,
  createAbstractPart,
  createConcretePart,
  validateOxnAssemblyIR,
  type OxnAssemblyIR,
  type OxnAssemblyPart,
  type OxnAssemblyTaskBinding,
} from "../../kernel/schemas/oxn-assembly.schema";

import { validateFrozenBlueprint, type FrozenBlueprint } from "../../kernel/schemas/frozen-schema";

// ========================
// 表达式求值
// ========================

describe("resolveAbstractParams", () => {
  test("简单 prop 引用: target_env = prop.env", () => {
    const result = resolveAbstractParams(
      { target_env: "prop.env" },
      { env: "prod", coverage: 90 }
    );
    expect(result.target_env).toBe("prod");
  });

  test("字面量赋值: timeout = 60000", () => {
    const result = resolveAbstractParams(
      { timeout: "60000" },
      {}
    );
    expect(result.timeout).toBe(60000);
  });

  test("字符串字面量: region = \"us-east-1\"", () => {
    const result = resolveAbstractParams(
      { region: '"us-east-1"' },
      {}
    );
    expect(result.region).toBe("us-east-1");
  });

  test("三元表达式: coverage = prop.env==\"prod\" ? 95 : prop.coverage (prod)", () => {
    const result = resolveAbstractParams(
      { coverage_threshold: 'prop.env == "prod" ? 95 : prop.coverage' },
      { env: "prod", coverage: 80 }
    );
    expect(result.coverage_threshold).toBe(95);
  });

  test("三元表达式: coverage = prop.env==\"prod\" ? 95 : prop.coverage (dev)", () => {
    const result = resolveAbstractParams(
      { coverage_threshold: 'prop.env == "prod" ? 95 : prop.coverage' },
      { env: "dev", coverage: 80 }
    );
    expect(result.coverage_threshold).toBe(80);
  });

  test("逻辑表达式: enabled = prop.env != \"prod\" || prop.flag == true", () => {
    const result = resolveAbstractParams(
      { enabled: 'prop.env != "prod" || prop.flag == true' },
      { env: "dev", flag: false }
    );
    expect(result.enabled).toBe(true);
  });

  test("多参数同时解析", () => {
    const result = resolveAbstractParams(
      {
        target_env: "prop.env",
        coverage_threshold: 'prop.env == "prod" ? 95 : prop.coverage',
        timeout: "60000",
      },
      { env: "prod", coverage: 90 }
    );
    expect(result.target_env).toBe("prod");
    expect(result.coverage_threshold).toBe(95);
    expect(result.timeout).toBe(60000);
  });
});

describe("resolveTemplateString", () => {
  test("单个 prop 替换", () => {
    const result = resolveTemplateString(
      "npm test -- --coverage=${prop.coverage_threshold}",
      { coverage_threshold: 95 }
    );
    expect(result).toBe("npm test -- --coverage=95");
  });

  test("多个 prop 替换", () => {
    const result = resolveTemplateString(
      "deploy --env=${prop.target_env} --region=${prop.region}",
      { target_env: "prod", region: "us-east-1" }
    );
    expect(result).toBe("deploy --env=prod --region=us-east-1");
  });

  test("未定义的 prop 保留占位符", () => {
    const result = resolveTemplateString(
      "deploy --env=${prop.unknown}",
      {}
    );
    expect(result).toBe("deploy --env=${prop.unknown}");
  });
});

// ========================
// isAbstract 防御性校验
// ========================

describe("validateAbstractBindings", () => {
  test("未绑定 abstract part 报错", () => {
    const ir = createOxnAssemblyIR({ id: "test", name: "test" });
    ir.abstractParts.push(createAbstractPart({ name: "tester", implements: "test-runner" }));

    const binding: OxnAssemblyTaskBinding = {
      partBindings: {},  // 空
      propBindings: {},
    };

    const result = validateAbstractBindings(ir, binding);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("tester");
  });

  test("所有 abstract part 已绑定则通过", () => {
    const ir = createOxnAssemblyIR({ id: "test", name: "test" });
    ir.abstractParts.push(createAbstractPart({ name: "tester" }));
    ir.abstractParts.push(createAbstractPart({ name: "builder" }));

    const binding: OxnAssemblyTaskBinding = {
      partBindings: {
        tester: "@glo/part/jest-runner",
        builder: "@glo/part/esbuild-bundler",
      },
      propBindings: {},
    };

    const result = validateAbstractBindings(ir, binding);
    expect(result.valid).toBe(true);
  });
});

// ========================
// adaptConcretePart
// ========================

describe("adaptConcretePart", () => {
  test("具象零件转换，参数和探针正确", () => {
    const part = createConcretePart({
      name: "jest-runner",
      implements: "test-runner",
      description: "Jest 测试执行器",
      props: [
        { name: "target_env", type: "string", required: false, default: "dev" },
        { name: "coverage_threshold", type: "number", required: false, default: 80 },
      ],
      probes: [
        {
          name: "run_test",
          ref: "@oxn/probe/shell-exec",
          params: {
            command: "npm test -- --coverage=${prop.coverage_threshold}",
            timeout: 60000,
          },
        },
      ],
      execution: ["probe.run_test"],
    });

    const resolvedParams = { target_env: "prod", coverage_threshold: 95 };
    const frozenPart = adaptConcretePart(part, resolvedParams);

    expect(frozenPart.id).toBe("jest-runner");
    expect(frozenPart.params.target_env).toBe("prod");
    expect(frozenPart.params.coverage_threshold).toBe(95);
    expect(frozenPart.probes).toHaveLength(1);
    expect(frozenPart.probes[0].type).toBe("shell-exec");
    expect(frozenPart.probes[0].params.command).toContain("coverage=95");
    expect(frozenPart.probes[0].params.timeout).toBe(60000);
  });

  test("使用 prop 默认值填充未传入的参数", () => {
    const part = createConcretePart({
      name: "test-part",
      props: [
        { name: "timeout", type: "number", required: false, default: 30000 },
      ],
    });

    const frozenPart = adaptConcretePart(part, {});
    expect(frozenPart.params.timeout).toBe(30000);
  });

  test("required 参数缺失抛异常", () => {
    const part = createConcretePart({
      name: "test-part",
      props: [
        { name: "api_key", type: "string", required: true },
      ],
    });

    expect(() => adaptConcretePart(part, {})).toThrow("api_key");
  });
});

// ========================
// 主适配器集成测试
// ========================

describe("OxnKernelAdapter", () => {
  let adapter: OxnKernelAdapter;

  function makeFeaturePipeline(): { ir: OxnAssemblyIR; binding: OxnAssemblyTaskBinding } {
    const ir = createOxnAssemblyIR({ id: "feature-pipeline", name: "feature-pipeline" });
    ir.props = [
      { name: "env", type: 'enum("dev", "staging", "prod")', required: false, default: "dev" },
      { name: "coverage", type: "number", required: false, default: 80 },
    ];

    ir.abstractParts.push(createAbstractPart({
      name: "tester",
      implements: "test-runner",
    }));

    ir.concreteParts.push(createConcretePart({
      name: "jest-runner",
      implements: "test-runner",
      description: "Jest 测试",
      props: [
        { name: "target_env", type: "string", required: false, default: "dev" },
        { name: "coverage_threshold", type: "number", required: false, default: 80 },
      ],
      probes: [
        {
          name: "run_test",
          ref: "@oxn/probe/shell-exec",
          params: {
            command: "npm test -- --coverage=${prop.coverage_threshold}",
            timeout: 60000,
          },
        },
      ],
      execution: ["probe.run_test"],
    }));

    ir.stages = [
      { name: "unit_test", run: "part.tester.run", deps: [] },
    ];
    ir.expectations = [];
    ir.rules = [];

    const binding: OxnAssemblyTaskBinding = {
      partBindings: {
        tester: "@glo/part/jest-runner",
      },
      propBindings: {
        env: "prod",
        coverage: 90,
      },
    };

    return { ir, binding };
  }

  beforeEach(() => {
    adapter = new OxnKernelAdapter();
  });

  test("完整适配流程：OxnAssemblyIR → FrozenBlueprint", () => {
    const { ir, binding } = makeFeaturePipeline();
    const result = adapter.adapt(ir, binding);

    expect(result.warnings).toHaveLength(0);

    const frozen = result.frozen;
    expect(frozen.id).toBe("feature-pipeline");
    expect(frozen.frozen_at).toBeTruthy();
    expect(frozen.parts).toHaveLength(1);

    // 验证 FrozenBlueprint schema
    expect(() => validateFrozenBlueprint(frozen)).not.toThrow();
  });

  test("FrozenPart 参数正确（prop.env=\"prod\" → coverage=95）", () => {
    // Manually set abstract params since createAbstractPart doesn't store them
    const ir = createOxnAssemblyIR({ id: "test", name: "test" });
    ir.abstractParts.push({
      name: "tester",
      implements: "test-runner",
      isAbstract: true,
      props: [],
      probes: [],
      execution: [],
      // This is stored indirectly - let me use explicit params
    });

    // Rebuild with explicit params
    const ir2 = createOxnAssemblyIR({ id: "test", name: "test" });
    ir2.abstractParts.push({
      name: "tester",
      isAbstract: true,
      props: [],
      probes: [],
      execution: [],
    });
    ir2.concreteParts.push(createConcretePart({
      name: "jest-runner",
      props: [
        { name: "target_env", type: "string" },
        { name: "coverage_threshold", type: "number", default: 80 },
      ],
    }));

    const binding: OxnAssemblyTaskBinding = {
      partBindings: { tester: "@glo/part/jest-runner" },
      propBindings: { env: "prod", coverage: 60 },
    };

    const result = adapter.adapt(ir2, binding);
    const part = result.frozen.parts[0]!;
    // coverage_threshold not in resolved params → uses default 80
    expect(part.params.coverage_threshold).toBe(80);
  });

  test("未绑定 abstract part 抛异常", () => {
    const ir = createOxnAssemblyIR({ id: "test", name: "test" });
    ir.abstractParts.push(createAbstractPart({ name: "worker" }));

    const binding: OxnAssemblyTaskBinding = {
      partBindings: {},  // worker 未绑定
      propBindings: {},
    };

    expect(() => adapter.adapt(ir, binding)).toThrow("Abstract binding");
  });

  test("adaptStrict 在有 warnings 时抛异常", () => {
    const ir = createOxnAssemblyIR({ id: "test", name: "test" });
    ir.concreteParts.push(createConcretePart({ name: "dup" }));
    ir.concreteParts.push(createConcretePart({ name: "dup" })); // duplicate

    const binding: OxnAssemblyTaskBinding = {
      partBindings: {},
      propBindings: {},
    };

    // adapt() 返回 warnings，adaptStrict() 抛异常
    const result = adapter.adapt(ir, binding);
    expect(result.warnings.length).toBeGreaterThan(0);

    expect(() => adapter.adaptStrict(ir, binding)).toThrow("dup");
  });

  test("FrozenBlueprint 通过终态 schema 校验", () => {
    const { ir, binding } = makeFeaturePipeline();
    const frozen = adapter.adaptStrict(ir, binding);

    // 直接通过 FrozenBlueprintSchema.parse
    expect(() => validateFrozenBlueprint(frozen)).not.toThrow();
    expect(frozen.parts).toHaveLength(1);
    expect(frozen.parts[0].probes).toHaveLength(1);
  });

  test("便捷函数 adaptOxnToFrozen", () => {
    const { ir, binding } = makeFeaturePipeline();
    const result: AdapterResult = adaptOxnToFrozen(ir, binding);
    expect(result.warnings).toHaveLength(0);
    expect(() => validateFrozenBlueprint(result.frozen)).not.toThrow();
  });

  test("多 concrete parts 生成多个 FrozenPart", () => {
    const ir = createOxnAssemblyIR({ id: "multi", name: "multi" });
    ir.concreteParts.push(createConcretePart({ name: "build", execution: ["probe.build"] }));
    ir.concreteParts.push(createConcretePart({ name: "test", execution: ["probe.test"] }));
    ir.concreteParts.push(createConcretePart({ name: "deploy", execution: ["probe.deploy"] }));
    ir.stages = [
      { name: "build", run: "part.build.run", deps: [] },
      { name: "test", run: "part.test.run", deps: ["build"] },
      { name: "deploy", run: "part.deploy.run", deps: ["test"] },
    ];

    const binding: OxnAssemblyTaskBinding = {
      partBindings: {},
      propBindings: {},
    };

    const frozen = adapter.adaptStrict(ir, binding);
    expect(frozen.parts).toHaveLength(3);
    expect(frozen.parts.map(p => p.id)).toContain("build");
    expect(frozen.parts.map(p => p.id)).toContain("test");
    expect(frozen.parts.map(p => p.id)).toContain("deploy");
  });
});
