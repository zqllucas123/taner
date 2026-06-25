/**
 * 本地存储封装（同步）
 */
import Taro from '@tarojs/taro'

export function setStorage<T = any>(key: string, value: T): void {
  try {
    Taro.setStorageSync(key, value)
  } catch (e) {
    console.error('[storage] set 失败', key, e)
  }
}

export function getStorage<T = any>(key: string, defaultValue: T | null = null): T | null {
  try {
    const v = Taro.getStorageSync(key)
    return v === '' || v === undefined || v === null ? defaultValue : (v as T)
  } catch (e) {
    console.error('[storage] get 失败', key, e)
    return defaultValue
  }
}

export function removeStorage(key: string): void {
  try {
    Taro.removeStorageSync(key)
  } catch (e) {
    console.error('[storage] remove 失败', key, e)
  }
}

/** 存储键常量 */
export const STORAGE_KEYS = {
  USER: 'taner_user',
  ROLE: 'taner_role',
  BIG_FONT: 'taner_big_font',
} as const
