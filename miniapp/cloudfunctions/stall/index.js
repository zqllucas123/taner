const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const stallsCol = db.collection('stalls')
const usersCol = db.collection('users')

/**
 * 摊位云函数（按 action 路由）
 *   create        开店：创建摊位 + 置 users.hasStall=true + 切 role=seller
 *   update        更新摊位信息（仅摊主本人）
 *   get           按 id 查摊位详情
 *   mine          查当前用户的摊位
 *   nearby        顾客端：矩形框拉取附近摊位（Day6 用）
 *   updateStatus  切换出摊/歇业状态
 *
 * 统一响应：{ code, message, data }
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event || {}

  try {
    switch (action) {
      case 'create':
        return await createStall(openid, event.data || {})
      case 'update':
        return await updateStall(openid, event.id, event.data || {})
      case 'get':
        return await getStall(event.id)
      case 'mine':
        return await getMyStall(openid)
      case 'nearby':
        return await getNearby(event)
      case 'updateStatus':
        return await updateStatus(openid, event.id, event.status)
      default:
        return { code: 1, message: `未知 action: ${action}`, data: null }
    }
  } catch (err) {
    console.error('[stall] 异常:', err)
    return { code: 1, message: err.message || '服务异常', data: null }
  }
}

/** 取当前用户文档（用于鉴权与归属判断） */
async function getUserByOpenid(openid) {
  const { data } = await usersCol.where({ openid }).limit(1).get()
  return data && data.length ? data[0] : null
}

async function createStall(openid, payload) {
  const user = await getUserByOpenid(openid)
  if (!user) return { code: 1, message: '请先登录', data: null }

  // 一人一摊：已开店则拒绝
  const { data: existed } = await stallsCol.where({ userId: user._id }).limit(1).get()
  if (existed && existed.length) {
    return { code: 1, message: '您已开店，请勿重复创建', data: normalizeStall(existed[0]) }
  }

  const now = Date.now()
  const doc = {
    userId: user._id,
    name: payload.name || '',
    ownerName: payload.ownerName || user.nickname || '',
    category: payload.category || '小吃美食',
    status: payload.status || 'offline',
    statusText: payload.statusText || '',
    locationType: payload.locationType || 'mobile',
    location: payload.location || '',
    latitude: payload.latitude || null,
    longitude: payload.longitude || null,
    stallTime: payload.stallTime || '',
    phone: payload.phone || user.phone || '',
    description: payload.description || '',
    announcement: payload.announcement || '',
    vibeImage: payload.vibeImage || '',
    vibeImageOpt: payload.vibeImageOpt || '',
    rating: 5.0,
    creditScore: 100,
    isHot: false,
    templateStyle: payload.templateStyle || payload.category || '小吃美食',
    restProtection: false,
    bigFontMode: false,
    marketId: payload.marketId || '',
    createdAt: now,
    updatedAt: now,
  }

  const { _id } = await stallsCol.add({ data: doc })

  // 同步用户：标记已开店，活跃角色切为摊主
  await usersCol.doc(user._id).update({
    data: { hasStall: true, role: 'seller', updatedAt: now },
  })

  return { code: 0, message: 'created', data: normalizeStall({ ...doc, _id }) }
}

async function updateStall(openid, id, payload) {
  const user = await getUserByOpenid(openid)
  if (!user) return { code: 1, message: '请先登录', data: null }

  // 未传 id 时，回退到用户自己的摊位
  let stall
  if (id) {
    const { data } = await stallsCol.doc(id).get().catch(() => ({ data: null }))
    stall = data
  } else {
    const { data } = await stallsCol.where({ userId: user._id }).limit(1).get()
    stall = data && data.length ? data[0] : null
  }
  if (!stall) return { code: 1, message: '摊位不存在', data: null }
  if (stall.userId !== user._id) return { code: 1, message: '无权操作他人摊位', data: null }

  // 仅允许更新业务字段，禁止改 userId/rating/creditScore 等系统字段
  const allowed = [
    'name', 'ownerName', 'category', 'status', 'statusText', 'locationType',
    'location', 'latitude', 'longitude', 'stallTime', 'phone', 'description',
    'announcement', 'vibeImage', 'vibeImageOpt', 'templateStyle',
    'restProtection', 'bigFontMode',
  ]
  const updates = { updatedAt: Date.now() }
  allowed.forEach((k) => {
    if (payload[k] !== undefined) updates[k] = payload[k]
  })

  await stallsCol.doc(stall._id).update({ data: updates })
  return { code: 0, message: 'ok', data: normalizeStall({ ...stall, ...updates }) }
}

async function getStall(id) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const { data } = await stallsCol.doc(id).get().catch(() => ({ data: null }))
  if (!data) return { code: 1, message: '摊位不存在', data: null }
  return { code: 0, message: 'ok', data: normalizeStall(data) }
}

async function getMyStall(openid) {
  const user = await getUserByOpenid(openid)
  if (!user) return { code: 1, message: '请先登录', data: null }
  const { data } = await stallsCol.where({ userId: user._id }).limit(1).get()
  const stall = data && data.length ? normalizeStall(data[0]) : null
  return { code: 0, message: 'ok', data: stall }
}

/** 矩形框粗筛 + 应用层 Haversine 算距离并排序（Day6） */
async function getNearby(event) {
  const { latitude, longitude, category, keyword } = event
  const hasGeo = typeof latitude === 'number' && typeof longitude === 'number'
  const where = { status: _.neq('offline') }

  if (hasGeo) {
    const span = 0.05 // ~5km 粗框
    where.latitude = _.gte(latitude - span).and(_.lte(latitude + span))
    where.longitude = _.gte(longitude - span).and(_.lte(longitude + span))
  }
  if (category) where.category = category

  const { data } = await stallsCol.where(where).limit(50).get()

  let list = (data || []).map(normalizeStall)
  if (keyword) {
    list = list.filter((s) => s.name && s.name.includes(keyword))
  }

  // 应用层算距离 + 按距离升序（无坐标的摊位排末尾）
  if (hasGeo) {
    list.forEach((s) => {
      s.distance =
        typeof s.latitude === 'number' && typeof s.longitude === 'number'
          ? Math.round(haversine(latitude, longitude, s.latitude, s.longitude))
          : null
    })
    list.sort((a, b) => {
      if (a.distance == null) return 1
      if (b.distance == null) return -1
      return a.distance - b.distance
    })
  }

  return { code: 0, message: 'ok', data: list }
}

/** Haversine 球面距离，返回米 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000 // 地球半径（米）
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function updateStatus(openid, id, status) {
  const valid = ['active', 'upcoming', 'offline']
  if (!valid.includes(status)) return { code: 1, message: '非法状态', data: null }

  const user = await getUserByOpenid(openid)
  if (!user) return { code: 1, message: '请先登录', data: null }

  const { data: stall } = await stallsCol.doc(id).get().catch(() => ({ data: null }))
  if (!stall) return { code: 1, message: '摊位不存在', data: null }
  if (stall.userId !== user._id) return { code: 1, message: '无权操作', data: null }

  await stallsCol.doc(id).update({ data: { status, updatedAt: Date.now() } })
  return { code: 0, message: 'ok', data: { id, status } }
}

/** 统一返回结构：补 id 字段（= _id），对齐前端 Stall 类型 */
function normalizeStall(doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    id: doc._id,
    userId: doc.userId,
    name: doc.name || '',
    ownerName: doc.ownerName || '',
    category: doc.category,
    status: doc.status || 'offline',
    statusText: doc.statusText || '',
    locationType: doc.locationType || 'mobile',
    location: doc.location || '',
    latitude: doc.latitude,
    longitude: doc.longitude,
    stallTime: doc.stallTime || '',
    phone: doc.phone || '',
    description: doc.description || '',
    announcement: doc.announcement || '',
    vibeImage: doc.vibeImage || '',
    vibeImageOpt: doc.vibeImageOpt || '',
    rating: doc.rating != null ? doc.rating : 5.0,
    creditScore: doc.creditScore != null ? doc.creditScore : 100,
    isHot: !!doc.isHot,
    templateStyle: doc.templateStyle || '',
    restProtection: !!doc.restProtection,
    bigFontMode: !!doc.bigFontMode,
    marketId: doc.marketId || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}
