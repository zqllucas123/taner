/**
 * 摊位状态 store（骨架，Day3/Day6 填充业务）
 */
import { create } from 'zustand'
import type { Stall, StallStatus } from '@/types'
import { callFunction } from '@/services/cloud'

interface StallQuery {
  latitude?: number
  longitude?: number
  category?: string
  keyword?: string
}

interface StallState {
  stalls: Stall[]
  currentStall: Stall | null
  /** 当前摊主自己的摊位（开店后） */
  myStall: Stall | null
  loading: boolean

  /** 顾客端：拉取附近摊位 */
  fetchNearby: (params: StallQuery) => Promise<void>
  /** 拉取摊位详情 */
  fetchDetail: (id: string) => Promise<Stall | null>
  /** 摊主端：拉取我的摊位 */
  fetchMyStall: () => Promise<Stall | null>
  /** 开店：创建摊位 */
  createStall: (payload: Partial<Stall>) => Promise<Stall | null>
  /** 更新摊位信息 */
  updateStall: (payload: Partial<Stall>) => Promise<Stall | null>
  /** 设置当前查看的摊位 */
  setCurrentStall: (stall: Stall | null) => void
  /** 切换出摊/歇业状态 */
  updateStatus: (status: StallStatus) => Promise<void>
}

export const useStallStore = create<StallState>((set, get) => ({
  stalls: [],
  currentStall: null,
  myStall: null,
  loading: false,

  fetchNearby: async (params) => {
    set({ loading: true })
    try {
      const list = await callFunction<Stall[]>('stall', { action: 'nearby', ...params })
      set({ stalls: list || [] })
    } catch (e) {
      console.error('[stallStore] fetchNearby 失败', e)
    } finally {
      set({ loading: false })
    }
  },

  fetchDetail: async (id) => {
    try {
      const stall = await callFunction<Stall>('stall', { action: 'get', id })
      set({ currentStall: stall })
      return stall
    } catch (e) {
      console.error('[stallStore] fetchDetail 失败', e)
      return null
    }
  },

  fetchMyStall: async () => {
    try {
      const stall = await callFunction<Stall | null>('stall', { action: 'mine' })
      set({ myStall: stall })
      return stall
    } catch (e) {
      console.error('[stallStore] fetchMyStall 失败', e)
      return null
    }
  },

  setCurrentStall: (stall) => set({ currentStall: stall }),

  createStall: async (payload) => {
    set({ loading: true })
    try {
      const stall = await callFunction<Stall>(
        'stall',
        { action: 'create', data: payload },
        { loading: true, loadingText: '开店中...' },
      )
      set({ myStall: stall })
      return stall
    } catch (e) {
      console.error('[stallStore] createStall 失败', e)
      return null
    } finally {
      set({ loading: false })
    }
  },

  updateStall: async (payload) => {
    const my = get().myStall
    set({ loading: true })
    try {
      const stall = await callFunction<Stall>(
        'stall',
        { action: 'update', id: my?.id, data: payload },
        { loading: true, loadingText: '保存中...' },
      )
      set({ myStall: stall })
      return stall
    } catch (e) {
      console.error('[stallStore] updateStall 失败', e)
      return null
    } finally {
      set({ loading: false })
    }
  },

  updateStatus: async (status) => {
    const my = get().myStall
    if (!my) return
    try {
      await callFunction('stall', { action: 'updateStatus', id: my.id, status })
      set({ myStall: { ...my, status } })
    } catch (e) {
      console.error('[stallStore] updateStatus 失败', e)
    }
  },
}))
