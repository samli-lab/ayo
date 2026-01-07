import { GoogleGenAI } from '@google/genai'
import logger from '@adonisjs/core/services/logger'
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

  constructor(config: AIModelConfig) {
    if (!config.model) {
      throw new Error('Vertex AI requires model name.')
    }

    this.model = config.model

    // 调试日志：检查关键配置是否获取成功
    logger.info('[VertexService] Initializing with:', {
      model: this.model,
      hasApiKey: !!config.apiKey,
      hasBaseUrl: !!config.baseURL,
    })

    // 初始化 Google GenAI 客户端，配置为使用 Vertex AI
    const clientConfig: any = {
      vertexai: true,
    }

    // 如果提供了 baseURL，配置 httpOptions
    if (config.baseURL) {
      clientConfig.httpOptions = {
        baseUrl: config.baseURL,
      }
    }

    // @google/genai 支持通过 apiKey 进行认证
    if (config.apiKey) {
      clientConfig.apiKey = config.apiKey
    }

    logger.info('[VertexService] clientConfig', clientConfig)
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

      // 添加图像调节配置 (Person Identity Lock 等)
      if (request.imageConditioning) {
        generationConfig.imageConditioning = request.imageConditioning
      }

      // Vertex AI 不支持 frequencyPenalty 和 presencePenalty
      // 这些参数会被忽略

      // 构建请求内容
      // @google/genai 使用 contents 数组，需要将消息转换为正确的格式
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

      // 处理消息内容
      for (const msg of chatMessages.slice(0, -1)) {
        const role = msg.role === 'assistant' ? 'model' : 'user'
        contents.push({
          role,
          parts: this.convertContentToParts(msg.content),
        })
      }

      // 添加最后一条用户消息
      const lastMessage = chatMessages[chatMessages.length - 1]
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('The last message must be from the user')
      }

      contents.push({
        role: 'user',
        parts: this.convertContentToParts(lastMessage.content),
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
      logger.info({ requestParams }, '[VertexService] Final Request')
      const response = await this.client.models.generateContent(requestParams)

      // 提取响应内容：遍历所有 parts，合并文本并处理图片数据
      let content = ''
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            content += part.text
          } else if (part.inlineData) {
            // 将生成的图片数据转换为 Markdown 格式的 Data URL
            const mimeType = part.inlineData.mimeType || 'image/png'
            const base64Data = part.inlineData.data
            content += `\n![generated_image](data:${mimeType};base64,${base64Data})`
          }
        }
      }

      // 备选方案：如果上述逻辑没拿到内容，再尝试使用 SDK 自带的 text 属性
      if (!content.trim()) {
        content = response.text || ''
      }

      // 检查响应是否成功
      if (!content && response.candidates && response.candidates.length > 0) {
        const finishReason = response.candidates[0].finishReason
        if (finishReason && finishReason !== 'STOP') {
          logger.warn(`Vertex AI response finished with reason: ${finishReason}`)
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

  /**
   * 将 Message 中的 content 转换为 Google SDK 要求的 parts 格式
   */
  private convertContentToParts(content: string | any[]): any[] {
    if (typeof content === 'string') {
      return [{ text: content }]
    }
    return content.map((part) => {
      if (part.text) {
        return { text: part.text }
      }
      if (part.inlineData) {
        return {
          inlineData: {
            mimeType: part.inlineData.mimeType,
            data: part.inlineData.data,
          },
        }
      }
      return part
    })
  }
}
