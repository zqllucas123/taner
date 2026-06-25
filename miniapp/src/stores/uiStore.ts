/**
 * UI 偏好 store（大字极简模式 / 语音开关）
 */
import { create } from 'zustand'
import { getStorage, setStorage, STORAGE_KEYS } from '@/utils/storage'

interface UIState {
  bigFontMode: boolean
  voiceEnabled: boolean
  toggleBigFont: () => void
  setVoiceEnabled: (v: boolean) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  bigFontMode: getStorage<boolean>(STORAGE_KEYS.BIG_FONT, false) || false,
  voiceEnabled: false,

  toggleBigFont: () => {
    const next = !get().bigFontMode
    set({ bigFontMode: next })
    setStorage(STORAGE_KEYS.BIG_FONT, next)
  },

  setVoiceEnabled: (v) => set({ voiceEnabled: v }),
}))
