import { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Empty } from '@nutui/nutui-react-taro'
import { useOrderStore } from '@/stores/orderStore'
import type { Order } from '@/types'
import './index.scss'

type TabKey = 'all' | 'pending' | 'confirmed' | 'completed'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待接单' },
  { key: 'confirmed', label: '待取货' },
  { key: 'completed', label: '已完成' },
]

const STATUS_META: Record<string, { text: string; color: string }> = {
  pending: { text: '待摊主接单', color: '#ff976a' },
  confirmed: { text: '待取货', color: '#1989fa' },
  completed: { text: '已完成', color: '#07c160' },
  cancelled: { text: '已取消', color: '#969799' },
  disputed: { text: '纠纷中', color: '#ee0a24' },
}

function fmtTime(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function Orders() {
  const { orders, loading, fetchOrders, cancelOrder } = useOrderStore()
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  useDidShow(() => {
    fetchOrders('customer')
  })

  const list = useMemo(() => {
    if (activeTab === 'all') return orders
    return orders.filter((o) => o.status === activeTab)
  }, [orders, activeTab])

  const handleCancel = (o: Order) => {
    Taro.showModal({
      title: '取消预定',
      content: '确认取消该预定订单？',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (res.confirm) {
          const ok = await cancelOrder(o.id)
          if (ok) {
            Taro.showToast({ title: '已取消', icon: 'success' })
            fetchOrders('customer')
          }
        }
      },
    })
  }

  return (
    <View className='orders-page'>
      {/* Tab 栏 */}
      <View className='tab-bar'>
        {TABS.map((t) => (
          <View
            key={t.key}
            className={`tab-item ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <Text className='ti-label'>{t.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className='orders-scroll'>
        {list.length === 0 ? (
          <View className='empty-wrap'>
            <Empty description={loading ? '加载中...' : '还没有预定订单'} />
          </View>
        ) : (
          <View className='order-list'>
            {list.map((o) => {
              const meta = STATUS_META[o.status] || STATUS_META.pending
              const canCancel = o.status === 'pending' || o.status === 'confirmed'
              return (
                <View key={o.id} className='order-card'>
                  <View className='oc-head'>
                    <Text className='oc-no'>#{o.orderNo}</Text>
                    <Text className='oc-status' style={{ color: meta.color }}>{meta.text}</Text>
                  </View>

                  {/* 取货码区（已完成/已取消淡化） */}
                  {o.status === 'confirmed' && (
                    <View className='oc-code-box'>
                      <Text className='occ-label'>取货码（向摊主出示）</Text>
                      <Text className='occ-code'>{o.pickupCode}</Text>
                    </View>
                  )}

                  <View className='oc-items'>
                    {(o.items || []).map((it) => (
                      <View key={it.productId} className='oci-row'>
                        <Text className='oci-name'>{it.productName} ×{it.quantity}</Text>
                        <Text className='oci-sub'>¥{it.subtotal}</Text>
                      </View>
                    ))}
                  </View>

                  <View className='oc-meta'>
                    {!!o.pickupTime && (
                      <View className='ocm-row'>
                        <Text className='ocm-label'>🕐 取货时间</Text>
                        <Text className='ocm-value'>{o.pickupTime}</Text>
                      </View>
                    )}
                    {!!o.reserveNotes && (
                      <View className='ocm-row'>
                        <Text className='ocm-label'>📝 备注</Text>
                        <Text className='ocm-value'>{o.reserveNotes}</Text>
                      </View>
                    )}
                    <View className='ocm-row'>
                      <Text className='ocm-label'>⏰ 下单</Text>
                      <Text className='ocm-value'>{fmtTime(o.createdAt)}</Text>
                    </View>
                  </View>

                  <View className='oc-foot'>
                    <Text className='oc-amount'>实付 <Text className='oc-price'>¥{o.payAmount}</Text></Text>
                    {canCancel && (
                      <View className='btn btn-ghost' onClick={() => handleCancel(o)}>取消预定</View>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}
        <View className='page-bottom' />
      </ScrollView>
    </View>
  )
}
