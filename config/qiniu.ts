import env from '#start/env'

const qiniuConfig = {
  accessKey: env.get('QINIU_ACCESS_KEY'),
  secretKey: env.get('QINIU_SECRET_KEY'),
  bucket: env.get('QINIU_BUCKET'),
  domain: env.get('QINIU_DOMAIN'),
}

export default qiniuConfig

