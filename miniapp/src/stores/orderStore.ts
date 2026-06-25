/**
 * 订单状态 store（Day8 预定下单 / Day9 订单管理 + 核销）
 */
import { create } from 'zustand'
import type { Order, UserRole, OrderStatus } from '@/types'
import { callFunction } from '@/services/cloud'

interface OrderState {
  orders: Order[]
  loading: boolean

  /** 按角色拉取订单列表（可选按状态过滤） */
  fetchOrders: (role: UserRole, status?: OrderStatus) => Promise<void>
  /** 顾客：创建预定单 */
  createReservation: (payload: {
    stallId: string
    items: { productId: string; quantity: number }[]
    pickupTime?: string
    reserveNotes?: string
    couponId?: string
  }) => Promise<Order | null>
  /** 摊主：确认接单 */
  confirmOrder: (orderId: string) => Promise<boolean>
  /** 摊主：核销完成（按订单 id） */
  completeOrder: (orderId: string) => Promise<boolean>
  /** 摊主：凭取货码核销完成 */
  completeByCode: (pickupCode: string) => Promise<Order | null>
  /** 取消订单（顾客或摊主） */
  cancelOrder: (orderId: string) => Promise<boolean>
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,

  fetchOrders: async (role, status) => {
    set({ loading: true })
    try {
      const list = await callFunction<Order[]>('order', { action: 'list', role, status })
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
    try {
      await callFunction('order', { action: 'confirm', id: orderId }, { loading: true, loadingText: '接单中...' })
      await get().fetchOrders('seller')
      return true
    } catch (e) {
      console.error('[orderStore] confirmOrder 失败', e)
      return false
    }
  },

  completeOrder: async (orderId) => {
    try {
      await callFunction('order', { action: 'complete', id: orderId }, { loading: true, loadingText: '核销中...' })
      await get().fetchOrders('seller')
      return true
    } catch (e) {
      console.error('[orderStore] completeOrder 失败', e)
      return false
    }
  },

  completeByCode: async (pickupCode) => {
    try {
      const order = await callFunction<Order>(
        'order',
        { action: 'complete', pickupCode },
        { loading: true, loadingText: '核销中...' },
      )
      await get().fetchOrders('seller')
      return order
    } catch (e) {
      console.error('[orderStore] completeByCode 失败', e)
      return null
    }
  },

  cancelOrder: async (orderId) => {
    try {
      await callFunction('order', { action: 'cancel', id: orderId }, { loading: true, loadingText: '处理中...' })
      return true
    } catch (e) {
      console.error('[orderStore] cancelOrder 失败', e)
      return false
    }
  },
}))
