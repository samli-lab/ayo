import type { HttpContext } from '@adonisjs/core/http'
import { AIService } from '#services/ai/service'
import {
  ToolCallingAgent,
  ReActAgent,
  AgentExecutor,
  createTool,
  BufferMemory,
  createLLMAdapter,
  createCalculatorTool,
  createCurrentTimeTool,
  createWorkerAgent,
  MultiAgentExecutor,
} from '#services/ai/agent/index'

export default class AiTestController {
  /**
   * @imageGenerationTest
   * @summary 图像理解与生成测试 (图生文/图生图)
   * @description 支持纯文本生成图片，也支持上传图片进行理解或风格迁移
   */
  async imageGenerationTest(ctx: HttpContext) {
    const prompt = ctx.request.input('prompt')
    const imageFile = ctx.request.file('image', {
      size: '5mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp'],
    })

    try {
      // 构造符合你要求的 parts 结构
      const parts: any[] = []

      // 1. 添加文本 part
      if (prompt) {
        parts.push({ text: prompt })
      }

      // 2. 添加图片 part (如果存在)
      if (imageFile) {
        await imageFile.move(process.cwd() + '/tmp/uploads')
        const fs = await import('node:fs')
        const imageBuffer = fs.readFileSync(imageFile.filePath!)
        const base64Image = imageBuffer.toString('base64')
        const mimeType = `image/${imageFile.extname === 'jpg' ? 'jpeg' : imageFile.extname}`

        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        })
      }

      // 如果既没有文本也没有图片，给一个默认提示
      if (parts.length === 0) {
        parts.push({ text: 'Generate an image' })
      }

      const ai = new AIService('gemini-3-image')

      const response = await ai.complete({
        messages: [
          {
            role: 'user',
            content: parts,
          },
        ],
        temperature: 0.7,
        imageConditioning: {
          personIdentity: 'LOCK',
        },
      })

      // 解析结果：尝试从返回的 Markdown 中提取 Base64 图片
      let base64Result = null
      const imageMatch = response.content.match(/!\[.*?\]\((data:image\/[^;]+;base64,([\s\S]+?))\)/)
      if (imageMatch) {
        base64Result = imageMatch[1] // 完整的 data:image/png;base64,...
      }

      return ctx.response.json({
        success: true,
        data: {
          hasImageInput: !!imageFile,
          prompt,
          model: response.model,
          // 如果提取到了图片，直接返回 Data URL，否则返回原始文本
          result: base64Result || response.content,
          isImage: !!base64Result,
          rawResponse: response.content,
          usage: response.usage,
        },
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '图像测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @flashChatTest
   * @summary Gemini 3 Flash 聊天测试
   * @description 使用 gemini-3-flash 模型测试快速对话功能
   */
  async flashChatTest(ctx: HttpContext) {
    const message = ctx.request.input('message', 'Hello, who are you?')

    try {
      // 使用刚刚在 Registry 中注册的 gemini-3-flash 键
      const ai = new AIService('gemini-3-flash')
      const response = await ai.chat(message)

      return ctx.response.json({
        success: true,
        data: {
          model: 'gemini-3-flash',
          input: message,
          output: response,
        },
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: 'Flash 聊天测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @chatTest
   * @summary 普通聊天测试
   */
  async chatTest(ctx: HttpContext) {
    const message = ctx.request.input('message', '你好')
    const model = ctx.request.input('model', 'gpt-3.5-turbo')

    try {
      const ai = new AIService(model)
      const content = await ai.chat(message)

      return ctx.response.json({
        success: true,
        data: {
          model,
          message,
          response: content,
        },
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '聊天测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @agentTest
   * @summary Agent 系统测试
   * @description 测试 Agent 系统的工具调用能力
   * @param message - 用户消息
   * @param agentType - Agent 类型 (tool_calling 或 react)
   * @param model - 使用的模型
   */
  async agentTest(ctx: HttpContext) {
    const message = ctx.request.input('message', '现在几点了？然后帮我计算 123 * 456')
    const agentType = ctx.request.input('agentType', 'react') // tool_calling 或 react
    const model = ctx.request.input('model', 'gpt-4')

    try {
      // 1. 创建 LLM 适配器
      const llm = createLLMAdapter(model)

      // 2. 创建工具
      const tools = [
        createCalculatorTool(),
        createCurrentTimeTool(),
        // 自定义搜索工具（模拟）
        createTool({
          name: 'search',
          description: '搜索网络获取信息',
          schema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: '搜索关键词' },
            },
            required: ['query'],
          },
          execute: async (input) => {
            // 模拟搜索结果
            return `搜索 "${input.query}" 的结果：这是一个模拟的搜索结果，实际使用时应接入真实的搜索API。`
          },
        }),
      ]

      // 3. 创建记忆
      const memory = new BufferMemory({ maxMessages: 20 })

      // 4. 创建 Agent（根据类型选择）
      const agent =
        agentType === 'tool_calling'
          ? new ToolCallingAgent({
              tools,
              llm,
              memory,
              config: {
                systemPrompt: '你是一个有用的AI助手，可以使用工具来帮助用户完成任务。',
                temperature: 0.7,
              },
            })
          : new ReActAgent({
              tools,
              llm,
              memory,
              config: {
                systemPrompt: '你是一个有用的AI助手，请使用提供的工具来帮助用户。',
                temperature: 0.7,
              },
            })

      // 5. 创建执行器
      const executor = new AgentExecutor({
        agent,
        config: {
          maxIterations: 5,
          continueOnError: true,
          onToolStart: (action) => {
            console.log(`[Agent] 开始调用工具: ${action.toolName}`, action.toolInput)
          },
          onToolEnd: (step) => {
            console.log(`[Agent] 工具执行完成: ${step.action.toolName}`, step.observation)
          },
        },
      })

      // 6. 执行
      const result = await executor.invoke(message)

      return ctx.response.json({
        success: true,
        data: {
          agentType,
          model,
          input: message,
          output: result.output,
          iterations: result.iterations,
          steps: result.steps.map((step) => ({
            tool: step.action.toolName,
            input: step.action.toolInput,
            observation: step.observation,
          })),
        },
      })
    } catch (error) {
      console.error('[Agent Test Error]', error)
      return ctx.response.status(500).json({
        success: false,
        message: 'Agent 测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  /**
   * @agentStreamTest
   * @summary Agent 流式输出测试
   * @description 测试 Agent 系统的流式输出能力
   */
  async agentStreamTest(ctx: HttpContext) {
    const message = ctx.request.input('message', '帮我计算 100 + 200 的结果')
    const model = ctx.request.input('model', 'gpt-4')

    try {
      // 创建 Agent
      const llm = createLLMAdapter(model)
      const tools = [createCalculatorTool(), createCurrentTimeTool()]

      const agent = new ReActAgent({
        tools,
        llm,
        config: { temperature: 0.7 },
      })

      const executor = new AgentExecutor({
        agent,
        config: { maxIterations: 5 },
      })

      // 收集流式事件
      const events: Array<{ type: string; data: unknown }> = []

      for await (const event of executor.stream(message)) {
        events.push({
          type: event.type,
          data:
            event.type === 'token'
              ? event.content
              : event.type === 'tool_start'
                ? { tool: event.action.toolName, input: event.action.toolInput }
                : event.type === 'tool_end'
                  ? { tool: event.step.action.toolName, observation: event.step.observation }
                  : event.type === 'finish'
                    ? event.output
                    : event,
        })
      }

      return ctx.response.json({
        success: true,
        data: {
          model,
          input: message,
          events,
        },
      })
    } catch (error) {
      console.error('[Agent Stream Test Error]', error)
      return ctx.response.status(500).json({
        success: false,
        message: 'Agent 流式测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @multiAgentTest
   * @summary Multi-Agent 系统测试
   * @description 测试 Supervisor 模式的多 Agent 协作
   * @param task - 用户任务
   * @param model - 使用的模型
   */
  async multiAgentTest(ctx: HttpContext) {
    const task = ctx.request.input(
      'task',
      '帮我查一下北京现在的时间，然后计算如果现在是下午3点，距离晚上8点还有多少分钟'
    )
    const model = ctx.request.input('model', 'gpt-4')

    try {
      // 1. 创建 Supervisor 使用的 LLM
      const supervisorLLM = createLLMAdapter(model)

      // 2. 创建专业 Worker Agents
      const workers = [
        // 数学计算专家
        createWorkerAgent({
          name: 'math_agent',
          description: '数学计算专家，可以进行各种数学运算',
          llm: createLLMAdapter(model),
          tools: [createCalculatorTool()],
          agentType: 'react',
          systemPrompt: '你是一个数学计算专家。请使用计算器工具来完成数学运算。',
        }),

        // 时间查询专家
        createWorkerAgent({
          name: 'time_agent',
          description: '时间查询专家，可以获取当前时间',
          llm: createLLMAdapter(model),
          tools: [createCurrentTimeTool()],
          agentType: 'react',
          systemPrompt: '你是一个时间查询专家。请使用时间工具来获取当前时间。',
        }),

        // 搜索专家（模拟）
        createWorkerAgent({
          name: 'search_agent',
          description: '信息搜索专家，可以搜索网络获取信息',
          llm: createLLMAdapter(model),
          tools: [
            createTool({
              name: 'web_search',
              description: '搜索网络获取信息',
              schema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: '搜索关键词' },
                },
                required: ['query'],
              },
              execute: async (input) => {
                // 模拟搜索结果
                return `搜索 "${input.query}" 的结果：这是模拟的搜索结果。实际使用时请接入真实搜索API。`
              },
            }),
          ],
          agentType: 'react',
          systemPrompt: '你是一个信息搜索专家。请使用搜索工具来查找信息。',
        }),
      ]

      // 3. 创建 Multi-Agent Executor
      const executor = new MultiAgentExecutor({
        supervisorLLM,
        workers,
        config: {
          maxIterations: 10,
          onDecision: (decision) => {
            console.log(`[Supervisor] 决策: ${decision.next}`)
            console.log(`[Supervisor] 指令: ${decision.instruction}`)
            console.log(`[Supervisor] 理由: ${decision.reasoning}`)
          },
          onAgentStart: (agentName, input) => {
            console.log(`[${agentName}] 开始执行: ${input}`)
          },
          onAgentEnd: (result) => {
            console.log(`[${result.agentName}] 完成: ${result.success ? '成功' : '失败'}`)
            console.log(`[${result.agentName}] 输出: ${result.output}`)
          },
        },
      })

      // 4. 执行
      const result = await executor.invoke(task)

      return ctx.response.json({
        success: true,
        data: {
          model,
          task,
          output: result.output,
          // 问答对格式的结果
          qaPairs: result.qaPairs,
          // 详细信息
          iterations: result.iterations,
          totalDuration: result.totalDuration,
          agentSequence: result.agentSequence,
        },
      })
    } catch (error) {
      console.error('[Multi-Agent Test Error]', error)
      return ctx.response.status(500).json({
        success: false,
        message: 'Multi-Agent 测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  /**
   * @multiAgentMock
   * @summary Multi-Agent 模拟接口
   * @description 模拟 Multi-Agent 系统的返回结果（用于前端开发）
   * @param task - 用户任务
   */
  async multiAgentMock(ctx: HttpContext) {
    const task = ctx.request.input('task', '帮我计算100的平方，然后告诉我现在几点')

    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 模拟返回结果
    const mockResult = {
      success: true,
      data: {
        model: 'gpt-4',
        task,
        output: '100的平方是10000。现在是2026年1月8日下午3点30分。',
        qaPairs: [
          {
            question: '计算100的平方',
            answer: '10000',
            agent: 'math_agent',
            success: true,
          },
          {
            question: '获取当前时间',
            answer: '2026年1月8日 15:30:00',
            agent: 'time_agent',
            success: true,
          },
          {
            question: task,
            answer: '100的平方是10000。现在是2026年1月8日下午3点30分。',
            agent: 'supervisor',
            success: true,
          },
        ],
        iterations: 3,
        totalDuration: 2500,
        agentSequence: ['math_agent', 'time_agent'],
      },
    }

    return ctx.response.json(mockResult)
  }
}
