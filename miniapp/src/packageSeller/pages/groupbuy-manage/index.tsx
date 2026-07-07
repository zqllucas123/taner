import { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Popup, Input, Button, Tag, Empty, Radio } from '@nutui/nutui-react-taro'
import { useGroupbuyStore } from '@/stores/groupbuyStore'
import { useProductStore } from '@/stores/productStore'
import type { GroupBuy } from '@/types'
import './index.scss'

/** 到期时间戳 → 倒计时文案 */
const remainText = (expireAt?: number) => {
  if (!expireAt) return ''
  const ms = expireAt - Date.now()
  if (ms <= 0) return '已结束'
  const hours = Math.floor(ms / 3600000)
  if (hours >= 1) return `剩 ${hours} 小时`
  return `剩 ${Math.max(1, Math.floor(ms / 60000))} 分钟`
}

const STATUS_TAG: Record<GroupBuy['status'], { text: string; type: 'success' | 'default' | 'danger' | 'primary' }> = {
  active: { text: '拼团中', type: 'primary' },
  completed: { text: '已成团', type: 'success' },
  expired: { text: '已过期', type: 'default' },
  cancelled: { text: '已下架', type: 'danger' },
}

export default function GroupbuyManage() {
  const { myGroups, loading, fetchMine, createGroupBuy, cancelGroupBuy } = useGroupbuyStore()
  const { products, fetchMine: fetchProducts } = useProductStore()

  const [showForm, setShowForm] = useState(false)
  const [productId, setProductId] = useState('')
  const [price, setPrice] = useState('')
  const [targetCount, setTargetCount] = useState('2')
  const [expiryHours, setExpiryHours] = useState('11')
  const [submitting, setSubmitting] = useState(false)

  useDidShow(() => {
    fetchMine()
    fetchProducts()
  })

  // 仅上架商品可开团
  const onSaleProducts = useMemo(() => products.filter((p) => p.status === 'on'), [products])
  const selectedProduct = useMemo(
    () => onSaleProducts.find((p) => p.id === productId),
    [onSaleProducts, productId],
  )

  const openCreate = () => {
    setProductId('')
    setPrice('')
    setTargetCount('2')
    setExpiryHours('11')
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!productId) {
      Taro.showToast({ title: '请选择拼团商品', icon: 'none' })
      return
    }
    const p = Number(price)
    if (!p || p <= 0) {
      Taro.showToast({ title: '请填写有效的成团价', icon: 'none' })
      return
    }
    if (selectedProduct && p >= selectedProduct.price) {
      Taro.showToast({ title: '成团价需低于零售价', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const ok = await createGroupBuy({
        productId,
        price: p,
        targetCount: Number(targetCount) || 2,
        expiryHours: Number(expiryHours) || 11,
      })
      if (ok) {
        Taro.showToast({ title: '开团成功', icon: 'success' })
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = (g: GroupBuy) => {
    Taro.showModal({
      title: '下架拼团',
      content: `确定下架「${g.productName}」的拼团活动吗？`,
      success: (res) => {
        if (res.confirm) cancelGroupBuy(g.id)
      },
    })
  }

  return (
    <View className='groupbuy-manage'>
      <ScrollView scrollY className='gm-scroll'>
        <View className='gm-intro'>
          <Text className='gmi-text'>
            👥 邻里拼团：设成团价 + 人数，顾客一键参团凑人享超低价，满员自动成团、各自到摊自提。
          </Text>
        </View>

        {myGroups.length === 0 && !loading ? (
          <Empty description='还没有发起过拼团' />
        ) : (
          <View className='gb-list'>
            {myGroups.map((g) => {
              const tag = STATUS_TAG[g.status]
              return (
                <View key={g.id} className={`gb-card ${g.status !== 'active' ? 'is-off' : ''}`}>
                  <View className='gc-head'>
                    <Text className='gc-name'>{g.productName}</Text>
                    <Tag type={tag.type}>{tag.text}</Tag>
                  </View>
                  <View className='gc-meta'>
                    <Text className='gc-price'>成团价 ￥{g.price}</Text>
                    {g.originalPrice ? <Text className='gc-origin'>零售 ￥{g.originalPrice}</Text> : null}
                  </View>
                  <View className='gc-progress'>
                    <Text className='gcp-count'>
                      {g.currentCount}/{g.targetCount} 人
                      {g.status === 'active' && g.currentCount < g.targetCount
                        ? ` · 还差 ${g.targetCount - g.currentCount} 人`
                        : ''}
                    </Text>
                    {g.status === 'active' && <Text className='gcp-timer'>{remainText(g.expireAt)}</Text>}
                  </View>
                  {g.status === 'active' && (
                    <View className='gc-actions'>
                      <Button size='small' fill='outline' onClick={() => handleCancel(g)}>
                        下架
                      </Button>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}
        <View className='gm-bottom' />
      </ScrollView>

      <View className='gm-fab'>
        <Button type='primary' block onClick={openCreate}>
          + 发起邻里拼团
        </Button>
      </View>

      <Popup visible={showForm} position='bottom' onClose={() => setShowForm(false)} round>
        <View className='form-sheet'>
          <Text className='fs-title'>发起邻里拼团</Text>

          <View className='fs-cell column'>
            <Text className='fsc-label'>选择拼团商品</Text>
            {onSaleProducts.length === 0 ? (
              <Text className='fsc-hint'>暂无上架商品，请先到商品管理上架</Text>
            ) : (
              <Radio.Group value={productId} onChange={(v) => setProductId(v as string)}>
                <View className='product-picker'>
                  {onSaleProducts.map((p) => (
                    <View key={p.id} className='pp-item'>
                      <Radio value={p.id}>
                        {p.name}（零售 ￥{p.price} · 库存 {p.stock}）
                      </Radio>
                    </View>
                  ))}
                </View>
              </Radio.Group>
            )}
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>
              成团价（元）{selectedProduct ? ` · 需低于零售 ￥${selectedProduct.price}` : ''}
            </Text>
            <Input type='digit' placeholder='如 28' value={price} onChange={(v) => setPrice(v)} />
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>成团人数</Text>
            <Radio.Group direction='horizontal' value={targetCount} onChange={(v) => setTargetCount(v as string)}>
              <Radio value='2'>2 人团</Radio>
              <Radio value='3'>3 人团</Radio>
            </Radio.Group>
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>有效时长（小时）</Text>
            <Input type='number' placeholder='如 11' value={expiryHours} onChange={(v) => setExpiryHours(v)} />
          </View>

          <View className='fs-actions'>
            <Button fill='outline' onClick={() => setShowForm(false)}>
              取消
            </Button>
            <Button type='primary' loading={submitting} onClick={handleSubmit}>
              确认开团
            </Button>
          </View>
        </View>
      </Popup>
    </View>
  )
}
