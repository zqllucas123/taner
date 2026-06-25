/**
 * 订单状态 store（骨架，Day8/Day9 填充业务）
 */
import { create } from 'zustand'
import type { Order, UserRole } from '@/types'
import { callFunction } from '@/services/cloud'

interface OrderState {
  orders: Order[]
  loading: boolean

  /** 按角色拉取订单列表 */
  fetchOrders: (role: UserRole) => Promise<void>
  /** 顾客：创建预定单 */
  createReservation: (payload: {
    stallId: string
    items: { productId: string; quantity: number }[]
    pickupTime?: string
    reserveNotes?: string
    couponId?: string
  }) => Promise<Order | null>
  /** 摊主：确认订单 */
  confirmOrder: (orderId: string) => Promise<void>
  /** 摊主：核销完成 */
  completeOrder: (orderId: string) => Promise<void>
  /** 取消订单 */
  cancelOrder: (orderId: string) => Promise<void>
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,

  fetchOrders: async (role) => {
    set({ loading: true })
    try {
      const list = await callFunction<Order[]>('order', { action: 'list', role })
      set({ orders: list || [] })
    } catch (e) {
      console.error('[orderStore] fetchOrders 失败', e)
    } finally {
      set({ loading: false })
    }
  },

  createReservation: async (payload) => {
    try {
      const order = await callFunction<Order>(
        'order',
        { action: 'reserve', ...payload },
        { loading: true, loadingText: '提交中...' },
      )
      return order
    } catch (e) {
      console.error('[orderStore] createReservation 失败', e)
      return null
    }
  },

  confirmOrder: async (orderId) => {
    await callFunction('order', { action: 'confirm', id: orderId })
    await get().fetchOrders('seller')
  },

  completeOrder: async (orderId) => {
    await callFunction('order', { action: 'complete', id: orderId })
    await get().fetchOrders('seller')
  },

  cancelOrder: async (orderId) => {
    await callFunction('order', { action: 'cancel', id: orderId })
  },
}))
