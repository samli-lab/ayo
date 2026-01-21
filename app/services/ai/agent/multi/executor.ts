/**
 * Multi-Agent Executor
 * 管理多个 Agent 的协作执行
 */

import { AgentLLM } from '../agents/base.js'
import { BaseAgent } from '../agents/base.js'
import { AgentExecutor } from '../executor.js'
import { BaseTool } from '../tool.js'
import { SupervisorAgent } from './supervisor.js'
import {
  MultiAgentState,
  MultiAgentResult,
  MultiAgentExecutorConfig,
  MultiAgentStreamEvent,
  AgentResult,
  WorkerAgentConfig,
  QAPair,
} from './types.js'
import { ReActAgent } from '../agents/react.js'
import { ToolCallingAgent } from '../agents/tool_calling.js'

/**
 * Worker Agent 包装器
 */
export interface WorkerAgent {
  /** 配置 */
  config: WorkerAgentConfig
  /** Agent 实例 */
  agent: BaseAgent
  /** 工具列表 */
  tools: BaseTool[]
}

/**
 * Multi-Agent Executor 配置
 */
export interface MultiAgentExecutorOptions {
  /** Supervisor 使用的 LLM */
  supervisorLLM: AgentLLM
  /** Worker Agent 列表 */
  workers: WorkerAgent[]
  /** 执行器配置 */
  config?: MultiAgentExecutorConfig
  /** 是否启用规划 */
  enablePlanning?: boolean
}

/**
 * Multi-Agent Executor
 */
export class MultiAgentExecutor {
  private supervisor: SupervisorAgent
  private workers: Map<string, WorkerAgent>
  private config: MultiAgentExecutorConfig

  constructor(options: MultiAgentExecutorOptions) {
    // 初始化 Workers Map
    this.workers = new Map()
    for (const worker of options.workers) {
      this.workers.set(worker.config.name, worker)
    }

    // 初始化 Supervisor
    this.supervisor = new SupervisorAgent(options.supervisorLLM, {
      workers: options.workers.map((w) => w.config),
      enablePlanning: options.enablePlanning,
    })

    // 配置
    this.config = {
      maxIterations: options.config?.maxIterations ?? 10,
      agentTimeout: options.config?.agentTimeout ?? 60000,
      ...options.config,
    }
  }

  /**
   * 执行任务
   */
  async invoke(task: string): Promise<MultiAgentResult> {
    const startTime = Date.now()
    const agentSequence: string[] = []

    // 初始化状态
    const state: MultiAgentState = {
      task,
      messages: [],
      results: [],
    }

    let iterations = 0

    // 执行循环
    while (iterations < this.config.maxIterations!) {
      iterations++

      // 1. Supervisor 决策
      const decision = await this.supervisor.decide(state)

      if (this.config.onDecision) {
        await this.config.onDecision(decision)
      }

      // 2. 检查是否完成
      if (decision.next === 'FINISH') {
        return {
          output: decision.instruction,
          qaPairs: this.buildQAPairs(task, state.results, decision.instruction),
          results: state.results,
          iterations,
          totalDuration: Date.now() - startTime,
          agentSequence,
        }
      }

      // 3. 执行对应的 Worker Agent
      const worker = this.workers.get(decision.next)
      if (!worker) {
        // Worker 不存在，记录错误并继续
        state.results.push({
          agentName: decision.next,
          input: decision.instruction,
          output: `错误：Agent "${decision.next}" 不存在`,
          steps: [],
          duration: 0,
          success: false,
          error: `Agent "${decision.next}" 不存在`,
        })
        continue
      }

      agentSequence.push(decision.next)

      // 4. 执行 Worker
      const result = await this.executeWorker(worker, decision.instruction)

      if (this.config.onAgentEnd) {
        await this.config.onAgentEnd(result)
      }

      // 5. 更新状态
      state.results.push(result)
    }

    // 达到最大迭代次数
    const output = `执行停止：达到最大迭代次数 (${this.config.maxIterations})`
    return {
      output,
      qaPairs: this.buildQAPairs(task, state.results, output),
      results: state.results,
      iterations,
      totalDuration: Date.now() - startTime,
      agentSequence,
    }
  }

  /**
   * 构建问答对列表
   */
  private buildQAPairs(originalTask: string, results: AgentResult[], finalOutput: string): QAPair[] {
    const qaPairs: QAPair[] = []

    // 每个 Agent 的执行结果作为一个问答对
    for (const result of results) {
      qaPairs.push({
        question: result.input,
        answer: result.output,
        agent: result.agentName,
        success: result.success,
      })
    }

    // 添加最终的总结问答对
    qaPairs.push({
      question: originalTask,
      answer: finalOutput,
      agent: 'supervisor',
      success: true,
    })

    return qaPairs
  }

  /**
   * 流式执行
   */
  async *stream(task: string): AsyncGenerator<MultiAgentStreamEvent> {
    const agentSequence: string[] = []

    // 初始化状态
    const state: MultiAgentState = {
      task,
      messages: [],
      results: [],
    }

    let iterations = 0

    // 执行循环
    while (iterations < this.config.maxIterations!) {
      iterations++

      // 1. Supervisor 决策
      const decision = await this.supervisor.decide(state)
      yield { type: 'decision', decision }

      // 2. 检查是否完成
      if (decision.next === 'FINISH') {
        yield { type: 'finish', output: decision.instruction }
        return
      }

      // 3. 获取 Worker
      const worker = this.workers.get(decision.next)
      if (!worker) {
        const errorResult: AgentResult = {
          agentName: decision.next,
          input: decision.instruction,
          output: `错误：Agent "${decision.next}" 不存在`,
          steps: [],
          duration: 0,
          success: false,
          error: `Agent "${decision.next}" 不存在`,
        }
        state.results.push(errorResult)
        yield { type: 'agent_end', result: errorResult }
        continue
      }

      agentSequence.push(decision.next)
      yield { type: 'agent_start', agentName: decision.next, input: decision.instruction }

      // 4. 执行 Worker（目前不支持子流式，直接执行）
      const result = await this.executeWorker(worker, decision.instruction)
      state.results.push(result)
      yield { type: 'agent_end', result }
    }

    // 达到最大迭代次数
    yield {
      type: 'finish',
      output: `执行停止：达到最大迭代次数 (${this.config.maxIterations})`,
    }
  }

  /**
   * 执行单个 Worker Agent
   */
  private async executeWorker(worker: WorkerAgent, instruction: string): Promise<AgentResult> {
    const startTime = Date.now()

    if (this.config.onAgentStart) {
      await this.config.onAgentStart(worker.config.name, instruction)
    }

    try {
      // 创建执行器
      const executor = new AgentExecutor({
        agent: worker.agent,
        tools: worker.tools,
        config: {
          maxIterations: 5,
          toolTimeout: this.config.agentTimeout,
        },
      })

      // 执行
      const result = await executor.invoke(instruction)

      return {
        agentName: worker.config.name,
        input: instruction,
        output: result.output,
        steps: result.steps,
        duration: Date.now() - startTime,
        success: true,
      }
    } catch (error) {
      return {
        agentName: worker.config.name,
        input: instruction,
        output: '',
        steps: [],
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * 获取所有 Worker 名称
   */
  getWorkerNames(): string[] {
    return Array.from(this.workers.keys())
  }

  /**
   * 添加 Worker
   */
  addWorker(worker: WorkerAgent): void {
    this.workers.set(worker.config.name, worker)
  }

  /**
   * 移除 Worker
   */
  removeWorker(name: string): boolean {
    return this.workers.delete(name)
  }
}

/**
 * 创建 Worker Agent 的便捷函数
 */
export interface CreateWorkerOptions {
  /** Agent 名称 */
  name: string
  /** Agent 描述 */
  description: string
  /** LLM 服务 */
  llm: AgentLLM
  /** 工具列表 */
  tools?: BaseTool[]
  /** Agent 类型 */
  agentType?: 'react' | 'tool_calling'
  /** 系统提示词 */
  systemPrompt?: string
}

export function createWorkerAgent(options: CreateWorkerOptions): WorkerAgent {
  const tools = options.tools ?? []

  const agent =
    options.agentType === 'tool_calling'
      ? new ToolCallingAgent({
          tools,
          llm: options.llm,
          config: {
            systemPrompt: options.systemPrompt ?? `你是 ${options.name}。${options.description}`,
          },
        })
      : new ReActAgent({
          tools,
          llm: options.llm,
          config: {
            systemPrompt: options.systemPrompt ?? `你是 ${options.name}。${options.description}`,
          },
        })

  return {
    config: {
      name: options.name,
      description: options.description,
      systemPrompt: options.systemPrompt,
    },
    agent,
    tools,
  }
}

/**
 * 创建 Multi-Agent Executor 的便捷函数
 */
export function createMultiAgentExecutor(options: MultiAgentExecutorOptions): MultiAgentExecutor {
  return new MultiAgentExecutor(options)
}
