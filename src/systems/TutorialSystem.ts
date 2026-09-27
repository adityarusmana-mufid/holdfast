import { Direction, Position } from '../types/index'

export type TutorialAction = 'deploy' | 'retreat' | 'activate_generator'

export interface TutorialPlacement extends Position {
  facing: Direction
}

export interface TutorialStep {
  action: TutorialAction
  text: string
  unitId?: string
  positions?: readonly Position[]
  facing?: Direction
}

export class TutorialSystem {
  private index = 0

  constructor(private readonly steps: readonly TutorialStep[]) {}

  get current(): TutorialStep | undefined {
    return this.steps[this.index]
  }

  record(action: TutorialAction, unitId?: string, placement?: TutorialPlacement): boolean {
    const step = this.current
    if (!step || step.action !== action) return false
    if (step.unitId && step.unitId !== unitId) return false
    if (step.facing && step.facing !== placement?.facing) return false
    if (step.positions && !step.positions.some(({ row, col }) => row === placement?.row && col === placement?.col)) return false
    this.index++
    return true
  }

  get complete(): boolean {
    return this.index >= this.steps.length
  }
}
