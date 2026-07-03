const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 数据库初始化云函数
 * 一次性创建项目所需的全部集合（collection）
 * 已存在的集合会被跳过，可重复调用
 */
const COLLECTIONS = [
  'users',
  'stalls',
  'products',
  'orders',
  'order_items',
  'coupons',
  'user_coupons',
  'wishes',
  'wish_likes',
  'inventory_logs',
  'pricing_records',
  'stall_qrcodes',
]

exports.main = async () => {
  const results = []

  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
      results.push({ name, status: 'created' })
    } catch (err) {
      // -501001 / ResourceUnavailable：集合已存在，视为成功
      const exists =
        err.errCode === -501001 ||
        /already exist|ResourceUnavailable|exist/i.test(err.errMsg || '')
      if (exists) {
        results.push({ name, status: 'exists' })
      } else {
        results.push({ name, status: 'failed', error: err.errMsg || String(err) })
      }
    }
  }

  const failed = results.filter((r) => r.status === 'failed')

  return {
    code: failed.length === 0 ? 0 : -1,
    message: failed.length === 0 ? 'ok' : '部分集合创建失败',
    data: results,
  }
}
