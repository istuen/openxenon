import { describe, test, expect, beforeAll } from "bun:test"
import { URI, Cancellation, DocumentState } from "langium"
import type { OXNDocument } from "../generated/ast"
import { createOxnServices } from "../langium/oxn-services"
import { categorizeEntities, generateOxnAssembly } from "../generator/oxn-generator"
import { OxnKernelAdapter } from "../../kernel/compiler/oxn-adapter"
import type { OxnAssemblyIR, OxnAssemblyPart, OxnAssemblyTaskBinding } from "../../kernel/schemas/oxn-assembly.schema"
import { adaptFrozenToBlueprint } from "../../kernel/compiler/frozen-to-blueprint-adapter"
import { getProbeHandler } from "../../infra/probes"
import { evaluateProbe } from "../../kernel/probes/evaluator"

const MINIMAL_OXN = `
part "my-runner" {
  description = "Test runner"
  prop "target_cmd" { type = string; default = "echo hello" }
  probe run_echo {
    ref = "@oxn/probe/shell-exec"
    params = {
      command = "\${prop.target_cmd}"
    }
  }
}

abstract part "runner" {
  params = {
    target_cmd = prop.cmd
  }
}

blueprint "e2e-flow" {
  version = 1
  prop "cmd" { type = string; default = "echo hello" }

  abstract part "runner" {
    params = {
      target_cmd = prop.cmd
    }
  }

  stage "execute" {
    run = part.runner.run
    deps = []
  }
}

task "verify-e2e" {
  use = "@prj/blueprint/e2e-flow"
  binding {
    runner = "@glo/part/my-runner"
    props.cmd = "echo hello_from_e2e"
  }
}
`

describe("E2E Param Flow — 端到端参数穿透验证", () => {
  let blueprintIR: OxnAssemblyIR
  let concretePart: OxnAssemblyPart
  let taskBinding: OxnAssemblyTaskBinding

  beforeAll(async () => {
    const services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)

    const langiumDocs = shared.workspace.LangiumDocuments
    const docBuilder = shared.workspace.DocumentBuilder
    const token = Cancellation.CancellationToken.None

    const uri = URI.file("/virtual/test-flow.oxn")
    const factory = shared.workspace.LangiumDocumentFactory
    const doc = await factory.fromString(MINIMAL_OXN, uri, token)

    await docBuilder.build([doc], { validation: false }, token)
    expect(doc.state).toBeGreaterThanOrEqual(DocumentState.Parsed)

    const oxnDoc = doc.parseResult.value as OXNDocument
    const categories = categorizeEntities(oxnDoc)

    blueprintIR = categories.blueprints[0]!
    expect(blueprintIR).toBeDefined()
    expect(blueprintIR.name).toBe("e2e-flow")

    concretePart = categories.parts.find(p => p.name === "my-runner")!
    expect(concretePart).toBeDefined()
    expect(concretePart.probes).toHaveLength(1)

    const taskIR = categories.tasks[0]!
    expect(taskIR).toBeDefined()
    expect(taskIR.name).toBe("verify-e2e")
    taskBinding = taskIR.binding

    blueprintIR.concreteParts = [concretePart]
  })

  test("1. Langium 解析 → OXN AST 成功", () => {
    expect(blueprintIR.props).toHaveLength(1)
    expect(blueprintIR.props[0]!.name).toBe("cmd")
    expect(blueprintIR.abstractParts).toHaveLength(1)
    expect(blueprintIR.abstractParts[0]!.name).toBe("runner")
    expect(blueprintIR.concreteParts).toHaveLength(1)
    expect(blueprintIR.concreteParts[0]!.name).toBe("my-runner")
    expect(blueprintIR.stages).toHaveLength(1)
    expect(blueprintIR.stages[0]!.name).toBe("execute")
  })

  test("2. Task binding 属性注入正确", () => {
    expect(taskBinding.partBindings["runner"]).toBe("@glo/part/my-runner")
    expect(taskBinding.propBindings["cmd"]).toBe("echo hello_from_e2e")
  })

  test("3. OxnAssemblyIR → FrozenBlueprint 适配成功", () => {
    const adapter = new OxnKernelAdapter()
    const result = adapter.adapt(blueprintIR, taskBinding)
    expect(result.warnings).toHaveLength(0)

    const frozen = result.frozen
    expect(frozen.id).toBe("e2e-flow")
    expect(frozen.parts).toHaveLength(1)

    const part = frozen.parts[0]!
    expect(part.id).toBe("my-runner")
    expect(part.probes).toHaveLength(1)
    expect(part.probes[0]!.type).toBe("shell_exec")
  })

  test("4. 参数穿透: Task prop → template → probe", () => {
    const adapter = new OxnKernelAdapter()
    const result = adapter.adapt(blueprintIR, taskBinding)
    const frozen = result.frozen

    const probe = frozen.parts[0]!.probes[0]!
    const command = probe.params?.command as string
    expect(command).toBe("echo hello_from_e2e")
  })

  test("5. FrozenBlueprint → Blueprint 适配成功", () => {
    const adapter = new OxnKernelAdapter()
    const result = adapter.adapt(blueprintIR, taskBinding)
    const frozen = result.frozen

    const blueprint = adaptFrozenToBlueprint(frozen)
    expect(blueprint.id).toBe("e2e-flow")
    expect(blueprint.parts).toHaveLength(1)

    const part = blueprint.parts![0]!
    expect(part.id).toBe("my-runner")
    expect(part.probes).toHaveLength(1)
    // Verify the probe params are flattened to top level
    expect((part.probes![0] as any).command).toBe("echo hello_from_e2e")
  })

  test("6. 真实 Probe 执行: shell_exec 运行 echo 并拿到 PASSED 结果", async () => {
    const adapter = new OxnKernelAdapter()
    const result = adapter.adapt(blueprintIR, taskBinding)
    const frozen = result.frozen

    const frozenProbe = frozen.parts[0]!.probes[0]!
    const probeType = frozenProbe.type
    const probeParams = frozenProbe.params || {}

    // 验证 handler 已注册
    const handler = getProbeHandler(probeType)
    expect(handler).not.toBeNull()

    // 执行真实 shell_exec
    const observation = await handler!(
      { command: probeParams.command, pattern: probeParams.pattern, cwd: probeParams.cwd },
      { projectRoot: process.cwd() }
    ) as any

    expect(observation.probeType).toBe("shell_exec")
    expect(observation.exitCode).toBe(0)

    // 判定期: evaluateProbe 判定 PASSED/FAILED
    const verdict = evaluateProbe(
      { type: probeType, params: probeParams as Record<string, unknown> },
      observation
    )

    expect(verdict.passed).toBe(true)
    expect(verdict.message).toBe("Command succeeded")
    expect(observation.output).toContain("hello_from_e2e")
  })
})
