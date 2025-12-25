import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Category from '#models/blog/category'
import Tag from '#models/blog/tag'
import Gallery from '#models/blog/gallery'

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

    // 3. 初始化相册数据
    await Gallery.updateOrCreateMany('url', [
      {
        url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80',
        title: '远方',
        description: '在山海之间寻找片刻宁静',
        sortOrder: 1,
      },
      {
        url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80',
        title: '晨曦',
        description: '第一缕阳光穿过云层的瞬间',
        sortOrder: 2,
      },
      {
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
        title: '林间',
        description: '呼吸森林深处的清新',
        sortOrder: 3,
      },
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        title: '幽谷',
        description: '流水潺潺，时光缓缓',
        sortOrder: 4,
      },
      {
        url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        title: '峰峦',
        description: '众山小，心自宽',
        sortOrder: 5,
      },
      {
        url: 'https://images.unsplash.com/photo-1434725039720-abb26e22ebe5?auto=format&fit=crop&w=800&q=80',
        title: '草甸',
        description: '绿意铺满大地的画卷',
        sortOrder: 6,
      },
      {
        url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
        title: '足迹',
        description: '走过的每一段路都算数',
        sortOrder: 7,
      },
      {
        url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        title: '秘境',
        description: '隐藏在尘世之外的绝色',
        sortOrder: 8,
      },
      {
        url: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=800&q=80',
        title: '光影',
        description: '大自然是最伟大的艺术家',
        sortOrder: 9,
      },
    ])
  }
}
