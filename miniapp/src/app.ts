import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { initCloud } from '@/services/cloud'
import { useUserStore } from '@/stores/userStore'

import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    // 初始化云开发
    initCloud()
    // 恢复本地登录态
    useUserStore.getState().hydrate()
    console.log('App launched.')
  })

  return children
}

export default App
