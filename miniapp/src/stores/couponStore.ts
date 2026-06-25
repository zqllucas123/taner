/**
 * 优惠券 store（Day10）
 */
import { create } from 'zustand'
import type { Coupon, UserCoupon, UserCouponStatus } from '@/types'
import { callFunction } from '@/services/cloud'

interface CouponState {
  /** 摊主：本摊位发的券 */
  myCoupons: Coupon[]
  /** 顾客：某摊位可领的券（带 claimed 标记） */
  stallCoupons: Coupon[]
  /** 顾客：我领取的券（带券快照） */
  ownedCoupons: UserCoupon[]
  loading: boolean

  /** 摊主：发券 */
  createCoupon: (payload: {
    title: string
    type: Coupon['type']
    discount: number
    minSpend: number
    totalCount?: number
    scene?: Coupon['scene']
    expiry?: string
  }) => Promise<boolean>
  /** 摊主：暂停/恢复 */
  updateCouponStatus: (id: string, status: Coupon['status']) => Promise<void>
  /** 摊主：拉本摊位券 */
  fetchMyCoupons: () => Promise<void>
  /** 顾客：拉某摊位可领券 */
  fetchStallCoupons: (stallId: string) => Promise<void>
  /** 顾客：领券 */
  claimCoupon: (couponId: string) => Promise<boolean>
  /** 顾客：拉我的券（可按状态） */
  fetchOwnedCoupons: (status?: UserCouponStatus) => Promise<void>
}

export const useCouponStore = create<CouponState>((set, get) => ({
  myCoupons: [],
  stallCoupons: [],
  ownedCoupons: [],
  loading: false,

  createCoupon: async (payload) => {
    try {
      await callFunction('coupon', { action: 'create', data: payload }, { loading: true, loadingText: '发券中...' })
      await get().fetchMyCoupons()
      return true
    } catch (e) {
      console.error('[couponStore] createCoupon 失败', e)
      return false
    }
  },

  updateCouponStatus: async (id, status) => {
    await callFunction('coupon', { action: 'update', id, data: { status } })
    await get().fetchMyCoupons()
  },

  fetchMyCoupons: async () => {
    set({ loading: true })
    try {
      const list = await callFunction<Coupon[]>('coupon', { action: 'list', mine: true })
      set({ myCoupons: list || [] })
    } catch (e) {
      console.error('[couponStore] fetchMyCoupons 失败', e)
    } finally {
      set({ loading: false })
    }
  },

  fetchStallCoupons: async (stallId) => {
    try {
      const list = await callFunction<Coupon[]>('coupon', { action: 'list', stallId })
      set({ stallCoupons: list || [] })
    } catch (e) {
      console.error('[couponStore] fetchStallCoupons 失败', e)
    }
  },

  claimCoupon: async (couponId) => {
    try {
      await callFunction('coupon', { action: 'claim', couponId }, { loading: true, loadingText: '领取中...' })
      // 本地标记已领
      set((s) => ({
        stallCoupons: s.stallCoupons.map((c) =>
          c.id === couponId ? { ...c, claimed: true, claimedCount: (c.claimedCount || 0) + 1 } : c,
        ),
      }))
      return true
    } catch (e) {
      console.error('[couponStore] claimCoupon 失败', e)
      return false
    }
  },

  fetchOwnedCoupons: async (status) => {
    set({ loading: true })
    try {
      const list = await callFunction<UserCoupon[]>('coupon', { action: 'list', owned: true, status })
      set({ ownedCoupons: list || [] })
    } catch (e) {
      console.error('[couponStore] fetchOwnedCoupons 失败', e)
    } finally {
      set({ loading: false })
    }
  },
}))
