import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { Empty, Tabs } from '@nutui/nutui-react-taro'
import { useCouponStore } from '@/stores/couponStore'
import type { UserCoupon, UserCouponStatus } from '@/types'
import './index.scss'

const TABS: { title: string; status: UserCouponStatus }[] = [
  { title: '可使用', status: 'unused' },
  { title: '已使用', status: 'used' },
  { title: '已过期', status: 'expired' },
]

export default function MyCoupons() {
  const { ownedCoupons, fetchOwnedCoupons } = useCouponStore()
  const [tab, setTab] = useState(0)

  useDidShow(() => {
    fetchOwnedCoupons(TABS[tab].status)
  })

  const onTabChange = (idx: number) => {
    setTab(idx)
    fetchOwnedCoupons(TABS[idx].status)
  }

  const discountText = (uc: UserCoupon) => {
    const c = uc.coupon
    if (!c) return ''
    if (c.type === 'discount') return `${c.discount}折`
    if (c.type === 'gift') return '赠品'
    return `¥${c.discount}`
  }

  return (
    <View className='my-coupons'>
      <Tabs value={tab} onChange={(v) => onTabChange(Number(v))}>
        {TABS.map((t) => (
          <Tabs.TabPane key={t.status} title={t.title} />
        ))}
      </Tabs>

      <ScrollView scrollY className='mc-scroll'>
        {ownedCoupons.length === 0 ? (
          <Empty description='暂无优惠券' />
        ) : (
          <View className='coupon-list'>
            {ownedCoupons.map((uc) => (
              <View key={uc.id} className={`coupon-ticket status-${uc.status}`}>
                <View className='ct-left'>
                  <Text className='ct-amount'>{discountText(uc)}</Text>
                  <Text className='ct-min'>满 ¥{uc.coupon?.minSpend || 0} 用</Text>
                </View>
                <View className='ct-body'>
                  <Text className='ct-title'>{uc.coupon?.title || '优惠券'}</Text>
                  {!!uc.coupon?.expiry && (
                    <Text className='ct-expiry'>有效期至 {uc.coupon.expiry}</Text>
                  )}
                  {uc.status === 'unused' && (
                    <Text className='ct-tip'>下单时可在结算页抵扣</Text>
                  )}
                </View>
                {uc.status !== 'unused' && (
                  <View className='ct-stamp'>{uc.status === 'used' ? '已使用' : '已过期'}</View>
                )}
              </View>
            ))}
          </View>
        )}
        <View className='mc-bottom' />
      </ScrollView>
    </View>
  )
}
