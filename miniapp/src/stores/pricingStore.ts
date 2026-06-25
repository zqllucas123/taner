/**
 * AI 定价 store
 * 摊主端：输入成本→获取多档定价建议、查看历史、一键回填到商品
 */
import { create } from 'zustand'
import type { PricingRecord, Product } from '@/types'
import { callFunction } from '@/services/cloud'

/** 定价输入参数 */
export interface PricingInput {
  /** 进货成本（必填） */
  costPrice: number
  /** 同城同行售价 */
  marketPrice?: number
  /** 每日点位租金摊销 */
  rentPrice?: number
  /** 品类（影响定价规则） */
  foodType?: string
  /** 预期日销量（用于摊销租金，默认 30） */
  expectDailyQty?: number
  /** 关联已有商品 id（可选） */
  productId?: string
}

interface PricingState {
  /** 最近一次定价结果 */
  result: PricingRecord | null
  /** 历史记录 */
  history: PricingRecord[]
  loading: boolean

  /** 计算定价（写库并返回结果） */
  calculate: (input: PricingInput) => Promise<PricingRecord | null>
  /** 拉取历史记录 */
  fetchHistory: () => Promise<void>
  /** 一键应用到商品（更新该商品 price / originalPrice / costPrice） */
  applyToProduct: (productId: string, record: PricingRecord) => Promise<Product | null>
  /** 清空当前结果 */
  reset: () => void
}

export const usePricingStore = create<PricingState>((set, get) => ({
  result: null,
  history: [],
  loading: false,

  calculate: async (input) => {
    set({ loading: true })
    try {
      const record = await callFunction<PricingRecord>(
        'ai',
        { action: 'pricing', data: input },
        { loading: true, loadingText: 'AI 测算中...' },
      )
      set({ result: record, history: [record, ...get().history] })
      return record
    } catch (e) {
      console.error('[pricingStore] calculate 失败', e)
      return null
    } finally {
      set({ loading: false })
    }
  },

  fetchHistory: async () => {
    try {
      const list = await callFunction<PricingRecord[]>('ai', { action: 'history', limit: 20 })
      set({ history: list || [] })
    } catch (e) {
      console.error('[pricingStore] fetchHistory 失败', e)
    }
  },

  applyToProduct: async (productId, record) => {
    try {
      // 建议价回填为现价，节假日溢价作为划线价（营造优惠感），成本同步
      const product = await callFunction<Product>(
        'product',
        {
          action: 'update',
          id: productId,
          data: {
            price: record.suggestedPrice,
            originalPrice: record.premiumPrice,
            costPrice: record.costPrice,
          },
        },
        { loading: true, loadingText: '应用中...' },
      )
      return product
    } catch (e) {
      console.error('[pricingStore] applyToProduct 失败', e)
      return null
    }
  },

  reset: () => set({ result: null }),
}))
