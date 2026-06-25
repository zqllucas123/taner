const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const usersCol = db.collection('users')

/**
 * 微信登录云函数
 * - 通过 getWXContext 取 openid（免前端鉴权）
 * - users 集合不存在该 openid 则创建（默认 customer 角色）
 * - 已存在则更新 lastLoginAt
 * - 返回前端 User 结构（camelCase，对齐 src/types）
 *
 * 入参（可选）：
 *   nickname, avatarUrl  —— 由前端 getUserProfile 获取后透传，用于补全资料
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { code: 1, message: '无法获取 openid，请在真机或开发者工具中调试', data: null }
  }

  const now = Date.now()
  const { nickname, avatarUrl } = event || {}

  try {
    const { data: existing } = await usersCol.where({ openid }).limit(1).get()

    if (existing && existing.length > 0) {
      // 已注册：更新登录时间 + 可选资料
      const user = existing[0]
      const updates = { lastLoginAt: now, updatedAt: now }
      if (nickname) updates.nickname = nickname
      if (avatarUrl) updates.avatarUrl = avatarUrl

      await usersCol.doc(user._id).update({ data: updates })

      return {
        code: 0,
        message: 'ok',
        data: normalizeUser({ ...user, ...updates }),
      }
    }

    // 新用户：创建
    const newUser = {
      openid,
      unionid: wxContext.UNIONID || '',
      nickname: nickname || '',
      avatarUrl: avatarUrl || '',
      phone: '',
      role: 'customer',
      hasStall: false,
      status: 'normal',
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    }

    const { _id } = await usersCol.add({ data: newUser })

    return {
      code: 0,
      message: 'created',
      data: normalizeUser({ ...newUser, _id }),
    }
  } catch (err) {
    console.error('[login] 失败:', err)
    return { code: 1, message: err.message || '登录失败', data: null }
  }
}

/** 统一返回结构：补 id 字段（= _id），对齐前端 User 类型 */
function normalizeUser(doc) {
  return {
    _id: doc._id,
    id: doc._id,
    openid: doc.openid,
    unionid: doc.unionid || '',
    nickname: doc.nickname || '',
    avatarUrl: doc.avatarUrl || '',
    phone: doc.phone || '',
    role: doc.role || 'customer',
    hasStall: !!doc.hasStall,
    status: doc.status || 'normal',
    lastLoginAt: doc.lastLoginAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}
