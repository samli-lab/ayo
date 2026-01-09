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

// ============== Tool Calling 相关类型 ==============

/**
 * 工具调用定义
 */
export interface ToolCallDefinition {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * 工具函数定义（用于 LLM）
 */
export interface FunctionTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, {
        type: string
        description?: string
        enum?: string[]
      }>
      required?: string[]
    }
  }
}

// ============== 消息类型 ==============

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | MessagePart[]
  /** 工具调用（assistant 消息） */
  tool_calls?: ToolCallDefinition[]
  /** 工具调用 ID（tool 消息） */
  tool_call_id?: string
  /** 工具名称（tool 消息） */
  name?: string
}

// ============== 请求/响应类型 ==============

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
  /** 工具定义列表 */
  tools?: FunctionTool[]
  /** 工具选择策略 */
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }
  /** 是否支持并行工具调用 */
  parallel_tool_calls?: boolean
}

export interface ChatCompletionResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  /** 工具调用列表（如果有） */
  toolCalls?: ToolCallDefinition[]
  /** 完成原因 */
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter'
}

// ============== 流式响应类型 ==============

/**
 * 流式响应块
 */
export interface ChatCompletionChunk {
  /** 块类型 */
  type: 'token' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'done'
  /** 文本内容（token 类型） */
  content?: string
  /** 工具调用信息 */
  toolCall?: {
    index: number
    id?: string
    name?: string
    arguments?: string
  }
  /** 完成原因（done 类型） */
  finishReason?: 'stop' | 'tool_calls' | 'length'
}

// ============== 服务接口 ==============

export interface AIModelService {
  generateCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>

  /** 流式生成（可选实现） */
  generateCompletionStream?(
    request: ChatCompletionRequest
  ): AsyncGenerator<ChatCompletionChunk>
}
