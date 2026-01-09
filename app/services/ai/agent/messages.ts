/**
 * Agent 消息系统
 * 参考 LangChain 1.0 消息设计
 */

import { ToolCall } from './types.js'

// ============== 消息类型枚举 ==============

export type MessageType = 'human' | 'ai' | 'system' | 'tool'

// ============== 基础消息接口 ==============

/**
 * 消息基础接口
 */
export interface BaseMessage {
  type: MessageType
  content: string
  /** 附加元数据 */
  metadata?: Record<string, unknown>
}

// ============== 具体消息类型 ==============

/**
 * 人类消息（用户输入）
 */
export interface HumanMessage extends BaseMessage {
  type: 'human'
}

/**
 * AI 消息（模型输出）
 */
export interface AIMessage extends BaseMessage {
  type: 'ai'
  /** 工具调用列表（支持并行调用） */
  toolCalls?: ToolCall[]
}

/**
 * 系统消息（系统提示词）
 */
export interface SystemMessage extends BaseMessage {
  type: 'system'
}

/**
 * 工具消息（工具执行结果）
 */
export interface ToolMessage extends BaseMessage {
  type: 'tool'
  /** 对应的工具调用 ID */
  toolCallId: string
  /** 工具名称 */
  name: string
}

/**
 * 所有消息类型的联合类型
 */
export type AgentMessage = HumanMessage | AIMessage | SystemMessage | ToolMessage

// ============== 消息工厂函数 ==============

/**
 * 创建人类消息
 */
export function createHumanMessage(
  content: string,
  metadata?: Record<string, unknown>
): HumanMessage {
  return {
    type: 'human',
    content,
    metadata,
  }
}

/**
 * 创建 AI 消息
 */
export function createAIMessage(
  content: string,
  toolCalls?: ToolCall[],
  metadata?: Record<string, unknown>
): AIMessage {
  return {
    type: 'ai',
    content,
    toolCalls,
    metadata,
  }
}

/**
 * 创建系统消息
 */
export function createSystemMessage(
  content: string,
  metadata?: Record<string, unknown>
): SystemMessage {
  return {
    type: 'system',
    content,
    metadata,
  }
}

/**
 * 创建工具消息
 */
export function createToolMessage(
  content: string,
  toolCallId: string,
  name: string,
  metadata?: Record<string, unknown>
): ToolMessage {
  return {
    type: 'tool',
    content,
    toolCallId,
    name,
    metadata,
  }
}

// ============== 消息转换工具 ==============

/**
 * 转换为 OpenAI 消息格式
 */
export function toOpenAIMessage(message: AgentMessage): {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
  name?: string
} {
  switch (message.type) {
    case 'human':
      return { role: 'user', content: message.content }

    case 'ai':
      const aiResult: {
        role: 'assistant'
        content: string
        tool_calls?: Array<{
          id: string
          type: 'function'
          function: { name: string; arguments: string }
        }>
      } = {
        role: 'assistant',
        content: message.content,
      }
      if (message.toolCalls && message.toolCalls.length > 0) {
        aiResult.tool_calls = message.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }))
      }
      return aiResult

    case 'system':
      return { role: 'system', content: message.content }

    case 'tool':
      return {
        role: 'tool',
        content: message.content,
        tool_call_id: message.toolCallId,
        name: message.name,
      }
  }
}

/**
 * 批量转换为 OpenAI 消息格式
 */
export function toOpenAIMessages(messages: AgentMessage[]) {
  return messages.map(toOpenAIMessage)
}

/**
 * 从 OpenAI 响应解析工具调用
 */
export function parseToolCallsFromOpenAI(
  toolCalls?: Array<{
    id: string
    type: string
    function: { name: string; arguments: string }
  }>
): ToolCall[] {
  if (!toolCalls) return []

  return toolCalls.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments),
  }))
}

// ============== 消息历史工具 ==============

/**
 * 消息历史管理器
 */
export class MessageHistory {
  private messages: AgentMessage[] = []

  constructor(initialMessages?: AgentMessage[]) {
    if (initialMessages) {
      this.messages = [...initialMessages]
    }
  }

  /**
   * 添加消息
   */
  add(message: AgentMessage): void {
    this.messages.push(message)
  }

  /**
   * 添加多条消息
   */
  addMany(messages: AgentMessage[]): void {
    this.messages.push(...messages)
  }

  /**
   * 获取所有消息
   */
  getMessages(): AgentMessage[] {
    return [...this.messages]
  }

  /**
   * 获取最近 N 条消息
   */
  getLastN(n: number): AgentMessage[] {
    return this.messages.slice(-n)
  }

  /**
   * 获取消息数量
   */
  get length(): number {
    return this.messages.length
  }

  /**
   * 清空历史
   */
  clear(): void {
    this.messages = []
  }

  /**
   * 按类型过滤消息
   */
  filterByType<T extends MessageType>(type: T): AgentMessage[] {
    return this.messages.filter((m) => m.type === type)
  }

  /**
   * 转换为字符串（用于调试）
   */
  toString(): string {
    return this.messages
      .map((m) => {
        const prefix =
          m.type === 'human'
            ? 'Human'
            : m.type === 'ai'
              ? 'AI'
              : m.type === 'system'
                ? 'System'
                : `Tool[${(m as ToolMessage).name}]`
        return `${prefix}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`
      })
      .join('\n')
  }
}

// ============== 类型守卫 ==============

export function isHumanMessage(message: AgentMessage): message is HumanMessage {
  return message.type === 'human'
}

export function isAIMessage(message: AgentMessage): message is AIMessage {
  return message.type === 'ai'
}

export function isSystemMessage(message: AgentMessage): message is SystemMessage {
  return message.type === 'system'
}

export function isToolMessage(message: AgentMessage): message is ToolMessage {
  return message.type === 'tool'
}
