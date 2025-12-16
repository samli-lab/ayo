import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

export default class GenerateMigrationFromModel extends BaseCommand {
  static commandName = 'generate:migration-from-model'
  static description = '从模型文件自动生成迁移文件'

  static options: CommandOptions = {
    startApp: false,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  @args.string({ description: '模型文件路径（相对于 app/models）' })
  declare modelPath: string

  @flags.string({ description: '数据库连接名称', alias: 'c' })
  declare connection: string

  @flags.boolean({ description: '是否覆盖已存在的迁移文件', alias: 'f' })
  declare force: boolean

  async run() {
    // 确保路径有 .ts 扩展名
    let modelPath = this.modelPath
    if (!modelPath.endsWith('.ts')) {
      modelPath = `${modelPath}.ts`
    }
    const modelFullPath = join(process.cwd(), 'app/models', modelPath)

    if (!existsSync(modelFullPath)) {
      this.logger.error(`模型文件不存在: ${modelFullPath}`)
      this.logger.info(`请检查路径是否正确，例如: blog/post 或 blog/post.ts`)
      process.exit(1)
    }

    // 读取模型文件
    const modelContent = readFileSync(modelFullPath, 'utf-8')

    // 解析模型信息
    const modelInfo = this.parseModel(modelContent, modelFullPath)

    // 调试输出
    this.logger.info(`找到 ${modelInfo.columns.length} 个字段`)
    if (modelInfo.columns.length === 0) {
      this.logger.error('未找到任何字段，请检查模型文件格式')
      // 输出前几行用于调试
      const lines = modelContent.split('\n').slice(0, 20)
      this.logger.info('模型文件前20行:')
      lines.forEach((line, i) => {
        this.logger.info(`${i + 1}: ${line}`)
      })
    } else {
      this.logger.info(`字段列表: ${modelInfo.columns.map((c: any) => c.name).join(', ')}`)
    }

    // 生成迁移文件
    const migrationContent = this.generateMigration(modelInfo)

    // 生成迁移文件名
    const timestamp = Date.now()
    const tableName = modelInfo.tableName
    const migrationFileName = `${timestamp}_create_${tableName}_table.ts`
    const migrationPath = join(process.cwd(), 'database/migrations', migrationFileName)

    // 检查文件是否存在
    if (existsSync(migrationPath) && !this.force) {
      this.logger.error(`迁移文件已存在: ${migrationFileName}`)
      this.logger.info('使用 --force 标志覆盖现有文件')
      process.exit(1)
    }

    // 写入迁移文件
    writeFileSync(migrationPath, migrationContent, 'utf-8')

    this.logger.success(`✅ 迁移文件已生成: ${migrationFileName}`)
    this.logger.info(`📁 路径: ${migrationPath}`)
    this.logger.info(`📋 表名: ${tableName}`)
  }

  private parseModel(content: string, filePath: string) {
    const modelName = basename(filePath, '.ts')
    const className = this.extractClassName(content)
    const tableName = this.extractTableName(content, modelName)
    const connection = this.extractConnection(content)
    const columns = this.extractColumns(content)
    const relations = this.extractRelations(content)

    return {
      className,
      tableName,
      connection: connection || this.connection || 'mysql',
      columns,
      relations,
    }
  }

  private extractClassName(content: string): string {
    const match = content.match(/export default class (\w+)/)
    return match ? match[1] : 'Model'
  }

  private extractTableName(content: string, modelName: string): string {
    // 查找 static table = 'xxx'
    const tableMatch = content.match(/static\s+table\s*=\s*['"]([^'"]+)['"]/)
    if (tableMatch) {
      return tableMatch[1]
    }

    // 如果没有指定，使用模型名的复数形式（简单实现）
    return this.pluralize(modelName.toLowerCase())
  }

  private extractConnection(content: string): string | null {
    const match = content.match(/static\s+connection\s*=\s*['"]([^'"]+)['"]/)
    return match ? match[1] : null
  }

  private extractColumns(content: string): Array<{
    name: string
    type: string
    nullable: boolean
    primary: boolean
    unique: boolean
    default?: string
    length?: number
  }> {
    // 直接使用逐行解析，更可靠
    return this.extractColumnsLineByLine(content)
  }

  private extractColumnsLineByLine(content: string): Array<{
    name: string
    type: string
    nullable: boolean
    primary: boolean
    unique: boolean
    default?: string
    length?: number
  }> {
    const columns: any[] = []
    const lines = content.split('\n')
    let currentDecorator = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // 跳过注释
      if (trimmedLine.startsWith('//')) {
        continue
      }

      // 空行：保留 currentDecorator，继续
      if (!trimmedLine) {
        continue
      }

      // 检测 @column 装饰器
      if (trimmedLine.includes('@column')) {
        currentDecorator = trimmedLine
        // 如果装饰器跨多行（如 @column({ ... })），继续读取直到找到闭合括号
        const openParens = (trimmedLine.match(/\(/g) || []).length
        const closeParens = (trimmedLine.match(/\)/g) || []).length
        if (openParens > closeParens) {
          let j = i + 1
          while (j < lines.length) {
            const nextLine = lines[j].trim()
            if (nextLine) {
              currentDecorator += ' ' + nextLine
            }
            const nextOpenParens = (nextLine.match(/\(/g) || []).length
            const nextCloseParens = (nextLine.match(/\)/g) || []).length
            if (nextCloseParens >= nextOpenParens && nextLine.includes(')')) {
              break
            }
            j++
          }
        }
        if (i < 15) {
          this.logger.info(`行 ${i + 1}: 找到 @column，设置 currentDecorator="${currentDecorator}"`)
        }
        continue
      }

      // 检测 declare 语句
      if (trimmedLine.startsWith('declare ')) {
        // 调试输出
        if (i < 15) {
          this.logger.info(`行 ${i + 1}: declare 语句，currentDecorator="${currentDecorator}"`)
        }
        if (currentDecorator && currentDecorator.includes('@column')) {
          // 修复正则：分号是可选的（TypeScript declare 语句可能没有分号）
          const declareMatch = trimmedLine.match(/declare\s+(\w+)\s*:\s*([^;]+?)(?:;|\s*$)/)
          if (i < 15) {
            this.logger.info(`  正则匹配结果: ${declareMatch ? '成功' : '失败'}`)
            if (declareMatch) {
              this.logger.info(`  匹配到的字段名: ${declareMatch[1]}, 类型: ${declareMatch[2]}`)
            }
          }
          if (declareMatch) {
            const name = declareMatch[1]
            const typeDef = declareMatch[2].trim()

            // 跳过关系字段
            if (
              name === 'category' ||
              name === 'tags' ||
              name === 'posts' ||
              currentDecorator.includes('@belongsTo') ||
              currentDecorator.includes('@hasMany') ||
              currentDecorator.includes('@manyToMany')
            ) {
              if (i < 15) {
                this.logger.info(`  ✗ 跳过关系字段: ${name}`)
              }
              currentDecorator = ''
              continue
            }

            const column = {
              name: this.camelToSnake(name),
              type: this.inferType(typeDef, currentDecorator),
              nullable: typeDef.includes('null') || typeDef.includes('| null'),
              primary: currentDecorator.includes('isPrimary'),
              unique: currentDecorator.includes('unique'),
              length: this.extractLength(currentDecorator),
              default: this.extractDefault(currentDecorator),
            }

            columns.push(column)
            if (i < 15) {
              this.logger.info(`  ✓ 提取字段: ${column.name} (${column.type})`)
            }
          } else if (i < 15) {
            this.logger.info(`  ✗ 正则匹配失败，行内容: "${trimmedLine}"`)
          }
        } else if (i < 15) {
          this.logger.info(`  ✗ 跳过：没有 @column 装饰器`)
        }
        // 处理完 declare 后重置装饰器
        currentDecorator = ''
      } else if (trimmedLine.startsWith('@')) {
        // 遇到其他装饰器（如 @belongsTo），重置
        if (!trimmedLine.includes('@column')) {
          currentDecorator = ''
        }
      } else if (
        trimmedLine.startsWith('static ') ||
        trimmedLine.startsWith('class ') ||
        trimmedLine.startsWith('export ') ||
        trimmedLine.startsWith('import ')
      ) {
        // 遇到类定义、静态属性等，重置装饰器（但只在类内部，不在类外部）
        // 检查是否在类内部（简单检查：之前有 class 关键字）
        const beforeLines = lines.slice(0, i).join('\n')
        if (beforeLines.includes('class ') || beforeLines.includes('export default class')) {
          // 在类内部，重置装饰器
          currentDecorator = ''
        }
      }
      // 其他情况保留 currentDecorator（可能是装饰器和 declare 之间的空行或其他内容）
    }

    return columns
  }

  private extractDecorator(content: string, columnName: string): string {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`declare ${columnName}:`)) {
        // 向上查找最近的 @column 装饰器（可能跨多行）
        let decorator = ''
        for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
          if (lines[j].includes('@column')) {
            decorator = lines[j].trim()
            // 如果装饰器跨多行，尝试获取更多行
            if (j > 0 && lines[j - 1].trim().startsWith('@')) {
              decorator = lines[j - 1].trim() + ' ' + decorator
            }
            return decorator
          }
        }
      }
    }
    return ''
  }

  private inferType(typeDef: string, decorator: string): string {
    // 优先检查装饰器中的类型提示（如 @column.date(), @column.dateTime()）
    if (decorator.includes('.date()')) return 'date'
    if (decorator.includes('.dateTime()')) return 'dateTime'
    if (decorator.includes('.timestamp()')) return 'timestamp'

    // 根据 TypeScript 类型推断
    if (typeDef.includes('DateTime')) return 'dateTime'
    if (typeDef.includes('Date')) return 'date'
    if (typeDef.includes('number')) {
      if (typeDef.includes('bigint') || typeDef.includes('BigInt')) {
        return 'bigInteger'
      }
      return 'integer'
    }
    if (typeDef.includes('boolean')) return 'boolean'
    if (typeDef.includes('string')) {
      // 对于长文本字段，使用 text 类型
      if (
        typeDef.includes('content') ||
        typeDef.includes('description') ||
        typeDef.includes('excerpt')
      ) {
        return 'text'
      }
      return 'string'
    }

    return 'string' // 默认
  }

  private extractLength(decorator: string): number | undefined {
    const match = decorator.match(/length:\s*(\d+)/)
    return match ? Number.parseInt(match[1], 10) : undefined
  }

  private extractDefault(decorator: string): string | undefined {
    const match = decorator.match(/default:\s*['"]?([^'"]+)['"]?/)
    return match ? match[1] : undefined
  }

  private extractRelations(content: string): Array<{
    type: string
    related: string
    foreignKey?: string
    pivotTable?: string
  }> {
    const relations: any[] = []

    // 匹配 @belongsTo, @hasMany, @manyToMany
    const belongsToMatch = content.match(/@belongsTo\(\(\)\s*=>\s*(\w+)\)/)
    if (belongsToMatch) {
      relations.push({
        type: 'belongsTo',
        related: belongsToMatch[1],
      })
    }

    const manyToManyMatch = content.match(
      /@manyToMany\(\(\)\s*=>\s*(\w+)[^}]*pivotTable:\s*['"]([^'"]+)['"]/
    )
    if (manyToManyMatch) {
      relations.push({
        type: 'manyToMany',
        related: manyToManyMatch[1],
        pivotTable: manyToManyMatch[2],
      })
    }

    return relations
  }

  private generateMigration(modelInfo: any): string {
    const { tableName, columns, relations } = modelInfo

    let migration = `import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = '${tableName}'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
`

    // 生成列定义
    for (const column of columns) {
      // 跳过已处理的时间戳字段
      if (column.name === 'created_at' || column.name === 'updated_at') {
        continue
      }

      if (column.primary && column.type === 'integer') {
        migration += `      table.increments('${column.name}').notNullable()\n`
        continue
      }

      let columnDef = `      table.${this.getColumnMethod(column.type)}('${column.name}'`

      // 为 string 类型添加合理的默认长度
      if (column.type === 'string' && !column.length) {
        // 根据字段名推断长度
        if (column.name.includes('slug') || column.name.includes('url')) {
          columnDef += ', 255'
        } else if (column.name.includes('name') || column.name.includes('title')) {
          columnDef += ', 255'
        } else if (column.name.includes('email')) {
          columnDef += ', 254'
        } else {
          columnDef += ', 255' // 默认长度
        }
      } else if (column.length) {
        columnDef += `, ${column.length}`
      }

      columnDef += ')'

      if (!column.nullable) {
        columnDef += '.notNullable()'
      }

      if (column.unique) {
        columnDef += '.unique()'
      }

      // 处理默认值
      if (column.default !== undefined && column.default !== null) {
        if (typeof column.default === 'string' && Number.isNaN(Number(column.default))) {
          columnDef += `.defaultTo('${column.default}')`
        } else {
          columnDef += `.defaultTo(${column.default})`
        }
      } else if (column.type === 'integer' && !column.nullable && !column.primary) {
        // 为整数类型添加默认值 0（如果不可空）
        columnDef += '.defaultTo(0)'
      }

      migration += columnDef + '\n'
    }

    // 添加时间戳（带时区）
    if (!columns.find((c: any) => c.name === 'created_at')) {
      migration += `      table.timestamp('created_at', { useTz: true }).notNullable()\n`
    }
    if (!columns.find((c: any) => c.name === 'updated_at')) {
      migration += `      table.timestamp('updated_at', { useTz: true }).nullable()\n`
    }

    // 生成外键
    for (const relation of relations) {
      if (relation.type === 'belongsTo') {
        const foreignKey = `${relation.related.toLowerCase()}_id`
        migration += `\n      table.foreign('${foreignKey}').references('id').inTable('${this.pluralize(relation.related.toLowerCase())}').onDelete('SET NULL')\n`
      }
    }

    // 生成索引
    for (const column of columns) {
      if (column.unique && !column.primary) {
        migration += `      table.index('${column.name}')\n`
      }
    }

    migration += `    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
`

    return migration
  }

  private getColumnMethod(type: string): string {
    const typeMap: Record<string, string> = {
      integer: 'integer',
      bigInteger: 'bigInteger',
      string: 'string',
      text: 'text',
      boolean: 'boolean',
      date: 'date',
      dateTime: 'dateTime',
      timestamp: 'timestamp',
    }

    return typeMap[type] || 'string'
  }

  private camelToSnake(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
  }

  private pluralize(str: string): string {
    // 简单的复数化规则
    if (str.endsWith('y')) {
      return str.slice(0, -1) + 'ies'
    }
    if (
      str.endsWith('s') ||
      str.endsWith('x') ||
      str.endsWith('z') ||
      str.endsWith('ch') ||
      str.endsWith('sh')
    ) {
      return str + 'es'
    }
    return str + 's'
  }
}
