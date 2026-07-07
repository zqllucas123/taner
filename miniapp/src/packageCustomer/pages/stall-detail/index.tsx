import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { Empty, Popup } from '@nutui/nutui-react-taro'
import { useStallStore } from '@/stores/stallStore'
import { useProductStore } from '@/stores/productStore'
import { useCouponStore } from '@/stores/couponStore'
import { useWishStore } from '@/stores/wishStore'
import { useCartStore } from '@/stores/cartStore'
import { useGroupbuyStore } from '@/stores/groupbuyStore'
import { getTempFileURLs } from '@/utils/upload'
import type { StallStatus, Coupon, Product, GroupBuy } from '@/types'
import './index.scss'

/** 出摊状态 → 颜色 / 文案 */
const STATUS_META: Record<StallStatus, { color: string; text: string; dot: string }> = {
  active: { color: '#ef4444', text: '出摊中', dot: '🔥' },
  upcoming: { color: '#f59e0b', text: '即将出摊', dot: '🟡' },
  offline: { color: '#94a3b8', text: '打烊中', dot: '🌧️' },
}

const CATEGORY_EMOJI: Record<string, string> = {
  小吃美食: '🍢',
  服饰饰品: '👗',
  生鲜果蔬: '🥬',
  手工文创: '🎨',
  日用杂货: '🧺',
}

/** 时间戳 → MM-DD 简短日期 */
const shortDate = (ts?: number) => {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 到期时间戳 → 「还剩 X 小时/分钟」倒计时文案 */
const remainText = (expireAt?: number) => {
  if (!expireAt) return ''
  const ms = expireAt - Date.now()
  if (ms <= 0) return '已结束'
  const hours = Math.floor(ms / 3600000)
  if (hours >= 1) return `还剩 ${hours} 小时`
  const mins = Math.max(1, Math.floor(ms / 60000))
  return `还剩 ${mins} 分钟`
}

export default function StallDetail() {
  const router = useRouter()
  const stallId = router.params.id || ''

  const { currentStall, fetchDetail } = useStallStore()
  const { products, fetchByStall } = useProductStore()
  const { stallCoupons, fetchStallCoupons, claimCoupon } = useCouponStore()
  const { wishes, fetchWishes, toggleLike } = useWishStore()
  const cart = useCartStore()
  const { stallGroups, fetchByStall: fetchGroups, join: joinGroup, fetchDetail: fetchGroupDetail } =
    useGroupbuyStore()

  // 实景图：原图 / AI 优化对比切换
  const [showOptimized, setShowOptimized] = useState(false)
  const [urlMap, setUrlMap] = useState<Record<string, string>>({})
  // 拼团详情弹层
  const [gbDetail, setGbDetail] = useState<GroupBuy | null>(null)

  useDidShow(() => {
    if (stallId) {
      fetchDetail(stallId)
      fetchByStall(stallId)
      fetchStallCoupons(stallId)
      fetchWishes({ stallId })
      fetchGroups(stallId)
    }
  })

  // 收集所有 cloud:// 图片（实景图原图+优化图、商品图）换临时 URL
  useEffect(() => {
    const ids: string[] = []
    if (currentStall?.vibeImage) ids.push(currentStall.vibeImage)
    if (currentStall?.vibeImageOpt) ids.push(currentStall.vibeImageOpt)
    products.forEach((p) => p.imageUrl && ids.push(p.imageUrl))
    const todo = ids.filter((u) => u && u.startsWith('cloud://') && !urlMap[u])
    if (todo.length) {
      getTempFileURLs(todo).then((map) => setUrlMap((prev) => ({ ...prev, ...map })))
    }
  }, [currentStall, products])

  const resolveImg = (url?: string) => {
    if (!url) return ''
    return url.startsWith('cloud://') ? urlMap[url] || '' : url
  }

  if (!currentStall) {
    return (
      <View className='stall-detail-page'>
        <View className='loading-ph'>
          <Text className='lp-emoji'>🏪</Text>
          <Text className='lp-text'>加载摊位信息中...</Text>
        </View>
      </View>
    )
  }

  const s = currentStall
  const meta = STATUS_META[s.status] || STATUS_META.offline
  // 实景图：有优化图且开启对比时显示优化图，否则原图
  const hasOpt = !!s.vibeImageOpt
  const heroImg = resolveImg(showOptimized && hasOpt ? s.vibeImageOpt : s.vibeImage)
  const previewWishes = wishes.slice(0, 3)

  const goReserve = () => {
    Taro.navigateTo({ url: `/packageCustomer/pages/reserve/index?stallId=${stallId}` })
  }

  // 加入购物车（跨店时弹确认后清空重加 · 美团同款单店约束）
  const handleAddToCart = (p: Product) => {
    if (s.status === 'offline') {
      Taro.showToast({ title: '摊主歇业中，暂不可加购', icon: 'none' })
      return
    }
    const r = cart.add(stallId, s.name, p)
    if (r === 'cross-stall') {
      Taro.showModal({
        title: '切换店铺',
        content: `购物车里还有「${cart.stallName}」的商品，切换到本店会清空购物车，是否继续？`,
        confirmText: '清空并加购',
        success: (res) => {
          if (res.confirm) {
            cart.clear()
            cart.forceAdd(stallId, s.name, p)
          }
        },
      })
    }
  }

  // 去结算：携带购物车进入预定页
  const goCheckout = () => {
    if (cart.totalQty() === 0) {
      goReserve()
      return
    }
    Taro.navigateTo({ url: `/packageCustomer/pages/reserve/index?stallId=${stallId}&fromCart=1` })
  }

  // 参团
  const handleJoinGroup = async (g: GroupBuy) => {
    if (g.joined) {
      openGbDetail(g)
      return
    }
    const res = await joinGroup(g.id)
    if (!res) return
    if (res.completed) {
      const code = res.myOrder?.pickupCode
      Taro.showModal({
        title: '🎉 拼团成功！',
        content: code
          ? `已为你生成拼团订单，取货码：${code}\n到摊报此码即可自提。`
          : '已成团，到摊自提即可。可在「我的预定」查看。',
        showCancel: false,
        confirmText: '知道了',
      })
    } else {
      const left = Math.max(0, res.groupBuy.targetCount - res.groupBuy.currentCount)
      Taro.showToast({ title: left > 0 ? `参团成功，还差 ${left} 人成团` : '参团成功', icon: 'none' })
    }
  }

  // 打开拼团详情（参与者头像）
  const openGbDetail = async (g: GroupBuy) => {
    setGbDetail(g) // 先展示基础信息
    const full = await fetchGroupDetail(g.id)
    if (full) setGbDetail(full)
  }

  const goWish = () => {
    Taro.navigateTo({ url: `/packageCustomer/pages/wish-pool/index?stallId=${stallId}` })
  }

  const handleClaim = async (c: Coupon) => {
    if (c.claimed) return
    const ok = await claimCoupon(c.id)
    if (ok) Taro.showToast({ title: '领取成功', icon: 'success' })
  }

  const couponDiscountText = (c: Coupon) => {
    if (c.type === 'discount') return `${c.discount}折`
    if (c.type === 'gift') return '赠品'
    return `￥${c.discount}`
  }

  const callPhone = () => {
    if (!s.phone) {
      Taro.showToast({ title: '摊主未留电话', icon: 'none' })
      return
    }
    Taro.makePhoneCall({ phoneNumber: s.phone }).catch(() => {})
  }

  return (
    <ScrollView scrollY className='stall-detail-page'>
      {/* 实景对比区（AI 去杂乱前后对比 · 设计稿特色） */}
      <View className='hero'>
        {heroImg ? (
          <Image className='hero-img' src={heroImg} mode='aspectFill' />
        ) : (
          <View className='hero-ph'>
            <Text className='hp-emoji'>{CATEGORY_EMOJI[s.category] || '🏪'}</Text>
          </View>
        )}
        {/* 实景标签（左上） */}
        <View className='hero-label'>
          ✨ {showOptimized && hasOpt ? 'AI去杂乱优化实景 (高清晰、环境美化)' : '线下杂乱地摊原相机实景'}
        </View>
        {/* 出摊状态角标 */}
        <View className='hero-status' style={{ background: meta.color }}>
          {meta.dot} {s.statusText || meta.text}
        </View>
        {/* 原图 / AI净化切换按钮（右下 · emerald 药丸） */}
        {hasOpt && (
          <View
            className='hero-ai-btn'
            onClick={() => {
              setShowOptimized(!showOptimized)
              Taro.showToast({
                title: showOptimized ? '切换至实景' : '已切至AI净化照片',
                icon: 'none',
              })
            }}
          >
            {showOptimized ? '🖼️ 查看原照' : '✨ AI净化去杂乱'}
          </View>
        )}
      </View>

      {/* 小店横幅（emerald · 对齐设计稿 shop 视图 banner） */}
      <View className='shop-banner'>
        <View className='sb-badges'>
          <Text className='sb-badge'>{CATEGORY_EMOJI[s.category] || '🏪'} {s.category}</Text>
          <Text className='sb-badge sb-badge--rating'>★ {s.rating?.toFixed(1)}</Text>
        </View>
        <View className='sb-name-row'>
          <Text className='sb-name'>{s.name}</Text>
          {s.isHot && <Text className='sb-hot'>爆火</Text>}
        </View>
        {!!s.description && <Text className='sb-desc'>{s.description}</Text>}
        <View className='sb-foot'>
          <Text className='sbf-time'>🕐 营业时间：{s.stallTime || '摊主暂未填写'}</Text>
          <Text className='sbf-credit'>信用 {s.creditScore}</Text>
        </View>
      </View>

      {/* 位置 / 摊主 信息条 */}
      <View className='meta-strip'>
        <View className='ms-row' onClick={() => s.location && Taro.showToast({ title: s.location, icon: 'none' })}>
          <Text className='msr-label'>📍</Text>
          <Text className='msr-value'>{s.location || '位置未填'}</Text>
        </View>
        {!!s.ownerName && (
          <View className='ms-row'>
            <Text className='msr-label'>👨‍🍳</Text>
            <Text className='msr-value'>摊主 · {s.ownerName}</Text>
          </View>
        )}
      </View>

      {/* 公告（amber 提示条） */}
      {!!s.announcement && (
        <View className='notice-card'>
          <Text className='nc-text'>{s.announcement}</Text>
        </View>
      )}

      {/* 优惠券区（rose 撕口券 · 对齐设计稿） */}
      {stallCoupons.length > 0 && (
        <View className='coupon-area'>
          <Text className='ca-title'>🧧 到店/预留可用优惠券 (点击一键领取)</Text>
          <ScrollView scrollX className='coupon-strip'>
            {stallCoupons.map((c) => (
              <View
                key={c.id}
                className={`coupon-mini ${c.claimed ? 'claimed' : ''}`}
                onClick={() => handleClaim(c)}
              >
                <View className='cm-left'>
                  <Text className='cm-amount'>{couponDiscountText(c)}</Text>
                </View>
                <View className='cm-mid'>
                  <Text className='cm-title'>{c.title}</Text>
                  <Text className='cm-min'>满￥{c.minSpend}可用</Text>
                </View>
                <View className='cm-claim'>{c.claimed ? '已领' : '领取'}</View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 邻里拼团（orange/amber 渐变 · 对齐设计稿） */}
      {stallGroups.length > 0 && (
        <View className='groupbuy-area'>
          <View className='gb-head'>
            <Text className='gb-title'>👥 发起的邻里拼团 (2-3成团)</Text>
            <Text className='gb-sub'>成团即享超低价</Text>
          </View>
          <View className='gb-list'>
            {stallGroups.map((g) => {
              const left = Math.max(0, g.targetCount - g.currentCount)
              return (
                <View key={g.id} className='gb-row'>
                  <View className='gbr-info' onClick={() => openGbDetail(g)}>
                    <Text className='gbr-name'>{g.productName}</Text>
                    <View className='gbr-meta'>
                      <Text className='gbr-price'>￥{g.price}</Text>
                      {g.originalPrice ? <Text className='gbr-origin'>￥{g.originalPrice}</Text> : null}
                      <Text className='gbr-progress'>差 {left} 人成团</Text>
                      <Text className='gbr-timer'>{remainText(g.expireAt)}</Text>
                    </View>
                  </View>
                  <View
                    className={`gbr-btn ${g.joined ? 'joined' : ''}`}
                    onClick={() => handleJoinGroup(g)}
                  >
                    {g.joined ? '已在拼单' : '一键参团'}
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* 商品列表（30秒预订 · 到店自提） */}
      <View className='section'>
        <View className='section-head'>
          <Text className='section-title'>在售商品 ({products.length})</Text>
          <Text className='section-count'>30秒预订 • 线下提货扫码付</Text>
        </View>
        {products.length === 0 ? (
          <Empty description='暂无在售商品' />
        ) : (
          <View className='product-list'>
            {products.map((p) => {
              const img = resolveImg(p.imageUrl)
              const soldOut = p.stock === 0
              return (
                <View key={p.id} className='product-card'>
                  <View className='pc-img'>
                    {img ? (
                      <Image className='pi' src={img} mode='aspectFill' />
                    ) : (
                      <Text className='pi-ph'>🍽️</Text>
                    )}
                    {p.isClearing && <View className='clearing-badge'>当日清仓</View>}
                  </View>
                  <View className='pc-body'>
                    <Text className='pc-name'>{p.name}</Text>
                    {!!p.description && <Text className='pc-desc'>{p.description}</Text>}
                    <View className='pc-tags'>
                      {(p.tags || []).slice(0, 3).map((t) => (
                        <Text key={t} className='pc-tag'>{t}</Text>
                      ))}
                    </View>
                    <View className='pc-bottom'>
                      <View className='pc-price'>
                        <Text className='price-now'>￥{p.price}</Text>
                        {p.originalPrice != null && p.originalPrice > p.price && (
                          <Text className='price-origin'>￥{p.originalPrice}</Text>
                        )}
                      </View>
                      <View className='pc-right'>
                        <Text className='pc-stock'>余 {p.stock}</Text>
                        {soldOut ? (
                          <View className='reserve-btn disabled'>售空</View>
                        ) : cart.qtyOf(p.id) > 0 ? (
                          <View className='pc-stepper'>
                            <View className='ps-btn' onClick={() => cart.dec(p.id)}>
                              −
                            </View>
                            <Text className='ps-qty'>{cart.qtyOf(p.id)}</Text>
                            <View
                              className={`ps-btn ${cart.qtyOf(p.id) >= p.stock ? 'disabled' : ''}`}
                              onClick={() => cart.qtyOf(p.id) < p.stock && cart.inc(p.id)}
                            >
                              +
                            </View>
                          </View>
                        ) : (
                          <View className='reserve-btn' onClick={() => handleAddToCart(p)}>
                            加入
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* 双向许愿池（内嵌预览 · 对齐设计稿） */}
      <View className='section wish-section'>
        <View className='wish-head'>
          <View className='wh-left'>
            <Text className='wh-title'>🔥 【{s.name}】的许愿池</Text>
            <Text className='wh-sub'>想要吃什么、要什么款式发在这里，摊主会安排！</Text>
          </View>
          <View className='wh-btn' onClick={goWish}>💬 我也许愿</View>
        </View>

        {previewWishes.length === 0 ? (
          <View className='wish-empty' onClick={goWish}>
            <Text className='we-text'>还没有人许愿，来抢个沙发，让摊主听见你的心声 ✨</Text>
          </View>
        ) : (
          <View className='wish-list'>
            {previewWishes.map((w) => (
              <View key={w.id} className='wish-card'>
                <View className='wc-head'>
                  <View className='wch-user'>
                    {w.userAvatar ? (
                      <Image className='wch-avatar' src={w.userAvatar} mode='aspectFill' />
                    ) : (
                      <Text className='wch-avatar-ph'>👤</Text>
                    )}
                    <Text className='wch-name'>{w.userName || '匿名街坊'}</Text>
                    <Text className='wch-date'>{shortDate(w.createdAt)}</Text>
                  </View>
                  <View
                    className={`wch-like ${w.liked ? 'liked' : ''}`}
                    onClick={() => toggleLike(w.id)}
                  >
                    {w.liked ? '❤️' : '🤍'} {w.likes}
                  </View>
                </View>
                <Text className='wc-content'>{w.content}</Text>
                {w.vendorReply ? (
                  <View className='wc-reply'>
                    <View className='wcr-head'>
                      <Text className='wcr-who'>👨‍🍳 摊主回馈答复：</Text>
                      <Text className='wcr-date'>{shortDate(w.vendorReplyDate)}</Text>
                    </View>
                    <Text className='wcr-text'>{w.vendorReply}</Text>
                  </View>
                ) : (
                  <View className='wc-pending'>
                    <Text className='wcp-text'>📢 备货筹备中... 已同步至摊主AI分析后台</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {wishes.length > previewWishes.length && (
          <View className='wish-more' onClick={goWish}>
            查看全部 {wishes.length} 条许愿 ›
          </View>
        )}
      </View>

      <View className='page-footer'>—— 已经是小店最底部了 ——</View>

      <View className='page-bottom' />

      {/* 底部操作栏（购物车结算 · 对齐美团外卖底部结算栏） */}
      <View className='action-bar'>
        <View className='ab-phone' onClick={callPhone}>
          <Text className='abp-icon'>📞</Text>
          <Text className='abp-label'>联系</Text>
        </View>
        {cart.totalQty() > 0 ? (
          <>
            <View className='ab-cart'>
              <View className='abc-icon'>
                🛒<Text className='abc-badge'>{cart.totalQty()}</Text>
              </View>
              <View className='abc-amount'>
                <Text className='abc-price'>￥{cart.totalAmount()}</Text>
                <Text className='abc-tip'>免定金 · 到店自提</Text>
              </View>
            </View>
            <View className='ab-main' onClick={goCheckout}>
              去结算 ({cart.totalQty()})
            </View>
          </>
        ) : (
          <View className='ab-main' onClick={goReserve}>
            🛍️ 云逛小店 / 在线预订
          </View>
        )}
      </View>

      {/* 拼团详情弹层（参与者头像 + 倒计时） */}
      <Popup visible={!!gbDetail} position='bottom' round onClose={() => setGbDetail(null)}>
        {gbDetail && (
          <View className='gb-detail'>
            <Text className='gbd-title'>{gbDetail.productName}</Text>
            <View className='gbd-price-row'>
              <Text className='gbd-price'>￥{gbDetail.price}</Text>
              {gbDetail.originalPrice ? (
                <Text className='gbd-origin'>原价 ￥{gbDetail.originalPrice}</Text>
              ) : null}
              <Text className='gbd-timer'>{remainText(gbDetail.expireAt)}</Text>
            </View>
            <Text className='gbd-progress'>
              已拼 {gbDetail.currentCount}/{gbDetail.targetCount} 人
              {gbDetail.currentCount < gbDetail.targetCount
                ? ` · 还差 ${gbDetail.targetCount - gbDetail.currentCount} 人成团`
                : ' · 已成团'}
            </Text>
            <View className='gbd-avatars'>
              {(gbDetail.participants || []).map((p) => (
                <View key={p.id} className='gbd-avatar'>
                  {p.userAvatar ? (
                    <Image className='gbda-img' src={p.userAvatar} mode='aspectFill' />
                  ) : (
                    <Text className='gbda-ph'>👤</Text>
                  )}
                </View>
              ))}
              {Array.from({ length: Math.max(0, gbDetail.targetCount - gbDetail.currentCount) }).map(
                (_, i) => (
                  <View key={`empty-${i}`} className='gbd-avatar empty'>
                    <Text className='gbda-ph'>➕</Text>
                  </View>
                ),
              )}
            </View>
            <View
              className={`gbd-btn ${gbDetail.joined ? 'joined' : ''}`}
              onClick={() => {
                if (gbDetail.joined) {
                  setGbDetail(null)
                  return
                }
                const g = gbDetail
                setGbDetail(null)
                handleJoinGroup(g)
              }}
            >
              {gbDetail.joined ? '你已在拼单中 · 等待成团' : '一键参团'}
            </View>
          </View>
        )}
      </Popup>
    </ScrollView>
  )
}
