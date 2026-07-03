/**
 * Mock 摊位数据 · 与 UI 设计稿（UI/src/data/mockData.ts）保持一致
 * ────────────────────────────────────────────────────────
 * 用途：云函数无数据 / 联调未就绪时，作为 UI 还原度对照的兜底数据。
 * 真实联调时云函数返回非空即自动覆盖，不影响线上。
 * 经纬度以杭州市中心为基准做小偏移，便于在真实地图上散点展示。
 */
import type { Stall } from '@/types'

// 杭州市中心基准点
const BASE = { latitude: 30.2741, longitude: 120.1551 }

export const MOCK_STALLS: Stall[] = [
  {
    id: '1',
    userId: 'mock-u1',
    name: '老周秘制铁板鱿鱼',
    ownerName: '周师傅',
    category: '小吃美食',
    status: 'active',
    statusText: '出摊中',
    locationType: 'fixed',
    location: '南门观光夜市中段 B15号位',
    latitude: BASE.latitude + 0.002,
    longitude: BASE.longitude + 0.0015,
    stallTime: '17:30 - 00:30',
    phone: '138****8823',
    description:
      '二十年老字号，秘制蒜蓉酱和麻辣酱，鱿鱼鲜嫩爆汁！线上提前预定，到店30秒手撕立提。',
    announcement: '📢 今晚九点后买十串送一串！新鲜穿制，数量有限先到先得。',
    vibeImage:
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=400',
    vibeImageOpt:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=400',
    rating: 4.9,
    creditScore: 98,
    isHot: true,
    restProtection: true,
    bigFontMode: false,
    distance: 150,
  },
  {
    id: '2',
    userId: 'mock-u2',
    name: '阿芳野百合鲜花铺',
    ownerName: '阿芳',
    category: '生鲜果蔬',
    status: 'active',
    statusText: '正在出摊（18:00 - 22:30）',
    locationType: 'mobile',
    location: '北环步行街岔路口花坛边',
    latitude: BASE.latitude + 0.0035,
    longitude: BASE.longitude - 0.001,
    stallTime: '18:00 - 22:30',
    phone: '159****9234',
    description:
      '每日昆明空运直达花材，主打平价艺术切花与治愈系手作小花束！浪漫触手可得。线上选好在线留花，下班路过一秒带走。',
    announcement: '🌸 今日特惠：浅紫色碎冰蓝玫瑰，买一束送雏菊一瓶！',
    vibeImage:
      'https://images.unsplash.com/photo-1508784785881-c9745e94aba5?auto=format&fit=crop&q=80&w=400',
    vibeImageOpt:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c944?auto=format&fit=crop&q=80&w=400',
    rating: 4.8,
    creditScore: 96,
    isHot: true,
    restProtection: true,
    bigFontMode: false,
    distance: 320,
  },
  {
    id: '3',
    userId: 'mock-u3',
    name: '大叔炭烤生蚝小海鲜',
    ownerName: '彪哥',
    category: '小吃美食',
    status: 'upcoming',
    statusText: '即将出摊（预计 19:30 出摊）',
    locationType: 'fixed',
    location: '南门观光夜市入口第一家',
    latitude: BASE.latitude - 0.0015,
    longitude: BASE.longitude - 0.002,
    stallTime: '19:30 - 00:30',
    phone: '135****4422',
    description: '威海生蚝，现开现烤，蒜蓉多得堆不下！肥壮爆浆，一口入魂！',
    announcement: '🦪 正在路上拉鲜货，预计19:30准时生火！在线预定排单，免排队。',
    vibeImage:
      'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400',
    vibeImageOpt:
      'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?auto=format&fit=crop&q=80&w=400',
    rating: 4.7,
    creditScore: 94,
    isHot: false,
    restProtection: true,
    bigFontMode: false,
    distance: 480,
  },
  {
    id: '4',
    userId: 'mock-u4',
    name: '林妹妹手作古风发簪铺',
    ownerName: '林妹妹',
    category: '手工文创',
    status: 'offline',
    statusText: '已收摊 / 雨天打烊',
    locationType: 'mobile',
    location: '大唐不夜城文创街南口',
    latitude: BASE.latitude - 0.003,
    longitude: BASE.longitude + 0.003,
    stallTime: '16:00 - 22:00',
    phone: '137****6611',
    description: '一簪一世界，纯手工制作古风发饰，汉服爱好者の浪漫，支持来图定制。',
    announcement: '🌧️ 今日雨天暂歇一晚，明日如常出摊，定制订单照常制作中～',
    vibeImage:
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400',
    vibeImageOpt:
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=400',
    rating: 4.9,
    creditScore: 99,
    isHot: false,
    restProtection: true,
    bigFontMode: false,
    distance: 1200,
  },
]

/** 按品类过滤 mock 摊位 */
export function filterMockStalls(category?: string): Stall[] {
  if (!category) return MOCK_STALLS
  return MOCK_STALLS.filter((s) => s.category === category)
}
