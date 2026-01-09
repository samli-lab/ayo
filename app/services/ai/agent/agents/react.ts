/**
 * ReAct Agent
 * 基于提示词 + 解析的 Agent，兼容所有 LLM
 */

import {
  AgentMessage,
  createSystemMessage,
  createHumanMessage,
  createAIMessage,
} from '../messages.js'
import { BaseTool } from '../tool.js'
import { BaseMemory } from '../memory/base.js'
import {
  AgentAction,
  AgentFinish,
  AgentDecision,
  AgentStep,
  ReActAgentConfig,
  StreamEvent,
  generateId,
  isAgentFinish,
} from '../types.js'
import { BaseAgent, AgentLLM } from './base.js'

/**
 * ReAct Agent 配置
 */
export interface ReActAgentOptions {
  /** 工具列表 */
  tools: BaseTool[]
  /** LLM 服务 */
  llm: AgentLLM
  /** 记忆模块 */
  memory?: BaseMemory
  /** Agent 配置 */
  config?: ReActAgentConfig
}

/**
 * 默认的 ReAct 提示词模板
 */
const DEFAULT_REACT_PROMPT = `你是一个有用的AI助手。请按照以下格式回答问题：

你可以使用以下工具：
{tools}

请严格按照以下格式回复：

Question: 需要回答的问题
Thought: 思考应该做什么
Action: 要执行的动作，必须是 [{tool_names}] 中的一个
Action Input: 动作的输入参数（JSON格式）
Observation: 动作的结果（由系统提供）
... (Thought/Action/Action Input/Observation 可以重复多次)
Thought: 我现在知道最终答案了
Final Answer: 最终答案

重要提示：
- 如果不需要使用工具，直接输出 Final Answer
- Action Input 必须是合法的 JSON 格式
- 每次只能执行一个 Action

开始！`

/**
 * ReAct Agent
 * 使用提示词引导 LLM 输出结构化思考，通过解析获取工具调用
 */
export class ReActAgent extends BaseAgent {
  private agentConfig: ReActAgentConfig
  private promptTemplate: string

  constructor(options: ReActAgentOptions) {
    super(options)
    this.agentConfig = options.config ?? {}
    this.promptTemplate = this.agentConfig.promptTemplate ?? DEFAULT_REACT_PROMPT
  }

  /**
   * 核心决策方法
   */
  async plan(messages: AgentMessage[], intermediateSteps: AgentStep[]): Promise<AgentDecision> {
    // 构建 ReAct 提示词
    const prompt = this.buildPrompt(messages, intermediateSteps)

    // 调用 LLM（不使用工具，纯文本生成）
    const response = await this.llm.generateCompletion(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      {
        temperature: this.agentConfig.temperature,
        maxTokens: this.agentConfig.maxTokens,
      }
    )

    // 解析 ReAct 输出
    return this.parseReActOutput(response.content)
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

    // 构建提示词
    const prompt = this.buildPrompt(messages, intermediateSteps)

    // 流式调用
    let fullContent = ''

    for await (const chunk of this.llm.generateCompletionStream(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      {
        temperature: this.agentConfig.temperature,
        maxTokens: this.agentConfig.maxTokens,
      }
    )) {
      if (chunk.type === 'token' && chunk.content) {
        fullContent += chunk.content
        yield { type: 'token', content: chunk.content }
      }

      if (chunk.type === 'done') {
        // 解析完整输出
        const result = this.parseReActOutput(fullContent)

        if (isAgentFinish(result)) {
          yield { type: 'finish', output: result.output }
        } else {
          for (const action of result) {
            yield { type: 'tool_start', action }
          }
        }
      }
    }
  }

  /**
   * 构建 ReAct 提示词
   */
  private buildPrompt(
    messages: AgentMessage[],
    intermediateSteps: AgentStep[]
  ): { system: string; user: string } {
    // 构建工具描述
    const toolDescriptions = this.toolRegistry.toPromptDescriptions()
    const toolNames = this.toolRegistry.getNames().join(', ')

    // 替换模板变量
    let systemPrompt = this.promptTemplate
      .replace('{tools}', toolDescriptions)
      .replace('{tool_names}', toolNames)

    // 如果有自定义系统提示词，添加到前面
    if (this.agentConfig.systemPrompt) {
      systemPrompt = this.agentConfig.systemPrompt + '\n\n' + systemPrompt
    }

    // 构建用户消息，包含历史步骤
    let userContent = ''

    // 提取用户输入
    const userMessage = messages.find((m) => m.type === 'human')
    if (userMessage) {
      userContent += `Question: ${userMessage.content}\n`
    }

    // 添加历史步骤（scratchpad）
    if (intermediateSteps.length > 0) {
      userContent += '\n' + this.formatScratchpad(intermediateSteps)
    }

    return {
      system: systemPrompt,
      user: userContent,
    }
  }

  /**
   * 格式化中间步骤为 scratchpad
   */
  private formatScratchpad(steps: AgentStep[]): string {
    return steps
      .map((step) => {
        return (
          `Thought: 我需要使用 ${step.action.toolName} 工具\n` +
          `Action: ${step.action.toolName}\n` +
          `Action Input: ${JSON.stringify(step.action.toolInput)}\n` +
          `Observation: ${step.observation}`
        )
      })
      .join('\n')
  }

  /**
   * 解析 ReAct 输出
   */
  private parseReActOutput(output: string): AgentDecision {
    // 检查是否有 Final Answer
    const finalAnswerMatch = output.match(/Final Answer:\s*([\s\S]*?)(?:$|(?=\nQuestion:))/i)
    if (finalAnswerMatch) {
      return {
        type: 'finish',
        output: finalAnswerMatch[1].trim(),
      }
    }

    // 解析 Action 和 Action Input
    const actionMatch = output.match(/Action:\s*([^\n]+)/i)
    const actionInputMatch = output.match(/Action Input:\s*([\s\S]*?)(?=\n(?:Observation|Thought|Action|Final)|$)/i)

    if (actionMatch) {
      const toolName = actionMatch[1].trim()
      let toolInput: Record<string, unknown> = {}

      if (actionInputMatch) {
        const inputStr = actionInputMatch[1].trim()
        try {
          // 尝试解析 JSON
          toolInput = JSON.parse(inputStr)
        } catch {
          // 如果不是有效 JSON，尝试作为简单字符串处理
          // 检查是否是简单的 key: value 格式
          if (inputStr.includes(':')) {
            const lines = inputStr.split('\n')
            for (const line of lines) {
              const colonIndex = line.indexOf(':')
              if (colonIndex > 0) {
                const key = line.slice(0, colonIndex).trim()
                const value = line.slice(colonIndex + 1).trim()
                toolInput[key] = value
              }
            }
          } else {
            // 作为单一输入参数
            toolInput = { input: inputStr }
          }
        }
      }

      const action: AgentAction = {
        type: 'tool_call',
        toolName,
        toolInput,
        id: generateId(),
      }

      return [action]
    }

    // 如果没有匹配到任何模式，将整个输出作为最终答案
    return {
      type: 'finish',
      output: output.trim(),
    }
  }

  /**
   * 设置提示词模板
   */
  setPromptTemplate(template: string): void {
    this.promptTemplate = template
  }

  /**
   * 获取当前提示词模板
   */
  getPromptTemplate(): string {
    return this.promptTemplate
  }
}

/**
 * 创建 ReAct Agent 的便捷函数
 */
export function createReActAgent(options: ReActAgentOptions): ReActAgent {
  return new ReActAgent(options)
}

/**
 * 中文 ReAct 提示词模板
 */
export const CHINESE_REACT_PROMPT = `你是一个智能助手，可以使用工具来帮助用户完成任务。

可用工具：
{tools}

请严格按照以下格式思考和行动：

问题: 用户的问题
思考: 分析问题，决定是否需要使用工具
动作: 选择一个工具，必须是 [{tool_names}] 之一
动作输入: 工具参数（JSON格式）
观察结果: 工具返回的结果
... (可以重复多次思考-动作-观察)
思考: 我已经得到了足够的信息
最终答案: 给用户的完整回答

注意：
1. 动作输入必须是有效的 JSON
2. 每次只能执行一个动作
3. 如果不需要工具，直接给出最终答案

开始！`

/**
 * 英文 ReAct 提示词模板
 */
export const ENGLISH_REACT_PROMPT = `You are a helpful assistant that can use tools to help users.

Available tools:
{tools}

Please respond in the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action (JSON format)
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Important:
1. Action Input must be valid JSON
2. Only one action per step
3. If no tool is needed, provide Final Answer directly

Begin!`
