import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import env from '#start/env'

// 动态导入 ssh2，避免在生产环境加载
// 在生产环境，如果 ssh2 未安装，会优雅地失败
async function getSSHClient(): Promise<any> {
  try {
    const ssh2Module = await import('ssh2')
    return ssh2Module.Client
  } catch (error) {
    throw new Error(
      'ssh2 module not found. SSH tunnel is only available in development environment. Please install ssh2: npm install --save-dev ssh2'
    )
  }
}

/**
 * SSH 隧道服务
 * 用于通过跳板机连接到远程数据库
 */
export class SSHTunnelService {
  private static tunnels = new Map<string, any>()
  private static localPorts = new Map<string, number>()

  /**
   * 创建 SSH 隧道
   * @param tunnelName 隧道名称（用于标识不同的隧道）
   * @param config SSH 隧道配置
   * @returns 本地端口号
   */
  static async createTunnel(
    tunnelName: string,
    config: {
      sshHost: string
      sshPort: number
      sshUsername: string
      sshPrivateKey?: string
      sshPassword?: string
      remoteHost: string
      remotePort: number
      localPort?: number
    }
  ): Promise<number> {
    // 如果隧道已存在，返回现有端口
    if (this.tunnels.has(tunnelName)) {
      const existingPort = this.localPorts.get(tunnelName)
      if (existingPort) {
        return existingPort
      }
    }

    return new Promise(async (resolve, reject) => {
      try {
        const SSHClientClass = await getSSHClient()
        const sshClient = new SSHClientClass()
        const localPort = config.localPort || 0 // 0 表示自动分配端口

        // 准备 SSH 配置
        const sshConfig: any = {
          host: config.sshHost,
          port: config.sshPort,
          username: config.sshUsername,
        }

        // 使用私钥或密码认证
        if (config.sshPrivateKey) {
          sshConfig.privateKey = readFileSync(config.sshPrivateKey)
        } else if (config.sshPassword) {
          sshConfig.password = config.sshPassword
        } else {
          reject(new Error('SSH authentication method required: either privateKey or password'))
          return
        }

        sshClient.on('ready', () => {
          // SSH 连接成功，创建本地服务器
          const server = createServer((localStream) => {
            // 为每个连接创建 SSH 端口转发
            sshClient.forwardOut(
              '127.0.0.1',
              0, // 本地端口，0 表示自动分配
              config.remoteHost,
              config.remotePort,
              (err: any, stream: any) => {
                if (err) {
                  localStream.destroy()
                  console.error(`SSH forward error: ${err.message}`)
                  return
                }

                // 双向数据流转发
                localStream.pipe(stream).pipe(localStream)

                // 处理流关闭
                stream.on('close', () => {
                  localStream.destroy()
                })
                localStream.on('close', () => {
                  stream.destroy()
                })
              }
            )
          })

          server.listen(localPort, '127.0.0.1', () => {
            const actualPort = (server.address() as any)?.port || localPort
            this.tunnels.set(tunnelName, sshClient)
            this.localPorts.set(tunnelName, actualPort)

            // 保存服务器引用以便关闭
            ;(sshClient as any)._tunnelServer = server

            console.log(
              `SSH tunnel "${tunnelName}" established: localhost:${actualPort} -> ${config.sshHost} -> ${config.remoteHost}:${config.remotePort}`
            )

            resolve(actualPort)
          })

          server.on('error', (err: any) => {
            sshClient.end()
            reject(new Error(`Local server error: ${err.message}`))
          })

          // 当 SSH 连接关闭时，关闭本地服务器
          sshClient.on('close', () => {
            server.close()
            this.tunnels.delete(tunnelName)
            this.localPorts.delete(tunnelName)
          })
        })

        sshClient.on('error', (err: any) => {
          reject(new Error(`SSH connection error: ${err.message}`))
        })

        // 连接到跳板机
        sshClient.connect(sshConfig)
      } catch (error: any) {
        reject(new Error(`Failed to load ssh2 module: ${error.message}`))
      }
    })
  }

  /**
   * 关闭指定的 SSH 隧道
   */
  static closeTunnel(tunnelName: string): void {
    const tunnel = this.tunnels.get(tunnelName)
    if (tunnel) {
      const server = (tunnel as any)._tunnelServer
      if (server) {
        server.close()
      }
      tunnel.end()
      this.tunnels.delete(tunnelName)
      this.localPorts.delete(tunnelName)
    }
  }

  /**
   * 关闭所有 SSH 隧道
   */
  static closeAllTunnels(): void {
    for (const [, tunnel] of this.tunnels.entries()) {
      tunnel.end()
    }
    this.tunnels.clear()
    this.localPorts.clear()
  }

  /**
   * 获取本地端口号
   */
  static getLocalPort(tunnelName: string): number | undefined {
    return this.localPorts.get(tunnelName)
  }
}

/**
 * 获取 SSH 跳板机配置
 */
function getSSHTunnelConfig() {
  return {
    sshHost: env.get('SSH_TUNNEL_HOST', ''),
    sshPort: env.get('SSH_TUNNEL_PORT', 22),
    sshUsername: env.get('SSH_TUNNEL_USERNAME', ''),
    sshPrivateKey: env.get('SSH_TUNNEL_PRIVATE_KEY', ''),
    sshPassword: env.get('SSH_TUNNEL_PASSWORD', ''),
  }
}

/**
 * 检查 SSH 跳板机配置是否完整
 */
function validateSSHTunnelConfig(): boolean {
  const config = getSSHTunnelConfig()
  if (!config.sshHost || !config.sshUsername) {
    return false
  }
  if (!config.sshPrivateKey && !config.sshPassword) {
    return false
  }
  return true
}

/**
 * 为数据库连接创建 SSH 隧道
 * @param tunnelName 隧道名称（通常是数据库连接名称）
 * @param remoteHost 远程数据库主机
 * @param remotePort 远程数据库端口
 */
export async function createDBTunnel(
  tunnelName: string,
  remoteHost: string,
  remotePort: number
): Promise<void> {
  const nodeEnv = env.get('NODE_ENV', 'development')

  // 只在开发环境创建隧道
  if (nodeEnv !== 'development') {
    return
  }

  if (!validateSSHTunnelConfig()) {
    console.warn(`SSH tunnel config incomplete, skipping tunnel creation for "${tunnelName}"`)
    return
  }

  try {
    const sshConfig = getSSHTunnelConfig()
    const tunnelConfig = {
      sshHost: sshConfig.sshHost!,
      sshPort: sshConfig.sshPort,
      sshUsername: sshConfig.sshUsername!,
      sshPrivateKey: sshConfig.sshPrivateKey || undefined,
      sshPassword: sshConfig.sshPassword || undefined,
      remoteHost,
      remotePort,
    }

    await SSHTunnelService.createTunnel(tunnelName, tunnelConfig)
  } catch (error) {
    console.error(`Failed to create SSH tunnel for "${tunnelName}":`, error)
    throw error
  }
}

/**
 * 初始化生产数据库的 SSH 隧道（仅在开发环境且启用时）
 */
export async function initializeProdDBTunnel(): Promise<void> {
  const useTunnel = env.get('AIDB_PROD_USE_TUNNEL', false)

  if (useTunnel) {
    await createDBTunnel('aidb_prod', env.get('AIDB_PROD_HOST'), env.get('AIDB_PROD_PORT', 5432))
  }
}
