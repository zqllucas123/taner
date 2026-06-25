import { useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { callFunction } from '@/services/cloud'
import { useUserStore } from '@/stores/userStore'
import './index.scss'

export default function Index() {
  const { user, role, isLoggedIn, login, switchRole } = useUserStore()
  const [echoResult, setEchoResult] = useState<string>('')

  useLoad(() => {
    console.log('Index page loaded.')
  })

  // Day1 验收：测试云函数连通
  const testEcho = async () => {
    try {
      const data = await callFunction<any>('echo', { msg: 'hello cloudbase' }, { loading: true })
      setEchoResult(JSON.stringify(data))
      Taro.showToast({ title: '云函数连通成功', icon: 'success' })
    } catch (e) {
      setEchoResult('调用失败：' + (e as Error).message)
    }
  }

  const goMy = () => {
    Taro.navigateTo({ url: '/pages/my/index' })
  }

  const goSellerStall = () => {
    Taro.navigateTo({ url: '/packageSeller/pages/stall-setting/index' })
  }

  const goCustomerHome = () => {
    Taro.navigateTo({ url: '/packageCustomer/pages/home/index' })
  }

  return (
    <View className='index-page'>
      <View className='hero'>
        <Text className='hero-emoji'>🍢</Text>
        <Text className='hero-title'>地摊烟火小店</Text>
        <Text className='hero-sub'>线下摊位引流 · 线上小店成交 · AI 辅助经营</Text>
      </View>

      <View className='status-card'>
        <View className='status-row'>
          <Text className='label'>登录状态</Text>
          <Text className='value'>{isLoggedIn ? '已登录' : '未登录'}</Text>
        </View>
        <View className='status-row'>
          <Text className='label'>当前身份</Text>
          <Text className='value'>{role === 'seller' ? '摊主' : '顾客'}</Text>
        </View>
        {user && (
          <View className='status-row'>
            <Text className='label'>openid</Text>
            <Text className='value tiny'>{user.openid?.slice(0, 12)}...</Text>
          </View>
        )}
      </View>

      <View className='actions'>
        {!isLoggedIn ? (
          <Button className='btn btn-primary' onClick={() => login()}>
            微信一键登录
          </Button>
        ) : (
          <Button className='btn btn-outline' onClick={() => switchRole()}>
            切换为{role === 'seller' ? '顾客' : '摊主'}端
          </Button>
        )}

        <Button className='btn btn-outline' onClick={goMy}>
          进入「我的」
        </Button>

        {role === 'seller' ? (
          <Button className='btn btn-seller' onClick={goSellerStall}>
            摊主：摊位设置 / 开店
          </Button>
        ) : (
          <Button className='btn btn-customer' onClick={goCustomerHome}>
            顾客：逛地摊地图
          </Button>
        )}
      </View>

      <View className='debug'>
        <Button className='btn btn-mini' size='mini' onClick={testEcho}>
          测试云函数连通（echo）
        </Button>
        {!!echoResult && <Text className='echo-result'>{echoResult}</Text>}
      </View>
    </View>
  )
}
