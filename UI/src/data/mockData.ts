import { Stall, DailyLedger } from '../types';

export const INITIAL_STALLS: Stall[] = [
  {
    id: '1',
    name: '老周秘制铁板鱿鱼',
    ownerName: '周师傅',
    category: '小吃美食',
    status: 'active',
    statusText: '正在出摊（17:30 - Midnight）',
    location: '南门观光夜市中段 B15号位',
    coordinate: { x: 35, y: 48 },
    distance: '150米',
    rating: 4.9,
    vibeImage: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=400',
    vibeImageOptimized: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=400',
    出摊时间: '17:30 - 00:30',
    phone: '138****8823',
    description: '二十年老字号，秘制蒜蓉酱和麻辣酱，鱿鱼鲜嫩爆汁！线上提前预定，到店30秒手撕立提。',
    isHot: true,
    announcement: '📢 今晚九点后买十串送一串！新鲜穿制，数量有限先到先得。',
    products: [
      {
        id: '1-1',
        name: '招牌爆浆大鱿鱼 (串)',
        price: 15,
        originalPrice: 18,
        costPrice: 5.5,
        stock: 32,
        soldCount: 320,
        image: '🐙',
        category: '经典单品',
        tags: ['爆款', '酱汁浓郁', '微辣'],
        description: '精选深海大鱿鱼，铁板强火迅速锁水，刷上周师傅二十年秘制酱汁，一口爆浆。'
      },
      {
        id: '1-2',
        name: '香脆铁板鱿鱼须 (5串/份)',
        price: 25,
        originalPrice: 28,
        costPrice: 9.0,
        stock: 18,
        soldCount: 198,
        image: '🦑',
        category: '经典单品',
        tags: ['Q弹有劲', '香辣适度'],
        description: '鱿鱼须爽脆可口，加入洋葱爆香，炭火封风，下酒神料。'
      },
      {
        id: '1-3',
        name: '特供烤脑花',
        price: 18,
        originalPrice: 22,
        costPrice: 6.0,
        stock: 8,
        soldCount: 88,
        image: '🧠',
        category: '特色小吃',
        tags: ['限量', '香辣脑花'],
        description: '锡纸慢火烤制，红油香滑绵密，如豆腐般细腻，无腥味。'
      }
    ],
    coupons: [
      { id: 'c1-1', title: '到店惊喜满20减3', discount: 3, minSpend: 20, expiry: '2026-06-30', claimed: false, type: 'cash' },
      { id: 'c1-2', title: '推荐新客送鱿鱼串', discount: 5, minSpend: 30, expiry: '2026-06-25', claimed: false, type: 'gift' }
    ],
    wishes: [
      {
        id: 'w1-1',
        userName: '喵酱不爱吃香菜',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
        content: '想吃不辣的爆浆烤脑花，家里小盆友想吃！',
        date: '昨天 19:22',
        likes: 12,
        likedByUser: false,
        status: 'arrived',
        vendorReply: '安排！已研究出秘制鲜香不辣配方（原汤骨汁熬制），今晚来出摊点单即可。',
        vendorReplyDate: '今天 11:30'
      },
      {
        id: 'w1-2',
        userName: '打工人小王',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
        content: '能出个鱿鱼五花肉双拼双重快乐双拼套餐吗？两样都想吃！',
        date: '今天 01:15',
        likes: 28,
        likedByUser: true,
        status: 'preparing',
        vendorReply: '好建议！双星拼盘烤鱿鱼+秘制烤五花已经在备货了，预计明晚隆重推出，上线拼团活动！',
        vendorReplyDate: '今天 09:12'
      }
    ],
    groupBuys: [
      { id: 'g1-1', productName: '经典大鱿鱼双人组合套餐', price: 28, targetCount: 3, currentCount: 2, expiryHours: 4, users: ['喵酱', '小张'] }
    ]
  },
  {
    id: '2',
    name: '阿芳野百合鲜花铺',
    ownerName: '阿芳',
    category: '生鲜果蔬',
    status: 'active',
    statusText: '正在出摊（18:00 - 22:30）',
    location: '北环步行街岔路口花坛边',
    coordinate: { x: 58, y: 32 },
    distance: '320米',
    rating: 4.8,
    vibeImage: 'https://images.unsplash.com/photo-1508784785881-c9745e94aba5?auto=format&fit=crop&q=80&w=400',
    vibeImageOptimized: 'https://images.unsplash.com/photo-1490750967868-88aa4486c944?auto=format&fit=crop&q=80&w=400',
    出摊时间: '18:00 - 22:30',
    phone: '159****9234',
    description: '每日昆明空运直达花材，主打平价艺术切花与治愈系手作小花束！浪漫触手可得。线上选好在线留花，下班路过一秒带走。',
    isHot: true,
    announcement: '🌸 今日特惠：浅紫色碎冰蓝玫瑰，买一束送雏菊一瓶！',
    products: [
      {
        id: '2-1',
        name: '碎冰蓝治愈小花束',
        price: 19.9,
        originalPrice: 29,
        costPrice: 7.0,
        stock: 12,
        soldCount: 140,
        image: '💐',
        category: '特惠花束',
        tags: ['热卖', '昆明直发', '高颜值'],
        description: '碎冰蓝多头玫瑰配洋甘菊、落新妇，用浪漫蓝纸包裹，送给平淡日子里发光的你。'
      },
      {
        id: '2-2',
        name: '向阳而生向日葵单支装',
        price: 9.9,
        originalPrice: 15,
        costPrice: 3.5,
        stock: 25,
        soldCount: 310,
        image: '🌻',
        category: '简手扎',
        tags: ['平价必入', '元气满满'],
        description: '高饱和度金黄向日葵，搭配尤加利叶，配磨砂防水保护袋。'
      }
    ],
    coupons: [
      { id: 'c2-1', title: '领券满15减2', discount: 2, minSpend: 15, expiry: '2026-06-28', claimed: false, type: 'cash' }
    ],
    wishes: [
      {
        id: 'w2-1',
        userName: '粉红泡泡',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
        content: '想要那种装在小透明袋子里的迷你捕蝇草，可以消灭办公室飞虫，阿芳姐可以进一点吗？',
        date: '前天 14:10',
        likes: 15,
        likedByUser: false,
        status: 'pending'
      }
    ],
    groupBuys: [
      { id: 'g2-1', productName: '向日葵朝气三人拼单', price: 7.9, targetCount: 3, currentCount: 1, expiryHours: 12, users: ['莉莉安'] }
    ]
  },
  {
    id: '3',
    name: '大叔炭烤生蚝小海鲜',
    ownerName: '彪哥',
    category: '小吃美食',
    status: 'upcoming',
    statusText: '即将出摊（预计 19:30 出摊）',
    location: '南门观光夜市入口第一家',
    coordinate: { x: 22, y: 65 },
    distance: '480米',
    rating: 4.7,
    vibeImage: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=400',
    vibeImageOptimized: 'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?auto=format&fit=crop&q=80&w=400',
    出摊时间: '19:30 - Midnight',
    phone: '135****4422',
    description: '威海生蚝，现开现烤，蒜蓉多得堆不下！肥壮爆浆，一口入魂！',
    isHot: false,
    announcement: '🦪 正在路上拉鲜货，预计19:30准时生火！在线预定排单，免排队。',
    products: [
      {
        id: '3-1',
        name: '经典黄金蒜蓉烤生蚝 (半打6只)',
        price: 36,
        originalPrice: 45,
        costPrice: 14.0,
        stock: 50,
        soldCount: 420,
        image: '🦪',
        category: '精品烤物',
        tags: ['必点', '肥美多汁'],
        description: '湛江生蚝现点现开，特调压榨金蒜蓉，铺满粉丝，强炭火滋滋作响。'
      }
    ],
    coupons: [
      { id: 'c3-1', title: '生蚝首单尝鲜券减5', discount: 5, minSpend: 35, expiry: '2026-06-25', claimed: false, type: 'cash' }
    ],
    wishes: [
      {
        id: 'w3-1',
        userName: '暴饮暴食君',
        userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100',
        content: '大叔，可以预定活大蒸蚝（原味蒸）吗？保留生蚝原汁原味的甜，不要烤的！',
        date: '3天前',
        likes: 9,
        likedByUser: false,
        status: 'arrived',
        vendorReply: '买了一个不锈钢双层大蒸箱，今晚正式出原味高压锅高蒸蚝！绝对极品。',
        vendorReplyDate: '昨天'
      }
    ],
    groupBuys: []
  },
  {
    id: '4',
    name: '林妹妹手作古风发簪铺',
    ownerName: '林妹妹',
    category: '手工文创',
    status: 'offline',
    statusText: '已收摊 / 雨天打烊',
    location: '大唐不夜城文创街南口',
    coordinate: { x: 74, y: 55 },
    distance: '1.2公里',
    rating: 4.9,
    vibeImage: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400',
    vibeImageOptimized: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=400',
    出摊时间: '主打周末 15:00 - 21:00',
    phone: '139****7766',
    description: '纯手工绕线、蚕丝缠花簪子。支持线上选样看图定做，按需发快递或者下周出摊自提。',
    isHot: false,
    announcement: '🌧️ 今日下雨休息，线上网店照常接定制单，接簪娘来图定制。',
    products: [
      {
        id: '4-1',
        name: '手作绕金丝粉晶桃花簪',
        price: 58,
        originalPrice: 75,
        costPrice: 15,
        stock: 3,
        soldCount: 45,
        image: '🥢',
        category: '林林缠花',
        tags: ['纯天然桃花粉晶', '国风刺绣配饰'],
        description: '高档保色铜丝，手工缠粉红天然水晶石瓣，簪体温润流溢。定制期3天。'
      }
    ],
    coupons: [],
    wishes: [
      {
        id: 'w4-1',
        userName: '汉服同好阿娇',
        userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100',
        content: '林妹妹，能否做一款蓝色蝴蝶造型的流苏振袖流苏金凤簪？搭配我的明制大红色大袖衫！',
        date: '5天前',
        likes: 31,
        likedByUser: false,
        status: 'preparing',
        vendorReply: '完全可以！底座已经起样，正在手工串流苏珍珠。出摊后会带着让您看货。',
        vendorReplyDate: '前天'
      }
    ],
    groupBuys: []
  }
];

export const MOCK_LEDGERS: DailyLedger[] = [
  { date: '周一 06-15', revenue: 450, costs: 180, profit: 270, onlineOrders: 10, offlineOrders: 20 },
  { date: '周二 06-16', revenue: 520, costs: 210, profit: 310, onlineOrders: 14, offlineOrders: 25 },
  { date: '周三 06-17', revenue: 680, costs: 250, profit: 430, onlineOrders: 18, offlineOrders: 32 },
  { date: '周四 06-18', revenue: 890, costs: 310, profit: 580, onlineOrders: 24, offlineOrders: 40 },
  { date: '周五 06-19', revenue: 1450, costs: 520, profit: 930, onlineOrders: 45, offlineOrders: 72 },
  { date: '周六 06-20', revenue: 1980, costs: 680, profit: 1300, onlineOrders: 62, offlineOrders: 98 },
  { date: '周日 今天', revenue: 1250, costs: 420, profit: 830, onlineOrders: 38, offlineOrders: 59 },
];

export const WECHAT_MOCK_COMMUNITIES = [
  { id: 't1', userName: '爱吃香口的果果', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100', content: '南门夜市打卡【老周烤鱿鱼】！真的爆浆，大呼过瘾🌶️🌶️🌶️！比之前那些糊弄的烤串好太多！还可以线上预定直接省去排大长队，大家冲啊！', time: '2小时前', likes: 45, stallName: '老周秘制铁板鱿鱼', rating: 5 },
  { id: 't2', userName: '浪漫收集者-小鱼', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100', content: '路过北门拿到了阿芳家给我预留的碎冰蓝！巨好看，只要19.9还要什么自行车啊家人们，花材很新鲜，阿芳姐还送了一小把雏菊。', time: '4小时前', likes: 18, stallName: '阿芳野百合鲜花铺', rating: 5 },
  { id: 't3', userName: '生蚝爱好者007', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100', content: '彪哥生蚝没得说，真的是超级大。不过大叔出摊时间容易流动，看到小程序提示“正在出摊中”我才跑过来的。希望彪哥每天定点出摊！', time: '1天前', likes: 32, stallName: '大叔炭烤生蚝小海鲜', rating: 4 },
];
