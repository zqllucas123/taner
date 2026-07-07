/**
 * Mock 「云逛小店」店内数据 · 与 UI 设计稿保持一致
 * ────────────────────────────────────────────────────────
 * 用途：云函数无数据 / 联调未就绪时，作为摊位详情页 6 大模块的兜底数据，
 *       保证点进摊位后店铺简介 / 商品 / 优惠券 / 拼团 / 许愿池都有内容可看。
 * 真实联调时云函数返回非空即自动覆盖，不影响线上。
 * 仅为 mock 摊位 '1'（老周鱿鱼）与 '2'（阿芳鲜花）提供，其余摊位走云端。
 */
import type { Coupon, GroupBuy, Product, Wish } from '@/types'

const HOUR = 3600 * 1000

/** 在售商品（按 stallId 归组） */
const PRODUCTS: Record<string, Product[]> = {
  '1': [
    {
      id: 'p1-1',
      stallId: '1',
      name: '秘制蒜蓉铁板鱿鱼',
      price: 15,
      originalPrice: 18,
      stock: 42,
      soldCount: 128,
      imageUrl:
        'https://images.unsplash.com/photo-1625938145312-c799e6a71b8f?auto=format&fit=crop&q=80&w=400',
      category: '铁板烧',
      tags: ['招牌爆款', '现烤现撕'],
      description: '二十年秘制蒜蓉酱，鱿鱼鲜嫩爆汁，越嚼越香。',
      isClearing: false,
      status: 'on',
      sortOrder: 1,
    },
    {
      id: 'p1-2',
      stallId: '1',
      name: '麻辣鱿鱼须',
      price: 12,
      stock: 30,
      soldCount: 86,
      imageUrl:
        'https://images.unsplash.com/photo-1606851091851-e8c8c0fca5ba?auto=format&fit=crop&q=80&w=400',
      category: '铁板烧',
      tags: ['香辣过瘾'],
      description: '香辣干香，下酒神器。',
      isClearing: false,
      status: 'on',
      sortOrder: 2,
    },
    {
      id: 'p1-3',
      stallId: '1',
      name: '炭火鱿鱼头',
      price: 10,
      stock: 0,
      soldCount: 54,
      category: '铁板烧',
      tags: ['弹牙'],
      description: '整颗鱿鱼头，弹牙有嚼劲。',
      isClearing: false,
      status: 'on',
      sortOrder: 3,
    },
  ],
  '2': [
    {
      id: 'p2-1',
      stallId: '2',
      name: '碎冰蓝玫瑰花束',
      price: 39,
      originalPrice: 49,
      stock: 15,
      soldCount: 63,
      imageUrl:
        'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&q=80&w=400',
      category: '花束',
      tags: ['网红爆款', '昆明直达'],
      description: '梦幻渐变碎冰蓝，浪漫拉满。',
      isClearing: false,
      status: 'on',
      sortOrder: 1,
    },
    {
      id: 'p2-2',
      stallId: '2',
      name: '治愈系雏菊小束',
      price: 19,
      stock: 22,
      soldCount: 41,
      imageUrl:
        'https://images.unsplash.com/photo-1490750967868-88aa4486c944?auto=format&fit=crop&q=80&w=400',
      category: '花束',
      tags: ['平价治愈'],
      description: '小小一束，点亮一整天。',
      isClearing: false,
      status: 'on',
      sortOrder: 2,
    },
    {
      id: 'p2-3',
      stallId: '2',
      name: '向日葵单支',
      price: 6,
      originalPrice: 10,
      stock: 8,
      soldCount: 90,
      imageUrl:
        'https://images.unsplash.com/photo-1470509037663-253afd7f0f51?auto=format&fit=crop&q=80&w=400',
      category: '单支',
      tags: ['当日清仓'],
      description: '收摊前特价，向阳而生。',
      isClearing: true,
      status: 'on',
      sortOrder: 3,
    },
  ],
}

/** 优惠券（按 stallId 归组） */
const COUPONS: Record<string, Coupon[]> = {
  '1': [
    {
      id: 'c1-1',
      stallId: '1',
      title: '到店惊喜满20减3',
      type: 'cash',
      discount: 3,
      minSpend: 20,
      expiry: '',
      totalCount: 100,
      claimedCount: 37,
      scene: 'manual',
      status: 'active',
      claimed: false,
    },
    {
      id: 'c1-2',
      stallId: '1',
      title: '新客立减5元',
      type: 'cash',
      discount: 5,
      minSpend: 15,
      expiry: '',
      totalCount: -1,
      claimedCount: 12,
      scene: 'new_customer',
      status: 'active',
      claimed: false,
    },
  ],
  '2': [
    {
      id: 'c2-1',
      stallId: '2',
      title: '鲜花满30享8.5折',
      type: 'discount',
      discount: 8.5,
      minSpend: 30,
      expiry: '',
      totalCount: 50,
      claimedCount: 9,
      scene: 'manual',
      status: 'active',
      claimed: false,
    },
  ],
}

/** 许愿池（按 stallId 归组） */
const WISHES: Record<string, Wish[]> = {
  '1': [
    {
      id: 'w1-1',
      stallId: '1',
      userId: 'mock-c1',
      userName: '爱吃辣的小张',
      content: '周师傅能不能出个爆浆芝士鱿鱼啊！想吃拉丝的那种！',
      likes: 12,
      status: 'preparing',
      vendorReply: '收到！芝士已在进货路上，本周五就能安排上，到时喊你来尝鲜～',
      vendorReplyDate: Date.now() - 6 * HOUR,
      liked: false,
      createdAt: Date.now() - 2 * 24 * HOUR,
    },
    {
      id: 'w1-2',
      stallId: '1',
      userId: 'mock-c2',
      userName: '微信匿名摊友',
      content: '想要不那么辣的甜口酱汁，家里小孩也想吃。',
      likes: 5,
      status: 'pending',
      liked: false,
      createdAt: Date.now() - 8 * HOUR,
    },
  ],
  '2': [
    {
      id: 'w2-1',
      stallId: '2',
      userId: 'mock-c3',
      userName: '楼上的邻居',
      content: '阿芳姐能进点满天星吗？想配玫瑰送人～',
      likes: 8,
      status: 'arrived',
      vendorReply: '已到货啦！新鲜满天星今晚出摊就有，给你留一扎🌟',
      vendorReplyDate: Date.now() - 3 * HOUR,
      expectPrice: 12,
      expectArrive: '今晚',
      liked: false,
      createdAt: Date.now() - 26 * HOUR,
    },
  ],
}

/** 邻里拼团（按 stallId 归组，expireAt 于导入时计算） */
const GROUPBUYS: Record<string, GroupBuy[]> = {
  '1': [
    {
      id: 'g1-1',
      stallId: '1',
      productId: 'p1-1',
      productName: '经典大鱿鱼双人组合套餐',
      productImage: '',
      price: 28,
      originalPrice: 36,
      targetCount: 3,
      currentCount: 2,
      expiryHours: 11,
      expireAt: Date.now() + 11 * HOUR,
      status: 'active',
      joined: false,
    },
  ],
  '2': [
    {
      id: 'g2-1',
      stallId: '2',
      productId: 'p2-1',
      productName: '双人拼·碎冰蓝玫瑰花束',
      productImage: '',
      price: 59,
      originalPrice: 78,
      targetCount: 2,
      currentCount: 1,
      expiryHours: 6,
      expireAt: Date.now() + 6 * HOUR,
      status: 'active',
      joined: false,
    },
  ],
}

export function getMockProducts(stallId: string): Product[] {
  return PRODUCTS[stallId] || []
}
export function getMockCoupons(stallId: string): Coupon[] {
  return COUPONS[stallId] || []
}
export function getMockWishes(stallId: string): Wish[] {
  return WISHES[stallId] || []
}
export function getMockGroupBuys(stallId: string): GroupBuy[] {
  return GROUPBUYS[stallId] || []
}
