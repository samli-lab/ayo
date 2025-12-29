import { AIModelConfig } from './types.js'

export const defaultConfig: Partial<AIModelConfig> = {
  temperature: 0.7,
  maxTokens: 1000,
}

export const modelConfigs: { [key: string]: Partial<AIModelConfig> } = {
  'gpt-4': {
    provider: 'openai',
    model: 'gpt-4',
  },
  'gpt-3.5-turbo': {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
  },
  'gemini-pro': {
    provider: 'gemini',
    model: 'gemini-pro',
  },
  'vertex-gemini-pro': {
    provider: 'vertex',
    model: 'gemini-1.5-pro',
  },
}

export function createModelConfig(
  modelKey: string,
  apiKey: string,
  overrides: Partial<AIModelConfig> = {}
): AIModelConfig {
  const modelConfig = modelConfigs[modelKey]
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${modelKey}`)
  }

  return {
    ...defaultConfig,
    ...modelConfig,
    apiKey,
    ...overrides,
  } as AIModelConfig
}
