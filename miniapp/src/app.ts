import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { initCloud, callFunction } from '@/services/cloud'
import { useUserStore } from '@/stores/userStore'
import type { StallQRCode } from '@/types'

import './app.scss'

/**
 * 扫码进店：小程序码（getUnlimited）带的 scene 会出现在启动参数 query.scene 中。
 * 解析 scene → qrcode.get 拿到 stallId → 跳转摊位详情。
 * 失败（无效码/网络）静默忽略，正常进首页。
 */
async function handleScanScene(scene?: string) {
  if (!scene) return
  try {
    const data = await callFunction<StallQRCode | null>(
      'qrcode',
      { action: 'get', sceneValue: decodeURIComponent(scene) },
      { toastError: false },
    )
    if (data && data.stallId) {
      Taro.navigateTo({
        url: `/packageCustomer/pages/stall-detail/index?id=${data.stallId}&from=qr`,
      })
    }
  } catch (e) {
    console.warn('[app] 扫码 scene 解析失败:', (e as Error).message)
  }
}

function App({ children }: PropsWithChildren<any>) {
  useLaunch((options) => {
    // 初始化云开发
    initCloud()
    // 恢复本地登录态
    useUserStore.getState().hydrate()
    // 扫码进店：解析聚合码 scene
    const scene = options?.query?.scene
    if (scene) handleScanScene(scene)
    console.log('App launched.', options?.query)
  })

  return children
}

export default App
