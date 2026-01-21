/**
 * Agent 基类
 * 参考 LangChain 1.0 Agent 设计
 */

import { AgentMessage } from '../messages.js'
import { BaseTool, ToolRegistry } from '../tool.js'
import { BaseMemory } from '../memory/base.js'
import {
  AgentDecision,
  AgentStep,
  AgentConfig,
  StreamEvent,
} from '../types.js'

/**
 * LLM 服务接口
 * Agent 使用此接口与 LLM 交互
 */
export interface AgentLLM {
  /**
   * 生成完成
   * @param messages 消息列表
   * @param options 可选参数
   */
  generateCompletion(
    messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool'
      content: string
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
      tool_call_id?: string
      name?: string
    }>,
    options?: {
      tools?: Array<{
        type: 'function'
        function: {
          name: string
          description: string
          parameters: Record<string, unknown>
        }
      }>
      temperature?: number
      maxTokens?: number
    }
  ): Promise<{
    content: string
    toolCalls?: Array<{
      id: string
      type: string
      function: { name: string; arguments: string }
    }>
  }>

  /**
   * 流式生成
   */
  generateCompletionStream?(
    messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool'
      content: string
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
      tool_call_id?: string
      name?: string
    }>,
    options?: {
      tools?: Array<{
        type: 'function'
        function: {
          name: string
          description: string
          parameters: Record<string, unknown>
        }
      }>
      temperature?: number
      maxTokens?: number
    }
  ): AsyncGenerator<{
    type: 'token' | 'tool_call' | 'done'
    content?: string
    toolCall?: {
      id: string
      name: string
      arguments: string
    }
  }>
}

/**
 * Agent 基类
 * 所有 Agent 实现都应继承此类
 */
export abstract class BaseAgent {
  /** 工具注册中心 */
  protected toolRegistry: ToolRegistry

  /** 记忆模块 */
  protected memory?: BaseMemory

  /** LLM 服务 */
  protected llm: AgentLLM

  /** Agent 配置 */
  protected config: AgentConfig

  constructor(options: {
    tools: BaseTool[]
    llm: AgentLLM
    memory?: BaseMemory
    config?: AgentConfig
  }) {
    this.toolRegistry = new ToolRegistry()
    this.toolRegistry.registerMany(options.tools)
    this.llm = options.llm
    this.memory = options.memory
    this.config = options.config ?? {}
  }

  /**
   * 核心决策方法
   * 根据当前消息和历史步骤，决定下一步动作
   *
   * @param messages 当前消息列表
   * @param intermediateSteps 中间步骤（工具调用及结果）
   * @returns AgentAction 数组（工具调用）或 AgentFinish（完成）
   */
  abstract plan(messages: AgentMessage[], intermediateSteps: AgentStep[]): Promise<AgentDecision>

  /**
   * 流式决策方法
   * 支持流式输出 token 和工具调用
   *
   * @param messages 当前消息列表
   * @param intermediateSteps 中间步骤
   * @yields 流式事件（token、工具调用、完成）
   */
  abstract planStream(
    messages: AgentMessage[],
    intermediateSteps: AgentStep[]
  ): AsyncGenerator<StreamEvent>

  /**
   * 获取所有工具
   */
  getTools(): BaseTool[] {
    return this.toolRegistry.getAll()
  }

  /**
   * 获取工具
   */
  getTool(name: string): BaseTool | undefined {
    return this.toolRegistry.get(name)
  }

  /**
   * 获取记忆模块
   */
  getMemory(): BaseMemory | undefined {
    return this.memory
  }

  /**
   * 设置记忆模块
   */
  setMemory(memory: BaseMemory): void {
    this.memory = memory
  }

  /**
   * 获取系统提示词
   */
  getSystemPrompt(): string | undefined {
    return this.config.systemPrompt
  }

  /**
   * 设置系统提示词
   */
  setSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt
  }

  /**
   * 构建带历史的消息
   */
  protected async buildMessagesWithHistory(messages: AgentMessage[]): Promise<AgentMessage[]> {
    const result: AgentMessage[] = []

    // 加载历史记忆
    if (this.memory) {
      const historyMessages = await this.memory.load()
      result.push(...historyMessages)
    }

    // 添加当前消息
    result.push(...messages)

    return result
  }

  /**
   * 将 AgentStep 转换为消息
   */
  protected stepsToMessages(steps: AgentStep[]): AgentMessage[] {
    const messages: AgentMessage[] = []

    for (const step of steps) {
      // AI 的工具调用消息
      messages.push({
        type: 'ai',
        content: '',
        toolCalls: [
          {
            id: step.action.id,
            name: step.action.toolName,
            arguments: step.action.toolInput,
          },
        ],
      })

      // 工具执行结果消息
      messages.push({
        type: 'tool',
        content: step.observation,
        toolCallId: step.action.id,
        name: step.action.toolName,
      })
    }

    return messages
  }
}

/**
 * Agent 停止条件
 */
export interface StopCondition {
  /**
   * 检查是否应该停止
   */
  shouldStop(steps: AgentStep[], iteration: number): boolean

  /**
   * 获取停止原因
   */
  getReason(): string
}

/**
 * 最大迭代停止条件
 */
export class MaxIterationsStop implements StopCondition {
  constructor(private maxIterations: number) {}

  shouldStop(_steps: AgentStep[], iteration: number): boolean {
    return iteration >= this.maxIterations
  }

  getReason(): string {
    return `达到最大迭代次数 (${this.maxIterations})`
  }
}

/**
 * 重复动作停止条件
 */
export class RepeatedActionStop implements StopCondition {
  private lastActions: string[] = []
  private repeatThreshold: number

  constructor(repeatThreshold: number = 3) {
    this.repeatThreshold = repeatThreshold
  }

  shouldStop(steps: AgentStep[]): boolean {
    if (steps.length === 0) return false

    const lastAction = steps[steps.length - 1].action
    const actionKey = `${lastAction.toolName}:${JSON.stringify(lastAction.toolInput)}`

    this.lastActions.push(actionKey)

    // 检查最近的动作是否重复
    if (this.lastActions.length >= this.repeatThreshold) {
      const recent = this.lastActions.slice(-this.repeatThreshold)
      if (recent.every((a) => a === recent[0])) {
        return true
      }
    }

    return false
  }

  getReason(): string {
    return `检测到重复动作 (${this.repeatThreshold} 次)`
  }
}
