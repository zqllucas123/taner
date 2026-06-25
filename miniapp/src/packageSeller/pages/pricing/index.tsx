import { useState } from 'react'
import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Input, Button, Tag, Empty } from '@nutui/nutui-react-taro'
import { usePricingStore } from '@/stores/pricingStore'
import { useProductStore } from '@/stores/productStore'
import type { PricingRecord } from '@/types'
import './index.scss'

/** 品类选项（与定价规则关键词对齐） */
const FOOD_TYPES = ['小吃美食', '生鲜果蔬', '服饰饰品', '手工文创', '日用杂货']

interface FormState {
  costPrice: string
  marketPrice: string
  rentPrice: string
  expectDailyQty: string
  foodType: string
}

const EMPTY_FORM: FormState = {
  costPrice: '',
  marketPrice: '',
  rentPrice: '',
  expectDailyQty: '',
  foodType: FOOD_TYPES[0],
}

export default function Pricing() {
  const { result, history, loading, calculate, fetchHistory, applyToProduct } = usePricingStore()
  const { products, fetchMine } = useProductStore()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showHistory, setShowHistory] = useState(false)
  const [showApply, setShowApply] = useState(false)

  useDidShow(() => {
    fetchHistory()
    fetchMine()
  })

  const setField = (k: keyof FormState, v: string) => setForm((s) => ({ ...s, [k]: v }))

  const handleCalc = async () => {
    const cost = Number(form.costPrice)
    if (!cost || cost <= 0) {
      Taro.showToast({ title: '请填写进货成本', icon: 'none' })
      return
    }
    await calculate({
      costPrice: cost,
      marketPrice: form.marketPrice ? Number(form.marketPrice) : undefined,
      rentPrice: form.rentPrice ? Number(form.rentPrice) : undefined,
      expectDailyQty: form.expectDailyQty ? Number(form.expectDailyQty) : undefined,
      foodType: form.foodType,
    })
  }

  const handleApply = async (productId: string) => {
    if (!result) return
    const updated = await applyToProduct(productId, result)
    if (updated) {
      setShowApply(false)
      Taro.showToast({ title: '已应用到商品', icon: 'success' })
    }
  }

  const foodIdx = FOOD_TYPES.indexOf(form.foodType)

  // 价格档位卡片配置
  const priceCards = result
    ? [
        { key: 'suggested', label: '建议零售价', value: result.suggestedPrice, hint: '日常主推', accent: 'primary' },
        { key: 'traffic', label: '引流价', value: result.trafficPrice, hint: '冲量获客', accent: 'green' },
        { key: 'premium', label: '节假日溢价', value: result.premiumPrice, hint: '旺季上浮', accent: 'orange' },
        { key: 'clearance', label: '清仓价', value: result.clearancePrice, hint: '尾货回笼', accent: 'red' },
      ]
    : []

  return (
    <ScrollView scrollY className='pricing-page'>
      {/* 顶部说明 */}
      <View className='hero'>
        <Text className='hero-title'>💰 AI 定价助手</Text>
        <Text className='hero-sub'>输入成本，智能算出多档价格与保本销量</Text>
      </View>

      {/* 输入表单 */}
      <View className='form-card'>
        <View className='form-row'>
          <Text className='form-label'>品类</Text>
          <Picker
            mode='selector'
            range={FOOD_TYPES}
            value={foodIdx < 0 ? 0 : foodIdx}
            onChange={(e) => setField('foodType', FOOD_TYPES[Number(e.detail.value)])}
          >
            <View className='picker-value'>
              <Text>{form.foodType}</Text>
              <Text className='picker-arrow'>▾</Text>
            </View>
          </Picker>
        </View>

        <View className='form-row'>
          <Text className='form-label'>进货成本 <Text className='req'>*</Text></Text>
          <Input
            className='form-input'
            type='digit'
            placeholder='每件进货价'
            value={form.costPrice}
            onChange={(v) => setField('costPrice', String(v))}
          />
          <Text className='unit'>元</Text>
        </View>

        <View className='form-row'>
          <Text className='form-label'>同行售价</Text>
          <Input
            className='form-input'
            type='digit'
            placeholder='同城同类售价（选填）'
            value={form.marketPrice}
            onChange={(v) => setField('marketPrice', String(v))}
          />
          <Text className='unit'>元</Text>
        </View>

        <View className='form-row'>
          <Text className='form-label'>每日租金</Text>
          <Input
            className='form-input'
            type='digit'
            placeholder='点位租金摊销（选填）'
            value={form.rentPrice}
            onChange={(v) => setField('rentPrice', String(v))}
          />
          <Text className='unit'>元</Text>
        </View>

        <View className='form-row'>
          <Text className='form-label'>预期日销</Text>
          <Input
            className='form-input'
            type='number'
            placeholder='默认 30 件'
            value={form.expectDailyQty}
            onChange={(v) => setField('expectDailyQty', String(v))}
          />
          <Text className='unit'>件</Text>
        </View>

        <Button className='calc-btn' loading={loading} onClick={handleCalc}>
          {loading ? '测算中...' : '🤖 智能测算'}
        </Button>
      </View>

      {/* 定价结果 */}
      {result && (
        <View className='result-section'>
          <View className='price-grid'>
            {priceCards.map((c) => (
              <View key={c.key} className={`price-card accent-${c.accent}`}>
                <Text className='pc-label'>{c.label}</Text>
                <Text className='pc-value'>¥{c.value}</Text>
                <Text className='pc-hint'>{c.hint}</Text>
              </View>
            ))}
          </View>

          {/* 利润测算 */}
          <View className='profit-card'>
            <View className='profit-item'>
              <Text className='pi-value'>{result.marginRate}%</Text>
              <Text className='pi-label'>毛利率</Text>
            </View>
            <View className='profit-divider' />
            <View className='profit-item'>
              <Text className='pi-value'>{result.breakEvenQty || '—'}</Text>
              <Text className='pi-label'>保本销量 / 日</Text>
            </View>
            <View className='profit-divider' />
            <View className='profit-item'>
              <Text className='pi-value'>¥{result.costPrice}</Text>
              <Text className='pi-label'>进货成本</Text>
            </View>
          </View>

          {/* AI 说明 */}
          {result.aiReasoning ? (
            <View className='reasoning-card'>
              <Text className='rc-icon'>💡</Text>
              <Text className='rc-text'>{result.aiReasoning}</Text>
            </View>
          ) : null}

          <Button className='apply-btn' onClick={() => setShowApply(true)}>
            一键应用到商品
          </Button>
        </View>
      )}

      {/* 历史记录入口 */}
      <View className='history-section'>
        <View className='history-head' onClick={() => setShowHistory((s) => !s)}>
          <Text className='hs-title'>📜 历史定价记录</Text>
          <Text className='hs-toggle'>{showHistory ? '收起' : `展开(${history.length})`}</Text>
        </View>
        {showHistory && (
          <View className='history-list'>
            {history.length === 0 ? (
              <Empty description='暂无定价记录' />
            ) : (
              history.map((h) => (
                <View key={h.id} className='history-item'>
                  <View className='hi-left'>
                    <Text className='hi-type'>{h.foodType || '通用'}</Text>
                    <Text className='hi-time'>{formatTime(h.createdAt)}</Text>
                  </View>
                  <View className='hi-right'>
                    <Text className='hi-price'>建议 ¥{h.suggestedPrice}</Text>
                    <Text className='hi-margin'>毛利 {h.marginRate}%</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      <View className='page-bottom' />

      {/* 应用到商品选择弹层 */}
      {showApply && (
        <View className='apply-mask' onClick={() => setShowApply(false)}>
          <View className='apply-sheet' onClick={(e) => e.stopPropagation()}>
            <View className='sheet-head'>
              <Text className='sheet-title'>选择要应用的商品</Text>
              <Text className='sheet-close' onClick={() => setShowApply(false)}>✕</Text>
            </View>
            <ScrollView scrollY className='sheet-scroll'>
              {products.length === 0 ? (
                <Empty description='暂无商品，请先在商品管理添加' />
              ) : (
                products.map((p) => (
                  <View key={p.id} className='apply-product' onClick={() => handleApply(p.id)}>
                    <View className='ap-info'>
                      <Text className='ap-name'>{p.name}</Text>
                      <Text className='ap-price'>当前 ¥{p.price}</Text>
                    </View>
                    <Tag type='primary'>应用 ¥{result?.suggestedPrice}</Tag>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

function formatTime(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}
