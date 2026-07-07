const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const groupBuysCol = db.collection('group_buys')
const participantsCol = db.collection('group_buy_participants')
const productsCol = db.collection('products')
const stallsCol = db.collection('stalls')
const usersCol = db.collection('users')
const ordersCol = db.collection('orders')
const orderItemsCol = db.collection('order_items')
const invLogsCol = db.collection('inventory_logs')

/**
 * 邻里拼团云函数（模块三 · 按 action 路由）
 *   create  摊主创建拼团活动（校验商品归属本摊，写 expireAt = now + expiryHours）
 *   list    列表：stallId=xxx 顾客看进行中的团（带 joined 标记）；mine=true 摊主看本摊所有团
 *   detail  团详情 + 参与者头像列表 + 剩余名额/倒计时
 *   join    参团/发起：uk(groupBuyId,userId) 防重复；原子 CAS 抢名额；满员成团→逐份转拼团订单
 *   cancel  摊主下架未成团活动
 *   sweepExpired  （可由定时触发器调用）扫描过期未成团活动置 expired
 *
 * 统一响应：{ code, message, data }
 * 并发：抢名额用 where(条件)+update 判 stats.updated>0，杜绝超员（对齐 order/coupon 写法，本栈无 Redis）
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event || {}

  try {
    switch (action) {
      case 'create':
        return await createGroupBuy(openid, event.data || {})
      case 'list':
        return await listGroupBuys(openid, event)
      case 'detail':
        return await detailGroupBuy(openid, event.id)
      case 'join':
        return await joinGroupBuy(openid, event.id)
      case 'cancel':
        return await cancelGroupBuy(openid, event.id)
      case 'sweepExpired':
        return await sweepExpired()
      default:
        return { code: 1, message: `未知 action: ${action}`, data: null }
    }
  } catch (err) {
    console.error('[groupbuy] 异常:', err)
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

function toNumber(v) {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function genOrderNo() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(Math.random() * 1e6)).padStart(6, '0')
  return `${ymd}${rand}`
}

/** 取货码：PICK-XXXX（去除易混淆 0O1I，对齐 order 云函数） */
function genPickupCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `PICK-${code}`
}

/** 原子扣库存（对齐 order.deductStock） */
async function deductStock(productId, qty) {
  const res = await productsCol
    .where({ _id: productId, stock: _.gte(qty), deletedAt: _.eq(null) })
    .update({ data: { stock: _.inc(-qty), soldCount: _.inc(qty), updatedAt: Date.now() } })
  return res.stats && res.stats.updated > 0
}

// ============ 摊主：创建拼团 ============
async function createGroupBuy(openid, payload) {
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '请先开店再发起拼团', data: null }

  const { productId } = payload
  if (!productId) return { code: 1, message: '请选择拼团商品', data: null }

  const { data: product } = await productsCol.doc(productId).get().catch(() => ({ data: null }))
  if (!product) return { code: 1, message: '商品不存在', data: null }
  if (product.stallId !== stall._id) return { code: 1, message: '商品与摊位不匹配', data: null }
  if (product.deletedAt || product.status !== 'on') {
    return { code: 1, message: '商品未上架，无法开团', data: null }
  }

  const price = round2(toNumber(payload.price))
  if (price <= 0) return { code: 1, message: '请填写有效的成团价', data: null }

  let targetCount = parseInt(payload.targetCount, 10) || 2
  if (targetCount < 2) targetCount = 2
  if (targetCount > 10) targetCount = 10

  let expiryHours = parseInt(payload.expiryHours, 10) || 24
  if (expiryHours < 1) expiryHours = 1
  if (expiryHours > 240) expiryHours = 240

  const now = Date.now()
  const doc = {
    stallId: stall._id,
    productId,
    productName: product.name,
    productImage: product.imageUrl || '',
    price,
    originalPrice: product.price,
    targetCount,
    currentCount: 0,
    expiryHours,
    expireAt: now + expiryHours * 3600 * 1000,
    status: 'active',
    createdAt: now,
  }
  const { _id } = await groupBuysCol.add({ data: doc })
  return { code: 0, message: 'created', data: normalizeGroupBuy({ ...doc, _id }) }
}

// ============ 列表 ============
async function listGroupBuys(openid, event) {
  const { mine, stallId } = event
  const now = Date.now()

  // 摊主端：本摊所有团（含历史）
  if (mine) {
    const { stall } = await getMyStall(openid)
    if (!stall) return { code: 0, message: 'ok', data: [] }
    const { data } = await groupBuysCol
      .where({ stallId: stall._id })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()
    return { code: 0, message: 'ok', data: (data || []).map(normalizeGroupBuy) }
  }

  // 顾客端：某摊进行中的团（未过期）
  if (stallId) {
    const { data } = await groupBuysCol
      .where({ stallId, status: 'active', expireAt: _.gt(now) })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()
    // 标记当前用户是否已参团
    let joinedSet = new Set()
    const user = await getUserByOpenid(openid)
    if (user && data && data.length) {
      const { data: ps } = await participantsCol
        .where({ userId: user._id, groupBuyId: _.in(data.map((g) => g._id)) })
        .get()
      joinedSet = new Set((ps || []).map((p) => p.groupBuyId))
    }
    const result = (data || []).map((g) => ({
      ...normalizeGroupBuy(g),
      joined: joinedSet.has(g._id),
    }))
    return { code: 0, message: 'ok', data: result }
  }

  return { code: 1, message: '缺少查询条件', data: null }
}

// ============ 详情（带参与者） ============
async function detailGroupBuy(openid, id) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const { data: gb } = await groupBuysCol.doc(id).get().catch(() => ({ data: null }))
  if (!gb) return { code: 1, message: '拼团不存在', data: null }

  const { data: ps } = await participantsCol
    .where({ groupBuyId: id })
    .orderBy('joinedAt', 'asc')
    .get()

  // join 用户昵称头像
  const userIds = [...new Set((ps || []).map((p) => p.userId))]
  const userMap = {}
  if (userIds.length) {
    const { data: us } = await usersCol.where({ _id: _.in(userIds) }).get()
    ;(us || []).forEach((u) => {
      userMap[u._id] = { nickname: u.nickname || '', avatarUrl: u.avatarUrl || '' }
    })
  }
  const participants = (ps || []).map((p) => ({
    id: p._id,
    groupBuyId: p.groupBuyId,
    userId: p.userId,
    userName: userMap[p.userId]?.nickname || '街坊',
    userAvatar: userMap[p.userId]?.avatarUrl || '',
    orderId: p.orderId || null,
    joinedAt: p.joinedAt,
  }))

  const user = await getUserByOpenid(openid)
  const joined = user ? participants.some((p) => p.userId === user._id) : false

  return {
    code: 0,
    message: 'ok',
    data: { ...normalizeGroupBuy(gb), joined, participants },
  }
}

// ============ 顾客：参团（含成团转单） ============
async function joinGroupBuy(openid, id) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const user = await getUserByOpenid(openid)
  if (!user) return { code: 1, message: '请先登录', data: null }

  const { data: gb } = await groupBuysCol.doc(id).get().catch(() => ({ data: null }))
  if (!gb) return { code: 1, message: '拼团不存在', data: null }
  if (gb.status !== 'active') return { code: 1, message: '该团已结束', data: null }
  if (gb.expireAt && gb.expireAt < Date.now()) {
    await groupBuysCol.doc(id).update({ data: { status: 'expired' } }).catch(() => {})
    return { code: 1, message: '该团已过期', data: null }
  }

  // 防重复参团：uk(groupBuyId, userId)
  const { data: exist } = await participantsCol
    .where({ groupBuyId: id, userId: user._id })
    .limit(1)
    .get()
  if (exist && exist.length) return { code: 1, message: '您已参团，等待成团', data: null }

  // 原子抢名额：仅当仍 active 且 currentCount < targetCount
  const casRes = await groupBuysCol
    .where({ _id: id, status: 'active', currentCount: _.lt(gb.targetCount) })
    .update({ data: { currentCount: _.inc(1) } })
  if (!casRes.stats || casRes.stats.updated === 0) {
    return { code: 1, message: '手慢了，该团已满或已结束', data: null }
  }

  const now = Date.now()
  // 写参与记录（失败则回滚名额）
  let participantId
  try {
    const addRes = await participantsCol.add({
      data: { groupBuyId: id, userId: user._id, orderId: null, joinedAt: now },
    })
    participantId = addRes._id
  } catch (e) {
    await groupBuysCol.doc(id).update({ data: { currentCount: _.inc(-1) } }).catch(() => {})
    throw e
  }

  const newCount = (gb.currentCount || 0) + 1
  let completed = false
  let myOrder = null

  // 满员成团：置 completed 并为每位成员建拼团订单
  if (newCount >= gb.targetCount) {
    const casDone = await groupBuysCol
      .where({ _id: id, status: 'active' })
      .update({ data: { status: 'completed', updatedAt: now } })
    // 仅抢到「成团」这一步的调用负责转单，避免并发重复建单
    if (casDone.stats && casDone.stats.updated > 0) {
      completed = true
      const orders = await fulfillGroupBuy(gb, id)
      myOrder = orders[user._id] || null
    }
  }

  const { data: fresh } = await groupBuysCol.doc(id).get().catch(() => ({ data: gb }))
  return {
    code: 0,
    message: completed ? 'completed' : 'joined',
    data: {
      groupBuy: normalizeGroupBuy(fresh || gb),
      joined: true,
      completed,
      participantId,
      myOrder,
    },
  }
}

/**
 * 成团履约：为全部参与者逐份建拼团订单（type='groupbuy'），
 * 生成取货码 + 原子扣库存 + 写 order_items/inventory_logs，并回填 participant.orderId。
 * @returns { [userId]: order }
 */
async function fulfillGroupBuy(gb, groupBuyId) {
  const { data: ps } = await participantsCol.where({ groupBuyId }).get()
  const { data: product } = await productsCol.doc(gb.productId).get().catch(() => ({ data: null }))
  const price = round2(gb.price)
  const now = Date.now()
  const orderMap = {}

  for (const p of ps || []) {
    // 幂等：已建单跳过
    if (p.orderId) continue

    // 原子扣 1 件库存（库存不足则记 0，不阻断成团履约）
    const stockOk = await deductStock(gb.productId, 1)

    const orderDoc = {
      orderNo: genOrderNo(),
      userId: p.userId,
      stallId: gb.stallId,
      type: 'groupbuy',
      status: 'pending',
      channel: 'online',
      totalAmount: price,
      discountAmount: 0,
      payAmount: price,
      couponId: null,
      groupBuyId,
      pickupCode: genPickupCode(),
      pickupTime: '',
      reserveNotes: `邻里拼团成团 · ${gb.productName}`,
      disputeStatus: 'none',
      penaltyAmount: 0,
      reserveExpireAt: now + 24 * 3600 * 1000,
      createdAt: now,
      updatedAt: now,
    }
    let orderId
    try {
      const addRes = await ordersCol.add({ data: orderDoc })
      orderId = addRes._id
    } catch (e) {
      if (stockOk) await productsCol.doc(gb.productId).update({ data: { stock: _.inc(1), soldCount: _.inc(-1) } }).catch(() => {})
      console.error('[groupbuy] 建单失败', e)
      continue
    }

    await orderItemsCol.add({
      data: {
        orderId,
        productId: gb.productId,
        productName: gb.productName,
        price,
        quantity: 1,
        subtotal: price,
      },
    })
    if (stockOk && product) {
      await invLogsCol.add({
        data: {
          productId: gb.productId,
          change: -1,
          stockAfter: null,
          reason: 'groupbuy',
          refId: orderId,
          createdAt: now,
        },
      })
    }
    await participantsCol.doc(p._id).update({ data: { orderId } }).catch(() => {})
    orderMap[p.userId] = { ...orderDoc, _id: orderId, id: orderId }
  }
  return orderMap
}

// ============ 摊主：下架 ============
async function cancelGroupBuy(openid, id) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '无摊位', data: null }

  const { data: gb } = await groupBuysCol.doc(id).get().catch(() => ({ data: null }))
  if (!gb) return { code: 1, message: '拼团不存在', data: null }
  if (gb.stallId !== stall._id) return { code: 1, message: '无权操作', data: null }
  if (gb.status !== 'active') return { code: 1, message: '仅进行中的团可下架', data: null }

  await groupBuysCol.doc(id).update({ data: { status: 'cancelled', updatedAt: Date.now() } })
  return { code: 0, message: 'cancelled', data: { id, status: 'cancelled' } }
}

// ============ 定时器：扫描过期未成团 ============
async function sweepExpired() {
  const now = Date.now()
  const res = await groupBuysCol
    .where({ status: 'active', expireAt: _.lt(now) })
    .update({ data: { status: 'expired', updatedAt: now } })
  return { code: 0, message: 'ok', data: { updated: res.stats ? res.stats.updated : 0 } }
}

function normalizeGroupBuy(doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    id: doc._id,
    stallId: doc.stallId,
    productId: doc.productId,
    productName: doc.productName || '',
    productImage: doc.productImage || '',
    price: doc.price != null ? doc.price : 0,
    originalPrice: doc.originalPrice != null ? doc.originalPrice : 0,
    targetCount: doc.targetCount != null ? doc.targetCount : 2,
    currentCount: doc.currentCount != null ? doc.currentCount : 0,
    expiryHours: doc.expiryHours != null ? doc.expiryHours : 24,
    expireAt: doc.expireAt,
    status: doc.status || 'active',
    createdAt: doc.createdAt,
  }
}
