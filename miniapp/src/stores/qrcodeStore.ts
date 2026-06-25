/**
 * 聚合摆摊码 store（Day11）
 */
import { create } from 'zustand'
import type { StallQRCode } from '@/types'
import { callFunction } from '@/services/cloud'

interface QRCodeState {
  /** 摊主本摊位的聚合码 */
  myQRCode: StallQRCode | null
  loading: boolean

  /** 拉取本摊位聚合码（无则返回 null） */
  fetchMine: () => Promise<void>
  /** 生成/更新聚合码（features 为启用的功能位） */
  generate: (features: string[]) => Promise<boolean>
}

export const useQRCodeStore = create<QRCodeState>((set, get) => ({
  myQRCode: null,
  loading: false,

  fetchMine: async () => {
    set({ loading: true })
    try {
      const data = await callFunction<StallQRCode | null>(
        'qrcode',
        { action: 'mine' },
        { toastError: false },
      )
      set({ myQRCode: data || null })
    } catch (e) {
      console.error('[qrcodeStore] fetchMine 失败', e)
    } finally {
      set({ loading: false })
    }
  },

  generate: async (features) => {
    try {
      const data = await callFunction<StallQRCode>(
        'qrcode',
        { action: 'generate', data: { features } },
        { loading: true, loadingText: '生成中...' },
      )
      set({ myQRCode: data })
      return true
    } catch (e) {
      console.error('[qrcodeStore] generate 失败', e)
      return false
    }
  },
}))
