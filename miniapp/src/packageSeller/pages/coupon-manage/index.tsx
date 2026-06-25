import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Popup, Input, Button, Tag, Empty, Radio } from '@nutui/nutui-react-taro'
import { useCouponStore } from '@/stores/couponStore'
import type { Coupon, CouponType } from '@/types'
import './index.scss'

interface FormState {
  title: string
  type: CouponType
  discount: string
  minSpend: string
  totalCount: string
  expiry: string
}

const EMPTY_FORM: FormState = {
  title: '',
  type: 'cash',
  discount: '',
  minSpend: '',
  totalCount: '',
  expiry: '',
}

const TYPE_LABEL: Record<CouponType, string> = {
  cash: '满减券',
  discount: '折扣券',
  gift: '赠品券',
}

export default function CouponManage() {
  const { myCoupons, loading, fetchMyCoupons, createCoupon, updateCouponStatus } = useCouponStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  useDidShow(() => {
    fetchMyCoupons()
  })

  const setField = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Taro.showToast({ title: '请填写券名称', icon: 'none' })
      return
    }
    const discount = Number(form.discount)
    if (!discount || discount <= 0) {
      Taro.showToast({ title: '请填写有效的优惠值', icon: 'none' })
      return
    }
    if (form.type === 'discount' && (discount <= 0 || discount >= 10)) {
      Taro.showToast({ title: '折扣需在 0-10 之间（如 8.5 折填 8.5）', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const ok = await createCoupon({
        title: form.title.trim(),
        type: form.type,
        discount,
        minSpend: Number(form.minSpend) || 0,
        totalCount: form.totalCount ? Number(form.totalCount) : -1,
        expiry: form.expiry.trim(),
      })
      if (ok) {
        Taro.showToast({ title: '发券成功', icon: 'success' })
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const discountText = (c: Coupon) => {
    if (c.type === 'discount') return `${c.discount} 折`
    if (c.type === 'gift') return '赠品'
    return `减 ¥${c.discount}`
  }

  const statusTag = (c: Coupon) => {
    if (c.status === 'paused') return <Tag type='default'>已暂停</Tag>
    if (c.status === 'expired') return <Tag type='danger'>已过期</Tag>
    return <Tag type='success'>进行中</Tag>
  }

  return (
    <View className='coupon-manage'>
      <ScrollView scrollY className='cm-scroll'>
        {myCoupons.length === 0 && !loading ? (
          <Empty description='还没有发过优惠券' />
        ) : (
          <View className='coupon-list'>
            {myCoupons.map((c) => (
              <View key={c.id} className={`coupon-card ${c.status === 'paused' ? 'is-paused' : ''}`}>
                <View className='cc-left'>
                  <Text className='cc-discount'>{discountText(c)}</Text>
                  <Text className='cc-min'>满 ¥{c.minSpend} 可用</Text>
                </View>
                <View className='cc-body'>
                  <View className='cc-head'>
                    <Text className='cc-title'>{c.title}</Text>
                    {statusTag(c)}
                  </View>
                  <Text className='cc-type'>{TYPE_LABEL[c.type]}</Text>
                  <View className='cc-meta'>
                    <Text className='cc-claimed'>
                      已领 {c.claimedCount || 0}
                      {c.totalCount && c.totalCount > 0 ? ` / ${c.totalCount}` : ' / 不限量'}
                    </Text>
                    {!!c.expiry && <Text className='cc-expiry'>至 {c.expiry}</Text>}
                  </View>
                  <View className='cc-actions'>
                    {c.status !== 'expired' && (
                      <Button
                        size='small'
                        fill='outline'
                        onClick={() =>
                          updateCouponStatus(c.id, c.status === 'paused' ? 'active' : 'paused')
                        }
                      >
                        {c.status === 'paused' ? '恢复' : '暂停'}
                      </Button>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        <View className='cm-bottom' />
      </ScrollView>

      <View className='cm-fab'>
        <Button type='primary' block onClick={openCreate}>
          + 发布优惠券
        </Button>
      </View>

      <Popup visible={showForm} position='bottom' onClose={() => setShowForm(false)} round>
        <View className='form-sheet'>
          <Text className='fs-title'>发布优惠券</Text>

          <View className='fs-cell column'>
            <Text className='fsc-label'>券名称</Text>
            <Input
              placeholder='如「新客立减」「夜宵满减」'
              value={form.title}
              maxLength={20}
              onChange={(v) => setField('title', v)}
            />
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>券类型</Text>
            <Radio.Group
              direction='horizontal'
              value={form.type}
              onChange={(v) => setField('type', v as CouponType)}
            >
              <Radio value='cash'>满减券</Radio>
              <Radio value='discount'>折扣券</Radio>
              <Radio value='gift'>赠品券</Radio>
            </Radio.Group>
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>
              {form.type === 'discount' ? '折扣（如 8.5 折填 8.5）' : '优惠金额（元）'}
            </Text>
            <Input
              type='digit'
              placeholder={form.type === 'discount' ? '0-10' : '如 5'}
              value={form.discount}
              onChange={(v) => setField('discount', v)}
            />
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>使用门槛（满 X 元，0 为无门槛）</Text>
            <Input
              type='digit'
              placeholder='如 20'
              value={form.minSpend}
              onChange={(v) => setField('minSpend', v)}
            />
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>发行量（留空为不限量）</Text>
            <Input
              type='number'
              placeholder='如 100'
              value={form.totalCount}
              onChange={(v) => setField('totalCount', v)}
            />
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>有效期至（留空为长期有效）</Text>
            <Input
              placeholder='如 2026-12-31'
              value={form.expiry}
              onChange={(v) => setField('expiry', v)}
            />
          </View>

          <View className='fs-actions'>
            <Button fill='outline' onClick={() => setShowForm(false)}>
              取消
            </Button>
            <Button type='primary' loading={submitting} onClick={handleSubmit}>
              确认发布
            </Button>
          </View>
        </View>
      </Popup>
    </View>
  )
}
