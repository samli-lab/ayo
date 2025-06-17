export interface AIModelConfig {
  provider: string
  apiKey: string
  model: string
  baseURL?: string
  temperature?: number
  maxTokens?: number
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  messages: Message[]
  temperature?: number
  maxTokens?: number
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
