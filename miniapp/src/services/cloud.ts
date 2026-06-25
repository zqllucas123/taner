/**
 * CloudBase 云函数调用统一封装
 * 所有云函数遵循 { code, message, data } 响应结构
 */
import Taro from '@tarojs/taro'
import { CLOUD_ENV } from '@/constants/config'
import type { CloudResponse } from '@/types'

let inited = false

/** 初始化云开发（在 app onLaunch 调用一次） */
export function initCloud() {
  if (inited) return
  if (!Taro.cloud) {
    console.error('[cloud] 当前环境不支持云开发，请确认基础库版本 >= 2.2.3 且已开通云开发')
    return
  }
  Taro.cloud.init({
    env: CLOUD_ENV,
    traceUser: true,
  })
  inited = true
  console.log('[cloud] 云开发初始化完成 env =', CLOUD_ENV)
}

interface CallOptions {
  /** 是否显示全局 loading，默认 false */
  loading?: boolean
  /** loading 文案 */
  loadingText?: string
  /** 是否自动 toast 错误，默认 true */
  toastError?: boolean
}

/**
 * 调用云函数
 * @param name 云函数名（如 'login'）
 * @param data 入参
 */
export async function callFunction<T = any>(
  name: string,
  data: Record<string, any> = {},
  options: CallOptions = {},
): Promise<T> {
  const { loading = false, loadingText = '加载中...', toastError = true } = options

  if (!inited) initCloud()

  if (loading) {
    Taro.showLoading({ title: loadingText, mask: true })
  }

  try {
    const res = await Taro.cloud.callFunction({ name, data })
    const result = res.result as CloudResponse<T>

    if (!result || typeof result.code === 'undefined') {
      // 云函数未按规范返回，直接返回原始 result
      return res.result as T
    }

    if (result.code !== 0) {
      if (toastError) {
        Taro.showToast({ title: result.message || '请求失败', icon: 'none' })
      }
      throw new Error(result.message || `云函数 ${name} 返回错误码 ${result.code}`)
    }

    return result.data
  } catch (err: any) {
    console.error(`[cloud] 调用云函数 ${name} 失败:`, err)
    if (toastError) {
      Taro.showToast({ title: err?.message || '网络异常，请稍后重试', icon: 'none' })
    }
    throw err
  } finally {
    if (loading) Taro.hideLoading()
  }
}
