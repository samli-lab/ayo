#!/bin/bash

# MongoDB Docker 启动脚本

echo "正在启动 MongoDB Docker 容器..."

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 切换到脚本目录
cd "$SCRIPT_DIR"

# 启动 Docker Compose
docker compose up -d

# 检查启动状态
if [ $? -eq 0 ]; then
    echo "✅ MongoDB 容器启动成功！"
    echo ""
    echo "连接信息："
    echo "  主机: localhost"
    echo "  端口: 27018"
    echo "  用户名: root"
    echo "  密码: rootpassword"
    echo "  数据库: ayo_blog"
    echo ""
    echo "连接字符串示例："
    echo "  mongodb://root:rootpassword@localhost:27018/ayo_blog?authSource=admin"
    echo ""
    echo "查看日志: docker logs ayo_mongodb"
    echo "停止容器: docker compose down"
else
    echo "❌ MongoDB 容器启动失败，请检查 Docker 是否运行"
    exit 1
fi
