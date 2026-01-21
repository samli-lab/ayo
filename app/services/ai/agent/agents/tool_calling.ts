/**
 * Tool Calling Agent
 * 基于 OpenAI/Gemini 原生函数调用能力的 Agent
 */

import {
  AgentMessage,
  createSystemMessage,
  toOpenAIMessages,
} from '../messages.js'
import { BaseTool } from '../tool.js'
import { BaseMemory } from '../memory/base.js'
import {
  AgentAction,
  AgentFinish,
  AgentDecision,
  AgentStep,
  ToolCallingAgentConfig,
  StreamEvent,
  generateId,
  isAgentFinish,
} from '../types.js'
import { BaseAgent, AgentLLM } from './base.js'

/**
 * Tool Calling Agent 配置
 */
export interface ToolCallingAgentOptions {
  /** 工具列表 */
  tools: BaseTool[]
  /** LLM 服务 */
  llm: AgentLLM
  /** 记忆模块 */
  memory?: BaseMemory
  /** Agent 配置 */
  config?: ToolCallingAgentConfig
}

/**
 * Tool Calling Agent
 * 利用 LLM 原生的函数调用能力进行工具选择
 */
export class ToolCallingAgent extends BaseAgent {
  private agentConfig: ToolCallingAgentConfig

  constructor(options: ToolCallingAgentOptions) {
    super(options)
    this.agentConfig = options.config ?? {}
  }

  /**
   * 核心决策方法
   */
  async plan(messages: AgentMessage[], intermediateSteps: AgentStep[]): Promise<AgentDecision> {
    // 构建完整的消息列表
    const fullMessages = await this.buildFullMessages(messages, intermediateSteps)

    // 准备工具定义
    const tools = this.toolRegistry.toToolDefinitions()

    // 调用 LLM
    const response = await this.llm.generateCompletion(toOpenAIMessages(fullMessages), {
      tools: tools.length > 0 ? tools : undefined,
      temperature: this.agentConfig.temperature,
      maxTokens: this.agentConfig.maxTokens,
    })

    // 解析响应
    return this.parseResponse(response)
  }

  /**
   * 流式决策方法
   */
  async *planStream(
    messages: AgentMessage[],
    intermediateSteps: AgentStep[]
  ): AsyncGenerator<StreamEvent> {
    // 检查 LLM 是否支持流式
    if (!this.llm.generateCompletionStream) {
      // 降级为非流式
      const result = await this.plan(messages, intermediateSteps)

      if (isAgentFinish(result)) {
        yield { type: 'token', content: result.output }
        yield { type: 'finish', output: result.output }
      } else {
        for (const action of result) {
          yield { type: 'tool_start', action }
        }
      }
      return
    }

    // 构建完整的消息列表
    const fullMessages = await this.buildFullMessages(messages, intermediateSteps)
    const tools = this.toolRegistry.toToolDefinitions()

    // 流式调用 LLM
    let content = ''
    const toolCalls: Array<{ id: string; name: string; arguments: string }> = []

    for await (const chunk of this.llm.generateCompletionStream(toOpenAIMessages(fullMessages), {
      tools: tools.length > 0 ? tools : undefined,
      temperature: this.agentConfig.temperature,
      maxTokens: this.agentConfig.maxTokens,
    })) {
      switch (chunk.type) {
        case 'token':
          if (chunk.content) {
            content += chunk.content
            yield { type: 'token', content: chunk.content }
          }
          break

        case 'tool_call':
          if (chunk.toolCall) {
            toolCalls.push(chunk.toolCall)
          }
          break

        case 'done':
          // 处理完成
          if (toolCalls.length > 0) {
            // 有工具调用
            for (const tc of toolCalls) {
              const action: AgentAction = {
                type: 'tool_call',
                toolName: tc.name,
                toolInput: JSON.parse(tc.arguments || '{}'),
                id: tc.id,
              }
              yield { type: 'tool_start', action }
            }
          } else {
            // 直接完成
            yield { type: 'finish', output: content }
          }
          break
      }
    }
  }

  /**
   * 构建完整的消息列表
   */
  private async buildFullMessages(
    messages: AgentMessage[],
    intermediateSteps: AgentStep[]
  ): Promise<AgentMessage[]> {
    const fullMessages: AgentMessage[] = []

    // 添加系统提示词
    if (this.agentConfig.systemPrompt) {
      fullMessages.push(createSystemMessage(this.agentConfig.systemPrompt))
    } else {
      fullMessages.push(
        createSystemMessage(
          '你是一个有用的AI助手。你可以使用提供的工具来完成用户的请求。' +
            '如果需要使用工具，请选择最合适的工具并提供正确的参数。' +
            '如果不需要使用工具，直接回答用户的问题。'
        )
      )
    }

    // 添加历史记忆
    const historyMessages = await this.buildMessagesWithHistory([])
    fullMessages.push(...historyMessages)

    // 添加中间步骤
    const stepMessages = this.stepsToMessages(intermediateSteps)
    fullMessages.push(...stepMessages)

    // 添加当前消息
    fullMessages.push(...messages)

    return fullMessages
  }

  /**
   * 解析 LLM 响应
   */
  private parseResponse(response: {
    content: string
    toolCalls?: Array<{
      id: string
      type: string
      function: { name: string; arguments: string }
    }>
  }): AgentDecision {
    // 检查是否有工具调用
    if (response.toolCalls && response.toolCalls.length > 0) {
      const actions: AgentAction[] = response.toolCalls.map((tc) => ({
        type: 'tool_call',
        toolName: tc.function.name,
        toolInput: JSON.parse(tc.function.arguments || '{}'),
        id: tc.id || generateId(),
      }))
      return actions
    }

    // 没有工具调用，直接完成
    const finish: AgentFinish = {
      type: 'finish',
      output: response.content,
    }
    return finish
  }
}

/**
 * 创建 Tool Calling Agent 的便捷函数
 */
export function createToolCallingAgent(options: ToolCallingAgentOptions): ToolCallingAgent {
  return new ToolCallingAgent(options)
}
