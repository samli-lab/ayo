import type { HttpContext } from '@adonisjs/core/http'
import { AIService } from '#services/ai/service'

export default class AiTestController {
  /**
   * @imageGenerationTest
   * @summary 图像理解与生成测试 (图生文/图生图)
   * @description 支持纯文本生成图片，也支持上传图片进行理解或风格迁移
   */
  async imageGenerationTest(ctx: HttpContext) {
    const prompt = ctx.request.input('prompt')
    const lockIdentity = ctx.request.input('lockIdentity', false)
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
}
