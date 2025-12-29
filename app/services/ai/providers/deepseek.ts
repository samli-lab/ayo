import {
  AIModelConfig,
  AIModelService,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types.js'

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface DeepSeekErrorResponse {
  error?: {
    message: string
  }
}

export class DeepSeekService implements AIModelService {
  private apiKey: string
  private model: string
  private baseURL = 'https://api.deepseek.com/v1'

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
      const errorData = (await response.json().catch(() => ({}))) as DeepSeekErrorResponse
      throw new Error(
        `DeepSeek API error: ${response.statusText}${
          errorData.error ? ` - ${errorData.error.message}` : ''
        }`
      )
    }

    const completion = (await response.json()) as DeepSeekResponse

    return {
      content: completion.choices[0].message.content || '',
      model: this.model,
      usage: {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      },
    }
  }
}
