export type TutorialAction = 'deploy' | 'retreat' | 'activate_generator'

export interface TutorialStep {
  action: TutorialAction
  text: string
  unitId?: string
}

export class TutorialSystem {
  private index = 0

  constructor(private readonly steps: readonly TutorialStep[]) {}

  get current(): TutorialStep | undefined {
    return this.steps[this.index]
  }

  record(action: TutorialAction, unitId?: string): boolean {
    const step = this.current
    if (!step || step.action !== action) return false
    if (step.unitId && step.unitId !== unitId) return false
    this.index++
    return true
  }

  get complete(): boolean {
    return this.index >= this.steps.length
  }
}
