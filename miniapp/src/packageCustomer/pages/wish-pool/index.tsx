import { useState } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { Popup, Input, TextArea, Button, Empty, Radio } from '@nutui/nutui-react-taro'
import { useWishStore } from '@/stores/wishStore'
import type { Wish, WishStatus } from '@/types'
import './index.scss'

const STATUS_META: Record<WishStatus, { label: string; cls: string }> = {
  pending: { label: '待回应', cls: 'pending' },
  preparing: { label: '备货中', cls: 'preparing' },
  arrived: { label: '已到货', cls: 'arrived' },
  declined: { label: '暂不支持', cls: 'declined' },
}

export default function WishPool() {
  const router = useRouter()
  const stallId = router.params.stallId || ''
  const isSeller = router.params.role === 'seller'

  const { wishes, loading, fetchWishes, createWish, toggleLike, replyWish } = useWishStore()

  // 顾客许愿弹窗
  const [showWish, setShowWish] = useState(false)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 摊主回愿弹窗
  const [replyTarget, setReplyTarget] = useState<Wish | null>(null)
  const [replyStatus, setReplyStatus] = useState<WishStatus>('preparing')
  const [vendorReply, setVendorReply] = useState('')
  const [expectPrice, setExpectPrice] = useState('')
  const [expectArrive, setExpectArrive] = useState('')

  useDidShow(() => {
    fetchWishes({ stallId })
  })

  const handleCreate = async () => {
    if (!content.trim()) {
      Taro.showToast({ title: '说说你想要什么吧', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const ok = await createWish(stallId, content.trim())
      if (ok) {
        Taro.showToast({ title: '许愿成功', icon: 'success' })
        setContent('')
        setShowWish(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openReply = (w: Wish) => {
    setReplyTarget(w)
    setReplyStatus(w.status === 'pending' ? 'preparing' : w.status)
    setVendorReply(w.vendorReply || '')
    setExpectPrice(w.expectPrice ? String(w.expectPrice) : '')
    setExpectArrive(w.expectArrive || '')
  }

  const handleReply = async () => {
    if (!replyTarget) return
    setSubmitting(true)
    try {
      const ok = await replyWish({
        id: replyTarget.id,
        status: replyStatus,
        vendorReply: vendorReply.trim(),
        expectPrice: expectPrice ? Number(expectPrice) : undefined,
        expectArrive: expectArrive.trim() || undefined,
      })
      if (ok) {
        Taro.showToast({ title: '已回应', icon: 'success' })
        setReplyTarget(null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='wish-pool'>
      <ScrollView scrollY className='wp-scroll'>
        <View className='wp-hero'>
          <Text className='wp-hero-emoji'>🔥</Text>
          <Text className='wp-hero-title'>双向许愿池</Text>
          <Text className='wp-hero-sub'>
            {isSeller ? '看看顾客都想要什么，回应他们的心愿吧' : '想要吃什么、要什么款式发在这里，摊主会安排！'}
          </Text>
        </View>

        {wishes.length === 0 && !loading ? (
          <Empty description={isSeller ? '还没有顾客许愿' : '快来许下第一个愿望吧'} />
        ) : (
          <View className='wish-list'>
            {wishes.map((w) => {
              const meta = STATUS_META[w.status]
              return (
                <View key={w.id} className='wish-card'>
                  <View className='wc-head'>
                    <View className='wc-user'>
                      {w.userAvatar ? (
                        <Image className='wc-avatar' src={w.userAvatar} mode='aspectFill' />
                      ) : (
                        <Text className='wc-avatar-ph'>🙂</Text>
                      )}
                      <Text className='wc-name'>{w.userName || '神秘食客'}</Text>
                    </View>
                    <Text className={`wc-status ${meta.cls}`}>{meta.label}</Text>
                  </View>

                  <Text className='wc-content'>{w.content}</Text>

                  {!!w.vendorReply && (
                    <View className='wc-reply'>
                      <Text className='wc-reply-tag'>👨‍🍳 摊主回馈答复：</Text>
                      <Text className='wc-reply-text'>{w.vendorReply}</Text>
                      {(w.expectPrice || w.expectArrive) && (
                        <View className='wc-reply-meta'>
                          {!!w.expectPrice && <Text className='wc-rm'>预定价 ¥{w.expectPrice}</Text>}
                          {!!w.expectArrive && <Text className='wc-rm'>{w.expectArrive} 到货</Text>}
                        </View>
                      )}
                    </View>
                  )}

                  {!w.vendorReply && w.status !== 'declined' && (
                    <View className='wc-noreply'>
                      <Text className='wc-noreply-text'>📢 备货筹备中... 已同步至摊主AI分析后台</Text>
                    </View>
                  )}

                  <View className='wc-foot'>
                    <View
                      className={`wc-like ${w.liked ? 'liked' : ''}`}
                      onClick={() => !isSeller && toggleLike(w.id)}
                    >
                      <Text className='wc-like-icon'>{w.liked ? '❤️' : '🤍'}</Text>
                      <Text className='wc-like-count'>{w.likes || 0}</Text>
                    </View>
                    {isSeller && (
                      <Button size='small' type='primary' fill='outline' onClick={() => openReply(w)}>
                        {w.vendorReply ? '修改回应' : '回应'}
                      </Button>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        <View className='wp-bottom' />
      </ScrollView>

      {!isSeller && (
        <View className='wp-fab'>
          <Button type='primary' block onClick={() => setShowWish(true)}>
            ✍️ 我也许愿
          </Button>
        </View>
      )}

      {/* 顾客许愿弹窗 */}
      <Popup visible={showWish} position='bottom' onClose={() => setShowWish(false)} round>
        <View className='form-sheet'>
          <Text className='fs-title'>向摊主许愿一包</Text>
          <View className='fs-cell column'>
            <Text className='fsc-label'>输入您希望摊主采购进货、预留定制、或者改口味的期盼：</Text>
            <TextArea
              placeholder='例如：周师傅我想吃爆浆芝士多肉鱿鱼烧！加微辣！'
              value={content}
              maxLength={100}
              onChange={(v) => setContent(v)}
            />
          </View>
          <View className='fs-tip'>
            <Text className='fs-tip-text'>💡 摊主收到后会在他的AI驾驶舱查看许愿热力！一旦承接口碑，您将收到系统推送告知。</Text>
          </View>
          <View className='fs-actions'>
            <Button fill='outline' onClick={() => setShowWish(false)}>
              取消
            </Button>
            <Button type='primary' loading={submitting} onClick={handleCreate}>
              发射许愿纸 🛩️
            </Button>
          </View>
        </View>
      </Popup>

      {/* 摊主回愿弹窗 */}
      <Popup visible={!!replyTarget} position='bottom' onClose={() => setReplyTarget(null)} round>
        <View className='form-sheet'>
          <Text className='fs-title'>回应心愿</Text>
          {!!replyTarget && <Text className='fs-quote'>「{replyTarget.content}」</Text>}

          <View className='fs-cell column'>
            <Text className='fsc-label'>处理状态</Text>
            <Radio.Group
              direction='horizontal'
              value={replyStatus}
              onChange={(v) => setReplyStatus(v as WishStatus)}
            >
              <Radio value='preparing'>备货中</Radio>
              <Radio value='arrived'>已到货</Radio>
              <Radio value='declined'>暂不支持</Radio>
            </Radio.Group>
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>回应留言</Text>
            <TextArea
              placeholder='如「这周末就上新，给你留着」'
              value={vendorReply}
              maxLength={100}
              onChange={(v) => setVendorReply(v)}
            />
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>预定价（元，可选）</Text>
            <Input
              type='digit'
              placeholder='如 12'
              value={expectPrice}
              onChange={(v) => setExpectPrice(v)}
            />
          </View>

          <View className='fs-cell column'>
            <Text className='fsc-label'>预计到货时间（可选）</Text>
            <Input
              placeholder='如 本周六'
              value={expectArrive}
              onChange={(v) => setExpectArrive(v)}
            />
          </View>

          <View className='fs-actions'>
            <Button fill='outline' onClick={() => setReplyTarget(null)}>
              取消
            </Button>
            <Button type='primary' loading={submitting} onClick={handleReply}>
              确认回应
            </Button>
          </View>
        </View>
      </Popup>
    </View>
  )
}
