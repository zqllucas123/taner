/**
 * 用户状态 store
 * 登录态持久化 + 双角色（顾客/摊主）切换
 */
import { create } from 'zustand'
import type { User, UserRole } from '@/types'
import { callFunction } from '@/services/cloud'
import { getStorage, setStorage, removeStorage, STORAGE_KEYS } from '@/utils/storage'
import Taro from '@tarojs/taro'

interface UserState {
  user: User | null
  role: UserRole
  isLoggedIn: boolean
  loading: boolean

  /** 微信登录：调 login 云函数，upsert users，返回用户态。可透传 getUserProfile 的资料 */
  login: (profile?: { nickname?: string; avatarUrl?: string }) => Promise<User | null>
  /** 切换角色（customer <-> seller） */
  switchRole: (role?: UserRole) => void
  /** 更新本地用户信息 */
  setUser: (user: User) => void
  /** 退出登录（清本地态） */
  logout: () => void
  /** 从本地存储恢复登录态（app 启动调用） */
  hydrate: () => void
}

export const useUserStore = create<UserState>((set, get) => ({
  user: getStorage<User>(STORAGE_KEYS.USER),
  role: getStorage<UserRole>(STORAGE_KEYS.ROLE) || 'customer',
  isLoggedIn: !!getStorage<User>(STORAGE_KEYS.USER),
  loading: false,

  login: async (profile) => {
    set({ loading: true })
    try {
      // login 云函数通过 getWXContext 取 openid，免鉴权 upsert users
      const user = await callFunction<User>('login', profile || {}, { loading: true, loadingText: '登录中...' })
      const role = (user.role as UserRole) || get().role || 'customer'
      set({ user, role, isLoggedIn: true })
      setStorage(STORAGE_KEYS.USER, user)
      setStorage(STORAGE_KEYS.ROLE, role)
      return user
    } catch (e) {
      console.error('[userStore] login 失败', e)
      return null
    } finally {
      set({ loading: false })
    }
  },

  switchRole: (role) => {
    const next: UserRole = role || (get().role === 'customer' ? 'seller' : 'customer')
    set({ role: next })
    setStorage(STORAGE_KEYS.ROLE, next)
    Taro.showToast({
      title: next === 'seller' ? '已切换到摊主端' : '已切换到顾客端',
      icon: 'none',
    })
  },

  setUser: (user) => {
    set({ user })
    setStorage(STORAGE_KEYS.USER, user)
  },

  logout: () => {
    set({ user: null, isLoggedIn: false, role: 'customer' })
    removeStorage(STORAGE_KEYS.USER)
    removeStorage(STORAGE_KEYS.ROLE)
  },

  hydrate: () => {
    const user = getStorage<User>(STORAGE_KEYS.USER)
    const role = getStorage<UserRole>(STORAGE_KEYS.ROLE) || 'customer'
    set({ user, role, isLoggedIn: !!user })
  },
}))
