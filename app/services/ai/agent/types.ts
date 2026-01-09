/**
 * Agent系统核心类型定义
 * 参考 LangChain 1.0 设计
 */

// ============== JSON Schema 类型 ==============

/**
 * JSON Schema 属性类型
 */
export type PropertyType = 'string' | 'number' | 'boolean' | 'array' | 'object'

/**
 * JSON Schema 属性定义
 */
export interface PropertySchema {
  type: PropertyType
  description?: string
  enum?: string[]
  items?: PropertySchema
  properties?: Record<string, PropertySchema>
  required?: string[]
  default?: unknown
}

/**
 * 工具参数 Schema（JSON Schema 子集）
 */
export interface ToolSchema {
  type: 'object'
  properties: Record<string, PropertySchema>
  required?: string[]
}

// ============== 工具调用类型 ==============

/**
 * 工具调用定义（用于LLM响应）
 */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/**
 * OpenAI 函数定义格式
 */
export interface FunctionDefinition {
  name: string
  description: string
  parameters: ToolSchema
}

/**
 * OpenAI Tool 格式
 */
export interface ToolDefinition {
  type: 'function'
  function: FunctionDefinition
}

// ============== Agent 动作类型 ==============

/**
 * Agent 工具调用动作
 */
export interface AgentAction {
  type: 'tool_call'
  toolName: string
  toolInput: Record<string, unknown>
  id: string // 用于并行调用追踪
}

/**
 * Agent 完成动作
 */
export interface AgentFinish {
  type: 'finish'
  output: string
}

/**
 * Agent 决策结果
 */
export type AgentDecision = AgentAction[] | AgentFinish

/**
 * Agent 执行步骤结果
 */
export interface AgentStep {
  action: AgentAction
  observation: string
}

// ============== 流式事件类型 ==============

/**
 * Token 流事件
 */
export interface TokenEvent {
  type: 'token'
  content: string
}

/**
 * 工具开始事件
 */
export interface ToolStartEvent {
  type: 'tool_start'
  action: AgentAction
}

/**
 * 工具结束事件
 */
export interface ToolEndEvent {
  type: 'tool_end'
  step: AgentStep
}

/**
 * 人工确认事件
 */
export interface HumanConfirmEvent {
  type: 'human_confirm'
  action: AgentAction
  confirmed: boolean
}

/**
 * 完成事件
 */
export interface FinishEvent {
  type: 'finish'
  output: string
}

/**
 * 错误事件
 */
export interface ErrorEvent {
  type: 'error'
  error: Error
}

/**
 * 所有流式事件类型
 */
export type StreamEvent =
  | TokenEvent
  | ToolStartEvent
  | ToolEndEvent
  | HumanConfirmEvent
  | FinishEvent
  | ErrorEvent

// ============== 执行器配置类型 ==============

/**
 * 人工确认回调函数
 */
export type HumanConfirmationFn = (action: AgentAction) => Promise<boolean>

/**
 * 工具开始回调函数
 */
export type OnToolStartFn = (action: AgentAction) => void | Promise<void>

/**
 * 工具结束回调函数
 */
export type OnToolEndFn = (step: AgentStep) => void | Promise<void>

/**
 * AgentExecutor 配置
 */
export interface ExecutorConfig {
  /** 最大迭代次数，防止无限循环 */
  maxIterations: number
  /** 人工确认回调，用于敏感操作前暂停 */
  humanConfirmation?: HumanConfirmationFn
  /** 工具开始执行回调 */
  onToolStart?: OnToolStartFn
  /** 工具执行结束回调 */
  onToolEnd?: OnToolEndFn
  /** 是否在工具执行失败时继续（默认 true） */
  continueOnError?: boolean
  /** 单个工具执行超时时间（毫秒） */
  toolTimeout?: number
}

// ============== Agent 配置类型 ==============

/**
 * Agent 基础配置
 */
export interface AgentConfig {
  /** 系统提示词 */
  systemPrompt?: string
  /** 温度参数 */
  temperature?: number
  /** 最大输出 token 数 */
  maxTokens?: number
}

/**
 * ReAct Agent 配置
 */
export interface ReActAgentConfig extends AgentConfig {
  /** 自定义提示词模板 */
  promptTemplate?: string
}

/**
 * Tool Calling Agent 配置
 */
export interface ToolCallingAgentConfig extends AgentConfig {
  /** 是否强制使用工具（parallel_tool_calls） */
  parallelToolCalls?: boolean
}

// ============== 工具类型 ==============

/**
 * 工具执行上下文
 */
export interface ToolContext {
  /** 当前对话的消息历史 */
  conversationId?: string
  /** 用户信息 */
  userId?: string
  /** 额外元数据 */
  metadata?: Record<string, unknown>
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  /** 执行是否成功 */
  success: boolean
  /** 结果内容 */
  output: string
  /** 错误信息（如果失败） */
  error?: string
  /** 额外元数据 */
  metadata?: Record<string, unknown>
}

// ============== 辅助类型 ==============

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 判断是否为 AgentFinish
 */
export function isAgentFinish(decision: AgentDecision): decision is AgentFinish {
  return !Array.isArray(decision) && decision.type === 'finish'
}

/**
 * 判断是否为 AgentAction 数组
 */
export function isAgentActions(decision: AgentDecision): decision is AgentAction[] {
  return Array.isArray(decision)
}
