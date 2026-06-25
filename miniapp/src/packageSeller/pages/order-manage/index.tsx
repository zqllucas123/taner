import { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Empty, Dialog, Input } from '@nutui/nutui-react-taro'
import { useOrderStore } from '@/stores/orderStore'
import type { Order, OrderStatus } from '@/types'
import './index.scss'

type TabKey = 'pending' | 'confirmed' | 'completed'

const TABS: { key: TabKey; label: string; status: OrderStatus }[] = [
  { key: 'pending', label: '待处理', status: 'pending' },
  { key: 'confirmed', label: '待核销', status: 'confirmed' },
  { key: 'completed', label: '已完成', status: 'completed' },
]

const STATUS_META: Record<string, { text: string; color: string }> = {
  pending: { text: '待接单', color: '#ff976a' },
  confirmed: { text: '待核销', color: '#1989fa' },
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

export default function OrderManage() {
  const { orders, loading, fetchOrders, confirmOrder, completeOrder, completeByCode, cancelOrder } =
    useOrderStore()

  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  // 凭码核销弹窗
  const [codeVisible, setCodeVisible] = useState(false)
  const [codeInput, setCodeInput] = useState('')

  useDidShow(() => {
    fetchOrders('seller')
  })

  // 各状态分组计数
  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, confirmed: 0, completed: 0 }
    orders.forEach((o) => {
      if (c[o.status] != null) c[o.status] += 1
    })
    return c
  }, [orders])

  const currentStatus = TABS.find((t) => t.key === activeTab)!.status
  const list = useMemo(
    () => orders.filter((o) => o.status === currentStatus),
    [orders, currentStatus],
  )

  const handleConfirm = async (o: Order) => {
    const ok = await confirmOrder(o.id)
    if (ok) Taro.showToast({ title: '已接单', icon: 'success' })
  }

  const handleComplete = (o: Order) => {
    Taro.showModal({
      title: '确认核销',
      content: `确认顾客已取货？取货码 ${o.pickupCode}`,
      success: async (res) => {
        if (res.confirm) {
          const ok = await completeOrder(o.id)
          if (ok) Taro.showToast({ title: '核销完成', icon: 'success' })
        }
      },
    })
  }

  const handleCancel = (o: Order) => {
    Taro.showModal({
      title: '取消订单',
      content: '确认取消该订单？库存将自动回滚。',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (res.confirm) {
          const ok = await cancelOrder(o.id)
          if (ok) {
            Taro.showToast({ title: '已取消', icon: 'success' })
            fetchOrders('seller')
          }
        }
      },
    })
  }

  // 凭码核销提交
  const submitCode = async () => {
    const code = codeInput.trim().toUpperCase()
    if (!code) {
      Taro.showToast({ title: '请输入取货码', icon: 'none' })
      return
    }
    // 兼容用户只输入后 4 位
    const fullCode = code.startsWith('PICK-') ? code : `PICK-${code}`
    const order = await completeByCode(fullCode)
    if (order) {
      setCodeVisible(false)
      setCodeInput('')
      Taro.showToast({ title: `核销成功 ${order.orderNo}`, icon: 'success' })
    }
  }

  return (
    <View className='order-manage-page'>
      {/* Tab 栏 */}
      <View className='tab-bar'>
        {TABS.map((t) => (
          <View
            key={t.key}
            className={`tab-item ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <Text className='ti-label'>{t.label}</Text>
            {counts[t.key] > 0 && <Text className='ti-badge'>{counts[t.key]}</Text>}
          </View>
        ))}
      </View>

      <ScrollView scrollY className='order-scroll'>
        {list.length === 0 ? (
          <View className='empty-wrap'>
            <Empty description={loading ? '加载中...' : '暂无订单'} />
          </View>
        ) : (
          <View className='order-list'>
            {list.map((o) => {
              const meta = STATUS_META[o.status] || STATUS_META.pending
              return (
                <View key={o.id} className='order-card'>
                  <View className='oc-head'>
                    <Text className='oc-no'>#{o.orderNo}</Text>
                    <Text className='oc-status' style={{ color: meta.color }}>{meta.text}</Text>
                  </View>

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
                      <Text className='ocm-label'>🎫 取货码</Text>
                      <Text className='ocm-code'>{o.pickupCode}</Text>
                    </View>
                    <View className='ocm-row'>
                      <Text className='ocm-label'>⏰ 下单</Text>
                      <Text className='ocm-value'>{fmtTime(o.createdAt)}</Text>
                    </View>
                  </View>

                  <View className='oc-foot'>
                    <Text className='oc-amount'>应收 <Text className='oc-price'>¥{o.payAmount}</Text></Text>
                    <View className='oc-actions'>
                      {o.status === 'pending' && (
                        <>
                          <View className='btn btn-ghost' onClick={() => handleCancel(o)}>拒单</View>
                          <View className='btn btn-main' onClick={() => handleConfirm(o)}>接单</View>
                        </>
                      )}
                      {o.status === 'confirmed' && (
                        <>
                          <View className='btn btn-ghost' onClick={() => handleCancel(o)}>取消</View>
                          <View className='btn btn-main' onClick={() => handleComplete(o)}>核销</View>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}
        <View className='page-bottom' />
      </ScrollView>

      {/* 扫码/输码核销悬浮按钮 */}
      <View className='scan-fab' onClick={() => setCodeVisible(true)}>
        <Text className='fab-icon'>🎫</Text>
        <Text className='fab-text'>凭码核销</Text>
      </View>

      {/* 凭码核销弹窗 */}
      <Dialog
        title='凭码核销'
        visible={codeVisible}
        onConfirm={submitCode}
        onCancel={() => { setCodeVisible(false); setCodeInput('') }}
      >
        <View className='code-dialog'>
          <Text className='cd-tip'>请输入顾客出示的取货码</Text>
          <Input
            className='cd-input'
            placeholder='如 PICK-AB12 或 AB12'
            value={codeInput}
            onChange={(v) => setCodeInput(v)}
          />
        </View>
      </Dialog>
    </View>
  )
}
