import qiniu from 'qiniu'
import qiniuConfig from '#config/qiniu'
import { randomUUID } from 'node:crypto'

export default class QiniuService {
  protected mac: qiniu.auth.digest.Mac
  protected config: qiniu.conf.Config

  constructor() {
    this.mac = new qiniu.auth.digest.Mac(qiniuConfig.accessKey, qiniuConfig.secretKey)
    this.config = new qiniu.conf.Config()
    // 可以在这里配置机房区域，例如：
    // this.config.zone = qiniu.zone.Zone_z2 // 华南
  }

  /**
   * 获取上传 Token
   */
  public getUploadToken(key?: string) {
    const options = {
      scope: key ? `${qiniuConfig.bucket}:${key}` : qiniuConfig.bucket,
      expires: 3600,
    }
    const putPolicy = new qiniu.rs.PutPolicy(options)
    return putPolicy.uploadToken(this.mac)
  }

  /**
   * 上传本地文件到七牛云
   * @param localFile 本地文件路径
   * @param key 目标文件名（可选，默认自动生成）
   */
  public async uploadFile(localFile: string, key?: string): Promise<{ url: string; key: string }> {
    const uploadToken = this.getUploadToken(key)
    const formUploader = new qiniu.form_up.FormUploader(this.config)
    const putExtra = new qiniu.form_up.PutExtra()

    // 如果未指定 key，则自动生成一个 UUID 作为 key
    const targetKey = key || `uploads/${randomUUID()}`

    return new Promise((resolve, reject) => {
      formUploader.putFile(
        uploadToken,
        targetKey,
        localFile,
        putExtra,
        (respErr, respBody, respInfo) => {
          if (respErr) {
            reject(respErr)
          } else if (respInfo.statusCode === 200) {
            const domain = qiniuConfig.domain.startsWith('http')
              ? qiniuConfig.domain
              : `http://${qiniuConfig.domain}`
            resolve({
              url: `${domain}/${respBody.key}`,
              key: respBody.key,
            })
          } else {
            reject(
              new Error(
                `Qiniu upload failed with status ${respInfo.statusCode}: ${JSON.stringify(respBody)}`
              )
            )
          }
        }
      )
    })
  }

  /**
   * 上传 Buffer 数据到七牛云
   */
  public async uploadBuffer(buffer: Buffer, key?: string): Promise<{ url: string; key: string }> {
    const uploadToken = this.getUploadToken(key)
    const formUploader = new qiniu.form_up.FormUploader(this.config)
    const putExtra = new qiniu.form_up.PutExtra()

    const targetKey = key || `uploads/${randomUUID()}`

    return new Promise((resolve, reject) => {
      formUploader.put(uploadToken, targetKey, buffer, putExtra, (respErr, respBody, respInfo) => {
        console.log('Qiniu uploadBuffer respBody:', respBody)
        console.log('Qiniu uploadBuffer respInfo:', respInfo)

        if (respErr) {
          reject(respErr)
        } else if (respInfo.statusCode === 200) {
          const domain = qiniuConfig.domain.startsWith('http')
            ? qiniuConfig.domain
            : `http://${qiniuConfig.domain}`
          resolve({
            url: `${domain}/${respBody.key}`,
            key: respBody.key,
          })
        } else {
          reject(
            new Error(
              `Qiniu upload failed with status ${respInfo.statusCode}: ${JSON.stringify(respBody)}`
            )
          )
        }
      })
    })
  }

  /**
   * 删除七牛云上的文件
   */
  public async deleteFile(key: string): Promise<void> {
    const bucketManager = new qiniu.rs.BucketManager(this.mac, this.config)

    return new Promise((resolve, reject) => {
      bucketManager.delete(qiniuConfig.bucket, key, (err, respBody, respInfo) => {
        if (err) {
          reject(err)
        } else if (respInfo.statusCode === 200) {
          resolve()
        } else {
          reject(
            new Error(
              `Qiniu delete failed with status ${respInfo.statusCode}: ${JSON.stringify(respBody)}`
            )
          )
        }
      })
    })
  }
}
