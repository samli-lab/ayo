#!/bin/bash

# MySQL Docker 启动脚本
# 使用方法: ./docker-start-mysql.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 正在启动 MySQL Docker 容器..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 错误: Docker 未运行，请先启动 Docker"
    exit 1
fi

# 启动 MySQL 容器
docker compose up -d mysql

# 等待 MySQL 启动
echo "⏳ 等待 MySQL 启动..."
sleep 5

# 检查容器状态
if docker ps | grep -q ayo_mysql; then
    echo "✅ MySQL 容器已启动"
    echo ""
    echo "📋 连接信息:"
    echo "   主机: localhost"
    echo "   端口: 3307"
    echo "   数据库: ayo_blog"
    echo "   用户名: ayo_user"
    echo "   密码: ayo_password"
    echo "   Root 密码: rootpassword"
    echo ""
    echo "🔍 查看日志: docker compose logs -f mysql"
    echo "🛑 停止容器: docker compose down"
    echo "🗑️  删除数据: docker compose down -v"
else
    echo "❌ MySQL 容器启动失败，请检查日志: docker compose logs mysql"
    exit 1
fi

