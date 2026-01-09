/**
 * AgentExecutor - Agent 执行器
 * 负责 Agent 的执行循环、工具调用、人工确认等
 */

import { AgentMessage, createHumanMessage, createAIMessage, createToolMessage } from './messages.js'
import { BaseTool, ToolRegistry, ToolExecutor } from './tool.js'
import { BaseMemory } from './memory/base.js'
import { BaseAgent, StopCondition, MaxIterationsStop } from './agents/base.js'
import {
  AgentAction,
  AgentStep,
  ExecutorConfig,
  StreamEvent,
  isAgentFinish,
  isAgentActions,
  generateId,
} from './types.js'

/**
 * AgentExecutor 配置
 */
export interface AgentExecutorOptions {
  /** Agent 实例 */
  agent: BaseAgent
  /** 工具列表（可选，默认使用 Agent 的工具） */
  tools?: BaseTool[]
  /** 执行器配置 */
  config?: Partial<ExecutorConfig>
  /** 记忆模块（可选，默认使用 Agent 的记忆） */
  memory?: BaseMemory
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  /** 最终输出 */
  output: string
  /** 执行的步骤 */
  steps: AgentStep[]
  /** 使用的消息 */
  messages: AgentMessage[]
  /** 迭代次数 */
  iterations: number
}

/**
 * AgentExecutor
 * 管理 Agent 的执行循环
 */
export class AgentExecutor {
  private agent: BaseAgent
  private toolRegistry: ToolRegistry
  private toolExecutor: ToolExecutor
  private memory?: BaseMemory
  private config: ExecutorConfig
  private stopConditions: StopCondition[]

  constructor(options: AgentExecutorOptions) {
    this.agent = options.agent
    this.memory = options.memory ?? options.agent.getMemory()

    // 初始化工具
    this.toolRegistry = new ToolRegistry()
    const tools = options.tools ?? options.agent.getTools()
    this.toolRegistry.registerMany(tools)

    // 初始化工具执行器
    this.toolExecutor = new ToolExecutor(this.toolRegistry, options.config?.toolTimeout ?? 30000)

    // 配置
    this.config = {
      maxIterations: options.config?.maxIterations ?? 10,
      continueOnError: options.config?.continueOnError ?? true,
      toolTimeout: options.config?.toolTimeout ?? 30000,
      humanConfirmation: options.config?.humanConfirmation,
      onToolStart: options.config?.onToolStart,
      onToolEnd: options.config?.onToolEnd,
    }

    // 停止条件
    this.stopConditions = [new MaxIterationsStop(this.config.maxIterations)]
  }

  /**
   * 添加停止条件
   */
  addStopCondition(condition: StopCondition): void {
    this.stopConditions.push(condition)
  }

  /**
   * 执行 Agent
   * @param input 用户输入
   * @returns 执行结果
   */
  async invoke(input: string): Promise<ExecutionResult> {
    const messages: AgentMessage[] = [createHumanMessage(input)]
    const steps: AgentStep[] = []
    let iteration = 0

    // 执行循环
    while (true) {
      iteration++

      // 检查停止条件
      for (const condition of this.stopConditions) {
        if (condition.shouldStop(steps, iteration)) {
          const output = `执行停止: ${condition.getReason()}`
          await this.saveToMemory(messages, output)
          return { output, steps, messages, iterations: iteration }
        }
      }

      // Agent 决策
      const decision = await this.agent.plan(messages, steps)

      // 如果是完成
      if (isAgentFinish(decision)) {
        await this.saveToMemory(messages, decision.output)
        return {
          output: decision.output,
          steps,
          messages,
          iterations: iteration,
        }
      }

      // 执行工具调用
      const newSteps = await this.executeActions(decision)
      steps.push(...newSteps)
    }
  }

  /**
   * 流式执行 Agent
   * @param input 用户输入
   * @yields 流式事件
   */
  async *stream(input: string): AsyncGenerator<StreamEvent> {
    const messages: AgentMessage[] = [createHumanMessage(input)]
    const steps: AgentStep[] = []
    let iteration = 0

    // 执行循环
    while (true) {
      iteration++

      // 检查停止条件
      for (const condition of this.stopConditions) {
        if (condition.shouldStop(steps, iteration)) {
          const output = `执行停止: ${condition.getReason()}`
          yield { type: 'finish', output }
          await this.saveToMemory(messages, output)
          return
        }
      }

      // 流式 Agent 决策
      let pendingActions: AgentAction[] = []
      let isFinished = false
      let finalOutput = ''

      for await (const event of this.agent.planStream(messages, steps)) {
        switch (event.type) {
          case 'token':
            yield event
            break

          case 'tool_start':
            pendingActions.push(event.action)
            break

          case 'finish':
            isFinished = true
            finalOutput = event.output
            yield event
            break

          case 'error':
            yield event
            if (!this.config.continueOnError) {
              return
            }
            break
        }
      }

      // 如果完成
      if (isFinished) {
        await this.saveToMemory(messages, finalOutput)
        return
      }

      // 执行工具调用
      if (pendingActions.length > 0) {
        for await (const event of this.executeActionsStream(pendingActions)) {
          yield event
          if (event.type === 'tool_end') {
            steps.push(event.step)
          }
        }
      }
    }
  }

  /**
   * 执行工具调用
   */
  private async executeActions(actions: AgentAction[]): Promise<AgentStep[]> {
    const steps: AgentStep[] = []

    // 分离需要确认和不需要确认的工具
    const needsConfirmation: AgentAction[] = []
    const noConfirmation: AgentAction[] = []

    for (const action of actions) {
      const tool = this.toolRegistry.get(action.toolName)
      if (tool?.requiresConfirmation && this.config.humanConfirmation) {
        needsConfirmation.push(action)
      } else {
        noConfirmation.push(action)
      }
    }

    // 并行执行不需要确认的工具
    if (noConfirmation.length > 0) {
      const parallelSteps = await this.executeParallel(noConfirmation)
      steps.push(...parallelSteps)
    }

    // 顺序执行需要确认的工具
    for (const action of needsConfirmation) {
      const step = await this.executeSingle(action, true)
      steps.push(step)
    }

    return steps
  }

  /**
   * 流式执行工具调用
   */
  private async *executeActionsStream(actions: AgentAction[]): AsyncGenerator<StreamEvent> {
    // 分离需要确认和不需要确认的工具
    const needsConfirmation: AgentAction[] = []
    const noConfirmation: AgentAction[] = []

    for (const action of actions) {
      const tool = this.toolRegistry.get(action.toolName)
      if (tool?.requiresConfirmation && this.config.humanConfirmation) {
        needsConfirmation.push(action)
      } else {
        noConfirmation.push(action)
      }
    }

    // 并行执行不需要确认的工具
    for (const action of noConfirmation) {
      yield { type: 'tool_start', action }

      if (this.config.onToolStart) {
        await this.config.onToolStart(action)
      }

      const result = await this.toolExecutor.execute(
        action.toolName,
        action.toolInput,
        undefined,
        this.config.toolTimeout
      )

      const step: AgentStep = {
        action,
        observation: result.success ? result.output : `错误: ${result.error}`,
      }

      if (this.config.onToolEnd) {
        await this.config.onToolEnd(step)
      }

      yield { type: 'tool_end', step }
    }

    // 顺序执行需要确认的工具
    for (const action of needsConfirmation) {
      // 请求确认
      const confirmed = await this.config.humanConfirmation!(action)

      yield {
        type: 'human_confirm',
        action,
        confirmed,
      }

      if (!confirmed) {
        const step: AgentStep = {
          action,
          observation: '用户拒绝执行此操作',
        }
        yield { type: 'tool_end', step }
        continue
      }

      yield { type: 'tool_start', action }

      if (this.config.onToolStart) {
        await this.config.onToolStart(action)
      }

      const result = await this.toolExecutor.execute(
        action.toolName,
        action.toolInput,
        undefined,
        this.config.toolTimeout
      )

      const step: AgentStep = {
        action,
        observation: result.success ? result.output : `错误: ${result.error}`,
      }

      if (this.config.onToolEnd) {
        await this.config.onToolEnd(step)
      }

      yield { type: 'tool_end', step }
    }
  }

  /**
   * 并行执行多个工具
   */
  private async executeParallel(actions: AgentAction[]): Promise<AgentStep[]> {
    const calls = actions.map((action) => ({
      toolName: action.toolName,
      input: action.toolInput,
      id: action.id,
    }))

    // 触发开始回调
    for (const action of actions) {
      if (this.config.onToolStart) {
        await this.config.onToolStart(action)
      }
    }

    // 并行执行
    const results = await this.toolExecutor.executeParallel(
      calls,
      undefined,
      this.config.toolTimeout
    )

    // 构建步骤结果
    const steps: AgentStep[] = []
    for (const action of actions) {
      const result = results.get(action.id)
      const step: AgentStep = {
        action,
        observation: result
          ? result.success
            ? result.output
            : `错误: ${result.error}`
          : '工具执行失败：未知错误',
      }
      steps.push(step)

      if (this.config.onToolEnd) {
        await this.config.onToolEnd(step)
      }
    }

    return steps
  }

  /**
   * 执行单个工具
   */
  private async executeSingle(
    action: AgentAction,
    requireConfirmation: boolean = false
  ): Promise<AgentStep> {
    // 人工确认
    if (requireConfirmation && this.config.humanConfirmation) {
      const confirmed = await this.config.humanConfirmation(action)
      if (!confirmed) {
        return {
          action,
          observation: '用户拒绝执行此操作',
        }
      }
    }

    // 触发开始回调
    if (this.config.onToolStart) {
      await this.config.onToolStart(action)
    }

    // 执行工具
    const result = await this.toolExecutor.execute(
      action.toolName,
      action.toolInput,
      undefined,
      this.config.toolTimeout
    )

    const step: AgentStep = {
      action,
      observation: result.success ? result.output : `错误: ${result.error}`,
    }

    // 触发结束回调
    if (this.config.onToolEnd) {
      await this.config.onToolEnd(step)
    }

    return step
  }

  /**
   * 保存到记忆
   */
  private async saveToMemory(messages: AgentMessage[], output: string): Promise<void> {
    if (this.memory) {
      await this.memory.save(messages, output)
    }
  }

  /**
   * 获取工具注册中心
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry
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
   * 更新配置
   */
  updateConfig(config: Partial<ExecutorConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

/**
 * 创建 AgentExecutor 的便捷函数
 */
export function createAgentExecutor(options: AgentExecutorOptions): AgentExecutor {
  return new AgentExecutor(options)
}
