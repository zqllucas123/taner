const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const qrcodesCol = db.collection('stall_qrcodes')
const stallsCol = db.collection('stalls')
const usersCol = db.collection('users')

/**
 * 聚合摆摊码云函数（按 action 路由）
 *   generate  摊主生成本摊位聚合码（getUnlimited 小程序码 → 云存储 → stall_qrcodes，已存在则复用/更新功能位）
 *   get       按 sceneValue 查码（扫码落地用：解析 scene → 返回 stallId + features，并 +1 scanCount）
 *   mine      摊主查本摊位的聚合码
 *
 * 统一响应：{ code, message, data }
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event || {}

  try {
    switch (action) {
      case 'generate':
        return await generateQRCode(openid, event.data || {})
      case 'get':
        return await getByScene(event.sceneValue)
      case 'mine':
        return await getMine(openid)
      default:
        return { code: 1, message: `未知 action: ${action}`, data: null }
    }
  } catch (err) {
    console.error('[qrcode] 异常:', err)
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

/** 生成短 scene 值（≤32 字符，小程序码 scene 限制；不含易混字符） */
function genScene() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 10; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return s
}

const VALID_FEATURES = ['shop', 'wechat', 'coupon', 'reserve', 'time']

function normalizeQRCode(doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    id: doc._id,
    stallId: doc.stallId || '',
    sceneValue: doc.sceneValue || '',
    qrUrl: doc.qrUrl || '',
    features: Array.isArray(doc.features) ? doc.features : [],
    scanCount: typeof doc.scanCount === 'number' ? doc.scanCount : 0,
    createdAt: doc.createdAt || null,
  }
}

/**
 * 生成聚合码：
 *  - 校验为本人摊位
 *  - 已有记录则复用 sceneValue（仅更新 features），无则新建 scene 并调 getUnlimited
 *  - getUnlimited 返回 Buffer → 上传云存储得 fileID 存 qrUrl
 */
async function generateQRCode(openid, data) {
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '请先开通摊位', data: null }

  // 功能位白名单过滤；默认全部开启进店+加微信+领券
  let features = Array.isArray(data.features)
    ? data.features.filter((f) => VALID_FEATURES.includes(f))
    : ['shop', 'wechat', 'coupon']
  if (!features.length) features = ['shop']

  // 已有码：复用 scene，仅更新 features（不重复生成码图，scene 不变码图不变）
  const existing = await qrcodesCol.where({ stallId: stall._id }).limit(1).get()
  if (existing.data && existing.data.length) {
    const doc = existing.data[0]
    await qrcodesCol.doc(doc._id).update({ data: { features } })
    return {
      code: 0,
      message: '已更新',
      data: normalizeQRCode({ ...doc, features }),
    }
  }

  const sceneValue = genScene()

  // 调用 getUnlimited 生成小程序码（落地页解析 scene）
  let qrUrl = ''
  try {
    const wxacode = await cloud.openapi.wxacode.getUnlimited({
      scene: sceneValue,
      page: 'pages/index/index', // 落地页：app.ts onLaunch 统一解析 scene 后再跳转
      checkPath: true,
      envVersion: 'release',
      width: 430,
    })
    const upload = await cloud.uploadFile({
      cloudPath: `qrcodes/${stall._id}-${sceneValue}.png`,
      fileContent: wxacode.buffer,
    })
    qrUrl = upload.fileID
  } catch (e) {
    // 本地/未配置 openapi 权限时不阻断：先存记录，码图后续可重新生成
    console.warn('[qrcode] getUnlimited 失败，仅落库:', e.errCode || e.message)
  }

  const now = Date.now()
  const res = await qrcodesCol.add({
    data: {
      stallId: stall._id,
      sceneValue,
      qrUrl,
      features,
      scanCount: 0,
      createdAt: now,
    },
  })

  return {
    code: 0,
    message: qrUrl ? '生成成功' : '已创建（码图待生成，请确认云函数 openapi 权限）',
    data: normalizeQRCode({
      _id: res._id,
      stallId: stall._id,
      sceneValue,
      qrUrl,
      features,
      scanCount: 0,
      createdAt: now,
    }),
  }
}

/** 扫码落地：按 scene 解析摊位，并累加扫码次数 */
async function getByScene(sceneValue) {
  if (!sceneValue) return { code: 1, message: '缺少 scene', data: null }
  const { data } = await qrcodesCol.where({ sceneValue }).limit(1).get()
  if (!data || !data.length) return { code: 1, message: '无效的码', data: null }

  const doc = data[0]
  // 累加扫码次数（非关键，失败忽略）
  qrcodesCol.doc(doc._id).update({ data: { scanCount: _.inc(1) } }).catch(() => {})

  return {
    code: 0,
    message: 'ok',
    data: normalizeQRCode({ ...doc, scanCount: (doc.scanCount || 0) + 1 }),
  }
}

/** 摊主查本摊位的码 */
async function getMine(openid) {
  const { stall } = await getMyStall(openid)
  if (!stall) return { code: 1, message: '请先开通摊位', data: null }
  const { data } = await qrcodesCol.where({ stallId: stall._id }).limit(1).get()
  return {
    code: 0,
    message: 'ok',
    data: data && data.length ? normalizeQRCode(data[0]) : null,
  }
}
