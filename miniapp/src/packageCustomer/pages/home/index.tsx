import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Home() {
  return (
    <View className='customer-home-page'>
      <View className='placeholder'>
        <Text className='ph-emoji'>🗺️</Text>
        <Text className='ph-title'>地摊地图首页</Text>
        <Text className='ph-desc'>Day6 开发：附近摊位地图、距离排序、品类筛选</Text>
      </View>
    </View>
  )
}
