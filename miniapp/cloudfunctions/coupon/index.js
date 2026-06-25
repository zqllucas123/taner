const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const couponsCol = db.collection('coupons')
const userCouponsCol = db.collection('user_coupons')
const stallsCol = db.collection('stalls')
const usersCol = db.collection('users')

/**
 * 优惠券云函数（按 action 路由）
 *   create   摊主发券（需为本人摊位，标题过 msgSecCheck）
 *   update   摊主改券状态（暂停/恢复）
 *   claim    顾客领券（限领一张、库存校验、原子领取）
 *   list     列表：
 *              - mine=true 摊主端：本摊位发的券
 *              - stallId=xxx 顾客端：该摊位可领的有效券（带 claimed 标记）
 *              - owned=true 顾客端：我领的券（带券快照 + 可选 status 过滤）
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
        return await createCoupon(openid, event.data || {})
      case 'update':
        return await updateCoupon(openid, event.id, event.data || {})
      case 'claim':
        return await claimCoupon(openid, event.couponId)
      case 'list':
        return await listCoupons(openid, event)
      default:
        return { code: 1, message: `未知 action: ${action}`, data: null }
    }
  } catch (err) {
    console.error('[coupon] 异常:', err)
    return { code: 1, message: err.message || '服务异常', data: null }
  }
}

async function getUserByOpenid(openid) {
  const { data } = await usersCol.where({ openid }).limit(1).get()
  return data && data.length ? data[0] : null
}

async function getMyStall(openid) {
  const user = await getUserByOpenid(openid)
  if (!user) return { user: null, stall: null }
  const { data } = await stallsCol.where({ userId: user._id }).limit(1).get()
  return { user, stall: data && data.length ? data[0] : null }
}

/**
 * 文本内容安全检测（微信 msgSecCheck v2）
 * @returns {ok:boolean, label?:number} ok=false 表示违规
 */
async function checkText(content, openid) {
  if (!content || !content.trim()) return { ok: true }
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      version: 2,
      scene: 2, // 2=评论 3=论坛 4=社交日志
      openid,
      content: content.slice(0, 2500),
    })
    // result.suggest: pass / review / risky
    const suggest = res && res.result && res.result.suggest
    if (suggest === 'risky') return { ok: false, label: res.result.label }
    return { ok: true }
  } catch (e) {
    // 检测接口异常（如未配置）不阻断主流程，仅记录
    console.warn('[coupon] msgSecCheck 调用失败，放行:', e.errCode || e.message)
    return { ok: true, skipped: true }
  }
}

function toNumber(v) {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

async function createCoupon(openid, payload) {
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '请先开店再发券', data: null }

  const title = (payload.title || '').trim()
  if (!title) return { code: 1, message: '请填写优惠券标题', data: null }

  // 内容安全：标题文本检测
  const sec = await checkText(title, openid)
  if (!sec.ok) return { code: 1, message: '标题含违规内容，请修改', data: null }

  const type = ['discount', 'cash', 'gift'].includes(payload.type) ? payload.type : 'cash'
  const now = Date.now()
  const doc = {
    stallId: stall._id,
    title,
    type,
    discount: toNumber(payload.discount),
    minSpend: toNumber(payload.minSpend),
    totalCount: payload.totalCount != null ? parseInt(payload.totalCount, 10) : -1,
    claimedCount: 0,
    scene: ['manual', 'auto_pay', 'share', 'new_customer'].includes(payload.scene)
      ? payload.scene
      : 'manual',
    expiry: payload.expiry || '', // 失效时间字符串（如 '2026-07-31'）
    status: 'active',
    createdAt: now,
  }
  const { _id } = await couponsCol.add({ data: doc })
  return { code: 0, message: 'created', data: normalizeCoupon({ ...doc, _id }) }
}

async function updateCoupon(openid, id, payload) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '无摊位', data: null }

  const { data: coupon } = await couponsCol.doc(id).get().catch(() => ({ data: null }))
  if (!coupon) return { code: 1, message: '优惠券不存在', data: null }
  if (coupon.stallId !== stall._id) return { code: 1, message: '无权操作', data: null }

  const updates = {}
  if (['active', 'paused', 'expired'].includes(payload.status)) updates.status = payload.status
  if (Object.keys(updates).length === 0) return { code: 1, message: '无可更新字段', data: null }

  await couponsCol.doc(id).update({ data: updates })
  return { code: 0, message: 'ok', data: normalizeCoupon({ ...coupon, ...updates }) }
}

/** 顾客领券：限领一张 + 原子扣减库存 */
async function claimCoupon(openid, couponId) {
  if (!couponId) return { code: 1, message: '缺少 couponId', data: null }
  const user = await getUserByOpenid(openid)
  if (!user) return { code: 1, message: '请先登录', data: null }

  const { data: coupon } = await couponsCol.doc(couponId).get().catch(() => ({ data: null }))
  if (!coupon) return { code: 1, message: '优惠券不存在', data: null }
  if (coupon.status !== 'active') return { code: 1, message: '该券已停止发放', data: null }

  // 失效校验
  if (coupon.expiry && new Date(coupon.expiry).getTime() < Date.now()) {
    return { code: 1, message: '该券已过期', data: null }
  }

  // 限领一张：唯一键 (userId, couponId)
  const { data: exist } = await userCouponsCol
    .where({ userId: user._id, couponId })
    .limit(1)
    .get()
  if (exist && exist.length) return { code: 1, message: '您已领取过该券', data: null }

  // 原子扣减库存（totalCount=-1 不限量则跳过条件）
  if (coupon.totalCount >= 0) {
    const res = await couponsCol
      .where({ _id: couponId, claimedCount: _.lt(coupon.totalCount) })
      .update({ data: { claimedCount: _.inc(1) } })
    if (!res.stats || res.stats.updated === 0) {
      return { code: 1, message: '优惠券已被领完', data: null }
    }
  } else {
    await couponsCol.doc(couponId).update({ data: { claimedCount: _.inc(1) } })
  }

  const now = Date.now()
  const ucDoc = {
    userId: user._id,
    couponId,
    stallId: coupon.stallId,
    status: 'unused',
    orderId: null,
    claimedAt: now,
    usedAt: null,
  }
  let ucId
  try {
    const addRes = await userCouponsCol.add({ data: ucDoc })
    ucId = addRes._id
  } catch (e) {
    // 领取记录写入失败，回滚库存
    await couponsCol.doc(couponId).update({ data: { claimedCount: _.inc(-1) } })
    throw e
  }
  return {
    code: 0,
    message: 'claimed',
    data: { ...normalizeUserCoupon({ ...ucDoc, _id: ucId }), coupon: normalizeCoupon(coupon) },
  }
}

async function listCoupons(openid, event) {
  const { mine, stallId, owned, status } = event

  // 摊主端：本摊位发的券
  if (mine) {
    const { stall } = await getMyStall(openid)
    if (!stall) return { code: 0, message: 'ok', data: [] }
    const { data } = await couponsCol
      .where({ stallId: stall._id })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()
    return { code: 0, message: 'ok', data: (data || []).map(normalizeCoupon) }
  }

  // 顾客端：我领的券
  if (owned) {
    const user = await getUserByOpenid(openid)
    if (!user) return { code: 0, message: 'ok', data: [] }
    const where = { userId: user._id }
    if (status) where.status = status
    const { data: ucs } = await userCouponsCol
      .where(where)
      .orderBy('claimedAt', 'desc')
      .limit(100)
      .get()
    // join 券快照
    const couponIds = [...new Set((ucs || []).map((u) => u.couponId))]
    const couponMap = {}
    if (couponIds.length) {
      const { data: cps } = await couponsCol.where({ _id: _.in(couponIds) }).get()
      ;(cps || []).forEach((c) => { couponMap[c._id] = normalizeCoupon(c) })
    }
    const result = (ucs || []).map((u) => ({
      ...normalizeUserCoupon(u),
      coupon: couponMap[u.couponId] || null,
    }))
    return { code: 0, message: 'ok', data: result }
  }

  // 顾客端：某摊位可领的有效券（带是否已领标记）
  if (stallId) {
    const { data } = await couponsCol
      .where({ stallId, status: 'active' })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()
    let claimedSet = new Set()
    const user = await getUserByOpenid(openid)
    if (user && data && data.length) {
      const { data: ucs } = await userCouponsCol
        .where({ userId: user._id, couponId: _.in(data.map((c) => c._id)) })
        .get()
      claimedSet = new Set((ucs || []).map((u) => u.couponId))
    }
    const now = Date.now()
    const result = (data || [])
      .filter((c) => !c.expiry || new Date(c.expiry).getTime() >= now) // 过滤已过期
      .map((c) => ({ ...normalizeCoupon(c), claimed: claimedSet.has(c._id) }))
    return { code: 0, message: 'ok', data: result }
  }

  return { code: 1, message: '缺少查询条件', data: null }
}

function normalizeCoupon(doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    id: doc._id,
    stallId: doc.stallId,
    title: doc.title || '',
    type: doc.type || 'cash',
    discount: doc.discount != null ? doc.discount : 0,
    minSpend: doc.minSpend != null ? doc.minSpend : 0,
    totalCount: doc.totalCount != null ? doc.totalCount : -1,
    claimedCount: doc.claimedCount != null ? doc.claimedCount : 0,
    scene: doc.scene || 'manual',
    expiry: doc.expiry || '',
    status: doc.status || 'active',
    createdAt: doc.createdAt,
  }
}

function normalizeUserCoupon(doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    id: doc._id,
    userId: doc.userId,
    couponId: doc.couponId,
    stallId: doc.stallId,
    status: doc.status || 'unused',
    orderId: doc.orderId || null,
    claimedAt: doc.claimedAt,
    usedAt: doc.usedAt || null,
  }
}
