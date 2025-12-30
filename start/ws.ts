/*
|--------------------------------------------------------------------------
| WebSocket routes file
|--------------------------------------------------------------------------
|
| The WebSocket routes file is used for defining the WebSocket server
| using native WebSocket (ws library)
|
*/

import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'
import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'node:http'
import { parse } from 'node:url'
import env from '#start/env'

let wss: WebSocketServer | null = null

// 存储连接的客户端
const clients = new Map<string, { ws: WebSocket; userId?: number; rooms: Set<string> }>()

app.ready(async () => {
  // 检查环境变量，决定是否启动 WebSocket
  const enableWebSocket = env.get('ENABLE_WEBSOCKET', false)

  if (!enableWebSocket) {
    console.log('WebSocket is disabled (ENABLE_WEBSOCKET=false)')
    return
  }

  const httpServer = server.getNodeServer()

  if (!httpServer) {
    console.error('HTTP server not available')
    return
  }

  // 创建 WebSocket 服务器
  wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
  })

  console.log('✅ WebSocket server initialized on /ws')

  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    const clientId = generateClientId()
    const rooms = new Set<string>()

    clients.set(clientId, { ws, rooms })

    console.log(`客户端连接: ${clientId}`)

    // 解析 URL 查询参数
    const url = request.url ? parse(request.url, true) : null
    const token = url?.query?.token as string | undefined

    // 发送连接成功消息
    sendMessage(ws, {
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString(),
    })

    // 处理消息
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())
        handleMessage(clientId, message, token)
      } catch (error: any) {
        console.error('解析消息失败:', error)
        sendError(ws, 'Invalid message format')
      }
    })

    // 处理断开连接
    ws.on('close', () => {
      console.log(`客户端断开连接: ${clientId}`)
      const client = clients.get(clientId)
      if (client) {
        // 通知房间内其他用户
        client.rooms.forEach((roomId) => {
          broadcastToRoom(
            roomId,
            {
              type: 'user:left',
              clientId,
              roomId,
              timestamp: new Date().toISOString(),
            },
            clientId
          )
        })
      }
      clients.delete(clientId)
    })

    // 处理错误
    ws.on('error', (error) => {
      console.error(`WebSocket 错误 [${clientId}]:`, error)
    })
  })
})

/**
 * 处理客户端消息
 */
function handleMessage(clientId: string, message: any, token?: string) {
  const client = clients.get(clientId)
  if (!client) {
    return
  }

  const { ws } = client

  switch (message.type) {
    case 'join:chat':
      handleJoinChat(clientId)
      break

    case 'chat:message':
      handleChatMessage(clientId, message.data)
      break

    case 'room:join':
      handleRoomJoin(clientId, message.data?.roomId)
      break

    case 'room:message':
      handleRoomMessage(clientId, message.data)
      break

    case 'room:leave':
      handleRoomLeave(clientId, message.data?.roomId)
      break

    case 'authenticate':
      handleAuthenticate(clientId, message.data?.token || token)
      break

    default:
      sendError(ws, `Unknown message type: ${message.type}`)
  }
}

/**
 * 加入聊天频道
 */
function handleJoinChat(clientId: string) {
  const client = clients.get(clientId)
  if (!client) return

  client.rooms.add('chat')
  console.log(`客户端 ${clientId} 加入聊天频道`)

  // 通知其他用户
  broadcastToRoom(
    'chat',
    {
      type: 'user:joined',
      clientId,
      timestamp: new Date().toISOString(),
    },
    clientId
  )

  sendMessage(client.ws, {
    type: 'chat:joined',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 处理聊天消息
 */
function handleChatMessage(clientId: string, data: { message?: string }) {
  const client = clients.get(clientId)
  if (!client || !client.rooms.has('chat')) {
    sendError(client!.ws, 'You are not in the chat room')
    return
  }

  // 广播消息到聊天频道（除了发送者）
  broadcastToRoom(
    'chat',
    {
      type: 'chat:message',
      clientId,
      message: data.message,
      timestamp: new Date().toISOString(),
    },
    clientId
  )

  // 确认消息已发送
  sendMessage(client.ws, {
    type: 'chat:message:sent',
    message: data.message,
    timestamp: new Date().toISOString(),
  })
}

/**
 * 加入房间
 */
function handleRoomJoin(clientId: string, roomId?: string) {
  const client = clients.get(clientId)
  if (!client || !roomId) {
    sendError(client?.ws!, 'Room ID is required')
    return
  }

  client.rooms.add(roomId)
  console.log(`客户端 ${clientId} 加入房间: ${roomId}`)

  // 通知房间内其他用户
  broadcastToRoom(
    roomId,
    {
      type: 'room:user:joined',
      clientId,
      roomId,
      timestamp: new Date().toISOString(),
    },
    clientId
  )

  sendMessage(client.ws, {
    type: 'room:joined',
    roomId,
    timestamp: new Date().toISOString(),
  })
}

/**
 * 处理房间消息
 */
function handleRoomMessage(clientId: string, data: { roomId?: string; message?: string }) {
  const client = clients.get(clientId)
  if (!client || !data.roomId || !data.message) {
    sendError(client?.ws!, 'Room ID and message are required')
    return
  }

  if (!client.rooms.has(data.roomId)) {
    sendError(client.ws, 'You are not in this room')
    return
  }

  // 发送消息到房间内所有用户（除了发送者）
  broadcastToRoom(
    data.roomId,
    {
      type: 'room:message',
      clientId,
      roomId: data.roomId,
      message: data.message,
      timestamp: new Date().toISOString(),
    },
    clientId
  )
}

/**
 * 离开房间
 */
function handleRoomLeave(clientId: string, roomId?: string) {
  const client = clients.get(clientId)
  if (!client || !roomId) {
    return
  }

  if (client.rooms.has(roomId)) {
    client.rooms.delete(roomId)
    console.log(`客户端 ${clientId} 离开房间: ${roomId}`)

    // 通知房间内其他用户
    broadcastToRoom(
      roomId,
      {
        type: 'room:user:left',
        clientId,
        roomId,
        timestamp: new Date().toISOString(),
      },
      clientId
    )
  }
}

/**
 * 处理认证
 */
async function handleAuthenticate(clientId: string, token?: string) {
  const client = clients.get(clientId)
  if (!client) return

  if (!token) {
    sendError(client.ws, 'Token is required')
    return
  }

  try {
    // TODO: 实现 token 验证逻辑
    // const user = await verifyToken(token)
    // client.userId = user.id

    sendMessage(client.ws, {
      type: 'authenticated',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    sendError(client.ws, `Authentication failed: ${error.message}`)
  }
}

/**
 * 向房间内所有客户端广播消息（除了排除的客户端）
 */
function broadcastToRoom(roomId: string, message: any, excludeClientId?: string) {
  clients.forEach((client, clientId) => {
    if (clientId === excludeClientId) return
    if (client.rooms.has(roomId)) {
      sendMessage(client.ws, message)
    }
  })
}

/**
 * 发送消息到客户端
 */
function sendMessage(ws: WebSocket, message: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

/**
 * 发送错误消息
 */
function sendError(ws: WebSocket, error: string) {
  sendMessage(ws, {
    type: 'error',
    error,
    timestamp: new Date().toISOString(),
  })
}

/**
 * 生成客户端 ID
 */
function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 导出 WebSocket 服务器实例，以便在其他地方使用
export { wss }
