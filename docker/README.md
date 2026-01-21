# Docker 部署指南（应用 + MySQL/Redis）

本项目是 AdonisJS(v6) + TypeScript，生产启动命令为 `node build/bin/server.js`。

本目录文档包含：
- 应用如何打包成 Docker 镜像并运行
- 如何启动本地 MySQL（项目内置脚本/Compose）
- 如何启动本地 Redis（用于 limiter/lock/queue 等）

## 1) 打包应用镜像（Dockerfile）

在项目根目录执行：

```bash
docker build -t ayo:latest .
```

### 镜像优化点（已在配置里处理）

- 多阶段构建：构建阶段装全量依赖，运行阶段只保留 production 依赖
- `.dockerignore`：避免把无关文件打进构建上下文，提高构建速度
- `dumb-init`：更可靠的信号转发与进程退出（便于容器优雅停机）
- 非 root 运行：运行阶段使用 `node` 用户

## 2) 准备环境变量（必须）

项目在启动时会对环境变量做严格校验（见 `start/env.ts`），因此需要提供 **所有必填项**。

推荐做法：在项目根目录准备一个 `.env`（或任意文件名），然后用 `--env-file` 注入到容器。

- **容器监听**：请确保 `HOST=0.0.0.0`，否则容器端口可能无法被映射访问
- **连接本机 MySQL/Redis（Docker Desktop）**：在容器里访问宿主机请使用 `host.docker.internal`

## 3) 运行应用容器

```bash
docker run --rm \
  -p 3333:3333 \
  --env-file ./.env \
  ayo:latest
```

## 4) 运行数据库迁移 / 启动队列 worker（可选）

镜像内包含 `build` 产物与 `database` 目录，你可以直接执行 Adonis 命令。

```bash
# 迁移（生产环境一般需要 --force）
docker run --rm --env-file ./.env ayo:latest node build/ace.js migration:run --force

# 队列 worker（示例：默认 worker）
docker run --rm --env-file ./.env ayo:latest node build/ace.js queue:worker
```

---

## MySQL（本地开发/测试）

### 方法 1: 使用启动脚本（推荐）

```bash
./scripts/mysql/docker-start-mysql.sh
```

### 方法 2: 使用 Docker Compose

```bash
# 启动 MySQL
docker compose -f ./scripts/mysql/docker-compose.yml up -d mysql

# 查看日志
docker compose -f ./scripts/mysql/docker-compose.yml logs -f mysql

# 停止 MySQL
docker compose -f ./scripts/mysql/docker-compose.yml down

# 停止并删除数据卷（会删除所有数据）
docker compose -f ./scripts/mysql/docker-compose.yml down -v
```

## 连接信息

- **主机**: `localhost`
- **端口**: `3307`
- **数据库名**: `ayo_blog`
- **用户名**: `ayo_user`
- **密码**: `ayo_password`
- **Root 密码**: `rootpassword`

## 环境变量配置

在你的 `.env` 文件中配置以下变量：

```env
DB_HOST=localhost
DB_PORT=3307
DB_USER=ayo_user
DB_PASSWORD=ayo_password
DB_DATABASE=ayo_blog
```

### 应用在容器里连接 MySQL（推荐配置）

如果 MySQL 是按上面方式发布到宿主机 `3307`，应用容器可用：

```env
DB_HOST=host.docker.internal
DB_PORT=3307
```

## 常用命令

```bash
# 进入 MySQL 容器
docker exec -it ayo_mysql mysql -u ayo_user -payo_password ayo_blog

# 使用 root 用户进入
docker exec -it ayo_mysql mysql -u root -prootpassword

# 查看容器状态
docker ps | grep ayo_mysql

# 查看容器日志
docker logs ayo_mysql

# 重启容器
docker compose -f ./scripts/mysql/docker-compose.yml restart mysql

# 备份数据库
docker exec ayo_mysql mysqldump -u ayo_user -payo_password ayo_blog > backup.sql

# 恢复数据库
docker exec -i ayo_mysql mysql -u ayo_user -payo_password ayo_blog < backup.sql
```

## 数据持久化

数据存储在 Docker volume `mysql_data` 中，即使删除容器，数据也会保留。

要完全删除数据：

```bash
docker compose -f ./scripts/mysql/docker-compose.yml down -v
```

## 自定义配置

如果需要修改数据库配置，编辑 `scripts/mysql/docker-compose.yml` 文件中的环境变量：

```yaml
environment:
  MYSQL_ROOT_PASSWORD: your_root_password
  MYSQL_DATABASE: your_database_name
  MYSQL_USER: your_username
  MYSQL_PASSWORD: your_password
```

修改后需要重新创建容器：

```bash
docker compose -f ./scripts/mysql/docker-compose.yml down -v
docker compose -f ./scripts/mysql/docker-compose.yml up -d mysql
```

---

## Redis（本地开发/测试）

项目的 limiter/lock/queue 等依赖 Redis（环境变量见 `start/env.ts` 的 `REDIS_*`）。

最简单的本地启动方式：

```bash
docker run -d --name ayo_redis -p 6379:6379 redis:7-alpine
```

本机运行应用时：

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

应用在容器里连接宿主机 Redis 时：

```env
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
```

