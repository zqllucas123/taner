/**
 * 业务配置常量
 */

/** 微信云开发环境 ID */
export const CLOUD_ENV = 'cloud1-d3gur3ufb5d4de53e'

/** 摊位品类 */
export const STALL_CATEGORIES = [
  '小吃美食',
  '服饰饰品',
  '生鲜果蔬',
  '手工文创',
  '日用杂货',
] as const

/** 摊位状态映射 */
export const STALL_STATUS_MAP = {
  active: { text: '出摊中', color: '#07c160' },
  upcoming: { text: '即将出摊', color: '#ff976a' },
  offline: { text: '已收摊', color: '#969799' },
} as const

/** 订单状态映射 */
export const ORDER_STATUS_MAP = {
  pending: { text: '待处理', color: '#ff976a' },
  confirmed: { text: '已确认', color: '#1989fa' },
  completed: { text: '已完成', color: '#07c160' },
  cancelled: { text: '已取消', color: '#969799' },
  disputed: { text: '纠纷中', color: '#ee0a24' },
} as const

/** 主题色 */
export const THEME = {
  primary: '#07c160', // 微信绿
  secondary: '#ff976a', // 橙
  seller: '#ff976a', // 摊主端主色
  customer: '#07c160', // 顾客端主色
} as const
