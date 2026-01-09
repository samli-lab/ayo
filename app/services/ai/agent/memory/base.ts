/**
 * Memory 基类
 * 参考 LangChain 1.0 Memory 设计
 */

import { AgentMessage } from '../messages.js'

/**
 * Memory 基类
 * 所有记忆实现都应继承此类
 */
export abstract class BaseMemory {
  /** 记忆的唯一标识（用于持久化） */
  abstract readonly key: string

  /**
   * 加载历史消息
   */
  abstract load(): Promise<AgentMessage[]>

  /**
   * 保存新的消息
   * @param messages 本轮对话的消息
   * @param output Agent 最终输出
   */
  abstract save(messages: AgentMessage[], output: string): Promise<void>

  /**
   * 清空记忆
   */
  abstract clear(): Promise<void>

  /**
   * 获取记忆变量（用于提示词）
   */
  async getMemoryVariables(): Promise<Record<string, string>> {
    const messages = await this.load()
    return {
      history: this.formatMessages(messages),
    }
  }

  /**
   * 格式化消息为字符串
   */
  protected formatMessages(messages: AgentMessage[]): string {
    return messages
      .map((m) => {
        switch (m.type) {
          case 'human':
            return `Human: ${m.content}`
          case 'ai':
            return `AI: ${m.content}`
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
 * Memory 存储接口
 * 用于持久化存储
 */
export interface MemoryStorage {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * 内存存储实现
 */
export class InMemoryStorage implements MemoryStorage {
  private store: Map<string, string> = new Map()

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
}
