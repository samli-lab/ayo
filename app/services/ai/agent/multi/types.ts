/**
 * Multi-Agent 系统类型定义
 */

import { AgentMessage } from '../messages.js'
import { AgentStep } from '../types.js'

/**
 * Multi-Agent 共享状态
 */
export interface MultiAgentState {
  /** 原始任务 */
  task: string
  /** 消息历史 */
  messages: AgentMessage[]
  /** 当前计划（步骤列表） */
  plan?: string[]
  /** 当前执行到的步骤索引 */
  currentStep?: number
  /** 各 Agent 的执行结果 */
  results: AgentResult[]
  /** 最终输出 */
  finalOutput?: string
  /** 额外元数据 */
  metadata?: Record<string, unknown>
}

/**
 * Agent 执行结果
 */
export interface AgentResult {
  /** 执行的 Agent 名称 */
  agentName: string
  /** 输入 */
  input: string
  /** 输出 */
  output: string
  /** 执行的步骤 */
  steps: AgentStep[]
  /** 执行时间（毫秒） */
  duration: number
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
}

/**
 * Supervisor 决策结果
 */
export interface SupervisorDecision {
  /** 下一个要执行的 Agent，或 "FINISH" 表示完成 */
  next: string
  /** 给下一个 Agent 的指令 */
  instruction: string
  /** 决策理由 */
  reasoning?: string
}

/**
 * Worker Agent 配置
 */
export interface WorkerAgentConfig {
  /** Agent 名称（唯一标识） */
  name: string
  /** Agent 描述（用于 Supervisor 了解其能力） */
  description: string
  /** 系统提示词 */
  systemPrompt?: string
}

/**
 * Supervisor 配置
 */
export interface SupervisorConfig {
  /** 可用的 Worker Agent 列表 */
  workers: WorkerAgentConfig[]
  /** 自定义系统提示词 */
  systemPrompt?: string
  /** 最大迭代次数 */
  maxIterations?: number
  /** 是否启用规划阶段 */
  enablePlanning?: boolean
}

/**
 * Multi-Agent 执行器配置
 */
export interface MultiAgentExecutorConfig {
  /** 最大迭代次数 */
  maxIterations?: number
  /** 单个 Agent 超时时间 */
  agentTimeout?: number
  /** 回调：Agent 开始执行 */
  onAgentStart?: (agentName: string, input: string) => void | Promise<void>
  /** 回调：Agent 执行完成 */
  onAgentEnd?: (result: AgentResult) => void | Promise<void>
  /** 回调：Supervisor 决策 */
  onDecision?: (decision: SupervisorDecision) => void | Promise<void>
}

/**
 * 问答对
 */
export interface QAPair {
  /** 问题（子任务） */
  question: string
  /** 答案 */
  answer: string
  /** 执行的 Agent */
  agent?: string
  /** 是否成功 */
  success?: boolean
}

/**
 * Multi-Agent 执行结果
 */
export interface MultiAgentResult {
  /** 最终输出 */
  output: string
  /** 问答对列表 */
  qaPairs: QAPair[]
  /** 所有 Agent 的执行结果 */
  results: AgentResult[]
  /** 总迭代次数 */
  iterations: number
  /** 总耗时（毫秒） */
  totalDuration: number
  /** 执行的 Agent 序列 */
  agentSequence: string[]
}

/**
 * 流式事件类型
 */
export type MultiAgentStreamEvent =
  | { type: 'planning'; plan: string[] }
  | { type: 'decision'; decision: SupervisorDecision }
  | { type: 'agent_start'; agentName: string; input: string }
  | { type: 'agent_token'; agentName: string; content: string }
  | { type: 'agent_end'; result: AgentResult }
  | { type: 'finish'; output: string }
  | { type: 'error'; error: Error }
