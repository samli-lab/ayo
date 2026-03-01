# MongoDB Docker 配置

这个目录包含了用于本地开发的 MongoDB Docker 配置。

## 快速开始

### 启动 MongoDB

```bash
# 方法 1: 使用启动脚本（推荐）
./scripts/mongodb/docker-start-mongodb.sh

# 方法 2: 直接使用 docker compose
cd scripts/mongodb
docker compose up -d
```

### 停止 MongoDB

```bash
cd scripts/mongodb
docker compose down
```

### 完全清理（包括数据）

```bash
cd scripts/mongodb
docker compose down -v
```

## 连接信息

- **主机**: `localhost`
- **端口**: `27018` (避免与本地 MongoDB 默认端口冲突)
- **Root 用户名**: `root`
- **Root 密码**: `rootpassword`
- **应用用户名**: `ayo_user`
- **应用密码**: `ayo_password`
- **数据库**: `ayo_blog`

## 连接字符串

### 使用 Root 用户

```
mongodb://root:rootpassword@localhost:27018/ayo_blog?authSource=admin
```

### 使用应用用户

```
mongodb://ayo_user:ayo_password@localhost:27018/ayo_blog
```

## 常用命令

### 查看日志

```bash
docker logs ayo_mongodb
docker logs -f ayo_mongodb  # 实时查看
```

### 进入 MongoDB Shell

```bash
# 使用 root 用户
docker exec -it ayo_mongodb mongosh -u root -p rootpassword --authenticationDatabase admin

# 使用应用用户
docker exec -it ayo_mongodb mongosh -u ayo_user -p ayo_password ayo_blog
```

### 查看容器状态

```bash
docker ps | grep ayo_mongodb
```

### 重启容器

```bash
cd scripts/mongodb
docker compose restart
```

## 初始化脚本

初始化脚本位于 `docker/mongodb/init/init-mongo.js`，会在容器首次启动时自动执行。

脚本会：
- 创建应用用户 `ayo_user`
- 创建基础集合（posts, users, comments）
- 创建常用索引

## 数据持久化

数据存储在 Docker volume 中：
- `mongodb_data`: 数据库数据
- `mongodb_config`: 配置文件

## 注意事项

1. **端口冲突**: 默认映射到 27018 端口，如果需要修改，请编辑 `docker-compose.yml`
2. **密码安全**: 生产环境请务必修改默认密码
3. **数据备份**: 开发环境数据，建议定期备份重要数据
4. **性能**: 这是开发环境配置，生产环境需要更多优化

## 在 AdonisJS 中使用

如果需要在项目中连接 MongoDB，可以安装相应的包：

```bash
pnpm add mongodb
# 或
pnpm add mongoose
```

然后在 `.env` 中配置：

```env
MONGODB_URL=mongodb://ayo_user:ayo_password@localhost:27018/ayo_blog
```
