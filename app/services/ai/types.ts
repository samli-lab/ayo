export interface AIModelConfig {
  provider: string
  apiKey: string
  model: string
  baseURL?: string
  temperature?: number
  maxTokens?: number
  seed?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  projectId?: string
  location?: string
}

export interface MessagePart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | MessagePart[]
}

export interface ChatCompletionRequest {
  messages: Message[]
  temperature?: number
  maxTokens?: number
  seed?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  /** 图像调节配置 (Vertex AI 特有) */
  imageConditioning?: {
    personIdentity?: 'LOCK' | 'DONT_LOCK'
  }
}

export interface ChatCompletionResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIModelService {
  generateCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>
}
