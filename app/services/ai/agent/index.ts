/**
 * Agent 系统统一导出
 *
 * 这是一个参考 LangChain 1.0 设计的 Agent 框架，支持：
 * - Tool Calling Agent（基于 OpenAI/Gemini 原生函数调用）
 * - ReAct Agent（基于提示词解析，兼容所有 LLM）
 * - 流式输出
 * - 对话记忆
 * - 并行工具调用
 * - 人工介入确认
 *
 * @example
 * ```typescript
 * import {
 *   ToolCallingAgent,
 *   AgentExecutor,
 *   BaseTool,
 *   BufferMemory,
 *   createTool
 * } from './agent'
 *
 * // 1. 创建工具
 * const searchTool = createTool({
 *   name: 'search',
 *   description: '搜索网络',
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       query: { type: 'string', description: '搜索关键词' }
 *     },
 *     required: ['query']
 *   },
 *   execute: async (input) => `搜索结果: ${input.query}`
 * })
 *
 * // 2. 创建 Agent
 * const agent = new ToolCallingAgent({
 *   tools: [searchTool],
 *   llm: yourLLMService,
 *   memory: new BufferMemory()
 * })
 *
 * // 3. 创建执行器
 * const executor = new AgentExecutor({
 *   agent,
 *   config: { maxIterations: 10 }
 * })
 *
 * // 4. 执行
 * const result = await executor.invoke('搜索今天的新闻')
 * console.log(result.output)
 *
 * // 5. 流式执行
 * for await (const event of executor.stream('计算 1+1')) {
 *   if (event.type === 'token') process.stdout.write(event.content)
 * }
 * ```
 */

// ============== 核心类型 ==============
export {
  // Schema 类型
  type PropertyType,
  type PropertySchema,
  type ToolSchema,

  // 工具调用类型
  type ToolCall,
  type FunctionDefinition,
  type ToolDefinition,

  // Agent 动作类型
  type AgentAction,
  type AgentFinish,
  type AgentDecision,
  type AgentStep,

  // 流式事件类型
  type TokenEvent,
  type ToolStartEvent,
  type ToolEndEvent,
  type HumanConfirmEvent,
  type FinishEvent,
  type ErrorEvent,
  type StreamEvent,

  // 配置类型
  type ExecutorConfig,
  type AgentConfig,
  type ReActAgentConfig,
  type ToolCallingAgentConfig,

  // 工具类型
  type ToolContext,
  type ToolResult,

  // 辅助函数
  generateId,
  isAgentFinish,
  isAgentActions,
} from './types.js'

// ============== 消息系统 ==============
export {
  // 消息类型
  type MessageType,
  type BaseMessage,
  type HumanMessage,
  type AIMessage,
  type SystemMessage,
  type ToolMessage,
  type AgentMessage,

  // 消息工厂
  createHumanMessage,
  createAIMessage,
  createSystemMessage,
  createToolMessage,

  // 消息转换
  toOpenAIMessage,
  toOpenAIMessages,
  parseToolCallsFromOpenAI,

  // 消息历史
  MessageHistory,

  // 类型守卫
  isHumanMessage,
  isAIMessage,
  isSystemMessage,
  isToolMessage,
} from './messages.js'

// ============== 工具系统 ==============
export {
  // 工具基类
  BaseTool,
  ToolRegistry,
  ToolExecutor,

  // 工具工厂
  createTool,
  type SimpleToolConfig,

  // 内置工具
  createCalculatorTool,
  createCurrentTimeTool,
} from './tool.js'

// ============== 记忆系统 ==============
export {
  // 基类
  BaseMemory,
  type MemoryStorage,
  InMemoryStorage,

  // Buffer Memory
  BufferMemory,
  WindowBufferMemory,
  type BufferMemoryConfig,

  // Summary Memory
  SummaryMemory,
  CombinedMemory,
  type SummaryMemoryConfig,
  type SummaryLLM,
} from './memory/index.js'

// ============== Agent ==============
export {
  // Agent 基类
  BaseAgent,
  type AgentLLM,

  // 停止条件
  type StopCondition,
  MaxIterationsStop,
  RepeatedActionStop,

  // Tool Calling Agent
  ToolCallingAgent,
  createToolCallingAgent,
  type ToolCallingAgentOptions,

  // ReAct Agent
  ReActAgent,
  createReActAgent,
  type ReActAgentOptions,

  // ReAct 提示词模板
  CHINESE_REACT_PROMPT,
  ENGLISH_REACT_PROMPT,
} from './agents/index.js'

// ============== 执行器 ==============
export {
  AgentExecutor,
  createAgentExecutor,
  type AgentExecutorOptions,
  type ExecutionResult,
} from './executor.js'

// ============== 适配器 ==============
export { AIServiceAdapter, createLLMAdapter } from './adapter.js'

// ============== Multi-Agent 系统 ==============
export {
  // 类型
  type MultiAgentState,
  type AgentResult,
  type SupervisorDecision,
  type WorkerAgentConfig,
  type SupervisorConfig,
  type MultiAgentExecutorConfig,
  type MultiAgentResult,
  type MultiAgentStreamEvent,
  type QAPair,

  // Supervisor
  SupervisorAgent,

  // Executor
  MultiAgentExecutor,
  createMultiAgentExecutor,
  createWorkerAgent,
  type WorkerAgent,
  type MultiAgentExecutorOptions,
  type CreateWorkerOptions,
} from './multi/index.js'
