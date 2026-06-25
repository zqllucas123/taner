const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const wishesCol = db.collection('wishes')
const wishLikesCol = db.collection('wish_likes')
const stallsCol = db.collection('stalls')
const usersCol = db.collection('users')

/**
 * 许愿池云函数（双向：顾客许愿 + 摊主回馈）
 *   create   顾客许愿（内容过 msgSecCheck）
 *   list     列表：stallId=xxx 看某摊位许愿（带是否已点赞）；hot=true 全站热度榜
 *   reply    摊主回愿（设置状态/预定价/到货时间，回复文本过检测）
 *   like     顾客点赞/取消点赞（toggle）
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
        return await createWish(openid, event)
      case 'list':
        return await listWishes(openid, event)
      case 'reply':
        return await replyWish(openid, event)
      case 'like':
        return await toggleLike(openid, event.id)
      default:
        return { code: 1, message: `未知 action: ${action}`, data: null }
    }
  } catch (err) {
    console.error('[wish] 异常:', err)
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

/** 文本内容安全检测（msgSecCheck v2），异常不阻断 */
async function checkText(content, openid) {
  if (!content || !content.trim()) return { ok: true }
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      version: 2,
      scene: 2,
      openid,
      content: content.slice(0, 2500),
    })
    const suggest = res && res.result && res.result.suggest
    if (suggest === 'risky') return { ok: false }
    return { ok: true }
  } catch (e) {
    console.warn('[wish] msgSecCheck 调用失败，放行:', e.errCode || e.message)
    return { ok: true, skipped: true }
  }
}

function toNumber(v) {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

async function createWish(openid, event) {
  const user = await getUserByOpenid(openid)
  if (!user) return { code: 1, message: '请先登录', data: null }

  const { stallId } = event
  const content = (event.content || '').trim()
  if (!stallId) return { code: 1, message: '缺少摊位', data: null }
  if (!content) return { code: 1, message: '请填写许愿内容', data: null }
  if (content.length > 200) return { code: 1, message: '许愿内容过长（限200字）', data: null }

  // 内容安全检测
  const sec = await checkText(content, openid)
  if (!sec.ok) return { code: 1, message: '许愿内容含违规信息，请修改', data: null }

  const now = Date.now()
  const doc = {
    stallId,
    userId: user._id,
    userName: user.nickname || '微信用户',
    userAvatar: user.avatarUrl || '',
    content,
    status: 'pending',
    vendorReply: '',
    vendorReplyAt: null,
    expectPrice: null,
    expectArrive: '',
    likes: 0,
    createdAt: now,
  }
  const { _id } = await wishesCol.add({ data: doc })
  return { code: 0, message: 'created', data: normalizeWish({ ...doc, _id }) }
}

async function listWishes(openid, event) {
  const { stallId, hot } = event
  const where = {}
  if (stallId) where.stallId = stallId
  if (!stallId && !hot) return { code: 1, message: '缺少查询条件', data: null }

  let query = wishesCol.where(where)
  // 全站热度榜按 likes 倒序，否则按时间倒序
  query = hot ? query.orderBy('likes', 'desc') : query.orderBy('createdAt', 'desc')

  const { data } = await query.limit(100).get()
  const wishes = (data || []).map(normalizeWish)

  // 标记当前用户是否已点赞
  const user = await getUserByOpenid(openid)
  if (user && wishes.length) {
    const { data: likes } = await wishLikesCol
      .where({ userId: user._id, wishId: _.in(wishes.map((w) => w.id)) })
      .get()
    const likedSet = new Set((likes || []).map((l) => l.wishId))
    wishes.forEach((w) => { w.liked = likedSet.has(w.id) })
  }
  return { code: 0, message: 'ok', data: wishes }
}

/** 摊主回愿 */
async function replyWish(openid, event) {
  const { id, status, vendorReply, expectPrice, expectArrive } = event
  if (!id) return { code: 1, message: '缺少 id', data: null }
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '无摊位', data: null }

  const { data: wish } = await wishesCol.doc(id).get().catch(() => ({ data: null }))
  if (!wish) return { code: 1, message: '许愿不存在', data: null }
  if (wish.stallId !== stall._id) return { code: 1, message: '只能回复本摊位许愿', data: null }

  const reply = (vendorReply || '').trim()
  if (reply) {
    const sec = await checkText(reply, openid)
    if (!sec.ok) return { code: 1, message: '回复含违规内容，请修改', data: null }
  }

  const updates = { vendorReplyAt: Date.now() }
  if (['pending', 'preparing', 'arrived', 'declined'].includes(status)) updates.status = status
  if (reply) updates.vendorReply = reply
  if (expectPrice != null && expectPrice !== '') updates.expectPrice = toNumber(expectPrice)
  if (expectArrive != null) updates.expectArrive = expectArrive

  await wishesCol.doc(id).update({ data: updates })
  return { code: 0, message: 'ok', data: normalizeWish({ ...wish, ...updates }) }
}

/** 点赞/取消点赞（toggle，去重用 wish_likes 记录） */
async function toggleLike(openid, wishId) {
  if (!wishId) return { code: 1, message: '缺少 id', data: null }
  const user = await getUserByOpenid(openid)
  if (!user) return { code: 1, message: '请先登录', data: null }

  const { data: exist } = await wishLikesCol
    .where({ userId: user._id, wishId })
    .limit(1)
    .get()

  let liked
  if (exist && exist.length) {
    // 取消点赞
    await wishLikesCol.doc(exist[0]._id).remove()
    await wishesCol.doc(wishId).update({ data: { likes: _.inc(-1) } })
    liked = false
  } else {
    await wishLikesCol.add({ data: { userId: user._id, wishId, createdAt: Date.now() } })
    await wishesCol.doc(wishId).update({ data: { likes: _.inc(1) } })
    liked = true
  }

  // 返回最新点赞数
  const { data: wish } = await wishesCol.doc(wishId).get().catch(() => ({ data: null }))
  return { code: 0, message: 'ok', data: { id: wishId, liked, likes: wish ? wish.likes : 0 } }
}

function normalizeWish(doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    id: doc._id,
    stallId: doc.stallId,
    userId: doc.userId,
    userName: doc.userName || '微信用户',
    userAvatar: doc.userAvatar || '',
    content: doc.content || '',
    status: doc.status || 'pending',
    vendorReply: doc.vendorReply || '',
    vendorReplyDate: doc.vendorReplyAt || null,
    expectPrice: doc.expectPrice != null ? doc.expectPrice : null,
    expectArrive: doc.expectArrive || '',
    likes: doc.likes != null ? doc.likes : 0,
    liked: false,
    createdAt: doc.createdAt,
  }
}
