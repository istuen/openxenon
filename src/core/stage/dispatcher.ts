import type { Stage } from '../../types/stage';
import type { Blueprint } from '../../types/blueprint';

export class StageDispatcher {
  private currentIndex: number = 0;
  private stages: Stage[] = [];

  dispatch(blueprint: Blueprint): void {
    this.stages = blueprint.stages || [];
    this.currentIndex = 0;
  }

  nextStage(): Stage | undefined {
    if (!this.hasNext()) {
      return undefined;
    }
    return this.stages[this.currentIndex++];
  }

  hasNext(): boolean {
    return this.currentIndex < this.stages.length;
  }

  reset(): void {
    this.currentIndex = 0;
  }
}