/**
 * Buffer Memory 实现
 * 保存完整的对话历史
 */

import { AgentMessage, createAIMessage, createHumanMessage } from '../messages.js'
import { BaseMemory, MemoryStorage, InMemoryStorage } from './base.js'

/**
 * Buffer Memory 配置
 */
export interface BufferMemoryConfig {
  /** 记忆的唯一标识 */
  key?: string
  /** 最大消息数量 */
  maxMessages?: number
  /** 是否返回消息（否则返回空数组，仅保存） */
  returnMessages?: boolean
  /** 存储后端 */
  storage?: MemoryStorage
  /** 人类消息前缀 */
  humanPrefix?: string
  /** AI 消息前缀 */
  aiPrefix?: string
}

/**
 * Buffer Memory
 * 保存完整的对话历史，可限制最大消息数量
 */
export class BufferMemory extends BaseMemory {
  readonly key: string
  private messages: AgentMessage[] = []
  private maxMessages: number
  private returnMessages: boolean
  private storage: MemoryStorage
  private humanPrefix: string
  private aiPrefix: string
  private loaded: boolean = false

  constructor(config: BufferMemoryConfig = {}) {
    super()
    this.key = config.key ?? `buffer_memory_${Date.now()}`
    this.maxMessages = config.maxMessages ?? 100
    this.returnMessages = config.returnMessages ?? true
    this.storage = config.storage ?? new InMemoryStorage()
    this.humanPrefix = config.humanPrefix ?? 'Human'
    this.aiPrefix = config.aiPrefix ?? 'AI'
  }

  /**
   * 从存储加载消息
   */
  private async loadFromStorage(): Promise<void> {
    if (this.loaded) return

    const data = await this.storage.get(this.key)
    if (data) {
      try {
        this.messages = JSON.parse(data)
      } catch {
        this.messages = []
      }
    }
    this.loaded = true
  }

  /**
   * 保存到存储
   */
  private async saveToStorage(): Promise<void> {
    await this.storage.set(this.key, JSON.stringify(this.messages))
  }

  /**
   * 加载历史消息
   */
  async load(): Promise<AgentMessage[]> {
    await this.loadFromStorage()

    if (!this.returnMessages) {
      return []
    }

    return [...this.messages]
  }

  /**
   * 保存新的消息
   */
  async save(messages: AgentMessage[], output: string): Promise<void> {
    await this.loadFromStorage()

    // 添加新消息
    this.messages.push(...messages)

    // 添加 AI 输出消息（如果不在消息列表中）
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.type !== 'ai' || lastMsg.content !== output) {
      this.messages.push(createAIMessage(output))
    }

    // 裁剪到最大数量
    if (this.messages.length > this.maxMessages) {
      // 保留系统消息
      const systemMessages = this.messages.filter((m) => m.type === 'system')
      const otherMessages = this.messages.filter((m) => m.type !== 'system')

      // 从非系统消息中裁剪
      const maxOther = this.maxMessages - systemMessages.length
      const trimmedOther = otherMessages.slice(-maxOther)

      this.messages = [...systemMessages, ...trimmedOther]
    }

    await this.saveToStorage()
  }

  /**
   * 清空记忆
   */
  async clear(): Promise<void> {
    this.messages = []
    this.loaded = true
    await this.storage.delete(this.key)
  }

  /**
   * 添加用户消息（便捷方法）
   */
  async addUserMessage(content: string): Promise<void> {
    await this.loadFromStorage()
    this.messages.push(createHumanMessage(content))
    await this.saveToStorage()
  }

  /**
   * 添加 AI 消息（便捷方法）
   */
  async addAIMessage(content: string): Promise<void> {
    await this.loadFromStorage()
    this.messages.push(createAIMessage(content))
    await this.saveToStorage()
  }

  /**
   * 获取消息数量
   */
  async getMessageCount(): Promise<number> {
    await this.loadFromStorage()
    return this.messages.length
  }

  /**
   * 格式化消息
   */
  protected formatMessages(messages: AgentMessage[]): string {
    return messages
      .map((m) => {
        switch (m.type) {
          case 'human':
            return `${this.humanPrefix}: ${m.content}`
          case 'ai':
            return `${this.aiPrefix}: ${m.content}`
          case 'system':
            return `System: ${m.content}`
          case 'tool':
            return `Tool[${m.name}]: ${m.content}`
        }
      })
      .join('\n')
  }
}

/**
 * 窗口 Buffer Memory
 * 只保留最近 k 轮对话
 */
export class WindowBufferMemory extends BufferMemory {
  private windowSize: number

  constructor(
    config: BufferMemoryConfig & {
      /** 窗口大小（对话轮数） */
      windowSize?: number
    } = {}
  ) {
    super(config)
    this.windowSize = config.windowSize ?? 5
  }

  /**
   * 加载历史消息（只返回最近 k 轮）
   */
  async load(): Promise<AgentMessage[]> {
    const allMessages = await super.load()

    // 计算对话轮数（每个 human 消息算一轮）
    const humanIndices: number[] = []
    allMessages.forEach((m, i) => {
      if (m.type === 'human') {
        humanIndices.push(i)
      }
    })

    // 获取最近 k 轮的起始索引
    if (humanIndices.length <= this.windowSize) {
      return allMessages
    }

    const startIndex = humanIndices[humanIndices.length - this.windowSize]

    // 包含系统消息
    const systemMessages = allMessages.filter((m) => m.type === 'system')
    const windowMessages = allMessages.slice(startIndex)

    return [...systemMessages, ...windowMessages.filter((m) => m.type !== 'system')]
  }
}
