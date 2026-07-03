import { useState, useEffect, useMemo } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { Input, TextArea, InputNumber, Button, Empty, Popup } from '@nutui/nutui-react-taro'
import { useProductStore } from '@/stores/productStore'
import { useStallStore } from '@/stores/stallStore'
import { useOrderStore } from '@/stores/orderStore'
import { useCouponStore } from '@/stores/couponStore'
import { getTempFileURLs } from '@/utils/upload'
import type { Order, UserCoupon } from '@/types'
import './index.scss'

export default function Reserve() {
  const router = useRouter()
  const stallId = router.params.stallId || ''
  // 可选：从详情页带入的默认预选商品
  const preselectId = router.params.productId || ''

  const { products, fetchByStall } = useProductStore()
  const { currentStall, fetchDetail } = useStallStore()
  const { createReservation } = useOrderStore()
  const { ownedCoupons, fetchOwnedCoupons } = useCouponStore()

  // 各商品选购数量 { productId: qty }
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})
  const [pickupTime, setPickupTime] = useState('')
  const [reserveNotes, setReserveNotes] = useState('')
  const [urlMap, setUrlMap] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  // 提交成功后的取货码票据
  const [ticket, setTicket] = useState<Order | null>(null)
  // 优惠券
  const [couponId, setCouponId] = useState('')
  const [showCouponPicker, setShowCouponPicker] = useState(false)

  useDidShow(() => {
    if (stallId) {
      fetchByStall(stallId)
      fetchDetail(stallId)
    }
    fetchOwnedCoupons('unused')
  })

  // 预选商品默认数量 1
  useEffect(() => {
    if (preselectId && products.some((p) => p.id === preselectId)) {
      setQtyMap((prev) => (prev[preselectId] ? prev : { ...prev, [preselectId]: 1 }))
    }
  }, [preselectId, products])

  // 商品图换临时 URL
  useEffect(() => {
    const todo = products
      .map((p) => p.imageUrl)
      .filter((u): u is string => !!u && u.startsWith('cloud://') && !urlMap[u])
    if (todo.length) {
      getTempFileURLs(todo).then((map) => setUrlMap((prev) => ({ ...prev, ...map })))
    }
  }, [products])

  const resolveImg = (url?: string) => {
    if (!url) return ''
    return url.startsWith('cloud://') ? urlMap[url] || '' : url
  }

  // 仅在售商品
  const onSaleProducts = useMemo(
    () => products.filter((p) => p.status === 'on'),
    [products],
  )

  // 已选明细 + 合计
  const { selectedItems, totalAmount, totalCount } = useMemo(() => {
    const items = onSaleProducts
      .filter((p) => (qtyMap[p.id] || 0) > 0)
      .map((p) => ({ product: p, qty: qtyMap[p.id] }))
    const amount = items.reduce((s, it) => s + it.product.price * it.qty, 0)
    const count = items.reduce((s, it) => s + it.qty, 0)
    return {
      selectedItems: items,
      totalAmount: Math.round(amount * 100) / 100,
      totalCount: count,
    }
  }, [onSaleProducts, qtyMap])

  // 适用于本摊位的可用券
  const applicableCoupons = useMemo(
    () => ownedCoupons.filter((uc) => uc.stallId === stallId && uc.status === 'unused' && uc.coupon),
    [ownedCoupons, stallId],
  )

  const calcDiscount = (uc?: UserCoupon | null) => {
    if (!uc || !uc.coupon) return 0
    const c = uc.coupon
    if (totalAmount < (c.minSpend || 0)) return 0
    let d = 0
    if (c.type === 'discount') {
      const rate = Math.min(Math.max(c.discount, 0), 10) / 10
      d = totalAmount * (1 - rate)
    } else {
      d = Math.min(c.discount || 0, totalAmount)
    }
    return Math.round(d * 100) / 100
  }

  const selectedCoupon = useMemo(
    () => applicableCoupons.find((uc) => uc.id === couponId) || null,
    [applicableCoupons, couponId],
  )

  const discountAmount = useMemo(() => calcDiscount(selectedCoupon), [selectedCoupon, totalAmount])
  const payAmount = useMemo(
    () => Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100),
    [totalAmount, discountAmount],
  )

  const couponLabel = (uc: UserCoupon) => {
    const c = uc.coupon!
    if (c.type === 'discount') return `${c.discount}折`
    if (c.type === 'gift') return '赠品券'
    return `减¥${c.discount}`
  }

  const setQty = (productId: string, val: number, max: number) => {
    const v = Math.max(0, Math.min(val || 0, max))
    setQtyMap((prev) => ({ ...prev, [productId]: v }))
  }

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      Taro.showToast({ title: '请先选择商品', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const order = await createReservation({
        stallId,
        items: selectedItems.map((it) => ({ productId: it.product.id, quantity: it.qty })),
        pickupTime: pickupTime.trim(),
        reserveNotes: reserveNotes.trim(),
        couponId: couponId || undefined,
      })
      if (order) {
        setTicket(order)
        // 刷新商品（库存已变化）
        fetchByStall(stallId)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ============ 取货码票据视图 ============
  if (ticket) {
    return (
      <View className='reserve-page ticket-view'>
        <View className='ticket-card'>
          <View className='tk-top'>
            <Text className='tk-emoji'>🎉</Text>
            <Text className='tk-title'>✓ 预定成功</Text>
            <Text className='tk-sub'>线下自提凭证 (到店无接触提货付款)</Text>
          </View>

          <View className='tk-code-box'>
            <Text className='tk-code-label'>取货码</Text>
            <Text className='tk-code'>{ticket.pickupCode}</Text>
          </View>

          <View className='tk-rows'>
            <View className='tk-row'>
              <Text className='tkr-label'>订单号</Text>
              <Text className='tkr-value'>{ticket.orderNo}</Text>
            </View>
            <View className='tk-row'>
              <Text className='tkr-label'>摊位</Text>
              <Text className='tkr-value'>{currentStall?.name || '-'}</Text>
            </View>
            {!!ticket.pickupTime && (
              <View className='tk-row'>
                <Text className='tkr-label'>取货时间</Text>
                <Text className='tkr-value'>{ticket.pickupTime}</Text>
              </View>
            )}
            {!!ticket.reserveNotes && (
              <View className='tk-row'>
                <Text className='tkr-label'>备注</Text>
                <Text className='tkr-value'>{ticket.reserveNotes}</Text>
              </View>
            )}
            <View className='tk-row tk-amount'>
              <Text className='tkr-label'>应付金额</Text>
              <Text className='tkr-price'>¥{ticket.payAmount}</Text>
            </View>
          </View>

          <View className='tk-items'>
            {(ticket.items || []).map((it) => (
              <View key={it.productId} className='tki-row'>
                <Text className='tki-name'>{it.productName} ×{it.quantity}</Text>
                <Text className='tki-sub'>¥{it.subtotal}</Text>
              </View>
            ))}
          </View>

          <View className='tk-tip'>
            <Text className='tk-tip-text'>⚠️ 默认保留24小时，过时自动取消不扣违约金</Text>
          </View>
        </View>

        <View className='tk-actions'>
          <Button className='tk-btn-ghost' onClick={() => Taro.navigateBack()}>
            返回摊位
          </Button>
          <Button
            className='tk-btn-main'
            type='primary'
            onClick={() => Taro.switchTab({ url: '/pages/my/index' }).catch(() => Taro.navigateBack())}
          >
            我的订单
          </Button>
        </View>
      </View>
    )
  }

  // ============ 下单表单视图 ============
  return (
    <View className='reserve-page'>
      <ScrollView scrollY className='rp-scroll'>
        {/* 摊位信息 */}
        <View className='shop-bar'>
          <Text className='sb-icon'>🏪</Text>
          <Text className='sb-name'>{currentStall?.name || '加载中...'}</Text>
        </View>

        {/* 商品选择 */}
        <View className='section'>
          <Text className='section-title'>🛍️ 选择商品</Text>
          {onSaleProducts.length === 0 ? (
            <Empty description='暂无可预定商品' />
          ) : (
            <View className='product-list'>
              {onSaleProducts.map((p) => {
                const img = resolveImg(p.imageUrl)
                const soldOut = p.stock <= 0
                return (
                  <View key={p.id} className={`product-row ${soldOut ? 'sold-out' : ''}`}>
                    <View className='pr-img'>
                      {img ? (
                        <Image className='pri' src={img} mode='aspectFill' />
                      ) : (
                        <Text className='pri-ph'>🍽️</Text>
                      )}
                    </View>
                    <View className='pr-body'>
                      <Text className='pr-name'>{p.name}</Text>
                      <View className='pr-meta'>
                        <Text className='pr-price'>¥{p.price}</Text>
                        <Text className='pr-stock'>{soldOut ? '已售罄' : `库存 ${p.stock}`}</Text>
                      </View>
                    </View>
                    <View className='pr-action'>
                      {soldOut ? (
                        <Text className='pr-soldout'>售罄</Text>
                      ) : (
                        <InputNumber
                          min={0}
                          max={p.stock}
                          value={qtyMap[p.id] || 0}
                          onChange={(v) => setQty(p.id, Number(v), p.stock)}
                        />
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* 取货信息 */}
        <View className='section'>
          <Text className='section-title'>📋 取货信息</Text>
          <View className='form-cell'>
            <Text className='fc-label'>取货时间</Text>
            <Input
              className='fc-input'
              placeholder='如 今晚 7 点 / 18:30'
              value={pickupTime}
              onChange={(v) => setPickupTime(v)}
            />
          </View>
          <View className='form-cell column'>
            <Text className='fc-label'>备注要求（例如: 不要辣/多要千岛酱/下午8点过来自提）</Text>
            <TextArea
              placeholder='输入口味习惯、自提时间等，不打字也可留空'
              value={reserveNotes}
              maxLength={200}
              onChange={(v) => setReserveNotes(v)}
            />
          </View>
        </View>

        {/* 极简预定规则说明（设计稿 amber 提示框） */}
        <View className='rules-box'>
          <Text className='rb-title'>🔒 极简预定规则说明 (专为地摊设计)：</Text>
          <Text className='rb-line'>1. 线上免预付款，自提验货满意后再微信扫码付款，降低买卖心理阻力。</Text>
          <Text className='rb-line'>2. 如出摊时间因下雨临时变动，小程序会自动微信消息告知。</Text>
        </View>

        {/* 优惠券 */}
        <View className='section'>
          <View className='coupon-entry' onClick={() => applicableCoupons.length && setShowCouponPicker(true)}>
            <Text className='ce-label'>🎟️ 优惠券</Text>
            {selectedCoupon ? (
              <Text className='ce-value active'>
                {couponLabel(selectedCoupon)}（-¥{discountAmount}）
              </Text>
            ) : (
              <Text className='ce-value'>
                {applicableCoupons.length ? `${applicableCoupons.length} 张可用` : '暂无可用券'}
              </Text>
            )}
            {applicableCoupons.length > 0 && <Text className='ce-arrow'>›</Text>}
          </View>
        </View>

        <View className='page-bottom' />
      </ScrollView>

      {/* 底部结算栏 */}
      <View className='checkout-bar'>
        <View className='cb-summary'>
          {discountAmount > 0 ? (
            <Text className='cb-total'>
              应付 <Text className='cb-price'>¥{payAmount}</Text>
              <Text className='cb-strike'>¥{totalAmount}</Text>
            </Text>
          ) : (
            <Text className='cb-total'>合计 <Text className='cb-price'>¥{totalAmount}</Text></Text>
          )}
          <Text className='cb-count'>
            已选 {totalCount} 件{discountAmount > 0 ? ` · 已省 ¥${discountAmount}` : ''}
          </Text>
        </View>
        <Button
          className='cb-submit'
          type='primary'
          loading={submitting}
          disabled={selectedItems.length === 0}
          onClick={handleSubmit}
        >
          确认预定并锁存货品 (免定金)
        </Button>
      </View>

      {/* 优惠券选择 */}
      <Popup
        visible={showCouponPicker}
        position='bottom'
        onClose={() => setShowCouponPicker(false)}
        round
      >
        <View className='coupon-picker'>
          <Text className='cp-title'>选择优惠券</Text>
          <ScrollView scrollY className='cp-scroll'>
            <View
              className={`cp-item none ${!couponId ? 'selected' : ''}`}
              onClick={() => {
                setCouponId('')
                setShowCouponPicker(false)
              }}
            >
              <Text className='cp-none-text'>不使用优惠券</Text>
              {!couponId && <Text className='cp-check'>✓</Text>}
            </View>
            {applicableCoupons.map((uc) => {
              const d = calcDiscount(uc)
              const usable = d > 0
              return (
                <View
                  key={uc.id}
                  className={`cp-item ${couponId === uc.id ? 'selected' : ''} ${usable ? '' : 'disabled'}`}
                  onClick={() => {
                    if (!usable) return
                    setCouponId(uc.id)
                    setShowCouponPicker(false)
                  }}
                >
                  <View className='cp-left'>
                    <Text className='cp-amount'>{couponLabel(uc)}</Text>
                    <Text className='cp-min'>满 ¥{uc.coupon?.minSpend || 0} 用</Text>
                  </View>
                  <View className='cp-info'>
                    <Text className='cp-name'>{uc.coupon?.title}</Text>
                    {!!uc.coupon?.expiry && <Text className='cp-expiry'>至 {uc.coupon.expiry}</Text>}
                    {!usable && <Text className='cp-unusable'>不满足使用门槛</Text>}
                  </View>
                  {couponId === uc.id && <Text className='cp-check'>✓</Text>}
                </View>
              )
            })}
          </ScrollView>
        </View>
      </Popup>
    </View>
  )
}
