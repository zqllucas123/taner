/**
 * 购物车 store（模块四 · 参照美团外卖以店铺为单位的购物车）
 *
 * 设计要点：
 * - 纯前端本地态 + Storage 持久化，不落云端；结算时才走 order.reserve（后端已就绪）。
 * - 单店约束：购物车只绑定一个摊位，跨店加购需先清空（美团同款交互）。
 * - 减到 0 自动移除；空车时 stallId 归零。
 */
import { create } from 'zustand'
import Taro from '@tarojs/taro'
import type { Product } from '@/types'

const STORAGE_KEY = 'cart_v1'

export interface CartItem {
  productId: string
  name: string
  price: number
  qty: number
  image?: string
  stock: number
}

interface PersistShape {
  stallId: string | null
  stallName: string
  items: Record<string, CartItem>
}

interface CartState {
  /** 当前购物车所属摊位（保证单店） */
  stallId: string | null
  stallName: string
  /** productId -> item */
  items: Record<string, CartItem>

  /** 加购一件（跨店时抛出 'cross-stall'，由页面弹确认后再 clear 重加） */
  add: (stallId: string, stallName: string, product: Product) => 'ok' | 'cross-stall'
  /** 强制加购（清空旧店后加入新店，用于跨店确认后） */
  forceAdd: (stallId: string, stallName: string, product: Product) => void
  inc: (productId: string) => void
  dec: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  clear: () => void
  /** 派生：总件数 */
  totalQty: () => number
  /** 派生：合计金额 */
  totalAmount: () => number
  /** 派生：某商品当前数量 */
  qtyOf: (productId: string) => number
}

/** 从 Storage 恢复初始态 */
function loadPersisted(): PersistShape {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY)
    if (raw && typeof raw === 'object') {
      return {
        stallId: raw.stallId || null,
        stallName: raw.stallName || '',
        items: raw.items || {},
      }
    }
  } catch (e) {
    console.warn('[cartStore] 读取本地购物车失败', e)
  }
  return { stallId: null, stallName: '', items: {} }
}

/** 写回 Storage */
function persist(state: PersistShape) {
  try {
    Taro.setStorageSync(STORAGE_KEY, {
      stallId: state.stallId,
      stallName: state.stallName,
      items: state.items,
    })
  } catch (e) {
    console.warn('[cartStore] 写入本地购物车失败', e)
  }
}

const init = loadPersisted()

export const useCartStore = create<CartState>((set, get) => ({
  stallId: init.stallId,
  stallName: init.stallName,
  items: init.items,

  add: (stallId, stallName, product) => {
    const cur = get()
    // 跨店：已有别店商品且购物车非空 → 交给页面确认
    if (cur.stallId && cur.stallId !== stallId && Object.keys(cur.items).length > 0) {
      return 'cross-stall'
    }
    get().forceAdd(stallId, stallName, product)
    return 'ok'
  },

  forceAdd: (stallId, stallName, product) => {
    set((s) => {
      const base = s.stallId === stallId ? s.items : {}
      const exist = base[product.id]
      const qty = Math.min((exist?.qty || 0) + 1, product.stock)
      const items = {
        ...base,
        [product.id]: {
          productId: product.id,
          name: product.name,
          price: product.price,
          qty,
          image: product.imageUrl,
          stock: product.stock,
        },
      }
      const next = { stallId, stallName, items }
      persist(next)
      return next
    })
  },

  inc: (productId) => {
    set((s) => {
      const item = s.items[productId]
      if (!item) return s
      const qty = Math.min(item.qty + 1, item.stock)
      const items = { ...s.items, [productId]: { ...item, qty } }
      const next = { ...s, items }
      persist(next)
      return next
    })
  },

  dec: (productId) => {
    set((s) => {
      const item = s.items[productId]
      if (!item) return s
      const items = { ...s.items }
      if (item.qty <= 1) {
        delete items[productId]
      } else {
        items[productId] = { ...item, qty: item.qty - 1 }
      }
      const empty = Object.keys(items).length === 0
      const next = {
        stallId: empty ? null : s.stallId,
        stallName: empty ? '' : s.stallName,
        items,
      }
      persist(next)
      return next
    })
  },

  setQty: (productId, qty) => {
    set((s) => {
      const item = s.items[productId]
      if (!item) return s
      const v = Math.max(0, Math.min(qty, item.stock))
      const items = { ...s.items }
      if (v === 0) {
        delete items[productId]
      } else {
        items[productId] = { ...item, qty: v }
      }
      const empty = Object.keys(items).length === 0
      const next = {
        stallId: empty ? null : s.stallId,
        stallName: empty ? '' : s.stallName,
        items,
      }
      persist(next)
      return next
    })
  },

  clear: () => {
    const next = { stallId: null, stallName: '', items: {} }
    persist(next)
    set(next)
  },

  totalQty: () => Object.values(get().items).reduce((sum, it) => sum + it.qty, 0),

  totalAmount: () => {
    const amount = Object.values(get().items).reduce((sum, it) => sum + it.price * it.qty, 0)
    return Math.round(amount * 100) / 100
  },

  qtyOf: (productId) => get().items[productId]?.qty || 0,
}))
