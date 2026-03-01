// MongoDB 初始化脚本

// 切换到目标数据库
db = db.getSiblingDB('ayo_blog');

// 创建应用用户
db.createUser({
  user: 'ayo_user',
  pwd: 'ayo_password',
  roles: [
    {
      role: 'readWrite',
      db: 'ayo_blog'
    }
  ]
});

// 创建示例集合（可选）
db.createCollection('posts');
db.createCollection('users');
db.createCollection('comments');

// 创建索引
db.posts.createIndex({ slug: 1 }, { unique: true });
db.posts.createIndex({ createdAt: -1 });
db.posts.createIndex({ published: 1 });
db.users.createIndex({ email: 1 }, { unique: true });

print('MongoDB 初始化完成！');
