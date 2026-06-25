import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/stores/userStore'
import './index.scss'

export default function My() {
  const { user, role, isLoggedIn, login, switchRole, logout } = useUserStore()

  const isSeller = role === 'seller'

  // 顾客端菜单
  const customerMenus = [
    { icon: '📋', label: '我的预定', path: '/packageCustomer/pages/orders/index' },
    { icon: '🎫', label: '我的优惠券', path: '/packageCustomer/pages/my-coupons/index' },
    { icon: '💌', label: '我的许愿', path: '' },
    { icon: '⚙️', label: '设置', path: '' },
  ]

  // 摊主端菜单
  const sellerMenus = [
    { icon: '🏪', label: '摊位设置', path: '/packageSeller/pages/stall-setting/index' },
    { icon: '📦', label: '商品管理', path: '/packageSeller/pages/product-manage/index' },
    { icon: '💰', label: 'AI 定价', path: '/packageSeller/pages/pricing/index' },
    { icon: '🧾', label: '订单管理', path: '/packageSeller/pages/order-manage/index' },
    { icon: '🎫', label: '优惠券管理', path: '/packageSeller/pages/coupon-manage/index' },
  ]

  const menus = isSeller ? sellerMenus : customerMenus

  const handleLogin = async () => {
    try {
      // 微信新规：需用户主动授权获取头像昵称
      const { userInfo } = await Taro.getUserProfile({ desc: '用于完善您的个人资料' })
      await login({ nickname: userInfo.nickName, avatarUrl: userInfo.avatarUrl })
    } catch (e) {
      // 用户拒绝授权时仍允许静默登录（仅 openid）
      console.warn('[my] getUserProfile 取消或失败，降级为静默登录', e)
      await login()
    }
  }

  const handleMenu = (path: string) => {
    if (!path) {
      Taro.showToast({ title: '功能开发中', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: path })
  }

  return (
    <View className={`my-page ${isSeller ? 'theme-seller' : 'theme-customer'}`}>
      {/* 用户信息头部 */}
      <View className='profile'>
        <Image
          className='avatar'
          src={user?.avatarUrl || 'https://img.icons8.com/color/96/user-male-circle--v1.png'}
        />
        <View className='profile-info'>
          {isLoggedIn ? (
            <>
              <Text className='nickname'>{user?.nickname || '微信用户'}</Text>
              <Text className='role-tag'>{isSeller ? '👨‍🍳 摊主' : '🔍 顾客'}</Text>
            </>
          ) : (
            <Button className='login-btn' onClick={handleLogin}>
              点击登录
            </Button>
          )}
        </View>
      </View>

      {/* 角色切换 */}
      <View className='role-switch' onClick={() => switchRole()}>
        <Text className='switch-text'>
          {isSeller ? '切换到顾客身份' : '切换到摊主身份'}
        </Text>
        <Text className='switch-arrow'>⇄</Text>
      </View>

      {/* 功能菜单 */}
      <View className='menu-list'>
        {menus.map((m) => (
          <View key={m.label} className='menu-item' onClick={() => handleMenu(m.path)}>
            <Text className='menu-icon'>{m.icon}</Text>
            <Text className='menu-label'>{m.label}</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
        ))}
      </View>

      {isLoggedIn && (
        <Button className='logout-btn' onClick={logout}>
          退出登录
        </Button>
      )}
    </View>
  )
}
