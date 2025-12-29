import OpenAI from 'openai'
import {
  AIModelConfig,
  AIModelService,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types.js'

export class OpenAIService implements AIModelService {
  private client: OpenAI
  private model: string

  constructor(config: AIModelConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://api.openai.com/v1',
    })
    this.model = config.model
  }

  async generateCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      seed: request.seed,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
    })

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
