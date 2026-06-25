const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const productsCol = db.collection('products')
const stallsCol = db.collection('stalls')
const usersCol = db.collection('users')

/**
 * 商品云函数（按 action 路由）
 *   create        新增商品（需为本人摊位）
 *   update        更新商品（含上下架/清仓，归属校验）
 *   delete        软删除商品
 *   get           商品详情
 *   list          商品列表
 *                   - 摊主端 mine=true：看自己摊位全部商品
 *                   - 顾客端 stallId=xxx：看该摊位已上架商品
 *   updateStatus  上下架快捷切换
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
        return await createProduct(openid, event.data || {})
      case 'update':
        return await updateProduct(openid, event.id, event.data || {})
      case 'delete':
        return await deleteProduct(openid, event.id)
      case 'get':
        return await getProduct(event.id)
      case 'list':
        return await listProducts(openid, event)
      case 'updateStatus':
        return await updateStatus(openid, event.id, event.status)
      default:
        return { code: 1, message: `未知 action: ${action}`, data: null }
    }
  } catch (err) {
    console.error('[product] 异常:', err)
    return { code: 1, message: err.message || '服务异常', data: null }
  }
}

async function getUserByOpenid(openid) {
  const { data } = await usersCol.where({ openid }).limit(1).get()
  return data && data.length ? data[0] : null
}

/** 取当前用户的摊位（商品归属判断基准） */
async function getMyStall(openid) {
  const user = await getUserByOpenid(openid)
  if (!user) return { user: null, stall: null }
  const { data } = await stallsCol.where({ userId: user._id }).limit(1).get()
  return { user, stall: data && data.length ? data[0] : null }
}

async function createProduct(openid, payload) {
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '请先开店再添加商品', data: null }

  const now = Date.now()
  const doc = {
    stallId: stall._id,
    name: payload.name || '',
    price: toNumber(payload.price),
    originalPrice: payload.originalPrice != null ? toNumber(payload.originalPrice) : null,
    costPrice: payload.costPrice != null ? toNumber(payload.costPrice) : null,
    stock: payload.stock != null ? parseInt(payload.stock, 10) : 0,
    soldCount: 0,
    imageUrl: payload.imageUrl || '',
    imageOptimized: payload.imageOptimized || '',
    category: payload.category || '',
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    description: payload.description || '',
    isClearing: !!payload.isClearing,
    status: payload.status === 'off' ? 'off' : 'on',
    sortOrder: payload.sortOrder != null ? parseInt(payload.sortOrder, 10) : 0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  const { _id } = await productsCol.add({ data: doc })
  return { code: 0, message: 'created', data: normalizeProduct({ ...doc, _id }) }
}

async function updateProduct(openid, id, payload) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '无摊位', data: null }

  const { data: product } = await productsCol.doc(id).get().catch(() => ({ data: null }))
  if (!product) return { code: 1, message: '商品不存在', data: null }
  if (product.stallId !== stall._id) return { code: 1, message: '无权操作他人商品', data: null }

  const allowed = [
    'name', 'price', 'originalPrice', 'costPrice', 'stock', 'imageUrl',
    'imageOptimized', 'category', 'tags', 'description', 'isClearing',
    'status', 'sortOrder',
  ]
  const numFields = ['price', 'originalPrice', 'costPrice']
  const intFields = ['stock', 'sortOrder']
  const updates = { updatedAt: Date.now() }
  allowed.forEach((k) => {
    if (payload[k] === undefined) return
    if (numFields.includes(k)) updates[k] = payload[k] == null ? null : toNumber(payload[k])
    else if (intFields.includes(k)) updates[k] = parseInt(payload[k], 10) || 0
    else updates[k] = payload[k]
  })

  await productsCol.doc(id).update({ data: updates })
  return { code: 0, message: 'ok', data: normalizeProduct({ ...product, ...updates }) }
}

async function deleteProduct(openid, id) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '无摊位', data: null }

  const { data: product } = await productsCol.doc(id).get().catch(() => ({ data: null }))
  if (!product) return { code: 1, message: '商品不存在', data: null }
  if (product.stallId !== stall._id) return { code: 1, message: '无权操作', data: null }

  // 软删除：置 deletedAt，列表查询时过滤
  await productsCol.doc(id).update({ data: { deletedAt: Date.now(), status: 'off' } })
  return { code: 0, message: 'deleted', data: { id } }
}

async function getProduct(id) {
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const { data } = await productsCol.doc(id).get().catch(() => ({ data: null }))
  if (!data || data.deletedAt) return { code: 1, message: '商品不存在', data: null }
  return { code: 0, message: 'ok', data: normalizeProduct(data) }
}

async function listProducts(openid, event) {
  const { mine, stallId } = event
  let targetStallId = stallId

  if (mine) {
    const { stall } = await getMyStall(openid)
    if (!stall) return { code: 0, message: 'ok', data: [] }
    targetStallId = stall._id
  }
  if (!targetStallId) return { code: 1, message: '缺少 stallId', data: null }

  const where = { stallId: targetStallId, deletedAt: _.eq(null) }
  // 顾客端只看上架商品；摊主端（mine）看全部
  if (!mine) where.status = 'on'

  const { data } = await productsCol
    .where(where)
    .orderBy('sortOrder', 'asc')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  return { code: 0, message: 'ok', data: (data || []).map(normalizeProduct) }
}

async function updateStatus(openid, id, status) {
  if (!['on', 'off'].includes(status)) return { code: 1, message: '非法状态', data: null }
  return await updateProduct(openid, id, { status })
}

function toNumber(v) {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

/** 统一返回结构：补 id 字段（= _id），对齐前端 Product 类型 */
function normalizeProduct(doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    id: doc._id,
    stallId: doc.stallId,
    name: doc.name || '',
    price: doc.price != null ? doc.price : 0,
    originalPrice: doc.originalPrice,
    costPrice: doc.costPrice,
    stock: doc.stock != null ? doc.stock : 0,
    soldCount: doc.soldCount != null ? doc.soldCount : 0,
    imageUrl: doc.imageUrl || '',
    imageOptimized: doc.imageOptimized || '',
    category: doc.category || '',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    description: doc.description || '',
    isClearing: !!doc.isClearing,
    status: doc.status || 'on',
    sortOrder: doc.sortOrder != null ? doc.sortOrder : 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}
