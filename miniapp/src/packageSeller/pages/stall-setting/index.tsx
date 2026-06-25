import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { Input, TextArea, Cell, Button, Picker } from '@nutui/nutui-react-taro'
import { useStallStore } from '@/stores/stallStore'
import { useUserStore } from '@/stores/userStore'
import type { StallCategory, LocationType } from '@/types'
import './index.scss'

const CATEGORIES: StallCategory[] = ['小吃美食', '服饰饰品', '生鲜果蔬', '手工文创', '日用杂货']
const categoryOptions = CATEGORIES.map((c) => ({ text: c, value: c }))

interface FormState {
  name: string
  ownerName: string
  category: StallCategory
  locationType: LocationType
  location: string
  latitude?: number
  longitude?: number
  stallTime: string
  phone: string
  description: string
  announcement: string
}

const EMPTY_FORM: FormState = {
  name: '',
  ownerName: '',
  category: '小吃美食',
  locationType: 'mobile',
  location: '',
  stallTime: '',
  phone: '',
  description: '',
  announcement: '',
}

export default function StallSetting() {
  const { myStall, fetchMyStall, createStall, updateStall, loading } = useStallStore()
  const { user } = useUserStore()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const isEdit = !!myStall

  useLoad(() => {
    fetchMyStall()
  })

  // 拉到已有摊位时，回填表单（编辑模式）
  useEffect(() => {
    if (myStall) {
      setForm({
        name: myStall.name || '',
        ownerName: myStall.ownerName || '',
        category: myStall.category || '小吃美食',
        locationType: myStall.locationType || 'mobile',
        location: myStall.location || '',
        latitude: myStall.latitude,
        longitude: myStall.longitude,
        stallTime: myStall.stallTime || '',
        phone: myStall.phone || '',
        description: myStall.description || '',
        announcement: myStall.announcement || '',
      })
    } else if (user) {
      setForm((f) => ({ ...f, ownerName: user.nickname || '', phone: user.phone || '' }))
    }
  }, [myStall, user])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // 地图选点
  const handleChooseLocation = async () => {
    try {
      const res = await Taro.chooseLocation()
      setForm((f) => ({
        ...f,
        location: res.address || res.name || f.location,
        latitude: res.latitude,
        longitude: res.longitude,
      }))
    } catch (e) {
      console.warn('[stall-setting] 选点取消', e)
    }
  }

  const validate = (): string | null => {
    if (!form.name.trim()) return '请填写摊位名称'
    if (!form.location.trim()) return '请选择或填写出摊位置'
    if (form.phone && !/^1\d{10}$/.test(form.phone)) return '手机号格式不正确'
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      Taro.showToast({ title: err, icon: 'none' })
      return
    }

    const payload = { ...form }
    const result = isEdit ? await updateStall(payload) : await createStall(payload)

    if (result) {
      Taro.showToast({ title: isEdit ? '已保存' : '开店成功 🎉', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 800)
    }
  }

  return (
    <View className='stall-setting-page'>
      <View className='form-header'>
        <Text className='form-title'>{isEdit ? '摊位设置' : '🏪 30秒极速开店'}</Text>
        <Text className='form-sub'>
          {isEdit ? '修改你的摊位信息' : '填好基础信息即可出摊，其余可随时完善'}
        </Text>
      </View>

      <View className='form-card'>
        <Cell.Group>
          <Cell title='摊位名称' align='center'>
            <Input
              className='cell-input'
              placeholder='如：周师傅炸串'
              value={form.name}
              maxLength={30}
              onChange={(v) => setField('name', v)}
            />
          </Cell>
          <Cell title='摊主称呼' align='center'>
            <Input
              className='cell-input'
              placeholder='如：周师傅'
              value={form.ownerName}
              maxLength={20}
              onChange={(v) => setField('ownerName', v)}
            />
          </Cell>
          <Cell
            title='经营品类'
            align='center'
            onClick={() => setShowCategoryPicker(true)}
          >
            <Text className='cell-value'>{form.category} ›</Text>
          </Cell>
          <Cell title='点位类型' align='center'>
            <View className='seg'>
              <Text
                className={`seg-item ${form.locationType === 'mobile' ? 'active' : ''}`}
                onClick={() => setField('locationType', 'mobile')}
              >
                流动
              </Text>
              <Text
                className={`seg-item ${form.locationType === 'fixed' ? 'active' : ''}`}
                onClick={() => setField('locationType', 'fixed')}
              >
                固定
              </Text>
            </View>
          </Cell>
          <Cell title='出摊位置' align='center' onClick={handleChooseLocation}>
            <Text className='cell-value'>
              {form.location ? form.location : '点击选择地图位置 ›'}
            </Text>
          </Cell>
          <Cell title='出摊时段' align='center'>
            <Input
              className='cell-input'
              placeholder='如：17:30 - 00:30'
              value={form.stallTime}
              onChange={(v) => setField('stallTime', v)}
            />
          </Cell>
          <Cell title='联系电话' align='center'>
            <Input
              className='cell-input'
              type='number'
              placeholder='选填'
              value={form.phone}
              maxLength={11}
              onChange={(v) => setField('phone', v)}
            />
          </Cell>
        </Cell.Group>
      </View>

      <View className='form-card'>
        <View className='area-label'>摊位简介</View>
        <TextArea
          placeholder='介绍下你的招牌菜/特色，吸引顾客～'
          value={form.description}
          maxLength={200}
          onChange={(v) => setField('description', v)}
        />
        <View className='area-label'>摊位公告</View>
        <TextArea
          placeholder='如：今日特价、新品上市…'
          value={form.announcement}
          maxLength={100}
          onChange={(v) => setField('announcement', v)}
        />
      </View>

      <View className='submit-bar'>
        <Button
          block
          type='primary'
          loading={loading}
          onClick={handleSubmit}
        >
          {isEdit ? '保存修改' : '立即开店'}
        </Button>
      </View>

      <Picker
        visible={showCategoryPicker}
        options={categoryOptions}
        defaultValue={[form.category]}
        onConfirm={(_, values) => {
          setField('category', values[0] as StallCategory)
          setShowCategoryPicker(false)
        }}
        onClose={() => setShowCategoryPicker(false)}
      />
    </View>
  )
}
