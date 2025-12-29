export interface TranslationResult {
  text: string
  provider: string
  success: boolean
  error?: string
}

export interface TranslationProvider {
  name: string
  weight: number
  successCount: number
  totalCount: number
  translate(text: string, from: string, to: string): Promise<TranslationResult>
  getSuccessRate(): number
}

export interface TranslationOptions {
  from?: string
  to?: string
  retryCount?: number
  preferredProvider?: string
}

export interface TranslationStats {
  provider: string
  weight: number
  successRate: number
  totalRequests: number
  successfulRequests: number
}
