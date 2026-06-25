const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const ordersCol = db.collection('orders')
const orderItemsCol = db.collection('order_items')
const productsCol = db.collection('products')
const stallsCol = db.collection('stalls')
const usersCol = db.collection('users')
const invLogsCol = db.collection('inventory_logs')
const couponsCol = db.collection('coupons')
const userCouponsCol = db.collection('user_coupons')

/**
 * 订单云函数（按 action 路由）
 *   reserve   顾客创建预定单：生成取货码 + 原子库存预扣 + 写 order_items + inventory_logs（Day8）
 *   list      订单列表：顾客看自己的 / 摊主看本摊位的（Day9）
 *   get       订单详情（含明细）
 *   confirm   摊主接单：pending → confirmed（Day9）
 *   complete  摊主核销：confirmed → completed，支持按取货码核销（Day9）
 *   cancel    取消订单：回滚库存（Day9）
 *
 * 统一响应：{ code, message, data }
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event || {}

  try {
    switch (action) {
      case 'reserve':
        return await reserve(openid, event)
      case 'list':
        return await listOrders(openid, event)
      case 'get':
        return await getOrder(openid, event.id)
      case 'confirm':
        return await confirmOrder(openid, event.id)
      case 'complete':
        return await completeOrder(openid, event)
      case 'cancel':
        return await cancelOrder(openid, event.id)
      default:
        return { code: 1, message: `未知 action: ${action}`, data: null }
    }
  } catch (err) {
    console.error('[order] 异常:', err)
    return { code: 1, message: err.message || '服务异常', data: null }
  }
}

async function getUserByOpenid(openid) {
  const { data } = await usersCol.where({ openid }).limit(1).get()
  return data && data.length ? data[0] : null
}

/** 取当前用户的摊位 */
async function getMyStall(openid) {
  const user = await getUserByOpenid(openid)
  if (!user) return { user: null, stall: null }
  const { data } = await stallsCol.where({ userId: user._id }).limit(1).get()
  return { user, stall: data && data.length ? data[0] : null }
}

/** 生成展示订单号：年月日 + 6位随机 */
function genOrderNo() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(Math.random() * 1e6)).padStart(6, '0')
  return `${ymd}${rand}`
}

/** 生成取货码：PICK-XXXX（4位大写字母数字） */
function genPickupCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去除易混淆 0O1I
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `PICK-${code}`
}

function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * 原子库存预扣：仅当 stock >= qty 时扣减，返回是否成功
 * 利用 where 条件 + update 的更新条数判断，避免超卖
 */
async function deductStock(productId, qty) {
  const res = await productsCol
    .where({ _id: productId, stock: _.gte(qty), deletedAt: _.eq(null) })
    .update({ data: { stock: _.inc(-qty), soldCount: _.inc(qty), updatedAt: Date.now() } })
  return res.stats && res.stats.updated > 0
}

/** 回滚库存（取消/失败补偿） */
async function rollbackStock(productId, qty) {
  await productsCol.doc(productId).update({
    data: { stock: _.inc(qty), soldCount: _.inc(-qty), updatedAt: Date.now() },
  })
}

/**
 * 创建预定单
 * event: { stallId, items:[{productId, quantity}], pickupTime, reserveNotes, couponId }
 */
async function reserve(openid, event) {
  const user = await getUserByOpenid(openid)
  if (!user) return { code: 1, message: '请先登录', data: null }

  const { stallId, items, pickupTime, reserveNotes, couponId } = event
  if (!stallId) return { code: 1, message: '缺少摊位', data: null }
  if (!Array.isArray(items) || items.length === 0) {
    return { code: 1, message: '请选择商品', data: null }
  }

  // 校验摊位存在且在营
  const { data: stall } = await stallsCol.doc(stallId).get().catch(() => ({ data: null }))
  if (!stall) return { code: 1, message: '摊位不存在', data: null }

  // 拉取商品快照，校验归属与上架状态
  const productIds = items.map((i) => i.productId)
  const { data: products } = await productsCol.where({ _id: _.in(productIds) }).get()
  const prodMap = {}
  ;(products || []).forEach((p) => { prodMap[p._id] = p })

  const orderItems = []
  let totalAmount = 0
  for (const it of items) {
    const p = prodMap[it.productId]
    const qty = parseInt(it.quantity, 10) || 0
    if (!p) return { code: 1, message: `商品不存在: ${it.productId}`, data: null }
    if (p.deletedAt) return { code: 1, message: `商品已下架: ${p.name}`, data: null }
    if (p.stallId !== stallId) return { code: 1, message: '商品与摊位不匹配', data: null }
    if (p.status !== 'on') return { code: 1, message: `商品已下架: ${p.name}`, data: null }
    if (qty <= 0) return { code: 1, message: `数量非法: ${p.name}`, data: null }
    if (p.stock < qty) return { code: 1, message: `库存不足: ${p.name}（剩 ${p.stock}）`, data: null }

    const subtotal = round2(p.price * qty)
    totalAmount += subtotal
    orderItems.push({
      productId: p._id,
      productName: p.name,
      price: p.price,
      quantity: qty,
      subtotal,
    })
  }
  totalAmount = round2(totalAmount)

  // 优惠券核销校验（在扣库存前算好抵扣金额）
  let discountAmount = 0
  let userCouponDoc = null
  let couponDoc = null
  if (couponId) {
    const { data: uc } = await userCouponsCol.doc(couponId).get().catch(() => ({ data: null }))
    if (!uc) return { code: 1, message: '优惠券不存在', data: null }
    if (uc.userId !== user._id) return { code: 1, message: '无权使用该券', data: null }
    if (uc.status !== 'unused') return { code: 1, message: '该券已使用或已过期', data: null }
    if (uc.stallId !== stallId) return { code: 1, message: '该券不适用于本摊位', data: null }

    const { data: cp } = await couponsCol.doc(uc.couponId).get().catch(() => ({ data: null }))
    if (!cp) return { code: 1, message: '优惠券信息异常', data: null }
    if (cp.expiry && new Date(cp.expiry).getTime() < Date.now()) {
      return { code: 1, message: '优惠券已过期', data: null }
    }
    if (totalAmount < (cp.minSpend || 0)) {
      return { code: 1, message: `满 ${cp.minSpend} 元可用该券`, data: null }
    }

    // 折扣计算：cash/gift 直减 discount；discount 为折扣率（如 8.5 折→discount=8.5）
    if (cp.type === 'discount') {
      const rate = Math.min(Math.max(cp.discount, 0), 10) / 10 // 折数 → 比例
      discountAmount = round2(totalAmount * (1 - rate))
    } else {
      discountAmount = round2(Math.min(cp.discount || 0, totalAmount))
    }
    userCouponDoc = uc
    couponDoc = cp
  }

  // 原子预扣库存（逐件），失败则回滚已扣的
  const deducted = []
  for (const oi of orderItems) {
    const ok = await deductStock(oi.productId, oi.quantity)
    if (!ok) {
      // 回滚已扣
      for (const d of deducted) await rollbackStock(d.productId, d.quantity)
      return { code: 1, message: `下单失败，库存不足: ${oi.productName}`, data: null }
    }
    deducted.push(oi)
  }

  // 创建订单主表
  const now = Date.now()
  const orderDoc = {
    orderNo: genOrderNo(),
    userId: user._id,
    stallId,
    type: 'reserve',
    status: 'pending',
    channel: 'online',
    totalAmount,
    discountAmount,
    payAmount: round2(totalAmount - discountAmount),
    couponId: couponId || null,
    pickupCode: genPickupCode(),
    pickupTime: pickupTime || '',
    reserveNotes: reserveNotes || '',
    disputeStatus: 'none',
    penaltyAmount: 0,
    reserveExpireAt: now + 24 * 3600 * 1000, // 24h 内有效
    createdAt: now,
    updatedAt: now,
  }

  let orderId
  try {
    const addRes = await ordersCol.add({ data: orderDoc })
    orderId = addRes._id
  } catch (e) {
    // 订单创建失败，回滚全部库存
    for (const d of deducted) await rollbackStock(d.productId, d.quantity)
    throw e
  }

  // 写订单明细 + 库存流水
  for (const oi of orderItems) {
    await orderItemsCol.add({ data: { orderId, ...oi } })
    const p = prodMap[oi.productId]
    await invLogsCol.add({
      data: {
        productId: oi.productId,
        change: -oi.quantity,
        stockAfter: (p.stock || 0) - oi.quantity,
        reason: 'reserve',
        refId: orderId,
        createdAt: now,
      },
    })
  }

  // 优惠券核销：原子标记 user_coupon 为 used（仅当仍 unused，防并发重复抵扣）
  if (userCouponDoc) {
    const ucRes = await userCouponsCol
      .where({ _id: userCouponDoc._id, status: 'unused' })
      .update({ data: { status: 'used', orderId, usedAt: now } })
    if (!ucRes.stats || ucRes.stats.updated === 0) {
      // 并发下券已被占用：回滚库存 + 删除订单 + 明细
      for (const d of deducted) await rollbackStock(d.productId, d.quantity)
      await ordersCol.doc(orderId).remove().catch(() => {})
      const { data: createdItems } = await orderItemsCol.where({ orderId }).get()
      for (const ci of createdItems || []) await orderItemsCol.doc(ci._id).remove().catch(() => {})
      return { code: 1, message: '优惠券已被使用，请重新下单', data: null }
    }
  }

  const fullOrder = normalizeOrder({ ...orderDoc, _id: orderId })
  fullOrder.items = orderItems.map((oi) => ({ ...oi, id: '', orderId }))
  return { code: 0, message: 'reserved', data: fullOrder }
}

/** 订单列表：顾客看自己 / 摊主看本摊位 */
async function listOrders(openid, event) {
  const { role, status } = event
  const where = {}

  if (role === 'seller') {
    const { stall } = await getMyStall(openid)
    if (!stall) return { code: 0, message: 'ok', data: [] }
    where.stallId = stall._id
  } else {
    const user = await getUserByOpenid(openid)
    if (!user) return { code: 0, message: 'ok', data: [] }
    where.userId = user._id
  }
  if (status) where.status = status

  const { data } = await ordersCol.where(where).orderBy('createdAt', 'desc').limit(100).get()
  const orders = (data || []).map(normalizeOrder)

  // 附加明细
  for (const o of orders) {
    const { data: its } = await orderItemsCol.where({ orderId: o.id }).get()
    o.items = (its || []).map(normalizeItem)
  }
  return { code: 0, message: 'ok', data: orders }
}

async function getOrder(openid, id) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const { data } = await ordersCol.doc(id).get().catch(() => ({ data: null }))
  if (!data) return { code: 1, message: '订单不存在', data: null }
  const order = normalizeOrder(data)
  const { data: its } = await orderItemsCol.where({ orderId: id }).get()
  order.items = (its || []).map(normalizeItem)
  return { code: 0, message: 'ok', data: order }
}

/** 摊主接单 pending → confirmed */
async function confirmOrder(openid, id) {
  return await sellerTransition(openid, id, 'pending', 'confirmed', '只有待处理订单可接单')
}

/** 摊主核销 confirmed → completed（支持按取货码） */
async function completeOrder(openid, event) {
  const { id, pickupCode } = event
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '无摊位', data: null }

  let order
  if (pickupCode) {
    const { data } = await ordersCol
      .where({ stallId: stall._id, pickupCode, status: 'confirmed' })
      .limit(1)
      .get()
    order = data && data.length ? data[0] : null
    if (!order) return { code: 1, message: '取货码无效或订单状态不符', data: null }
  } else {
    if (!id) return { code: 1, message: '缺少 id 或取货码', data: null }
    const { data } = await ordersCol.doc(id).get().catch(() => ({ data: null }))
    order = data
    if (!order) return { code: 1, message: '订单不存在', data: null }
    if (order.stallId !== stall._id) return { code: 1, message: '无权操作', data: null }
    if (order.status !== 'confirmed') return { code: 1, message: '只有已确认订单可核销', data: null }
  }

  await ordersCol.doc(order._id).update({ data: { status: 'completed', updatedAt: Date.now() } })
  return { code: 0, message: 'completed', data: normalizeOrder({ ...order, status: 'completed' }) }
}

/** 取消订单：回滚库存 */
async function cancelOrder(openid, id) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const user = await getUserByOpenid(openid)
  if (!user) return { code: 1, message: '请先登录', data: null }

  const { data: order } = await ordersCol.doc(id).get().catch(() => ({ data: null }))
  if (!order) return { code: 1, message: '订单不存在', data: null }

  // 顾客本人或摊主可取消
  const { stall } = await getMyStall(openid)
  const isOwner = order.userId === user._id
  const isSeller = stall && order.stallId === stall._id
  if (!isOwner && !isSeller) return { code: 1, message: '无权操作', data: null }
  if (['completed', 'cancelled'].includes(order.status)) {
    return { code: 1, message: '该订单不可取消', data: null }
  }

  // 回滚库存
  const { data: its } = await orderItemsCol.where({ orderId: id }).get()
  const now = Date.now()
  for (const it of its || []) {
    await rollbackStock(it.productId, it.quantity)
    await invLogsCol.add({
      data: {
        productId: it.productId,
        change: it.quantity,
        stockAfter: null, // 回滚后实时库存以 products 为准
        reason: 'rollback',
        refId: id,
        createdAt: now,
      },
    })
  }

  // 退还已使用的优惠券（恢复为 unused）
  if (order.couponId) {
    await userCouponsCol
      .where({ _id: order.couponId, status: 'used', orderId: id })
      .update({ data: { status: 'unused', orderId: null, usedAt: null } })
      .catch(() => {})
  }

  await ordersCol.doc(id).update({ data: { status: 'cancelled', updatedAt: now } })
  return { code: 0, message: 'cancelled', data: { id, status: 'cancelled' } }
}

/** 摊主状态流转通用逻辑 */
async function sellerTransition(openid, id, fromStatus, toStatus, errMsg) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '无摊位', data: null }

  const { data: order } = await ordersCol.doc(id).get().catch(() => ({ data: null }))
  if (!order) return { code: 1, message: '订单不存在', data: null }
  if (order.stallId !== stall._id) return { code: 1, message: '无权操作', data: null }
  if (order.status !== fromStatus) return { code: 1, message: errMsg, data: null }

  await ordersCol.doc(id).update({ data: { status: toStatus, updatedAt: Date.now() } })
  return { code: 0, message: 'ok', data: normalizeOrder({ ...order, status: toStatus }) }
}

/** 统一返回结构：补 id（= _id），对齐前端 Order 类型 */
function normalizeOrder(doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    id: doc._id,
    orderNo: doc.orderNo || '',
    userId: doc.userId,
    stallId: doc.stallId,
    type: doc.type || 'reserve',
    status: doc.status || 'pending',
    channel: doc.channel || 'online',
    totalAmount: doc.totalAmount != null ? doc.totalAmount : 0,
    discountAmount: doc.discountAmount != null ? doc.discountAmount : 0,
    payAmount: doc.payAmount != null ? doc.payAmount : 0,
    couponId: doc.couponId || null,
    pickupCode: doc.pickupCode || '',
    pickupTime: doc.pickupTime || '',
    reserveNotes: doc.reserveNotes || '',
    reserveExpireAt: doc.reserveExpireAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function normalizeItem(doc) {
  if (!doc) return null
  return {
    id: doc._id,
    orderId: doc.orderId,
    productId: doc.productId,
    productName: doc.productName || '',
    price: doc.price != null ? doc.price : 0,
    quantity: doc.quantity != null ? doc.quantity : 0,
    subtotal: doc.subtotal != null ? doc.subtotal : 0,
  }
}
