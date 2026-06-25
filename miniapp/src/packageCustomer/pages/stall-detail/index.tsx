import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { Tag, Empty } from '@nutui/nutui-react-taro'
import { useStallStore } from '@/stores/stallStore'
import { useProductStore } from '@/stores/productStore'
import { getTempFileURLs } from '@/utils/upload'
import type { StallStatus } from '@/types'
import './index.scss'

/** 出摊状态 → 颜色 / 文案 */
const STATUS_META: Record<StallStatus, { color: string; text: string; dot: string }> = {
  active: { color: '#07c160', text: '出摊中', dot: '🟢' },
  upcoming: { color: '#ff976a', text: '即将出摊', dot: '🟡' },
  offline: { color: '#c8c9cc', text: '已收摊', dot: '⚪' },
}

const CATEGORY_EMOJI: Record<string, string> = {
  小吃美食: '🍢',
  服饰饰品: '👗',
  生鲜果蔬: '🥬',
  手工文创: '🎨',
  日用杂货: '🧺',
}

export default function StallDetail() {
  const router = useRouter()
  const stallId = router.params.id || ''

  const { currentStall, fetchDetail } = useStallStore()
  const { products, fetchByStall } = useProductStore()

  // 实景图：原图 / AI 优化对比切换
  const [showOptimized, setShowOptimized] = useState(false)
  const [urlMap, setUrlMap] = useState<Record<string, string>>({})

  useDidShow(() => {
    if (stallId) {
      fetchDetail(stallId)
      fetchByStall(stallId)
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

  const handleReserve = (productId: string) => {
    Taro.navigateTo({ url: `/packageCustomer/pages/reserve/index?stallId=${stallId}&productId=${productId}` })
  }

  const goReserve = () => {
    Taro.navigateTo({ url: `/packageCustomer/pages/reserve/index?stallId=${stallId}` })
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
      {/* 实景图区 */}
      <View className='hero'>
        {heroImg ? (
          <Image className='hero-img' src={heroImg} mode='aspectFill' />
        ) : (
          <View className='hero-ph'>
            <Text className='hp-emoji'>{CATEGORY_EMOJI[s.category] || '🏪'}</Text>
          </View>
        )}
        {/* 出摊状态角标 */}
        <View className='hero-status' style={{ background: meta.color }}>
          {meta.dot} {s.statusText || meta.text}
        </View>
        {/* 原图/AI优化切换 */}
        {hasOpt && (
          <View className='hero-toggle'>
            <View
              className={`ht-btn ${!showOptimized ? 'active' : ''}`}
              onClick={() => setShowOptimized(false)}
            >
              原图
            </View>
            <View
              className={`ht-btn ${showOptimized ? 'active' : ''}`}
              onClick={() => setShowOptimized(true)}
            >
              ✨ AI优化
            </View>
          </View>
        )}
      </View>

      {/* 摊位信息 */}
      <View className='info-card'>
        <View className='info-head'>
          <Text className='shop-name'>{s.name}</Text>
          {s.isHot && <Text className='hot-tag'>🔥 热门</Text>}
        </View>
        <View className='info-meta'>
          <Text className='im-cat'>{CATEGORY_EMOJI[s.category] || '🏪'} {s.category}</Text>
          <Text className='im-rating'>⭐ {s.rating?.toFixed(1)}</Text>
          <Text className='im-credit'>信用 {s.creditScore}</Text>
        </View>
        {!!s.description && <Text className='shop-desc'>{s.description}</Text>}

        <View className='info-rows'>
          {!!s.stallTime && (
            <View className='info-row'>
              <Text className='ir-label'>🕐 出摊时间</Text>
              <Text className='ir-value'>{s.stallTime}</Text>
            </View>
          )}
          <View className='info-row' onClick={() => s.location && Taro.showToast({ title: s.location, icon: 'none' })}>
            <Text className='ir-label'>📍 摊位位置</Text>
            <Text className='ir-value'>{s.location || '位置未填'}</Text>
          </View>
          {!!s.ownerName && (
            <View className='info-row'>
              <Text className='ir-label'>👨‍🍳 摊主</Text>
              <Text className='ir-value'>{s.ownerName}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 公告 */}
      {!!s.announcement && (
        <View className='notice-card'>
          <Text className='nc-icon'>📢</Text>
          <Text className='nc-text'>{s.announcement}</Text>
        </View>
      )}

      {/* 优惠券区（占位 Day8-10） */}
      <View className='section coupon-section'>
        <Text className='section-title'>🎫 优惠券</Text>
        <View className='placeholder-box'>
          <Text className='pb-text'>暂无优惠券（Day8-10 上线）</Text>
        </View>
      </View>

      {/* 商品列表 */}
      <View className='section'>
        <View className='section-head'>
          <Text className='section-title'>🛍️ 在售商品</Text>
          <Text className='section-count'>{products.length} 件</Text>
        </View>
        {products.length === 0 ? (
          <Empty description='暂无在售商品' />
        ) : (
          <View className='product-list'>
            {products.map((p) => {
              const img = resolveImg(p.imageUrl)
              return (
                <View key={p.id} className='product-card'>
                  <View className='pc-img'>
                    {img ? (
                      <Image className='pi' src={img} mode='aspectFill' />
                    ) : (
                      <Text className='pi-ph'>🍽️</Text>
                    )}
                    {p.isClearing && <View className='clearing-badge'>清仓</View>}
                  </View>
                  <View className='pc-body'>
                    <Text className='pc-name'>{p.name}</Text>
                    {!!p.description && <Text className='pc-desc'>{p.description}</Text>}
                    <View className='pc-tags'>
                      {(p.tags || []).slice(0, 3).map((t) => (
                        <Tag key={t} type='primary' plain>{t}</Tag>
                      ))}
                    </View>
                    <View className='pc-bottom'>
                      <View className='pc-price'>
                        <Text className='price-now'>¥{p.price}</Text>
                        {p.originalPrice != null && p.originalPrice > p.price && (
                          <Text className='price-origin'>¥{p.originalPrice}</Text>
                        )}
                      </View>
                      <View className='reserve-btn' onClick={() => handleReserve(p.id)}>
                        预定
                      </View>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* 许愿区（占位 Day8-10） */}
      <View className='section wish-section'>
        <Text className='section-title'>💌 许愿池</Text>
        <View className='placeholder-box'>
          <Text className='pb-text'>想要的没看到？许愿功能开发中（Day8-10）</Text>
        </View>
      </View>

      <View className='page-bottom' />

      {/* 底部操作栏 */}
      <View className='action-bar'>
        <View className='ab-phone' onClick={callPhone}>
          <Text className='abp-icon'>📞</Text>
          <Text className='abp-label'>联系</Text>
        </View>
        <View className='ab-main' onClick={goReserve}>
          立即预定
        </View>
      </View>
    </ScrollView>
  )
}
