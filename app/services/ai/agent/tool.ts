/**
 * Agent 工具系统
 * 参考 LangChain 1.0 Tool 设计
 */

import { ToolSchema, FunctionDefinition, ToolDefinition, ToolContext, ToolResult } from './types.js'

// ============== 工具基类 ==============

/**
 * 工具基类
 * 所有自定义工具都应继承此类
 */
export abstract class BaseTool {
  /** 工具名称（唯一标识） */
  abstract name: string

  /** 工具描述（用于LLM理解工具用途） */
  abstract description: string

  /** 工具参数 Schema */
  abstract schema: ToolSchema

  /** 是否需要人工确认后才能执行 */
  requiresConfirmation: boolean = false

  /** 工具标签（用于分类） */
  tags: string[] = []

  /**
   * 执行工具
   * @param input 工具输入参数
   * @param context 执行上下文
   * @returns 执行结果字符串
   */
  abstract execute(input: Record<string, unknown>, context?: ToolContext): Promise<string>

  /**
   * 安全执行工具（带错误处理）
   */
  async safeExecute(input: Record<string, unknown>, context?: ToolContext): Promise<ToolResult> {
    try {
      // 验证输入参数
      const validation = this.validateInput(input)
      if (!validation.valid) {
        return {
          success: false,
          output: '',
          error: `参数验证失败: ${validation.error}`,
        }
      }

      const output = await this.execute(input, context)
      return {
        success: true,
        output,
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * 验证输入参数
   */
  validateInput(input: Record<string, unknown>): { valid: boolean; error?: string } {
    const { properties, required } = this.schema

    // 检查必需字段
    if (required) {
      for (const field of required) {
        if (!(field in input) || input[field] === undefined) {
          return { valid: false, error: `缺少必需参数: ${field}` }
        }
      }
    }

    // 检查字段类型
    for (const [key, value] of Object.entries(input)) {
      if (key in properties) {
        const propSchema = properties[key]
        const actualType = Array.isArray(value) ? 'array' : typeof value

        if (propSchema.type !== actualType && value !== null && value !== undefined) {
          // 允许 number 传入 string 字段（会自动转换）
          if (!(propSchema.type === 'string' && actualType === 'number')) {
            return {
              valid: false,
              error: `参数 ${key} 类型错误: 期望 ${propSchema.type}，实际 ${actualType}`,
            }
          }
        }

        // 检查枚举值
        if (propSchema.enum && !propSchema.enum.includes(String(value))) {
          return {
            valid: false,
            error: `参数 ${key} 值无效: 必须是 [${propSchema.enum.join(', ')}] 之一`,
          }
        }
      }
    }

    return { valid: true }
  }

  /**
   * 转换为 OpenAI Function 定义格式
   */
  toFunctionDefinition(): FunctionDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.schema,
    }
  }

  /**
   * 转换为 OpenAI Tool 定义格式
   */
  toToolDefinition(): ToolDefinition {
    return {
      type: 'function',
      function: this.toFunctionDefinition(),
    }
  }

  /**
   * 转换为 ReAct 提示词格式
   */
  toPromptDescription(): string {
    const params = Object.entries(this.schema.properties)
      .map(([name, prop]) => {
        const required = this.schema.required?.includes(name) ? '(必需)' : '(可选)'
        return `    - ${name} (${prop.type}) ${required}: ${prop.description || ''}`
      })
      .join('\n')

    return `${this.name}: ${this.description}\n  参数:\n${params}`
  }
}

// ============== 工具注册中心 ==============

/**
 * 工具注册中心
 * 管理所有可用工具
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map()

  /**
   * 注册工具
   */
  register(tool: BaseTool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`工具 "${tool.name}" 已存在，将被覆盖`)
    }
    this.tools.set(tool.name, tool)
  }

  /**
   * 批量注册工具
   */
  registerMany(tools: BaseTool[]): void {
    for (const tool of tools) {
      this.register(tool)
    }
  }

  /**
   * 获取工具
   */
  get(name: string): BaseTool | undefined {
    return this.tools.get(name)
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * 移除工具
   */
  remove(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * 获取所有工具
   */
  getAll(): BaseTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * 获取所有工具名称
   */
  getNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * 按标签筛选工具
   */
  getByTag(tag: string): BaseTool[] {
    return this.getAll().filter((tool) => tool.tags.includes(tag))
  }

  /**
   * 获取需要人工确认的工具
   */
  getRequiresConfirmation(): BaseTool[] {
    return this.getAll().filter((tool) => tool.requiresConfirmation)
  }

  /**
   * 转换为 OpenAI Function 定义数组
   */
  toFunctionDefinitions(): FunctionDefinition[] {
    return this.getAll().map((tool) => tool.toFunctionDefinition())
  }

  /**
   * 转换为 OpenAI Tool 定义数组
   */
  toToolDefinitions(): ToolDefinition[] {
    return this.getAll().map((tool) => tool.toToolDefinition())
  }

  /**
   * 转换为 ReAct 提示词
   */
  toPromptDescriptions(): string {
    return this.getAll()
      .map((tool) => tool.toPromptDescription())
      .join('\n\n')
  }

  /**
   * 工具数量
   */
  get size(): number {
    return this.tools.size
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.tools.clear()
  }
}

// ============== 工具工厂函数 ==============

/**
 * 创建简单工具的配置
 */
export interface SimpleToolConfig {
  name: string
  description: string
  schema: ToolSchema
  execute: (input: Record<string, unknown>, context?: ToolContext) => Promise<string>
  requiresConfirmation?: boolean
  tags?: string[]
}

/**
 * 创建简单工具（无需继承类）
 */
export function createTool(config: SimpleToolConfig): BaseTool {
  return new (class extends BaseTool {
    name = config.name
    description = config.description
    schema = config.schema
    requiresConfirmation = config.requiresConfirmation ?? false
    tags = config.tags ?? []

    async execute(input: Record<string, unknown>, context?: ToolContext): Promise<string> {
      return config.execute(input, context)
    }
  })()
}

// ============== 内置工具示例 ==============

/**
 * 创建一个简单的计算器工具
 */
export function createCalculatorTool(): BaseTool {
  return createTool({
    name: 'calculator',
    description: '执行数学计算，支持基本的加减乘除和括号',
    schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '数学表达式，如 "2 + 3 * 4" 或 "(10 - 5) / 2"',
        },
      },
      required: ['expression'],
    },
    async execute(input) {
      const expression = String(input.expression)
      // 安全的数学表达式计算（只允许数字和基本运算符）
      if (!/^[\d\s+\-*/().]+$/.test(expression)) {
        throw new Error('表达式包含非法字符')
      }
      try {
        // 使用 Function 而不是 eval 来限制作用域
        const result = new Function(`return (${expression})`)()
        return String(result)
      } catch {
        throw new Error('表达式计算失败')
      }
    },
  })
}

/**
 * 创建一个当前时间工具
 */
export function createCurrentTimeTool(): BaseTool {
  return createTool({
    name: 'current_time',
    description: '获取当前日期和时间',
    schema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: '时区，如 "Asia/Shanghai"，默认为系统时区',
        },
        format: {
          type: 'string',
          description: '时间格式，可选 "iso", "locale", "timestamp"',
          enum: ['iso', 'locale', 'timestamp'],
        },
      },
    },
    async execute(input) {
      const now = new Date()
      const format = (input.format as string) || 'locale'

      switch (format) {
        case 'iso':
          return now.toISOString()
        case 'timestamp':
          return String(now.getTime())
        case 'locale':
        default:
          if (input.timezone) {
            return now.toLocaleString('zh-CN', { timeZone: input.timezone as string })
          }
          return now.toLocaleString('zh-CN')
      }
    },
  })
}

// ============== 工具执行器 ==============

/**
 * 工具执行器
 * 统一管理工具的执行
 */
export class ToolExecutor {
  private registry: ToolRegistry
  private defaultTimeout: number

  constructor(registry: ToolRegistry, defaultTimeout: number = 30000) {
    this.registry = registry
    this.defaultTimeout = defaultTimeout
  }

  /**
   * 执行单个工具
   */
  async execute(
    toolName: string,
    input: Record<string, unknown>,
    context?: ToolContext,
    timeout?: number
  ): Promise<ToolResult> {
    const tool = this.registry.get(toolName)
    if (!tool) {
      return {
        success: false,
        output: '',
        error: `工具 "${toolName}" 不存在`,
      }
    }

    const timeoutMs = timeout ?? this.defaultTimeout

    // 带超时的执行
    const timeoutPromise = new Promise<ToolResult>((_, reject) => {
      setTimeout(() => reject(new Error(`工具执行超时 (${timeoutMs}ms)`)), timeoutMs)
    })

    try {
      const result = await Promise.race([tool.safeExecute(input, context), timeoutPromise])
      return result
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * 并行执行多个工具
   */
  async executeParallel(
    calls: Array<{ toolName: string; input: Record<string, unknown>; id: string }>,
    context?: ToolContext,
    timeout?: number
  ): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>()

    const promises = calls.map(async (call) => {
      const result = await this.execute(call.toolName, call.input, context, timeout)
      results.set(call.id, result)
    })

    await Promise.all(promises)
    return results
  }
}
