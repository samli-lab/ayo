import { TranslationProvider, TranslationResult } from '../types.js'

export abstract class BaseTranslationProvider implements TranslationProvider {
  name: string
  weight: number = 1
  successCount: number = 0
  totalCount: number = 0

  constructor(name: string) {
    this.name = name
  }

  abstract translate(text: string, from: string, to: string): Promise<TranslationResult>

  protected updateStats(success: boolean) {
    this.totalCount++
    if (success) {
      this.successCount++
    }
    this.updateWeight()
  }

  private updateWeight() {
    if (this.totalCount > 0) {
      const successRate = this.successCount / this.totalCount
      this.weight = successRate
    }
  }

  getSuccessRate(): number {
    return this.totalCount > 0 ? this.successCount / this.totalCount : 0
  }
}
