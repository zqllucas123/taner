import { useState, useEffect, useMemo } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { Input, TextArea, InputNumber, Button, Empty } from '@nutui/nutui-react-taro'
import { useProductStore } from '@/stores/productStore'
import { useStallStore } from '@/stores/stallStore'
import { useOrderStore } from '@/stores/orderStore'
import { getTempFileURLs } from '@/utils/upload'
import type { Order } from '@/types'
import './index.scss'

export default function Reserve() {
  const router = useRouter()
  const stallId = router.params.stallId || ''
  // 可选：从详情页带入的默认预选商品
  const preselectId = router.params.productId || ''

  const { products, fetchByStall } = useProductStore()
  const { currentStall, fetchDetail } = useStallStore()
  const { createReservation } = useOrderStore()

  // 各商品选购数量 { productId: qty }
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})
  const [pickupTime, setPickupTime] = useState('')
  const [reserveNotes, setReserveNotes] = useState('')
  const [urlMap, setUrlMap] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  // 提交成功后的取货码票据
  const [ticket, setTicket] = useState<Order | null>(null)

  useDidShow(() => {
    if (stallId) {
      fetchByStall(stallId)
      fetchDetail(stallId)
    }
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
            <Text className='tk-title'>预定成功</Text>
            <Text className='tk-sub'>请凭取货码到摊位自提</Text>
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
            <Text className='tk-tip-text'>⏰ 请在 24 小时内取货，逾期预定将自动取消</Text>
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
            <Text className='fc-label'>备注</Text>
            <TextArea
              placeholder='口味、规格等特殊要求（如「不要辣」）'
              value={reserveNotes}
              maxLength={200}
              onChange={(v) => setReserveNotes(v)}
            />
          </View>
        </View>

        <View className='page-bottom' />
      </ScrollView>

      {/* 底部结算栏 */}
      <View className='checkout-bar'>
        <View className='cb-summary'>
          <Text className='cb-total'>合计 <Text className='cb-price'>¥{totalAmount}</Text></Text>
          <Text className='cb-count'>已选 {totalCount} 件</Text>
        </View>
        <Button
          className='cb-submit'
          type='primary'
          loading={submitting}
          disabled={selectedItems.length === 0}
          onClick={handleSubmit}
        >
          提交预定
        </Button>
      </View>
    </View>
  )
}
