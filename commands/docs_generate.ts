import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

export default class DocsGenerate extends BaseCommand {
  static commandName = 'docs:generate'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    const Router = await this.app.container.make('router')
    Router.commit()
    await AutoSwagger.default.writeFile(Router.toJSON(), swagger)

    // Move generated Swagger files to doc/swagger directory
    const docDir = join(process.cwd(), 'doc/swagger/')
    const swaggerJsonPath = join(process.cwd(), 'swagger.json')
    const swaggerYamlPath = join(process.cwd(), 'swagger.yml')

    // Ensure doc directory exists
    await fs.mkdir(docDir, { recursive: true })

    // Move files
    try {
      await fs.rename(swaggerJsonPath, join(docDir, 'swagger.json'))
      await fs.rename(swaggerYamlPath, join(docDir, 'swagger.yml'))
      this.logger.success(
        'Swagger documentation has been successfully moved to doc/swagger directory'
      )
    } catch (error) {
      this.logger.error('Error moving Swagger documentation:', error.message)
    }
  }
}
