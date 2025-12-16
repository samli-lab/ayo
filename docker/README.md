# Docker MySQL 数据库使用指南

## 快速开始

### 方法 1: 使用启动脚本（推荐）

```bash
./docker-start-mysql.sh
```

### 方法 2: 使用 Docker Compose

```bash
# 启动 MySQL
docker-compose up -d mysql

# 查看日志
docker-compose logs -f mysql

# 停止 MySQL
docker-compose down

# 停止并删除数据卷（会删除所有数据）
docker-compose down -v
```

## 连接信息

- **主机**: `localhost`
- **端口**: `3306`
- **数据库名**: `ayo_blog`
- **用户名**: `ayo_user`
- **密码**: `ayo_password`
- **Root 密码**: `rootpassword`

## 环境变量配置

在你的 `.env` 文件中配置以下变量：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=ayo_user
DB_PASSWORD=ayo_password
DB_DATABASE=ayo_blog
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
docker-compose restart mysql

# 备份数据库
docker exec ayo_mysql mysqldump -u ayo_user -payo_password ayo_blog > backup.sql

# 恢复数据库
docker exec -i ayo_mysql mysql -u ayo_user -payo_password ayo_blog < backup.sql
```

## 数据持久化

数据存储在 Docker volume `mysql_data` 中，即使删除容器，数据也会保留。

要完全删除数据：

```bash
docker-compose down -v
```

## 自定义配置

如果需要修改数据库配置，编辑 `docker-compose.yml` 文件中的环境变量：

```yaml
environment:
  MYSQL_ROOT_PASSWORD: your_root_password
  MYSQL_DATABASE: your_database_name
  MYSQL_USER: your_username
  MYSQL_PASSWORD: your_password
```

修改后需要重新创建容器：

```bash
docker-compose down -v
docker-compose up -d mysql
```

