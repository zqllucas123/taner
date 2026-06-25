/**
 * 云存储图片上传
 * chooseImage / chooseMedia 选图 → 压缩 → uploadFile 到 CloudBase 云存储 → 返回 fileID
 */
import Taro from '@tarojs/taro'

/** 上传单张本地图片到云存储，返回 fileID（cloud://...） */
export async function uploadImage(
  filePath: string,
  options: { dir?: string } = {},
): Promise<string> {
  const { dir = 'products' } = options
  const ext = filePath.split('.').pop()?.split('?')[0] || 'png'
  const cloudPath = `${dir}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`

  if (!Taro.cloud) {
    throw new Error('当前环境不支持云开发，无法上传图片')
  }

  const res = await Taro.cloud.uploadFile({ cloudPath, filePath })
  if (!res.fileID) {
    throw new Error('上传失败，未返回 fileID')
  }
  return res.fileID
}

/**
 * 选择并上传图片（一步到位）
 * @returns 云存储 fileID，用户取消则返回 null
 */
export async function chooseAndUploadImage(
  options: { dir?: string; count?: number } = {},
): Promise<string | null> {
  const { dir = 'products', count = 1 } = options
  try {
    const chooseRes = await Taro.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    const path = chooseRes.tempFilePaths?.[0]
    if (!path) return null

    Taro.showLoading({ title: '上传中...', mask: true })
    const fileID = await uploadImage(path, { dir })
    Taro.hideLoading()
    return fileID
  } catch (e: any) {
    Taro.hideLoading()
    // 用户主动取消不报错
    if (e?.errMsg && /cancel/.test(e.errMsg)) return null
    console.error('[upload] 选图/上传失败', e)
    Taro.showToast({ title: e?.message || '图片上传失败', icon: 'none' })
    return null
  }
}

/**
 * 把云存储 fileID 换成可访问的临时 URL（批量）
 * 用于列表展示 cloud:// 图片
 */
export async function getTempFileURLs(fileIDs: string[]): Promise<Record<string, string>> {
  const ids = fileIDs.filter((id) => id && id.startsWith('cloud://'))
  if (!ids.length || !Taro.cloud) return {}
  try {
    const res = await Taro.cloud.getTempFileURL({ fileList: ids })
    const map: Record<string, string> = {}
    res.fileList.forEach((f: any) => {
      if (f.fileID && f.tempFileURL) map[f.fileID] = f.tempFileURL
    })
    return map
  } catch (e) {
    console.error('[upload] getTempFileURL 失败', e)
    return {}
  }
}
