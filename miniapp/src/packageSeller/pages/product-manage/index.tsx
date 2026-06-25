import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import {
  Popup, Input, TextArea, Button, Switch, Tag, Empty, Dialog,
} from '@nutui/nutui-react-taro'
import { useProductStore } from '@/stores/productStore'
import { chooseAndUploadImage, getTempFileURLs } from '@/utils/upload'
import type { Product, ProductStatus } from '@/types'
import './index.scss'

interface FormState {
  name: string
  price: string
  originalPrice: string
  costPrice: string
  stock: string
  category: string
  description: string
  imageUrl: string
  isClearing: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  price: '',
  originalPrice: '',
  costPrice: '',
  stock: '',
  category: '',
  description: '',
  imageUrl: '',
  isClearing: false,
}

export default function ProductManage() {
  const { products, loading, fetchMine, createProduct, updateProduct, removeProduct, toggleStatus } =
    useProductStore()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [urlMap, setUrlMap] = useState<Record<string, string>>({})

  useDidShow(() => {
    fetchMine()
  })

  // 列表里的 cloud:// 图片换临时 URL
  useEffect(() => {
    const ids = products
      .map((p) => p.imageUrl)
      .filter((u) => u && u.startsWith('cloud://') && !urlMap[u])
    if (ids.length) {
      getTempFileURLs(ids).then((map) => setUrlMap((prev) => ({ ...prev, ...map })))
    }
  }, [products])

  const resolveImg = (url?: string) => {
    if (!url) return ''
    return url.startsWith('cloud://') ? urlMap[url] || '' : url
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      price: String(p.price ?? ''),
      originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
      costPrice: p.costPrice != null ? String(p.costPrice) : '',
      stock: String(p.stock ?? ''),
      category: p.category || '',
      description: p.description || '',
      imageUrl: p.imageUrl || '',
      isClearing: !!p.isClearing,
    })
    setShowForm(true)
  }

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleUpload = async () => {
    const fileID = await chooseAndUploadImage({ dir: 'products' })
    if (fileID) {
      setField('imageUrl', fileID)
      // 立刻拿临时 URL 预览
      const map = await getTempFileURLs([fileID])
      setUrlMap((prev) => ({ ...prev, ...map }))
    }
  }

  const validate = (): string | null => {
    if (!form.name.trim()) return '请填写商品名称'
    if (!form.price || Number(form.price) <= 0) return '请填写有效价格'
    if (form.stock === '' || Number(form.stock) < 0) return '请填写库存'
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      Taro.showToast({ title: err, icon: 'none' })
      return
    }
    const payload: Partial<Product> = {
      name: form.name.trim(),
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      stock: Number(form.stock),
      category: form.category.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl,
      isClearing: form.isClearing,
    }
    const result = editingId
      ? await updateProduct(editingId, payload)
      : await createProduct(payload)
    if (result) {
      Taro.showToast({ title: editingId ? '已保存' : '已添加', icon: 'success' })
      setShowForm(false)
    }
  }

  const handleDelete = (p: Product) => {
    Dialog.open('del', {
      title: '删除商品',
      content: `确定删除「${p.name}」吗？`,
      onConfirm: async () => {
        await removeProduct(p.id)
        Dialog.close('del')
      },
      onCancel: () => Dialog.close('del'),
    })
  }

  return (
    <View className='product-manage-page'>
      <ScrollView scrollY className='list-scroll'>
        {!loading && products.length === 0 && (
          <Empty description='还没有商品，点右下角添加吧' />
        )}

        {products.map((p) => {
          const img = resolveImg(p.imageUrl)
          return (
            <View key={p.id} className={`product-card ${p.status === 'off' ? 'is-off' : ''}`}>
              <View className='card-img'>
                {img ? <Image className='img' src={img} mode='aspectFill' /> : <Text className='img-ph'>🍡</Text>}
                {p.isClearing && <Text className='clearing-badge'>清仓</Text>}
              </View>

              <View className='card-body'>
                <View className='card-top'>
                  <Text className='name'>{p.name}</Text>
                  {p.status === 'off' && <Tag type='default'>已下架</Tag>}
                </View>
                <View className='price-row'>
                  <Text className='price'>¥{p.price}</Text>
                  {p.originalPrice ? <Text className='origin'>¥{p.originalPrice}</Text> : null}
                  <Text className='stock'>库存 {p.stock}</Text>
                </View>
                {p.category ? <Text className='cate'>{p.category}</Text> : null}

                <View className='card-actions'>
                  <View className='switch-wrap'>
                    <Text className='switch-label'>{p.status === 'on' ? '上架中' : '已下架'}</Text>
                    <Switch
                      checked={p.status === 'on'}
                      onChange={(val) => toggleStatus(p.id, (val ? 'on' : 'off') as ProductStatus)}
                    />
                  </View>
                  <View className='btns'>
                    <Text className='link' onClick={() => openEdit(p)}>编辑</Text>
                    <Text className='link danger' onClick={() => handleDelete(p)}>删除</Text>
                  </View>
                </View>
              </View>
            </View>
          )
        })}
        <View className='list-bottom' />
      </ScrollView>

      {/* 悬浮新增按钮 */}
      <View className='fab' onClick={openCreate}>
        <Text className='fab-icon'>＋</Text>
      </View>

      {/* 新增/编辑表单 */}
      <Popup
        visible={showForm}
        position='bottom'
        round
        onClose={() => setShowForm(false)}
        style={{ height: '82vh' }}
      >
        <View className='form-popup'>
          <View className='form-header'>
            <Text className='form-cancel' onClick={() => setShowForm(false)}>取消</Text>
            <Text className='form-title'>{editingId ? '编辑商品' : '新增商品'}</Text>
            <Text className='form-save' onClick={handleSubmit}>保存</Text>
          </View>

          <ScrollView scrollY className='form-scroll'>
            {/* 图片 */}
            <View className='img-uploader' onClick={handleUpload}>
              {form.imageUrl ? (
                <Image className='preview' src={resolveImg(form.imageUrl)} mode='aspectFill' />
              ) : (
                <View className='uploader-ph'>
                  <Text className='ph-plus'>＋</Text>
                  <Text className='ph-text'>上传商品图</Text>
                </View>
              )}
            </View>

            <View className='field'>
              <Text className='label'>商品名称</Text>
              <Input placeholder='如：招牌炸鸡' value={form.name} maxLength={50}
                onChange={(v) => setField('name', v)} />
            </View>
            <View className='field'>
              <Text className='label'>售价（元）</Text>
              <Input type='digit' placeholder='0.00' value={form.price}
                onChange={(v) => setField('price', v)} />
            </View>
            <View className='field'>
              <Text className='label'>划线价（选填）</Text>
              <Input type='digit' placeholder='原价' value={form.originalPrice}
                onChange={(v) => setField('originalPrice', v)} />
            </View>
            <View className='field'>
              <Text className='label'>进货成本（选填，AI定价用）</Text>
              <Input type='digit' placeholder='成本价' value={form.costPrice}
                onChange={(v) => setField('costPrice', v)} />
            </View>
            <View className='field'>
              <Text className='label'>库存</Text>
              <Input type='number' placeholder='0' value={form.stock}
                onChange={(v) => setField('stock', v)} />
            </View>
            <View className='field'>
              <Text className='label'>分类（选填）</Text>
              <Input placeholder='如：经典单品' value={form.category} maxLength={20}
                onChange={(v) => setField('category', v)} />
            </View>
            <View className='field col'>
              <Text className='label'>商品描述（选填）</Text>
              <TextArea placeholder='口味、规格、特色…' value={form.description} maxLength={200}
                onChange={(v) => setField('description', v)} />
            </View>
            <View className='field row'>
              <Text className='label'>标记为清仓尾货</Text>
              <Switch checked={form.isClearing} onChange={(v) => setField('isClearing', v)} />
            </View>
            <View className='form-bottom' />
          </ScrollView>
        </View>
      </Popup>

      <Dialog id='del' />
    </View>
  )
}
