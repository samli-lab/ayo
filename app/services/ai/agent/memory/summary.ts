/**
 * Summary Memory 实现
 * 使用 LLM 压缩历史对话为摘要
 */

import { AgentMessage, createSystemMessage, createAIMessage } from '../messages.js'
import { BaseMemory, MemoryStorage, InMemoryStorage } from './base.js'

/**
 * LLM 调用接口
 */
export interface SummaryLLM {
  invoke(prompt: string): Promise<string>
}

/**
 * Summary Memory 配置
 */
export interface SummaryMemoryConfig {
  /** 记忆的唯一标识 */
  key?: string
  /** 用于生成摘要的 LLM */
  llm: SummaryLLM
  /** 存储后端 */
  storage?: MemoryStorage
  /** 触发摘要的消息数量阈值 */
  summaryThreshold?: number
  /** 摘要提示词 */
  summaryPrompt?: string
}

/**
 * 内部存储结构
 */
interface SummaryData {
  summary: string
  recentMessages: AgentMessage[]
}

/**
 * Summary Memory
 * 使用 LLM 将历史对话压缩为摘要，节省 token
 */
export class SummaryMemory extends BaseMemory {
  readonly key: string
  private llm: SummaryLLM
  private storage: MemoryStorage
  private summaryThreshold: number
  private summaryPrompt: string

  private summary: string = ''
  private recentMessages: AgentMessage[] = []
  private loaded: boolean = false

  constructor(config: SummaryMemoryConfig) {
    super()
    this.key = config.key ?? `summary_memory_${Date.now()}`
    this.llm = config.llm
    this.storage = config.storage ?? new InMemoryStorage()
    this.summaryThreshold = config.summaryThreshold ?? 10
    this.summaryPrompt =
      config.summaryPrompt ??
      `请将以下对话历史总结为简洁的摘要，保留关键信息：

当前摘要:
{current_summary}

新的对话:
{new_messages}

请输出更新后的摘要：`
  }

  /**
   * 从存储加载
   */
  private async loadFromStorage(): Promise<void> {
    if (this.loaded) return

    const data = await this.storage.get(this.key)
    if (data) {
      try {
        const parsed: SummaryData = JSON.parse(data)
        this.summary = parsed.summary
        this.recentMessages = parsed.recentMessages
      } catch {
        this.summary = ''
        this.recentMessages = []
      }
    }
    this.loaded = true
  }

  /**
   * 保存到存储
   */
  private async saveToStorage(): Promise<void> {
    const data: SummaryData = {
      summary: this.summary,
      recentMessages: this.recentMessages,
    }
    await this.storage.set(this.key, JSON.stringify(data))
  }

  /**
   * 加载历史消息
   */
  async load(): Promise<AgentMessage[]> {
    await this.loadFromStorage()

    const messages: AgentMessage[] = []

    // 如果有摘要，添加为系统消息
    if (this.summary) {
      messages.push(createSystemMessage(`对话历史摘要: ${this.summary}`))
    }

    // 添加最近的消息
    messages.push(...this.recentMessages)

    return messages
  }

  /**
   * 保存新的消息
   */
  async save(messages: AgentMessage[], output: string): Promise<void> {
    await this.loadFromStorage()

    // 添加新消息
    this.recentMessages.push(...messages)

    // 添加 AI 输出（如果不在消息列表中）
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.type !== 'ai' || lastMsg.content !== output) {
      this.recentMessages.push(createAIMessage(output))
    }

    // 如果消息数量超过阈值，生成摘要
    if (this.recentMessages.length >= this.summaryThreshold) {
      await this.summarize()
    }

    await this.saveToStorage()
  }

  /**
   * 生成摘要
   */
  private async summarize(): Promise<void> {
    // 取一半消息用于摘要
    const messagesToSummarize = this.recentMessages.slice(
      0,
      Math.floor(this.recentMessages.length / 2)
    )
    const remainingMessages = this.recentMessages.slice(Math.floor(this.recentMessages.length / 2))

    const newMessagesText = this.formatMessages(messagesToSummarize)

    const prompt = this.summaryPrompt
      .replace('{current_summary}', this.summary || '无')
      .replace('{new_messages}', newMessagesText)

    try {
      this.summary = await this.llm.invoke(prompt)
      this.recentMessages = remainingMessages
    } catch (error) {
      console.error('生成摘要失败:', error)
      // 摘要失败时保留所有消息
    }
  }

  /**
   * 清空记忆
   */
  async clear(): Promise<void> {
    this.summary = ''
    this.recentMessages = []
    this.loaded = true
    await this.storage.delete(this.key)
  }

  /**
   * 获取当前摘要
   */
  async getSummary(): Promise<string> {
    await this.loadFromStorage()
    return this.summary
  }

  /**
   * 强制生成摘要
   */
  async forceSummarize(): Promise<void> {
    await this.loadFromStorage()
    if (this.recentMessages.length > 0) {
      await this.summarize()
      await this.saveToStorage()
    }
  }

  /**
   * 获取记忆变量
   */
  async getMemoryVariables(): Promise<Record<string, string>> {
    await this.loadFromStorage()
    return {
      summary: this.summary,
      history: this.formatMessages(this.recentMessages),
    }
  }
}

/**
 * 组合 Memory
 * 结合 Buffer 和 Summary 的优点
 */
export class CombinedMemory extends BaseMemory {
  readonly key: string
  private llm: SummaryLLM
  private storage: MemoryStorage
  private maxRecentMessages: number
  private summaryPrompt: string

  private summary: string = ''
  private recentMessages: AgentMessage[] = []
  private loaded: boolean = false

  constructor(
    config: SummaryMemoryConfig & {
      /** 保留的最近消息数量 */
      maxRecentMessages?: number
    }
  ) {
    super()
    this.key = config.key ?? `combined_memory_${Date.now()}`
    this.llm = config.llm
    this.storage = config.storage ?? new InMemoryStorage()
    this.maxRecentMessages = config.maxRecentMessages ?? 10
    this.summaryPrompt =
      config.summaryPrompt ??
      `请将以下对话历史总结为简洁的摘要：

当前摘要:
{current_summary}

新的对话:
{new_messages}

请输出更新后的摘要：`
  }

  private async loadFromStorage(): Promise<void> {
    if (this.loaded) return

    const data = await this.storage.get(this.key)
    if (data) {
      try {
        const parsed = JSON.parse(data)
        this.summary = parsed.summary
        this.recentMessages = parsed.recentMessages
      } catch {
        this.summary = ''
        this.recentMessages = []
      }
    }
    this.loaded = true
  }

  private async saveToStorage(): Promise<void> {
    await this.storage.set(
      this.key,
      JSON.stringify({
        summary: this.summary,
        recentMessages: this.recentMessages,
      })
    )
  }

  async load(): Promise<AgentMessage[]> {
    await this.loadFromStorage()

    const messages: AgentMessage[] = []

    if (this.summary) {
      messages.push(createSystemMessage(`之前的对话摘要: ${this.summary}`))
    }

    messages.push(...this.recentMessages)

    return messages
  }

  async save(messages: AgentMessage[], output: string): Promise<void> {
    await this.loadFromStorage()

    this.recentMessages.push(...messages)

    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.type !== 'ai' || lastMsg.content !== output) {
      this.recentMessages.push(createAIMessage(output))
    }

    // 超过限制时，将旧消息压缩为摘要
    if (this.recentMessages.length > this.maxRecentMessages) {
      const toSummarize = this.recentMessages.slice(
        0,
        this.recentMessages.length - this.maxRecentMessages
      )
      this.recentMessages = this.recentMessages.slice(-this.maxRecentMessages)

      const prompt = this.summaryPrompt
        .replace('{current_summary}', this.summary || '无')
        .replace('{new_messages}', this.formatMessages(toSummarize))

      try {
        this.summary = await this.llm.invoke(prompt)
      } catch (error) {
        console.error('生成摘要失败:', error)
      }
    }

    await this.saveToStorage()
  }

  async clear(): Promise<void> {
    this.summary = ''
    this.recentMessages = []
    this.loaded = true
    await this.storage.delete(this.key)
  }
}
