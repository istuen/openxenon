import type { Stage as LegacyStage } from '../../types/stage'
import type { Blueprint as ArsenalBlueprint } from '../../types/arsenal/blueprint'

export class StageDispatcher {
  private currentIndex: number = 0
  private stages: LegacyStage[] = []

  dispatchArsenal(blueprint: ArsenalBlueprint): void {
    this.stages = blueprint.stages.map(s => ({
      id: s.id,
      name: s.name,
      deps: s.deps,
      status: 'PENDING'
    })) as LegacyStage[]
    this.currentIndex = 0
  }

  nextStage(): LegacyStage | undefined {
    if (!this.hasNext()) {
      return undefined
    }
    return this.stages[this.currentIndex++]
  }

  hasNext(): boolean {
    return this.currentIndex < this.stages.length
  }

  reset(): void {
    this.currentIndex = 0
  }
}