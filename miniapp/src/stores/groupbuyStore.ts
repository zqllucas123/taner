/**
 * 邻里拼团 store（模块三）
 * 顾客端：按摊位拉进行中的团 / 参团 / 详情
 * 摊主端：拉本摊所有团 / 创建 / 下架
 */
import { create } from 'zustand'
import type { GroupBuy } from '@/types'
import { callFunction } from '@/services/cloud'
import { getMockGroupBuys } from '@/data/mockShop'

interface JoinResult {
  groupBuy: GroupBuy
  joined: boolean
  completed: boolean
  myOrder?: any
}

interface GroupBuyState {
  /** 顾客：某摊进行中的团（带 joined 标记） */
  stallGroups: GroupBuy[]
  /** 摊主：本摊所有团 */
  myGroups: GroupBuy[]
  loading: boolean

  /** 顾客：拉某摊进行中的团 */
  fetchByStall: (stallId: string) => Promise<void>
  /** 顾客：参团（返回结果含是否成团 + 我的拼团订单） */
  join: (id: string) => Promise<JoinResult | null>
  /** 顾客/摊主：团详情（含参与者） */
  fetchDetail: (id: string) => Promise<GroupBuy | null>

  /** 摊主：拉本摊所有团 */
  fetchMine: () => Promise<void>
  /** 摊主：创建拼团 */
  createGroupBuy: (payload: {
    productId: string
    price: number
    targetCount: number
    expiryHours: number
  }) => Promise<boolean>
  /** 摊主：下架未成团活动 */
  cancelGroupBuy: (id: string) => Promise<boolean>
}

export const useGroupbuyStore = create<GroupBuyState>((set, get) => ({
  stallGroups: [],
  myGroups: [],
  loading: false,

  fetchByStall: async (stallId) => {
    try {
      const list = await callFunction<GroupBuy[]>('groupbuy', { action: 'list', stallId })
      set({ stallGroups: list && list.length ? list : getMockGroupBuys(stallId) })
    } catch (e) {
      console.error('[groupbuyStore] fetchByStall 失败，使用 mock 拼团', e)
      set({ stallGroups: getMockGroupBuys(stallId) })
    }
  },

  join: async (id) => {
    try {
      const res = await callFunction<JoinResult>(
        'groupbuy',
        { action: 'join', id },
        { loading: true, loadingText: '参团中...' },
      )
      // 本地更新该团人数/参团态
      if (res?.groupBuy) {
        set((s) => ({
          stallGroups: s.stallGroups.map((g) =>
            g.id === id ? { ...g, ...res.groupBuy, joined: true } : g,
          ),
        }))
      }
      return res
    } catch (e) {
      console.error('[groupbuyStore] join 失败', e)
      return null
    }
  },

  fetchDetail: async (id) => {
    try {
      const gb = await callFunction<GroupBuy>('groupbuy', { action: 'detail', id })
      return gb || null
    } catch (e) {
      console.error('[groupbuyStore] fetchDetail 失败', e)
      return null
    }
  },

  fetchMine: async () => {
    set({ loading: true })
    try {
      const list = await callFunction<GroupBuy[]>('groupbuy', { action: 'list', mine: true })
      set({ myGroups: list || [] })
    } catch (e) {
      console.error('[groupbuyStore] fetchMine 失败', e)
    } finally {
      set({ loading: false })
    }
  },

  createGroupBuy: async (payload) => {
    try {
      await callFunction('groupbuy', { action: 'create', data: payload }, { loading: true, loadingText: '开团中...' })
      await get().fetchMine()
      return true
    } catch (e) {
      console.error('[groupbuyStore] createGroupBuy 失败', e)
      return false
    }
  },

  cancelGroupBuy: async (id) => {
    try {
      await callFunction('groupbuy', { action: 'cancel', id }, { loading: true, loadingText: '下架中...' })
      await get().fetchMine()
      return true
    } catch (e) {
      console.error('[groupbuyStore] cancelGroupBuy 失败', e)
      return false
    }
  },
}))
