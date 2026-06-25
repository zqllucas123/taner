const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const usersCol = db.collection('users')
const stallsCol = db.collection('stalls')
const productsCol = db.collection('products')
const pricingCol = db.collection('pricing_records')

/**
 * AI 助手云函数（按 action 路由）
 *   pricing   AI 定价建议：成本/同行价/租金/品类 → 多档价 + 毛利率 + 保本销量，写 pricing_records
 *   history   定价历史记录（本摊位，倒序）
 *
 * 统一响应：{ code, message, data }
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event || {}

  try {
    switch (action) {
      case 'pricing':
        return await pricing(openid, event.data || {})
      case 'history':
        return await history(openid, event)
      default:
        return { code: 1, message: `未知 action: ${action}`, data: null }
    }
  } catch (err) {
    console.error('[ai] 异常:', err)
    return { code: 1, message: err.message || '服务异常', data: null }
  }
}

async function getUserByOpenid(openid) {
  const { data } = await usersCol.where({ openid }).limit(1).get()
  return data && data.length ? data[0] : null
}

/** 取当前用户摊位 */
async function getMyStall(openid) {
  const user = await getUserByOpenid(openid)
  if (!user) return { user: null, stall: null }
  const { data } = await stallsCol.where({ userId: user._id }).limit(1).get()
  return { user, stall: data && data.length ? data[0] : null }
}

/**
 * 不同品类的定价策略参数
 *   targetMargin  目标毛利率（建议价对应）
 *   trafficMargin 引流价毛利率（更低，靠走量）
 *   premiumRate   节假日溢价上浮比例
 *   clearanceRate 清仓价相对成本的加成（接近保本，仅覆盖少量摊销）
 */
const CATEGORY_STRATEGY = {
  生鲜: { targetMargin: 0.35, trafficMargin: 0.15, premiumRate: 0.2, clearanceRate: 0.05, label: '生鲜果蔬' },
  小吃: { targetMargin: 0.6, trafficMargin: 0.3, premiumRate: 0.25, clearanceRate: 0.1, label: '小吃美食' },
  服饰: { targetMargin: 0.55, trafficMargin: 0.25, premiumRate: 0.3, clearanceRate: 0.08, label: '服饰饰品' },
  手工: { targetMargin: 0.65, trafficMargin: 0.3, premiumRate: 0.35, clearanceRate: 0.1, label: '手工文创' },
  日用: { targetMargin: 0.4, trafficMargin: 0.18, premiumRate: 0.15, clearanceRate: 0.06, label: '日用杂货' },
  default: { targetMargin: 0.5, trafficMargin: 0.25, premiumRate: 0.25, clearanceRate: 0.08, label: '通用' },
}

function pickStrategy(foodType) {
  if (!foodType) return CATEGORY_STRATEGY.default
  const key = Object.keys(CATEGORY_STRATEGY).find((k) => foodType.includes(k))
  return CATEGORY_STRATEGY[key] || CATEGORY_STRATEGY.default
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function toNumber(v, fallback = 0) {
  const n = Number(v)
  return isNaN(n) ? fallback : n
}

/**
 * 核心定价计算（纯规则，无外部依赖）
 * @returns 各档价格 + 毛利率 + 保本销量 + 说明
 */
function calcPricing({ costPrice, marketPrice, rentPrice, foodType, expectDailyQty }) {
  const strategy = pickStrategy(foodType)
  const cost = toNumber(costPrice)
  const market = toNumber(marketPrice)
  const rent = toNumber(rentPrice) // 每日点位租金摊销

  // 单件需分摊的租金：按预期日销量摊（默认按 30 件估）
  const dailyQty = Math.max(toNumber(expectDailyQty, 30), 1)
  const rentPerUnit = rent > 0 ? rent / dailyQty : 0
  // 保本成本 = 进货成本 + 单件租金摊销
  const breakEvenCost = cost + rentPerUnit

  // 建议价：按目标毛利率定价（price = cost / (1 - margin)），并参考同行价做收敛
  let suggested = breakEvenCost / (1 - strategy.targetMargin)
  if (market > 0) {
    // 与同行价加权（建议价偏向略低于/接近同行，避免脱离市场）
    suggested = suggested * 0.6 + market * 0.4
    // 不超过同行价的 1.15 倍
    suggested = Math.min(suggested, market * 1.15)
  }
  suggested = Math.max(suggested, breakEvenCost * 1.05) // 至少覆盖保本并留 5% 利润

  // 引流价：低毛利冲量
  let traffic = breakEvenCost / (1 - strategy.trafficMargin)
  if (market > 0) traffic = Math.min(traffic, market * 0.9)
  traffic = Math.max(traffic, breakEvenCost) // 不亏本

  // 节假日溢价
  const premium = suggested * (1 + strategy.premiumRate)

  // 清仓价：仅在成本上微利，快速回笼
  const clearance = Math.max(cost * (1 + strategy.clearanceRate), cost)

  // 毛利率（按建议价）
  const marginRate = suggested > 0 ? ((suggested - breakEvenCost) / suggested) * 100 : 0
  // 保本销量：覆盖当日租金所需销量 = rent / 单件毛利
  const unitProfit = suggested - cost
  const breakEvenQty = unitProfit > 0 && rent > 0 ? Math.ceil(rent / unitProfit) : 0

  const reasoning = buildReasoning({
    strategy,
    cost,
    market,
    rent,
    suggested,
    traffic,
    premium,
    clearance,
    marginRate,
    breakEvenQty,
  })

  return {
    foodType: foodType || '',
    costPrice: round2(cost),
    marketPrice: market ? round2(market) : null,
    rentPrice: rent ? round2(rent) : null,
    suggestedPrice: round2(suggested),
    trafficPrice: round2(traffic),
    premiumPrice: round2(premium),
    clearancePrice: round2(clearance),
    marginRate: round2(marginRate),
    breakEvenQty,
    aiReasoning: reasoning,
  }
}

/** 生成一句定价说明（规则模板，无需调用 LLM 也可用） */
function buildReasoning(p) {
  const parts = []
  parts.push(`按「${p.strategy.label}」品类目标毛利率 ${Math.round(p.strategy.targetMargin * 100)}% 测算`)
  if (p.market > 0) parts.push(`并参考同行售价 ¥${round2(p.market)} 做收敛`)
  parts.push(`建议零售 ¥${round2(p.suggested)}（毛利率约 ${round2(p.marginRate)}%）`)
  parts.push(`引流价 ¥${round2(p.traffic)} 用于冲量获客`)
  if (p.rent > 0 && p.breakEvenQty > 0) parts.push(`每日约卖 ${p.breakEvenQty} 件可覆盖摊位租金`)
  parts.push(`尾货清仓 ¥${round2(p.clearance)} 快速回笼`)
  return parts.join('，') + '。'
}

async function pricing(openid, payload) {
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '请先开店再使用定价助手', data: null }

  if (payload.costPrice == null || toNumber(payload.costPrice) <= 0) {
    return { code: 1, message: '请填写进货成本', data: null }
  }

  const result = calcPricing(payload)

  // 落库 pricing_records
  const now = Date.now()
  const doc = {
    stallId: stall._id,
    productId: payload.productId || null,
    foodType: result.foodType,
    costPrice: result.costPrice,
    marketPrice: result.marketPrice,
    rentPrice: result.rentPrice,
    suggestedPrice: result.suggestedPrice,
    trafficPrice: result.trafficPrice,
    premiumPrice: result.premiumPrice,
    clearancePrice: result.clearancePrice,
    marginRate: result.marginRate,
    breakEvenQty: result.breakEvenQty,
    aiReasoning: result.aiReasoning,
    createdAt: now,
  }

  const { _id } = await pricingCol.add({ data: doc })
  return { code: 0, message: 'ok', data: normalizeRecord({ ...doc, _id }) }
}

async function history(openid, event) {
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 0, message: 'ok', data: [] }

  const limit = Math.min(toNumber(event.limit, 20), 50)
  const { data } = await pricingCol
    .where({ stallId: stall._id })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return { code: 0, message: 'ok', data: (data || []).map(normalizeRecord) }
}

/** 统一返回结构：补 id（= _id），对齐前端 PricingRecord 类型 */
function normalizeRecord(doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    id: doc._id,
    stallId: doc.stallId,
    productId: doc.productId || null,
    foodType: doc.foodType || '',
    costPrice: doc.costPrice != null ? doc.costPrice : 0,
    marketPrice: doc.marketPrice,
    rentPrice: doc.rentPrice,
    suggestedPrice: doc.suggestedPrice,
    trafficPrice: doc.trafficPrice,
    premiumPrice: doc.premiumPrice,
    clearancePrice: doc.clearancePrice,
    marginRate: doc.marginRate,
    breakEvenQty: doc.breakEvenQty,
    aiReasoning: doc.aiReasoning || '',
    createdAt: doc.createdAt,
  }
}
