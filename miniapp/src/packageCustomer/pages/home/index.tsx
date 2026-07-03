import { useState, useMemo, useRef } from 'react'
import { View, Text, Map, ScrollView, Input } from '@tarojs/components'
import type { MapProps } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useStallStore } from '@/stores/stallStore'
import { useUserStore } from '@/stores/userStore'
import type { Stall, StallStatus, StallCategory } from '@/types'
import './index.scss'

/** 品类筛选项（含「全部」），文案/emoji 对齐设计稿 */
const CATEGORIES: Array<{ label: string; value: StallCategory | '' }> = [
  { label: '全部烟火气', value: '' },
  { label: '🍢 小吃美食', value: '小吃美食' },
  { label: '🌸 生鲜果蔬', value: '生鲜果蔬' },
  { label: '🏮 手工文创', value: '手工文创' },
  { label: '👗 服饰饰品', value: '服饰饰品' },
  { label: '🧺 日用杂货', value: '日用杂货' },
]

/** 出摊状态 → 颜色 / 文案（emerald 体系） */
const STATUS_META: Record<StallStatus, { color: string; text: string }> = {
  active: { color: 'var(--status-active)', text: '出摊中' },
  upcoming: { color: 'var(--status-upcoming)', text: '即将出摊' },
  offline: { color: 'var(--status-offline)', text: '已收摊' },
}

/** 品类 → 地图标记 emoji */
const CATEGORY_EMOJI: Record<string, string> = {
  小吃美食: '🍢',
  服饰饰品: '👗',
  生鲜果蔬: '🥬',
  手工文创: '🎨',
  日用杂货: '🧺',
}

// 默认中心点（杭州市中心，定位失败时兜底）
const DEFAULT_CENTER = { latitude: 30.2741, longitude: 120.1551 }

/** 底部导航项（文案对齐设计稿） */
const TAB_BAR = [
  { key: 'map', icon: '🗺️', label: '实景扫街', path: '' },
  { key: 'shop', icon: '🛍️', label: '云逛小店', path: '' },
  { key: 'square', icon: '🎪', label: '探店晒广场', path: '' },
  { key: 'my', icon: '👤', label: '我的', path: '/pages/my/index' },
]

export default function Home() {
  const { stalls, loading, fetchNearby } = useStallStore()
  useUserStore()

  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [located, setLocated] = useState(false)
  const [category, setCategory] = useState<StallCategory | ''>('')
  const [activeId, setActiveId] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const listRef = useRef<any>(null)

  useDidShow(() => {
    void initLocate()
  })

  /** 定位 → 拉附近摊位 */
  const initLocate = async () => {
    try {
      const loc = await Taro.getLocation({ type: 'gcj02' })
      const c = { latitude: loc.latitude, longitude: loc.longitude }
      setCenter(c)
      setLocated(true)
      await fetchNearby({ ...c, category: category || undefined })
    } catch (e) {
      console.warn('[home] 定位失败，使用默认中心', e)
      setLocated(false)
      await fetchNearby({ ...DEFAULT_CENTER, category: category || undefined })
    }
  }

  /** 切换品类 → 重新拉取 */
  const handleCategory = (value: StallCategory | '') => {
    setCategory(value)
    fetchNearby({ ...center, category: value || undefined })
  }

  /** 在线（出摊中）摊位数 */
  const onlineCount = useMemo(
    () => stalls.filter((s) => s.status === 'active').length,
    [stalls],
  )

  /** 关键词过滤后的列表 */
  const visibleStalls = useMemo(() => {
    const kw = keyword.trim()
    if (!kw) return stalls
    return stalls.filter(
      (s) => s.name.includes(kw) || (s.location || '').includes(kw),
    )
  }, [stalls, keyword])

  /** 地图标记 */
  const markers = useMemo<MapProps.marker[]>(() => {
    return visibleStalls
      .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
      .map((s, i) => ({
        id: i, // marker id 必须为数字
        latitude: s.latitude as number,
        longitude: s.longitude as number,
        width: 32,
        height: 32,
        callout: {
          content: `${CATEGORY_EMOJI[s.category] || '🏪'} ${s.name}`,
          color: '#333',
          fontSize: 12,
          borderRadius: 8,
          bgColor: '#ffffff',
          padding: 6,
          display: s.id === activeId ? 'ALWAYS' : 'BYCLICK',
        },
      } as MapProps.marker))
  }, [visibleStalls, activeId])

  /** 点击地图标记 → 高亮对应卡片 */
  const handleMarkerTap = (e: any) => {
    const idx = e.detail.markerId
    const geoStalls = visibleStalls.filter(
      (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number',
    )
    const stall = geoStalls[idx]
    if (stall) {
      setActiveId(stall.id)
      setCenter({ latitude: stall.latitude as number, longitude: stall.longitude as number })
    }
  }

  /** 点击卡片 → 进详情 */
  const handleCardTap = (stall: Stall) => {
    setActiveId(stall.id)
    Taro.navigateTo({ url: `/packageCustomer/pages/stall-detail/index?id=${stall.id}` })
  }

  /** AI 逛街寻宝推荐 */
  const handleAiRecommend = () => {
    Taro.showToast({ title: 'AI 逛街寻宝推荐开发中', icon: 'none' })
  }

  const handleTab = (tab: typeof TAB_BAR[number]) => {
    if (tab.key === 'map') return
    if (tab.path) {
      Taro.navigateTo({ url: tab.path })
    } else {
      Taro.showToast({ title: '功能开发中', icon: 'none' })
    }
  }

  const fmtDistance = (m?: number | null) => {
    if (m == null) return ''
    return m < 1000 ? `距您 ${m} 米` : `距您 ${(m / 1000).toFixed(1)} 公里`
  }

  return (
    <View className='customer-home-page'>
      {/* 顶部：标题 + 搜索框 + 品类 chip（sticky） */}
      <View className='top-header'>
        <View className='th-titlebar'>
          <View className='th-title-wrap'>
            <Text className='th-title'>地摊烟火小店</Text>
            <Text className='th-subtitle'>顾客版 · 市民扫街小店</Text>
          </View>
          <View className='th-refresh' onClick={initLocate}>↻</View>
        </View>

        {/* 搜索框 */}
        <View className='search-box'>
          <Text className='sb-icon'>🔍</Text>
          <Input
            className='sb-input'
            placeholder='搜索夜市招牌/冷面/大生蚝...'
            placeholderClass='sb-placeholder'
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>

        {/* 品类 chip */}
        <ScrollView scrollX className='filter-scroll' showScrollbar={false}>
          {CATEGORIES.map((c) => (
            <View
              key={c.value || 'all'}
              className={`filter-chip ${category === c.value ? 'active' : ''}`}
              onClick={() => handleCategory(c.value)}
            >
              {c.label}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 内容区 */}
      <ScrollView scrollY className='home-scroll'>
        {/* 深色地图卡片 */}
        <View className='map-card'>
          <Map
            className='map'
            latitude={center.latitude}
            longitude={center.longitude}
            scale={14}
            markers={markers}
            showLocation={located}
            onMarkerTap={handleMarkerTap}
          />

          {/* 重新定位按钮 */}
          <View className='locate-btn' onClick={initLocate}>📍</View>

          {/* 地图内状态栏 */}
          <View className='map-status'>
            <View className='ms-left'>
              <View className='ms-dot' />
              <Text className='ms-text'>
                全城在线摊位: <Text className='ms-num'>{onlineCount}</Text> 个
              </Text>
            </View>
            <View className='ms-ai' onClick={handleAiRecommend}>
              <Text className='ms-ai-icon'>✨</Text>
              <Text className='ms-ai-text'>AI 逛街寻宝推荐</Text>
            </View>
          </View>
        </View>

        {/* 摊位列表 */}
        <View className='stall-list'>
          {visibleStalls.length === 0 && !loading ? (
            <View className='empty'>
              <Text className='empty-emoji'>🍃</Text>
              <Text className='empty-text'>附近暂无出摊，换个品类看看～</Text>
            </View>
          ) : (
            visibleStalls.map((s) => {
              const meta = STATUS_META[s.status] || STATUS_META.offline
              const catIdx = CATEGORIES.findIndex((c) => c.value === s.category)
              return (
                <View
                  key={s.id}
                  className={`stall-card ${activeId === s.id ? 'active' : ''}`}
                  onClick={() => handleCardTap(s)}
                >
                  {/* 标签行 */}
                  <View className='sc-tags'>
                    <Text className='sc-tag-cat'>
                      #{catIdx >= 0 ? catIdx : ''} {s.category}
                    </Text>
                    <Text className={`sc-tag-status status-${s.status}`}>
                      {s.status === 'active' ? '🔥 ' : ''}
                      {s.statusText || meta.text}
                    </Text>
                    <View className='sc-rating'>
                      <Text className='sc-star'>⭐</Text>
                      <Text className='sc-score'>{s.rating?.toFixed(1)}</Text>
                    </View>
                  </View>

                  {/* 店名 */}
                  <Text className='sc-name'>{s.name}</Text>

                  {/* 营业时间 */}
                  {s.stallTime && (
                    <Text className='sc-time'>出摊：{s.stallTime}</Text>
                  )}

                  {/* 地址 + 距离 */}
                  <View className='sc-bottom'>
                    <Text className='sc-loc'>📍 {s.location || '位置未填'}</Text>
                    {s.distance != null && (
                      <Text className='sc-dist'>{fmtDistance(s.distance)}</Text>
                    )}
                  </View>

                  {/* 实景图占位 */}
                  <View className='sc-vibe'>
                    {s.vibeImage ? (
                      <View
                        className='sc-vibe-img'
                        style={{ backgroundImage: `url(${s.vibeImage})` }}
                      />
                    ) : (
                      <View className='sc-vibe-ph'>
                        <Text className='sc-vibe-ph-icon'>🖼️</Text>
                      </View>
                    )}
                    <View className='sc-vibe-label'>
                      <Text>✨ 线下杂乱地摊原相机实景</Text>
                    </View>
                  </View>
                </View>
              )
            })
          )}
          <View className='list-bottom' />
        </View>
      </ScrollView>

      {/* 自定义底部导航 */}
      <View className='tab-bar'>
        {TAB_BAR.map((t) => (
          <View
            key={t.key}
            className={`tab-item ${t.key === 'map' ? 'active' : ''}`}
            onClick={() => handleTab(t)}
          >
            <Text className='tab-icon'>{t.icon}</Text>
            <Text className='tab-label'>{t.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
