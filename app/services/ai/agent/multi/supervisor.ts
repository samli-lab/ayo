/**
 * Supervisor Agent
 * 负责任务规划和分配
 */

import { AgentLLM } from '../agents/base.js'
import {
  SupervisorConfig,
  SupervisorDecision,
  MultiAgentState,
  WorkerAgentConfig,
} from './types.js'

/**
 * 默认 Supervisor 系统提示词
 */
const DEFAULT_SUPERVISOR_PROMPT = `你是一个任务协调者（Supervisor）。

可用的专业 Agent：
{workers}

【重要】你必须且只能输出以下 JSON 格式，不要输出任何其他内容：
{"next":"agent名称","instruction":"具体指令","reasoning":"理由"}

示例输出：
{"next":"math_agent","instruction":"计算 100 的平方","reasoning":"用户需要数学计算"}

规则：
1. next 必须是上面列出的 agent 名称之一，或者 "FINISH"
2. 任务需要多步时，每次只分配一步
3. 所有步骤完成后，next 设为 "FINISH"，instruction 写最终答案
4. 只输出 JSON，不要有任何解释文字`

/**
 * 规划阶段的提示词
 */
const PLANNING_PROMPT = `分析以下任务，制定执行计划：

任务：{task}

可用的 Agent：
{workers}

请输出详细的执行计划，格式为：
1. 步骤1: [agent名称] - 具体任务
2. 步骤2: [agent名称] - 具体任务
...

只输出计划，不要执行。`

/**
 * Supervisor Agent
 */
export class SupervisorAgent {
  private llm: AgentLLM
  private config: SupervisorConfig
  private systemPrompt: string

  constructor(llm: AgentLLM, config: SupervisorConfig) {
    this.llm = llm
    this.config = config
    this.systemPrompt = this.buildSystemPrompt()
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(): string {
    const workersDesc = this.config.workers.map((w) => `- ${w.name}: ${w.description}`).join('\n')

    const template = this.config.systemPrompt || DEFAULT_SUPERVISOR_PROMPT
    return template.replace('{workers}', workersDesc)
  }

  /**
   * 生成任务计划
   */
  async plan(task: string): Promise<string[]> {
    const workersDesc = this.config.workers.map((w) => `- ${w.name}: ${w.description}`).join('\n')

    const prompt = PLANNING_PROMPT.replace('{task}', task).replace('{workers}', workersDesc)

    const response = await this.llm.generateCompletion([
      { role: 'system', content: '你是一个任务规划专家。' },
      { role: 'user', content: prompt },
    ])

    // 解析计划步骤
    const lines = response.content.split('\n').filter((line) => line.trim())
    const steps: string[] = []

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)/)
      if (match) {
        steps.push(match[1].trim())
      }
    }

    return steps.length > 0 ? steps : [task]
  }

  /**
   * 做出决策：下一步该由谁执行
   */
  async decide(state: MultiAgentState): Promise<SupervisorDecision> {
    // 构建上下文消息
    const messages = this.buildContextMessages(state)

    // 调用 LLM
    const response = await this.llm.generateCompletion(messages)

    // 解析决策
    return this.parseDecision(response.content)
  }

  /**
   * 构建上下文消息
   */
  private buildContextMessages(
    state: MultiAgentState
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: this.systemPrompt },
    ]

    // 添加原始任务
    messages.push({
      role: 'user',
      content: `任务：${state.task}`,
    })

    // 添加计划（如果有）
    if (state.plan && state.plan.length > 0) {
      messages.push({
        role: 'assistant',
        content: `执行计划：\n${state.plan.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      })
    }

    // 添加已执行的结果
    if (state.results.length > 0) {
      const resultsText = state.results
        .map((r) => {
          const status = r.success ? '成功' : `失败: ${r.error}`
          return `[${r.agentName}] ${status}\n输入: ${r.input}\n输出: ${r.output}`
        })
        .join('\n\n')

      messages.push({
        role: 'user',
        content: `已完成的步骤：\n${resultsText}\n\n请决定下一步。`,
      })
    } else {
      messages.push({
        role: 'user',
        content: '请决定第一步应该做什么。',
      })
    }

    return messages
  }

  /**
   * 解析 LLM 的决策输出
   */
  private parseDecision(content: string): SupervisorDecision {
    console.log('[Supervisor] 原始响应:', content)

    // 1. 尝试解析 JSON
    try {
      // 提取 JSON 部分（支持 markdown 代码块）
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*?\}/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        const parsed = JSON.parse(jsonStr)
        if (parsed.next && this.isValidWorkerOrFinish(parsed.next)) {
          return {
            next: parsed.next,
            instruction: parsed.instruction || '',
            reasoning: parsed.reasoning,
          }
        }
      }
    } catch (e) {
      console.log('[Supervisor] JSON 解析失败:', e)
    }

    // 2. 尝试正则匹配 JSON 字段
    const nextMatch = content.match(/"next"\s*:\s*"([^"]+)"/i)
    const instructionMatch = content.match(/"instruction"\s*:\s*"([^"]+)"/i)

    if (nextMatch && this.isValidWorkerOrFinish(nextMatch[1])) {
      return {
        next: nextMatch[1],
        instruction: instructionMatch?.[1] || content,
        reasoning: content,
      }
    }

    // 3. 尝试直接匹配 worker 名称
    for (const worker of this.config.workers) {
      if (content.includes(worker.name)) {
        return {
          next: worker.name,
          instruction: this.extractInstruction(content, worker.name),
          reasoning: `从文本中匹配到 ${worker.name}`,
        }
      }
    }

    // 4. 根据关键词智能匹配 worker
    const keywordMatch = this.matchWorkerByKeywords(content)
    if (keywordMatch) {
      return {
        next: keywordMatch.name,
        instruction: content,
        reasoning: `根据关键词匹配到 ${keywordMatch.name}`,
      }
    }

    // 5. 检查是否包含 FINISH 或完成的意图
    if (
      content.toLowerCase().includes('finish') ||
      content.includes('完成') ||
      content.includes('最终答案')
    ) {
      return {
        next: 'FINISH',
        instruction: content,
        reasoning: '检测到完成意图',
      }
    }

    // 6. 兜底：选择第一个 worker（而不是直接 FINISH）
    if (this.config.workers.length > 0) {
      const firstWorker = this.config.workers[0]
      return {
        next: firstWorker.name,
        instruction: content,
        reasoning: `无法解析，默认分配给 ${firstWorker.name}`,
      }
    }

    // 最终兜底
    return {
      next: 'FINISH',
      instruction: content,
      reasoning: '无法解析决策，默认完成',
    }
  }

  /**
   * 检查是否是有效的 worker 名称或 FINISH
   */
  private isValidWorkerOrFinish(name: string): boolean {
    return name === 'FINISH' || this.config.workers.some((w) => w.name === name)
  }

  /**
   * 从文本中提取指令
   */
  private extractInstruction(content: string, workerName: string): string {
    // 尝试提取 worker 名称之后的内容
    const parts = content.split(workerName)
    if (parts.length > 1) {
      return parts[1].trim().replace(/^[:\s\-]+/, '')
    }
    return content
  }

  /**
   * 根据关键词匹配 worker
   */
  private matchWorkerByKeywords(content: string): WorkerAgentConfig | null {
    const lowerContent = content.toLowerCase()

    // 定义关键词映射
    const keywordMap: Record<string, string[]> = {
      math: ['计算', '数学', '加', '减', '乘', '除', '平方', '开方', 'calculate', 'math'],
      time: ['时间', '几点', '日期', '现在', 'time', 'date', 'clock'],
      search: ['搜索', '查找', '查询', '搜一下', 'search', 'find', 'lookup'],
      code: ['代码', '编程', '程序', 'code', 'program'],
      file: ['文件', '读取', '写入', 'file', 'read', 'write'],
    }

    for (const worker of this.config.workers) {
      // 从 worker 名称中提取关键词类型
      for (const [type, keywords] of Object.entries(keywordMap)) {
        if (worker.name.toLowerCase().includes(type)) {
          // 检查内容是否包含这些关键词
          for (const keyword of keywords) {
            if (lowerContent.includes(keyword)) {
              return worker
            }
          }
        }
      }

      // 也检查 worker 的描述
      const descKeywords = worker.description.toLowerCase().split(/[\s,，。.]+/)
      for (const keyword of descKeywords) {
        if (keyword.length > 1 && lowerContent.includes(keyword)) {
          return worker
        }
      }
    }

    return null
  }

  /**
   * 获取 Worker 配置
   */
  getWorker(name: string): WorkerAgentConfig | undefined {
    return this.config.workers.find((w) => w.name === name)
  }

  /**
   * 获取所有 Worker 名称
   */
  getWorkerNames(): string[] {
    return this.config.workers.map((w) => w.name)
  }

  /**
   * 检查是否是有效的 Worker 名称
   */
  isValidWorker(name: string): boolean {
    return this.config.workers.some((w) => w.name === name)
  }
}
