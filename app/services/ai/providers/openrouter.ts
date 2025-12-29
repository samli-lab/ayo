import {
  AIModelConfig,
  AIModelService,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types.js'

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenRouterService implements AIModelService {
  private apiKey: string
  private model: string
  private baseURL = 'https://openrouter.ai/api/v1'

  constructor(config: AIModelConfig) {
    this.apiKey = config.apiKey
    this.model = config.model
  }

  async generateCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'http://localhost:3333', // 需要根据实际部署环境修改
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        seed: request.seed,
        top_p: request.topP,
        top_k: request.topK,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const completion = (await response.json()) as OpenRouterResponse

    return {
      content: completion.choices[0].message.content || '',
      model: this.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    }
  }
}
