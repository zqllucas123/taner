import { useState, useMemo, useRef } from 'react'
import { View, Text, Map, ScrollView } from '@tarojs/components'
import type { MapProps } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useStallStore } from '@/stores/stallStore'
import { useUserStore } from '@/stores/userStore'
import type { Stall, StallStatus, StallCategory } from '@/types'
import './index.scss'

/** 品类筛选项（含「全部」） */
const CATEGORIES: Array<{ label: string; value: StallCategory | '' }> = [
  { label: '全部', value: '' },
  { label: '小吃美食', value: '小吃美食' },
  { label: '服饰饰品', value: '服饰饰品' },
  { label: '生鲜果蔬', value: '生鲜果蔬' },
  { label: '手工文创', value: '手工文创' },
  { label: '日用杂货', value: '日用杂货' },
]

/** 出摊状态 → 颜色 / 文案 */
const STATUS_META: Record<StallStatus, { color: string; text: string; dot: string }> = {
  active: { color: '#07c160', text: '出摊中', dot: '🟢' },
  upcoming: { color: '#ff976a', text: '即将出摊', dot: '🟡' },
  offline: { color: '#c8c9cc', text: '已收摊', dot: '⚪' },
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

/** 底部导航项 */
const TAB_BAR = [
  { key: 'map', icon: '🗺️', label: '地图', path: '' },
  { key: 'shop', icon: '🏪', label: '小店', path: '' },
  { key: 'square', icon: '🎪', label: '广场', path: '' },
  { key: 'my', icon: '👤', label: '我的', path: '/pages/my/index' },
]

export default function Home() {
  const { stalls, loading, fetchNearby } = useStallStore()
  const { switchRole } = useUserStore()

  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [located, setLocated] = useState(false)
  const [category, setCategory] = useState<StallCategory | ''>('')
  const [activeId, setActiveId] = useState<string>('')
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

  /** 地图标记 */
  const markers = useMemo<MapProps.marker[]>(() => {
    return stalls
      .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
      .map((s, i) => {
        const meta = STATUS_META[s.status] || STATUS_META.offline
        return {
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
        } as MapProps.marker
      })
  }, [stalls, activeId])

  /** 点击地图标记 → 高亮对应卡片 */
  const handleMarkerTap = (e: any) => {
    const idx = e.detail.markerId
    const geoStalls = stalls.filter(
      (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number',
    )
    const stall = geoStalls[idx]
    if (stall) {
      setActiveId(stall.id)
      setCenter({ latitude: stall.latitude as number, longitude: stall.longitude as number })
    }
  }

  /** 点击卡片 → 进详情（Day7） */
  const handleCardTap = (stall: Stall) => {
    setActiveId(stall.id)
    Taro.showToast({ title: '摊位详情开发中（Day7）', icon: 'none' })
    // Day7: Taro.navigateTo({ url: `/packageCustomer/pages/stall-detail/index?id=${stall.id}` })
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
    return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`
  }

  return (
    <View className='customer-home-page'>
      {/* 顶部品类筛选 */}
      <View className='filter-bar'>
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

      {/* 地图 */}
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

      {/* 底部摊位卡片列表 */}
      <View className='stall-sheet'>
        <View className='sheet-handle' />
        <View className='sheet-title'>
          <Text className='st-text'>附近摊位</Text>
          <Text className='st-count'>{loading ? '加载中...' : `${stalls.length} 家`}</Text>
        </View>
        <ScrollView scrollY className='sheet-list' ref={listRef}>
          {stalls.length === 0 && !loading ? (
            <View className='empty'>
              <Text className='empty-emoji'>🍃</Text>
              <Text className='empty-text'>附近暂无出摊，换个品类看看～</Text>
            </View>
          ) : (
            stalls.map((s) => {
              const meta = STATUS_META[s.status] || STATUS_META.offline
              return (
                <View
                  key={s.id}
                  className={`stall-card ${activeId === s.id ? 'active' : ''}`}
                  onClick={() => handleCardTap(s)}
                >
                  <View className='sc-emoji' style={{ borderColor: meta.color }}>
                    {CATEGORY_EMOJI[s.category] || '🏪'}
                  </View>
                  <View className='sc-body'>
                    <View className='sc-top'>
                      <Text className='sc-name'>{s.name}</Text>
                      {s.isHot && <Text className='sc-hot'>🔥热门</Text>}
                    </View>
                    <View className='sc-meta'>
                      <Text className='sc-status' style={{ color: meta.color }}>
                        {meta.dot} {s.statusText || meta.text}
                      </Text>
                      <Text className='sc-cat'>{s.category}</Text>
                    </View>
                    <View className='sc-bottom'>
                      <Text className='sc-loc'>📍 {s.location || '位置未填'}</Text>
                      {s.distance != null && (
                        <Text className='sc-dist'>{fmtDistance(s.distance)}</Text>
                      )}
                    </View>
                  </View>
                  <View className='sc-rating'>
                    <Text className='sc-star'>⭐ {s.rating?.toFixed(1)}</Text>
                  </View>
                </View>
              )
            })
          )}
          <View className='list-bottom' />
        </ScrollView>
      </View>

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
