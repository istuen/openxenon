import type { Stage } from '../../types/stage';
import type { Blueprint } from '../../types/blueprint';
import type { Action } from '../../types/action';
import { getDefaultStageById, isDefaultStageId } from './default-stages';
import type { DefaultStage } from './default-stages';

export class StageExecutor {
  private blueprints: Map<string, Blueprint> = new Map();

  loadStage(stageId: string, blueprint: Blueprint, userInput?: Record<string, unknown>): Stage | undefined {
    if (isDefaultStageId(stageId)) {
      const defaultStage = getDefaultStageById(stageId);
      if (defaultStage) {
        return this.createStageFromDefault(defaultStage, userInput);
      }
      return undefined;
    }

    const stages = blueprint.stages || [];
    const stage = stages.find(s => s.id === stageId);
    if (stage && blueprint.id) {
      this.blueprints.set(blueprint.id, blueprint);
    }
    return stage;
  }

  private createStageFromDefault(defaultStage: DefaultStage, userInput?: Record<string, unknown>): Stage {
    const input = { ...defaultStage.exampleInput, ...userInput };
    const inputStr = JSON.stringify(input);
    return {
      id: defaultStage.id,
      name: defaultStage.name,
      spec: { constraints: [], description: defaultStage.description },
      proof: defaultStage.proof,
      status: 'PENDING',
      targetState: inputStr
    };
  }

  async execute(stage: Stage): Promise<Stage> {
    stage.status = 'RUNNING';

    try {
      const proofPassed = await this.validateProof(stage);
      stage.status = proofPassed ? 'PASSED' : 'FAILED';
    } catch (error) {
      stage.status = 'FAILED';
      console.error(`Stage ${stage.id} failed:`, error);
    }

    return stage;
  }

  applyAction(action: Action, prompt: string): string {
    const actionInstructions = action.instructions.join('\n');
    return `${prompt}\n\n${actionInstructions}`;
  }

  private async validateProof(_stage: Stage): Promise<boolean> {
    return true;
  }
}