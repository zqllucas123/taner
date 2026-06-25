import { useState, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Button, Empty } from '@nutui/nutui-react-taro'
import { useQRCodeStore } from '@/stores/qrcodeStore'
import { getTempFileURLs } from '@/utils/upload'
import './index.scss'

/** 功能位定义：聚合码一码多用 */
const FEATURE_OPTIONS: { key: string; emoji: string; label: string; desc: string }[] = [
  { key: 'shop', emoji: '🏪', label: '进店逛逛', desc: '扫码直达线上小店' },
  { key: 'wechat', emoji: '💬', label: '加微信', desc: '扫码加摊主好友' },
  { key: 'coupon', emoji: '🎟️', label: '领优惠券', desc: '扫码自动领券' },
  { key: 'reserve', emoji: '📦', label: '预定下单', desc: '扫码预定商品' },
  { key: 'time', emoji: '🕐', label: '查出摊时间', desc: '扫码看今日出摊' },
]

export default function StallQRCodePage() {
  const { myQRCode, loading, fetchMine, generate } = useQRCodeStore()
  const [selected, setSelected] = useState<string[]>(['shop', 'wechat', 'coupon'])
  const [qrTempUrl, setQrTempUrl] = useState<string>('')

  useDidShow(() => {
    fetchMine()
  })

  // 已有码 → 同步选中的功能位 + 解析码图临时地址
  useEffect(() => {
    if (myQRCode) {
      if (Array.isArray(myQRCode.features) && myQRCode.features.length) {
        setSelected(myQRCode.features)
      }
      if (myQRCode.qrUrl && myQRCode.qrUrl.startsWith('cloud://')) {
        getTempFileURLs([myQRCode.qrUrl]).then((map) => {
          setQrTempUrl(map[myQRCode.qrUrl!] || '')
        })
      } else {
        setQrTempUrl(myQRCode.qrUrl || '')
      }
    }
  }, [myQRCode])

  const toggleFeature = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const handleGenerate = async () => {
    if (!selected.length) {
      Taro.showToast({ title: '请至少选择一项功能', icon: 'none' })
      return
    }
    const ok = await generate(selected)
    if (ok) {
      Taro.showToast({ title: myQRCode ? '已更新' : '生成成功', icon: 'success' })
    }
  }

  const handleSave = () => {
    if (!qrTempUrl) {
      Taro.showToast({ title: '暂无码图可保存', icon: 'none' })
      return
    }
    Taro.showLoading({ title: '保存中...', mask: true })
    Taro.downloadFile({
      url: qrTempUrl,
      success: (res) => {
        Taro.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => Taro.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: () => Taro.showToast({ title: '保存失败，请授权相册', icon: 'none' }),
          complete: () => Taro.hideLoading(),
        })
      },
      fail: () => {
        Taro.hideLoading()
        Taro.showToast({ title: '下载码图失败', icon: 'none' })
      },
    })
  }

  return (
    <View className='qrcode-page'>
      <View className='page-head'>
        <Text className='page-title'>聚合摆摊码</Text>
        <Text className='page-sub'>一张码搞定进店、加微信、领券、预定、查出摊</Text>
      </View>

      {/* 码图展示区 */}
      <View className='qr-card'>
        {qrTempUrl ? (
          <Image className='qr-img' src={qrTempUrl} mode='aspectFit' showMenuByLongpress />
        ) : (
          <View className='qr-placeholder'>
            <Text className='ph-emoji'>📱</Text>
            <Text className='ph-text'>
              {myQRCode ? '码图待生成（请确认云函数权限）' : '尚未生成，选择功能后点击下方按钮'}
            </Text>
          </View>
        )}
        {!!myQRCode && (
          <View className='qr-meta'>
            <Text className='meta-item'>累计扫码 {myQRCode.scanCount} 次</Text>
          </View>
        )}
      </View>

      {/* 功能位多选 */}
      <View className='feature-list'>
        <Text className='section-title'>启用功能</Text>
        {FEATURE_OPTIONS.map((f) => {
          const on = selected.includes(f.key)
          return (
            <View
              key={f.key}
              className={`feature-item ${on ? 'on' : ''}`}
              onClick={() => toggleFeature(f.key)}
            >
              <Text className='f-emoji'>{f.emoji}</Text>
              <View className='f-main'>
                <Text className='f-label'>{f.label}</Text>
                <Text className='f-desc'>{f.desc}</Text>
              </View>
              <Text className={`f-check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</Text>
            </View>
          )
        })}
      </View>

      {/* 操作区 */}
      <View className='actions'>
        <Button type='primary' block loading={loading} onClick={handleGenerate}>
          {myQRCode ? '更新聚合码' : '生成聚合码'}
        </Button>
        {!!qrTempUrl && (
          <Button block fill='outline' onClick={handleSave} style={{ marginTop: '20rpx' }}>
            保存码图到相册
          </Button>
        )}
      </View>

      <View className='tip'>
        <Text className='tip-text'>
          💡 把这张码打印贴在摊位上，顾客扫码即可进店、领券。更新功能不会改变码图，已贴出的码继续有效。
        </Text>
      </View>
    </View>
  )
}
