/**
 * 商品状态 store
 * 摊主端商品管理 + 顾客端商品浏览
 */
import { create } from 'zustand'
import type { Product, ProductStatus } from '@/types'
import { callFunction } from '@/services/cloud'

interface ProductState {
  /** 当前列表（摊主端=自己全部，顾客端=某摊位上架） */
  products: Product[]
  loading: boolean

  /** 摊主端：拉取我的商品（全部状态） */
  fetchMine: () => Promise<void>
  /** 顾客端：拉取某摊位上架商品 */
  fetchByStall: (stallId: string) => Promise<void>
  /** 新增商品 */
  createProduct: (payload: Partial<Product>) => Promise<Product | null>
  /** 更新商品 */
  updateProduct: (id: string, payload: Partial<Product>) => Promise<Product | null>
  /** 删除商品（软删） */
  removeProduct: (id: string) => Promise<boolean>
  /** 上下架切换 */
  toggleStatus: (id: string, status: ProductStatus) => Promise<void>
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,

  fetchMine: async () => {
    set({ loading: true })
    try {
      const list = await callFunction<Product[]>('product', { action: 'list', mine: true })
      set({ products: list || [] })
    } catch (e) {
      console.error('[productStore] fetchMine 失败', e)
    } finally {
      set({ loading: false })
    }
  },

  fetchByStall: async (stallId) => {
    set({ loading: true })
    try {
      const list = await callFunction<Product[]>('product', { action: 'list', stallId })
      set({ products: list || [] })
    } catch (e) {
      console.error('[productStore] fetchByStall 失败', e)
    } finally {
      set({ loading: false })
    }
  },

  createProduct: async (payload) => {
    try {
      const product = await callFunction<Product>(
        'product',
        { action: 'create', data: payload },
        { loading: true, loadingText: '保存中...' },
      )
      // 插入列表头部
      set({ products: [product, ...get().products] })
      return product
    } catch (e) {
      console.error('[productStore] createProduct 失败', e)
      return null
    }
  },

  updateProduct: async (id, payload) => {
    try {
      const product = await callFunction<Product>(
        'product',
        { action: 'update', id, data: payload },
        { loading: true, loadingText: '保存中...' },
      )
      set({
        products: get().products.map((p) => (p.id === id ? product : p)),
      })
      return product
    } catch (e) {
      console.error('[productStore] updateProduct 失败', e)
      return null
    }
  },

  removeProduct: async (id) => {
    try {
      await callFunction('product', { action: 'delete', id }, { loading: true, loadingText: '删除中...' })
      set({ products: get().products.filter((p) => p.id !== id) })
      return true
    } catch (e) {
      console.error('[productStore] removeProduct 失败', e)
      return false
    }
  },

  toggleStatus: async (id, status) => {
    // 乐观更新
    const prev = get().products
    set({ products: prev.map((p) => (p.id === id ? { ...p, status } : p)) })
    try {
      await callFunction('product', { action: 'updateStatus', id, status })
    } catch (e) {
      console.error('[productStore] toggleStatus 失败，回滚', e)
      set({ products: prev })
    }
  },
}))
