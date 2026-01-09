/**
 * AIService 到 AgentLLM 的适配器
 * 将现有的 AIService 适配为 Agent 系统使用的 LLM 接口
 */

import { AIService } from '../service.js'
import { Message, ChatCompletionRequest, FunctionTool } from '../types.js'
import { AgentLLM } from './agents/base.js'

/**
 * AIService 适配器
 * 使现有的 AIService 可以被 Agent 系统使用
 */
export class AIServiceAdapter implements AgentLLM {
  private service: AIService

  constructor(model: string = 'gpt-4') {
    this.service = new AIService(model)
  }

  /**
   * 生成完成
   */
  async generateCompletion(
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
  }> {
    // 转换消息格式
    const convertedMessages: Message[] = messages.map((m) => ({
      role: m.role === 'tool' ? 'user' : m.role, // 将 tool 消息转为 user
      content:
        m.role === 'tool' ? `[Tool Result for ${m.name}]: ${m.content}` : (m.content as string),
      tool_calls: m.tool_calls,
      tool_call_id: m.tool_call_id,
      name: m.name,
    }))

    // 构建请求
    const request: ChatCompletionRequest = {
      messages: convertedMessages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      tools: options?.tools as FunctionTool[],
    }

    // 调用服务
    const response = await this.service.complete(request)

    return {
      content: response.content,
      toolCalls: response.toolCalls,
    }
  }
}

/**
 * 创建 AIService 适配器的便捷函数
 */
export function createLLMAdapter(model: string = 'gpt-4'): AgentLLM {
  return new AIServiceAdapter(model)
}
