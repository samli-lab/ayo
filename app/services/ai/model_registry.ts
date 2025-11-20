import env from '#start/env'
import { AIModelConfig } from './types.js'

/**
 * 模型配置定义接口
 */
export interface ModelDefinition {
  /** 模型标识符（唯一键） */
  key: string
  /** 提供商名称 */
  provider: string
  /** 实际模型名称 */
  model: string
  /** API Key 环境变量名（可选，如果不提供则从 provider 默认获取） */
  apiKeyEnv?: string
  /** 项目 ID 环境变量名（Vertex AI 等需要） */
  projectIdEnv?: string
  /** 位置环境变量名（Vertex AI 等需要） */
  locationEnv?: string
  /** 默认配置覆盖 */
  defaults?: Partial<AIModelConfig>
}

/**
 * 模型注册表
 *
 * 支持：
 * 1. 静态配置（代码中定义）
 * 2. 环境变量驱动
 * 3. 动态注册
 */
export class ModelRegistry {
  private static models = new Map<string, ModelDefinition>()

  /**
   * 注册模型配置
   */
  static register(definition: ModelDefinition): void {
    this.models.set(definition.key, definition)
  }

  /**
   * 批量注册模型配置
   */
  static registerMany(definitions: ModelDefinition[]): void {
    for (const definition of definitions) {
      this.register(definition)
    }
  }

  /**
   * 获取模型配置
   */
  static get(key: string): ModelDefinition | undefined {
    return this.models.get(key)
  }

  /**
   * 获取所有已注册的模型键
   */
  static getAllKeys(): string[] {
    return Array.from(this.models.keys())
  }

  /**
   * 检查模型是否存在
   */
  static has(key: string): boolean {
    return this.models.has(key)
  }

  /**
   * 将模型定义转换为 AIModelConfig
   */
  static toAIModelConfig(definition: ModelDefinition): AIModelConfig {
    // 获取 API Key
    let apiKey = ''
    if (definition.apiKeyEnv) {
      apiKey = env.get(definition.apiKeyEnv, '')
    } else {
      // 如果没有指定 apiKeyEnv，尝试从 provider 默认获取
      apiKey = this.getDefaultApiKeyForProvider(definition.provider)
    }

    // 获取项目 ID 和位置
    const projectId = definition.projectIdEnv ? env.get(definition.projectIdEnv, '') : undefined
    const location = definition.locationEnv ? env.get(definition.locationEnv, '') : undefined

    return {
      provider: definition.provider,
      apiKey,
      model: definition.model,
      projectId,
      location,
      ...definition.defaults,
    }
  }

  /**
   * 根据 provider 获取默认的 API Key 环境变量名
   */
  private static getDefaultApiKeyForProvider(provider: string): string {
    const providerApiKeyMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      gemini: 'GEMINI_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      vertex: '', // Vertex AI 通常使用 ADC
    }
    const envKey = providerApiKeyMap[provider.toLowerCase()]
    return envKey ? env.get(envKey, '') : ''
  }

  /**
   * 验证模型配置是否完整
   */
  static validate(definition: ModelDefinition): { valid: boolean; error?: string } {
    if (!definition.key) {
      return { valid: false, error: 'Model key is required' }
    }
    if (!definition.provider) {
      return { valid: false, error: 'Provider is required' }
    }
    if (!definition.model) {
      return { valid: false, error: 'Model name is required' }
    }

    // Vertex AI 需要 projectId 和 location
    if (definition.provider === 'vertex') {
      const config = this.toAIModelConfig(definition)
      if (!config.projectId) {
        return {
          valid: false,
          error: `Vertex AI model "${definition.key}" requires projectId (set ${definition.projectIdEnv || 'GOOGLE_VERTEX_PROJECT_ID'})`,
        }
      }
      if (!config.location) {
        return {
          valid: false,
          error: `Vertex AI model "${definition.key}" requires location (set ${definition.locationEnv || 'GOOGLE_VERTEX_LOCATION'})`,
        }
      }
    } else {
      // 其他 provider 需要 API Key（除非是 vertex）
      const config = this.toAIModelConfig(definition)
      if (!config.apiKey && definition.provider !== 'vertex') {
        const envKey = definition.apiKeyEnv || this.getDefaultApiKeyForProvider(definition.provider)
        return {
          valid: false,
          error: `API key is required for model "${definition.key}" (set ${envKey || 'API_KEY'})`,
        }
      }
    }

    return { valid: true }
  }
}

/**
 * 从 JSON 文件加载模型配置
 *
 * 注意：此功能需要在运行时环境中支持文件系统访问
 * 可以通过环境变量 AI_MODELS_CONFIG_PATH 指定配置文件路径
 */
export async function loadModelsFromFile(filePath: string): Promise<void> {
  try {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { dirname, join } = await import('node:path')

    // 如果是相对路径，转换为绝对路径
    const absolutePath = filePath.startsWith('/')
      ? filePath
      : join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', filePath)

    const fileContent = readFileSync(absolutePath, 'utf-8')
    const config = JSON.parse(fileContent)

    if (config.models && Array.isArray(config.models)) {
      ModelRegistry.registerMany(config.models as ModelDefinition[])
    } else {
      console.warn(`Invalid models configuration file format: ${filePath}`)
    }
  } catch (error) {
    console.warn(`Failed to load models from file ${filePath}:`, error)
  }
}

/**
 * 初始化默认模型配置
 */
function initializeDefaultModels(): void {
  ModelRegistry.registerMany([
    {
      key: 'gpt-3.5-turbo',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      apiKeyEnv: 'OPENAI_API_KEY',
    },
    {
      key: 'gpt-4',
      provider: 'openai',
      model: 'gpt-4',
      apiKeyEnv: 'OPENAI_API_KEY',
    },
    {
      key: 'gemini-pro',
      provider: 'gemini',
      model: 'gemini-pro',
      apiKeyEnv: 'GEMINI_API_KEY',
    },
    {
      key: 'vertex-gemini-pro',
      provider: 'vertex',
      model: 'gemini-1.5-pro',
      projectIdEnv: 'GOOGLE_VERTEX_PROJECT_ID',
      locationEnv: 'GOOGLE_VERTEX_LOCATION',
    },
    {
      key: 'anthropic/claude-2',
      provider: 'openrouter',
      model: 'anthropic/claude-2',
      apiKeyEnv: 'OPENROUTER_API_KEY',
    },
    {
      key: 'gemma',
      provider: 'openrouter',
      model: 'google/gemma-3-12b-it',
      apiKeyEnv: 'OPENROUTER_API_KEY',
    },
    {
      key: 'deepseek',
      provider: 'deepseek',
      model: 'deepseek-coder-33b-instruct',
      apiKeyEnv: 'DEEPSEEK_API_KEY',
    },
  ])
}

// 初始化默认模型
initializeDefaultModels()
