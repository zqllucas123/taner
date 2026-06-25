/**
 * 全局类型定义
 * 字段对齐《数据库设计文档》P1 集合 schema
 */

// ============ 用户与会员域 ============

export type UserRole = 'customer' | 'seller'
export type UserStatus = 'normal' | 'banned'

export interface User {
  _id?: string
  id: string
  openid: string
  unionid?: string
  nickname?: string
  avatarUrl?: string
  phone?: string
  role: UserRole
  hasStall: boolean
  status: UserStatus
  lastLoginAt?: number
  createdAt?: number
  updatedAt?: number
}

// ============ 摊位域 ============

export type StallCategory = '小吃美食' | '服饰饰品' | '生鲜果蔬' | '手工文创' | '日用杂货'
/** 出摊中 / 即将出摊 / 已收摊 */
export type StallStatus = 'active' | 'upcoming' | 'offline'
export type LocationType = 'fixed' | 'mobile'

export interface Stall {
  _id?: string
  id: string
  userId: string
  name: string
  ownerName?: string
  category: StallCategory
  status: StallStatus
  statusText?: string
  locationType: LocationType
  location?: string
  latitude?: number
  longitude?: number
  stallTime?: string
  phone?: string
  description?: string
  announcement?: string
  vibeImage?: string
  vibeImageOpt?: string
  rating: number
  creditScore: number
  isHot: boolean
  templateStyle?: string
  restProtection: boolean
  bigFontMode: boolean
  marketId?: string
  /** 应用层计算字段：距离（米） */
  distance?: number
  createdAt?: number
  updatedAt?: number
}

// ============ 商品域 ============

export type ProductStatus = 'on' | 'off'

export interface Product {
  _id?: string
  id: string
  stallId: string
  name: string
  price: number
  originalPrice?: number
  costPrice?: number
  stock: number
  soldCount: number
  imageUrl?: string
  imageOptimized?: string
  category?: string
  tags?: string[]
  description?: string
  isClearing: boolean
  status: ProductStatus
  sortOrder: number
  createdAt?: number
  updatedAt?: number
}

/** AI 定价记录 */
export interface PricingRecord {
  id: string
  stallId: string
  productId?: string
  foodType?: string
  costPrice: number
  marketPrice?: number
  rentPrice?: number
  suggestedPrice?: number
  trafficPrice?: number
  premiumPrice?: number
  clearancePrice?: number
  marginRate?: number
  breakEvenQty?: number
  aiReasoning?: string
  createdAt?: number
}

// ============ 交易域 ============

export type OrderType = 'reserve' | 'groupbuy' | 'flash_sale'
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'disputed'
export type OrderChannel = 'online' | 'offline'

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName?: string
  price: number
  quantity: number
  subtotal: number
}

export interface Order {
  _id?: string
  id: string
  orderNo: string
  userId: string
  stallId: string
  type: OrderType
  status: OrderStatus
  channel: OrderChannel
  totalAmount: number
  discountAmount: number
  payAmount: number
  couponId?: string
  pickupCode?: string
  pickupTime?: string
  reserveNotes?: string
  reserveExpireAt?: number
  items?: OrderItem[]
  createdAt?: number
  updatedAt?: number
}

// ============ 营销域 ============

export type CouponType = 'discount' | 'cash' | 'gift'

export interface Coupon {
  _id?: string
  id: string
  stallId: string
  title: string
  type: CouponType
  discount: number
  minSpend: number
  expiry: string
  total?: number
  claimed?: number
  createdAt?: number
}

// ============ 互动域 ============

export type WishStatus = 'pending' | 'preparing' | 'arrived' | 'declined'

export interface Wish {
  _id?: string
  id: string
  stallId: string
  userId: string
  userName?: string
  userAvatar?: string
  content: string
  likes: number
  status: WishStatus
  vendorReply?: string
  vendorReplyDate?: number
  createdAt?: number
}

// ============ 聚合码 ============

export interface StallQRCode {
  _id?: string
  id: string
  stallId: string
  sceneValue: string
  qrUrl?: string
  features?: string[]
  scanCount: number
  createdAt?: number
}

// ============ 云函数通用响应 ============

export interface CloudResponse<T = any> {
  code: number
  message: string
  data: T
}
