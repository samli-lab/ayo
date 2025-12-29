import { GoogleGenAI } from '@google/genai'
import {
  AIModelConfig,
  AIModelService,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types.js'

/**
 * Vertex AI Service Implementation
 *
 * 使用 @google/genai 统一 SDK 支持 Google Vertex AI (Gemini) 模型
 *
 * @google/genai 是 Google 推荐的统一生成式 AI SDK，提供：
 * - 更好的类型支持
 * - 统一的接口（同时支持 Gemini API 和 Vertex AI）
 * - 更简洁的 API
 *
 * 认证方式：
 * - Application Default Credentials (ADC) - 默认方式，适用于 GCP 环境
 * - Service Account Key File - 通过 apiKey 配置项传入 keyFile 路径
 *
 * 配置要求：
 * - projectId: GCP 项目 ID（必需）
 * - location: Vertex AI 服务区域（必需，如 'us-central1'）
 * - model: 模型名称（必需，如 'gemini-1.5-pro'）
 * - apiKey: 可选，如果提供则作为 keyFile 路径使用
 */
export class VertexService implements AIModelService {
  private client: GoogleGenAI
  private model: string
  private projectId: string
  private location: string

  constructor(config: AIModelConfig) {
    // 验证必需的配置项
    if (!config.projectId) {
      throw new Error(
        'Vertex AI requires projectId. Please set GOOGLE_VERTEX_PROJECT_ID environment variable.'
      )
    }
    if (!config.location) {
      throw new Error(
        'Vertex AI requires location. Please set GOOGLE_VERTEX_LOCATION environment variable.'
      )
    }
    if (!config.model) {
      throw new Error('Vertex AI requires model name.')
    }

    this.projectId = config.projectId
    this.location = config.location
    this.model = config.model

    // 初始化 Google GenAI 客户端，配置为使用 Vertex AI
    const clientConfig: ConstructorParameters<typeof GoogleGenAI>[0] = {
      vertexai: true,
      project: this.projectId,
      location: this.location,
    }

    // @google/genai 支持通过 apiKey 进行认证
    // 如果不提供 apiKey，将使用 Application Default Credentials (ADC)
    // ADC 可以通过 GOOGLE_APPLICATION_CREDENTIALS 环境变量指向服务账号 keyFile
    if (config.apiKey) {
      clientConfig.apiKey = config.apiKey
    }

    this.client = new GoogleGenAI(clientConfig)
  }

  /**
   * 生成聊天完成响应
   *
   * @param request 聊天完成请求
   * @returns 聊天完成响应
   */
  async generateCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      // 验证消息列表不为空
      if (!request.messages || request.messages.length === 0) {
        throw new Error('At least one message is required for chat completion')
      }

      // 分离 system message 和聊天消息
      const systemMessage = request.messages.find((msg) => msg.role === 'system')
      const chatMessages = request.messages.filter((msg) => msg.role !== 'system')

      // 如果没有聊天消息，抛出错误
      if (chatMessages.length === 0) {
        throw new Error('At least one user or assistant message is required')
      }

      // 构建生成配置
      const generationConfig: Record<string, any> = {}

      if (request.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = request.maxTokens
      }
      if (request.temperature !== undefined) {
        generationConfig.temperature = request.temperature
      }
      if (request.topP !== undefined) {
        generationConfig.topP = request.topP
      }
      if (request.topK !== undefined) {
        generationConfig.topK = request.topK
      }

      // Vertex AI 不支持 frequencyPenalty 和 presencePenalty
      // 这些参数会被忽略

      // 构建请求内容
      // @google/genai 使用 contents 数组，需要将消息转换为正确的格式
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

      // 添加历史消息（除了最后一条）
      for (const msg of chatMessages.slice(0, -1)) {
        const role = msg.role === 'assistant' ? 'model' : 'user'
        contents.push({
          role,
          parts: [{ text: msg.content }],
        })
      }

      // 添加最后一条用户消息
      const lastMessage = chatMessages[chatMessages.length - 1]
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('The last message must be from the user')
      }
      contents.push({
        role: 'user',
        parts: [{ text: lastMessage.content }],
      })

      // 构建请求参数
      const requestParams: any = {
        model: this.model,
        contents,
      }

      // 添加生成配置
      if (Object.keys(generationConfig).length > 0) {
        requestParams.generationConfig = generationConfig
      }

      // 如果有 system message，添加到请求中
      if (systemMessage) {
        requestParams.systemInstruction = {
          parts: [{ text: systemMessage.content }],
        }
      }

      // 调用 API
      const response = await this.client.models.generateContent(requestParams)

      // 提取响应内容
      const content = response.text || ''

      // 检查响应是否成功
      if (!content && response.candidates && response.candidates.length > 0) {
        const finishReason = response.candidates[0].finishReason
        if (finishReason && finishReason !== 'STOP') {
          console.warn(`Vertex AI response finished with reason: ${finishReason}`)
        }
      }

      // 返回标准化响应
      return {
        content,
        model: this.model,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
      }
    } catch (error) {
      // 改进错误处理，提供更有用的错误信息
      if (error instanceof Error) {
        throw new Error(`Vertex AI completion failed: ${error.message}`)
      }
      throw new Error(`Vertex AI completion failed: ${String(error)}`)
    }
  }
}
