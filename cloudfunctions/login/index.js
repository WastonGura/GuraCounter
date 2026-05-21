const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 直接从请求中获取 secret 或使用环境变量
const APPID = 'wxab89040ca37be073'

exports.main = async (event) => {
  const { code } = event

  // 从云函数环境变量读取 AppSecret（在云开发控制台设置）
  const SECRET = process.env.WECHAT_APP_SECRET || ''

  if (!SECRET) {
    return { error: '请先在云函数环境变量中设置 WECHAT_APP_SECRET' }
  }

  const https = require('https')

  return new Promise((resolve) => {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`
    https.get(url, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        const data = JSON.parse(body)
        if (data.openid) {
          resolve({ openid: data.openid })
        } else {
          resolve({ error: data.errmsg || '获取 openid 失败', errcode: data.errcode })
        }
      })
    }).on('error', (e) => {
      resolve({ error: e.message })
    })
  })
}
