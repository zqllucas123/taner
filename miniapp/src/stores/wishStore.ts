/**
 * 许愿池 store（Day10）
 */
import { create } from 'zustand'
import type { Wish, WishStatus } from '@/types'
import { callFunction } from '@/services/cloud'

interface WishState {
  wishes: Wish[]
  loading: boolean

  /** 拉某摊位许愿（或全站热度榜 hot=true） */
  fetchWishes: (params: { stallId?: string; hot?: boolean }) => Promise<void>
  /** 顾客：许愿 */
  createWish: (stallId: string, content: string) => Promise<boolean>
  /** 顾客：点赞/取消点赞 */
  toggleLike: (wishId: string) => Promise<void>
  /** 摊主：回愿 */
  replyWish: (payload: {
    id: string
    status?: WishStatus
    vendorReply?: string
    expectPrice?: number
    expectArrive?: string
  }) => Promise<boolean>
}

export const useWishStore = create<WishState>((set, get) => ({
  wishes: [],
  loading: false,

  fetchWishes: async (params) => {
    set({ loading: true })
    try {
      const list = await callFunction<Wish[]>('wish', { action: 'list', ...params })
      set({ wishes: list || [] })
    } catch (e) {
      console.error('[wishStore] fetchWishes 失败', e)
    } finally {
      set({ loading: false })
    }
  },

  createWish: async (stallId, content) => {
    try {
      const wish = await callFunction<Wish>(
        'wish',
        { action: 'create', stallId, content },
        { loading: true, loadingText: '提交中...' },
      )
      if (wish) set((s) => ({ wishes: [wish, ...s.wishes] }))
      return true
    } catch (e) {
      console.error('[wishStore] createWish 失败', e)
      return false
    }
  },

  toggleLike: async (wishId) => {
    try {
      const res = await callFunction<{ id: string; liked: boolean; likes: number }>(
        'wish',
        { action: 'like', id: wishId },
        { toastError: false },
      )
      if (res) {
        set((s) => ({
          wishes: s.wishes.map((w) =>
            w.id === wishId ? { ...w, liked: res.liked, likes: res.likes } : w,
          ),
        }))
      }
    } catch (e) {
      console.error('[wishStore] toggleLike 失败', e)
    }
  },

  replyWish: async (payload) => {
    try {
      const wish = await callFunction<Wish>(
        'wish',
        { action: 'reply', ...payload },
        { loading: true, loadingText: '提交中...' },
      )
      if (wish) {
        set((s) => ({ wishes: s.wishes.map((w) => (w.id === wish.id ? { ...w, ...wish } : w)) }))
      }
      return true
    } catch (e) {
      console.error('[wishStore] replyWish 失败', e)
      return false
    }
  },
}))
