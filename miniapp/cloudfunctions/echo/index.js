const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 连通性测试云函数
 * 返回入参 + openid + 服务端时间
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  return {
    code: 0,
    message: 'ok',
    data: {
      echo: event,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      serverTime: Date.now(),
    },
  }
}
