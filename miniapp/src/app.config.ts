export default defineAppConfig({
  // 主包：启动分发 + 我的（双角色入口）
  pages: [
    'pages/index/index',
    'pages/my/index',
  ],
  // 分包：顾客端 / 摊主端
  subPackages: [
    {
      root: 'packageCustomer',
      name: 'customer',
      pages: [
        'pages/home/index', // 地摊地图首页（Day6）
        'pages/stall-detail/index', // 摊位详情（Day7）
        'pages/reserve/index', // 预定下单（Day8）
        'pages/orders/index', // 我的预定（Day9）
        'pages/my-coupons/index', // 我的优惠券（Day10）
        'pages/wish-pool/index', // 许愿池（Day10）
      ],
    },
    {
      root: 'packageSeller',
      name: 'seller',
      pages: [
        'pages/stall-setting/index', // 摊位设置/开店（Day3）
        'pages/product-manage/index', // 商品管理（Day4）
        'pages/pricing/index', // AI 定价助手（Day5）
        'pages/order-manage/index', // 订单管理（Day9）
        'pages/coupon-manage/index', // 优惠券管理（Day10）
        'pages/groupbuy-manage/index', // 邻里拼团管理（模块三）
        'pages/stall-qrcode/index', // 聚合摆摊码（Day11）
        // 'pages/dashboard/index',      // 经营仪表盘（Day3+）
      ],
    },
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '地摊烟火小店',
    navigationBarTextStyle: 'black',
  },
  // 定位权限说明（getLocation 需要）
  permission: {
    'scope.userLocation': {
      desc: '用于展示附近的地摊与计算距离',
    },
  },
  requiredPrivateInfos: ['getLocation', 'chooseLocation'],
})
