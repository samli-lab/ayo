import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Category from '#models/blog/category'
import Tag from '#models/blog/tag'

export default class extends BaseSeeder {
  async run() {
    // 1. 初始化分类数据
    await Category.updateOrCreateMany('name', [
      { name: '技术', description: '编程、架构、前沿技术探索' },
      { name: '设计', description: 'UI/UX、产品设计、审美研究' },
      { name: '生活', description: '随笔、旅行、感悟分享' },
      { name: '工具', description: '利器推荐、效率提升技巧' },
    ])

    // 2. 初始化标签数据
    await Tag.updateOrCreateMany('name', [
      { name: 'React', description: '前端 UI 框架' },
      { name: 'Node.js', description: 'JavaScript 服务端运行环境' },
      { name: 'TypeScript', description: '强类型的 JavaScript' },
      { name: 'AdonisJS', description: '全栈 Web 框架' },
      { name: 'Next.js', description: 'React 服务端渲染框架' },
      { name: 'TailwindCSS', description: '原子化 CSS 框架' },
      { name: 'MySQL', description: '关系型数据库' },
      { name: 'Docker', description: '容器化技术' },
    ])
  }
}
