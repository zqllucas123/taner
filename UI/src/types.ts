export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  costPrice?: number; // For AI Pricing calculation
  stock: number;
  soldCount: number;
  image: string;
  category: string;
  tags: string[];
  description: string;
  aiSuggestedPrice?: number;
  aiReasoning?: string;
  isClearing?: boolean; // Tail stock mode
}

export interface Coupon {
  id: string;
  title: string;
  discount: number;
  minSpend: number;
  expiry: string;
  claimed: boolean;
  type: 'discount' | 'cash' | 'gift';
}

export interface Wish {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  date: string;
  likes: number;
  likedByUser?: boolean;
  status: 'pending' | 'preparing' | 'arrived' | 'declined';
  vendorReply?: string;
  vendorReplyDate?: string;
}

export interface GroupBuy {
  id: string;
  productName: string;
  price: number;
  targetCount: number;
  currentCount: number;
  expiryHours: number;
  users: string[];
}

export interface Stall {
  id: string;
  name: string;
  ownerName: string;
  category: '小吃美食' | '服饰饰品' | '生鲜果蔬' | '手工文创' | '日用杂货';
  status: 'active' | 'upcoming' | 'offline'; // 正在出摊, 即将出摊, 已收摊
  statusText: string;
  location: string;
  coordinate: { x: number; y: number }; // Percentage coordinate on simulated map
  distance: string; // e.g. "120m"
  rating: number;
  vibeImage: string; // Before AI optimization
  vibeImageOptimized: string; // After AI optimization
  出摊时间: string; // e.g. "18:00 - 24:00"
  phone: string;
  description: string;
  isHot: boolean;
  announcement: string;
  products: Product[];
  coupons: Coupon[];
  wishes: Wish[];
  groupBuys: GroupBuy[];
}

export interface DailyLedger {
  date: string;
  revenue: number;
  costs: number;
  profit: number;
  onlineOrders: number;
  offlineOrders: number;
}
