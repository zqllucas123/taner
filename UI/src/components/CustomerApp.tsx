import React, { useState } from 'react';
import { Stall, Product, Wish, Coupon, GroupBuy } from '../types';
import { INITIAL_STALLS, WECHAT_MOCK_COMMUNITIES } from '../data/mockData';
import { 
  MapPin, Navigation, Info, Flame, Search, FlameKindling, 
  ShoppingBag, Clock, Heart, PlusCircle, MessageSquarePlus, 
  Map, ThumbsUp, Tag, Star, Sparkles, User, Gift, ChevronRight, CheckCircle2, Users, Sliders, LogOut, ArrowLeftRight, Settings, Zap, Volume2, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerAppProps {
  stalls: Stall[];
  setStalls: React.Dispatch<React.SetStateAction<Stall[]>>;
  selectedStallId: string;
  setSelectedStallId: (id: string) => void;
  onAddNotification: (msg: string, type: 'info' | 'success' | 'warning') => void;
  activeMode?: 'customer' | 'seller';
  setActiveMode?: (mode: 'customer' | 'seller') => void;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({
  stalls,
  setStalls,
  selectedStallId,
  setSelectedStallId,
  onAddNotification,
  activeMode,
  setActiveMode
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'map' | 'shop' | 'square' | 'me'>('map');
  
  // Simulated Logged in status for Customer/User
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  
  // Custom states for user settings
  const [gpsLocationEnabled, setGpsLocationEnabled] = useState<boolean>(true);
  const [notifyNightStall, setNotifyNightStall] = useState<boolean>(true);
  const [couponExpiryNotify, setCouponExpiryNotify] = useState<boolean>(true);
  const [vibrateOnClaim, setVibrateOnClaim] = useState<boolean>(true);
  const [darkBackground, setDarkBackground] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  
  // Navigation & Route states
  const [plannedRoute, setPlannedRoute] = useState<boolean>(false);
  const [showAIVideoContrast, setShowAIVideoContrast] = useState<boolean>(false);
  const [sliderPosition, setSliderPosition] = useState<number>(50); // For AI background clean demo
  
  // Checkout modal state
  const [showReserveModal, setShowReserveModal] = useState<Product | null>(null);
  const [reserveNotes, setReserveNotes] = useState<string>('');
  const [reserveSuccessTicket, setReserveSuccessTicket] = useState<{ code: string; product: Product } | null>(null);

  // Wish modal state
  const [showWishModal, setShowWishModal] = useState<boolean>(false);
  const [newWishText, setNewWishText] = useState<string>('');

  // Selected stall object
  const currentStall = stalls.find(s => s.id === selectedStallId) || stalls[0];

  const handleClaimCoupon = (stallId: string, couponId: string) => {
    setStalls(prevStalls => {
      return prevStalls.map(s => {
        if (s.id === stallId) {
          return {
            ...s,
            coupons: s.coupons.map(c => c.id === couponId ? { ...c, claimed: true } : c)
          };
        }
        return s;
      });
    });
    onAddNotification("优惠券领取成功！到店付款或线上提交预留订单时自动抵扣 🧧", "success");
  };

  const handleLikeWish = (stallId: string, wishId: string) => {
    setStalls(prevStalls => {
      return prevStalls.map(s => {
        if (s.id === stallId) {
          return {
            ...s,
            wishes: s.wishes.map(w => {
              if (w.id === wishId) {
                const liked = !w.likedByUser;
                return {
                  ...w,
                  likedByUser: liked,
                  likes: liked ? w.likes + 1 : w.likes - 1
                };
              }
              return w;
            })
          };
        }
        return s;
      });
    });
  };

  const handleAddWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWishText.trim()) return;

    const newWish: Wish = {
      id: `w-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      userName: '微信匿名摊友',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
      content: newWishText,
      date: '刚刚',
      likes: 1,
      likedByUser: true,
      status: 'pending'
    };

    setStalls(prevStalls => {
      return prevStalls.map(s => {
        if (s.id === currentStall.id) {
          return {
            ...s,
            wishes: [newWish, ...s.wishes]
          };
        }
        return s;
      });
    });

    onAddNotification(`在【${currentStall.name}】许愿成功！摊主听到愿望敲锣后会在线回复您。🌟`, "success");
    setNewWishText('');
    setShowWishModal(false);
  };

  const handleJoinGroupBuy = (groupBuyId: string) => {
    setStalls(prevStalls => {
      return prevStalls.map(s => {
        if (s.id === currentStall.id) {
          return {
            ...s,
            groupBuys: s.groupBuys.map(gb => {
              if (gb.id === groupBuyId) {
                if (gb.users.includes('你')) return gb;
                return {
                  ...gb,
                  currentCount: gb.currentCount + 1,
                  users: [...gb.users, '你']
                };
              }
              return gb;
            })
          };
        }
        return s;
      });
    });
    onAddNotification("成功加入拼单！成团后将在出摊现场领取 👥", "success");
  };

  const handleReserveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReserveModal) return;

    // Simulate order
    const ticketCode = `PICK-${Math.floor(1000 + Math.random() * 9000)}`;
    setReserveSuccessTicket({
      code: ticketCode,
      product: showReserveModal
    });

    // Reduce stock
    setStalls(prevStalls => {
      return prevStalls.map(s => {
        if (s.id === currentStall.id) {
          return {
            ...s,
            products: s.products.map(p => p.id === showReserveModal.id ? { ...p, stock: Math.max(0, p.stock - 1), soldCount: p.soldCount + 1 } : p)
          };
        }
        return s;
      });
    });

    onAddNotification(`线上自提预订成功！微信提货单号已生成：${ticketCode} 提货付款 🚀`, "success");
    setNoteMessage(`恭喜！您成功预留了 ${showReserveModal.name}，可凭该条码前往线下摊位提货！`);
  };

  const [noteMessage, setNoteMessage] = useState('');

  const filteredStalls = stalls.filter(s => {
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    const matchesSearch = s.name.toLowerCase().includes(searchText.toLowerCase()) || 
                          s.products.some(p => p.name.toLowerCase().includes(searchText.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col h-full bg-slate-50 text-slate-800">
        <div className="bg-emerald-850 text-white p-4 sticky top-0 flex items-center justify-between z-10 shadow-xs select-none">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏕️</span>
            <span className="text-xs font-black">地摊游园会 • 市民登录</span>
          </div>
          <button 
            type="button"
            onClick={() => {
              if (setActiveMode) {
                setActiveMode('seller');
                onAddNotification("已切到摊主后台 🏪", "info");
              }
            }}
            className="text-[9px] bg-emerald-700/80 hover:bg-emerald-600 font-bold px-2 py-1 rounded"
          >
            切换到摊主端
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl" />
          
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-3xl flex items-center justify-center text-3xl shadow-sm mb-4">
            🏕️
          </div>
          <h2 className="text-sm font-black text-slate-800 tracking-tight font-sans text-center mb-1">
            地摊智多星 • 游园市民端
          </h2>
          <p className="text-[10px] text-slate-400 text-center mb-6 max-w-[240px]">
            线上云逛街领券，免定金零成本美食预订，摊位现场极速自提
          </p>

          <div className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-3.5">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 block font-black">手机号码</label>
              <div className="flex gap-2 bg-slate-50 border rounded-xl p-2 items-center">
                <span className="text-xs text-slate-400 font-bold border-r pr-2 shrink-0">+86</span>
                <input 
                  type="tel" 
                  placeholder="微信预留手机号" 
                  defaultValue="13999998888"
                  className="w-full bg-transparent text-xs outline-none text-slate-800 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 block font-black">验证码</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-50 border rounded-xl p-2 items-center flex">
                  <input 
                    type="text" 
                    placeholder="4位验证码" 
                    maxLength={4} 
                    defaultValue="8888"
                    className="w-full bg-transparent text-xs outline-none text-slate-800 font-bold"
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => onAddNotification("验证码已模拟发送，请输入 8888 🚀", "info")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] px-2.5 font-bold rounded-xl transition-all border border-slate-200"
                >
                  模拟获取
                </button>
              </div>
            </div>

            <div className="text-[9px] text-amber-600/90 leading-normal bg-amber-50 p-2.5 rounded-lg border border-amber-100/60 font-medium">
              💡 演示系统：已自动填充市民测试账号，可点击下方一键授权微信登录！
            </div>

            <button 
              type="button"
              onClick={() => {
                setIsLoggedIn(true);
                onAddNotification("欢迎来到地摊游园街区！🏕️ 现在可以领取优惠券、实时许愿啦！", 'success');
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-3xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              登录进入游园会
            </button>

            <button 
              type="button"
              onClick={() => {
                setIsLoggedIn(true);
                onAddNotification("市民微信免密授权成功！🏖️ 一起去逛逛好吃的吧！", 'success');
              }}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-extrabold py-2 rounded-xl text-xs border border-slate-200 flex justify-center items-center gap-1.5 active:scale-98 transition-all"
            >
              <span className="text-sm">💬</span>
              <span>微信一键免密授权</span>
            </button>
          </div>

          <div className="text-[8px] text-slate-400 mt-8 text-center leading-normal">
            授权即同意《游玩安全与社区健康互助契约》
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Search Header for Client page */}
      {activeSubTab === 'map' && (
        <div className="bg-white/95 sticky top-0 px-4 py-2 flex flex-col gap-2 shadow-xs z-30-important">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="搜索夜市招牌/冷面/大生蚝..." 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-slate-100 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>
          
          {/* Quick categories scrollable */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', name: '全部烟火气' },
              { id: '小吃美食', name: '🍢 小吃美食' },
              { id: '生鲜果蔬', name: '🌸 生鲜果蔬' },
              { id: '手工文创', name: '🏮 手工文创' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`text-[11px] shrink-0 px-3 py-1 rounded-full border transition-all ${
                  categoryFilter === cat.id 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium' 
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Screen according to active sub tab */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'map' && (
          <div className="p-4 flex flex-col gap-4">
            
            {/* Visual Mini Map Showcase (Visual representation of street sweeps) */}
            <div className="bg-slate-900 h-64 rounded-2xl relative overflow-hidden flex flex-col border border-slate-800 shadow-inner">
              
              {/* Simulated Map Background */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Grid Roads simulation */}
              <div className="absolute inset-0 select-none pointer-events-none">
                <svg className="w-full h-full text-slate-700 stroke-1 stroke-current" fill="none">
                  {/* Road Grid lines */}
                  <line x1="10%" y1="0%" x2="10%" y2="100%" />
                  <line x1="50%" y1="0%" x2="50%" y2="100%" strokeWidth="2" strokeDasharray="4 2" />
                  <line x1="90%" y1="0%" x2="90%" y2="100%" />
                  <line x1="0%" y1="40%" x2="100%" y2="40%" strokeWidth="3" />
                  <line x1="0%" y1="75%" x2="100%" y2="75%" />
                  
                  {/* Street Label */}
                  <text x="25" y="112" fill="#94a3b8" fontSize="10" transform="rotate(-90 25 112)">南门步行街</text>
                  <text x="175" y="88" fill="#e2e8f0" fontSize="11" fontWeight="bold">热闹夜市街</text>
                  <text x="350" y="270" fill="#94a3b8" fontSize="10" transform="rotate(-90 350 270)">北环辅路</text>
                  
                  {/* AI planned Route Overlay line */}
                  {plannedRoute && (
                    <path 
                      d="M 136,122 L 226,81 L 288,140" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="4" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="animate-pulse"
                    />
                  )}
                </svg>
              </div>

              {/* Firefly/Flares indicating Stalls on Map */}
              {stalls.map(s => {
                const isActive = s.id === selectedStallId;
                const statusColors = {
                  active: 'bg-rose-500 shadow-rose-500/80 animate-bounce',
                  upcoming: 'bg-amber-500 shadow-amber-500/80',
                  offline: 'bg-slate-500 shadow-slate-500/80'
                };
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStallId(s.id);
                      onAddNotification(`正在定位：${s.name} ${s.distance}`, 'info');
                    }}
                    style={{ left: `${s.coordinate.x}%`, top: `${s.coordinate.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 select-none group transition-all"
                  >
                    {/* Glowing pulse ring */}
                    <span className="absolute inline-flex h-6 w-6 rounded-full bg-emerald-400 opacity-20 group-hover:opacity-60 transition-opacity animate-ping" />
                    
                    {/* Marker Pin Icon */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 ${isActive ? 'scale-115 border-white ring-4 ring-emerald-500/40' : 'border-slate-800'} ${statusColors[s.status]}`}>
                      {s.id}
                    </div>
                    
                    {/* Little tag */}
                    <span className={`px-1.5 py-0.5 rounded shadow text-[9px] -mt-1 ${isActive ? 'bg-emerald-500 text-white font-bold pb-1 scale-102 transition-all' : 'bg-slate-900 border border-slate-700 text-slate-200'}`}>
                      {s.name.substring(0, 4)}..
                    </span>
                  </button>
                );
              })}

              {/* Status bar inside map */}
              <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur rounded-lg px-2.5 py-1.5 text-[10px] text-slate-300 flex justify-between items-center border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span>全城在线摊位: <strong className="text-white">3</strong> 个</span>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setPlannedRoute(!plannedRoute);
                      if(!plannedRoute) {
                        onAddNotification("已为您优选『夜市人气探店路线』！避开拥堵，100%覆盖高口碑地摊。🍲", "success");
                      }
                    }}
                    className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${plannedRoute ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700'}`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {plannedRoute ? "已规划路线" : "AI 逛街寻宝推荐"}
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Stall Preview Card (Simulating high visual fidelity with dynamic street-sweep visual switcher) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      # {currentStall.id} {currentStall.category}
                    </span>
                    
                    {currentStall.status === 'active' ? (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold animate-pulse-slow">
                        <Flame className="w-2.5 h-2.5 text-red-500" />
                        出摊中
                      </span>
                    ) : currentStall.status === 'upcoming' ? (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                        ⏱️ 即将出摊
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        🌧️ 打烊中
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-base font-bold text-slate-900 mt-1">{currentStall.name}</h3>
                  
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentStall.location}</span>
                    <span className="text-slate-300">|</span>
                    <span className="font-mono text-emerald-600 font-medium">距您 {currentStall.distance}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-amber-500 flex items-center gap-0.5 font-bold text-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {currentStall.rating.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-slate-400">出摊:{currentStall.出摊时间}</span>
                </div>
              </div>

              {/* Real-vibe Contrast Gallery. Demonstrating before/after AI optimization */}
              <div className="bg-slate-100 rounded-xl overflow-hidden relative group">
                <img 
                  src={showAIVideoContrast ? currentStall.vibeImageOptimized : currentStall.vibeImage} 
                  alt="Street look" 
                  className="w-full h-40 object-cover"
                />
                
                {/* Visual Label overlay */}
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur rounded-md px-1.5 py-0.5 text-[10px] text-white flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span>{showAIVideoContrast ? "AI去杂乱优化实景 (高清晰、环境美化)" : "线下杂乱地摊原相机实景"}</span>
                </div>

                {/* Switcher Button */}
                <button
                  onClick={() => {
                    setShowAIVideoContrast(!showAIVideoContrast);
                    onAddNotification(showAIVideoContrast ? "切换至实景" : "切换至AI去杂乱优化照片（自动纠偏、色调过滤）", 'info');
                  }}
                  className="absolute bottom-2 right-2 bg-emerald-600/95 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <Sliders className="w-3 h-3" />
                  {showAIVideoContrast ? "查看原照" : "AI净化去杂乱"}
                </button>
              </div>

              {/* Mini announcement block */}
              <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-2 text-xs text-amber-800">
                {currentStall.announcement}
              </div>

              <div className="flex gap-2 mt-1">
                <button 
                  onClick={() => {
                    setActiveSubTab('shop');
                    onAddNotification(`已为您进入【${currentStall.name}】的线上极简菜单`, 'success');
                  }}
                  className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs hover:bg-emerald-700 active:scale-98 transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>云逛小店 / 在线预订</span>
                </button>
                
                <button 
                  onClick={() => {
                    onAddNotification(`正在调用系统导航，高精纠偏定位已传输！即将前往:${currentStall.name} 📍`, 'success');
                  }}
                  className="px-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center"
                  title="一键导航到摊位"
                >
                  <Navigation className="w-4 h-4 text-emerald-600" />
                </button>
              </div>
            </div>

            {/* AI Street Ranking & Hot Zone List (对标高德扫街真实榜单) */}
            <div className="flex flex-col gap-2.5 mt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FlameKindling className="w-4 h-4 text-rose-500 animate-pulse" />
                  AI 夜市热力＆逛市榜单 (零刷量)
                </h4>
                <div className="text-[10px] text-slate-400">实时更新</div>
              </div>

              <div className="flex flex-col gap-2">
                {stalls.slice(0, 3).map((item, index) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setSelectedStallId(item.id);
                      onAddNotification(`查看排行榜第 ${index + 1} 位店铺 - ${item.name}`, 'info');
                    }}
                    className={`flex items-center gap-3 p-3 bg-white rounded-xl border transition-all cursor-pointer ${
                      item.id === selectedStallId 
                        ? 'border-emerald-500 bg-emerald-50/30' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-slate-100 text-slate-600' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800 truncate">{item.name}</span>
                        {item.isHot && <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded">爆火</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate -mt-0.5">
                        最新打卡：{item.wishes[0]?.userName || "附近居民"} 等100+人好评
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold text-rose-500 block">
                        {(9.8 - index * 0.3).toFixed(1)} 分
                      </span>
                      <span className="text-[9px] text-slate-400">{item.distance}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Guide Info */}
            <div className="bg-slate-200/50 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed">
              💡 <strong>微信使用习惯适配：</strong>顾客端聚焦“附近烟火”，支持一键导航拒绝跑空，AI智能把原本杂乱无章的流动摊位转为规范可见的线上卡片。
            </div>
            
          </div>
        )}

        {activeSubTab === 'shop' && (
          <div className="flex flex-col gap-3 pb-8">
            
            {/* Store Top banner */}
            <div className="bg-emerald-600 text-white p-4 pt-5 relative">
              <div className="absolute top-2 right-2 flex gap-1">
                <span className="text-[10px] bg-black/20 text-white px-2 py-0.5 rounded">
                  {currentStall.category}
                </span>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded">
                  ★ {currentStall.rating.toFixed(1)}
                </span>
              </div>
              <h2 className="text-lg font-bold">{currentStall.name}</h2>
              <p className="text-xs text-white/80 mt-1 lines-clamp-2">{currentStall.description}</p>
              
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/20 pt-2.5 text-xs text-white/90">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>营业时间：{currentStall.出摊时间}</span>
                </div>
                <div className="text-emerald-100 font-bold">
                  {currentStall.distance} 米
                </div>
              </div>
            </div>

            {/* Coupons section */}
            {currentStall.coupons.length > 0 && (
              <div className="px-4 py-1 flex flex-col gap-1.5">
                <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-rose-500" />
                  <span>到店/预留可用优惠券 (点击一键领取)</span>
                </div>
                
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {currentStall.coupons.map((c) => (
                    <div 
                      key={c.id}
                      onClick={() => !c.claimed && handleClaimCoupon(currentStall.id, c.id)}
                      className={`flex rounded-lg overflow-hidden border shrink-0 text-xs shadow-3xs cursor-pointer select-none transition-all ${
                        c.claimed 
                          ? 'bg-slate-100 border-slate-200 text-slate-400' 
                          : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                      }`}
                    >
                      <div className={`p-2 font-bold px-3 text-center border-r border-dashed border-rose-200 flex flex-col justify-center`}>
                        <span className="text-sm font-black underline-offset-1">￥{c.discount}</span>
                      </div>
                      <div className="p-2 flex flex-col justify-center">
                        <p className="font-bold text-[10px] truncate max-w-[120px]">{c.title}</p>
                        <p className="text-[10px] text-slate-400">满￥{c.minSpend}可用</p>
                      </div>
                      <div className={`text-[9px] font-bold py-1 px-2.5 flex items-center ${c.claimed ? 'bg-slate-200 text-slate-500' : 'bg-rose-600 text-white'}`}>
                        {c.claimed ? "已领" : "领取"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simulated Ticket after success reservation */}
            {reserveSuccessTicket && (
              <div className="mx-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col. shrink-0 shadow-sm relative overflow-hidden">
                <div className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rotate-12">
                  ✓ 预定成功
                </div>
                <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  线下自提凭证 (到店无接触提货付款)
                </h4>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded border border-emerald-100 flex items-center justify-center font-black text-emerald-700 text-xl font-mono shadow-xs">
                    {reserveSuccessTicket.code.slice(-4)}
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-medium text-slate-800">商品: <span className="font-bold">{reserveSuccessTicket.product.name}</span></p>
                    <p className="text-slate-500">价格: <span className="text-emerald-700 font-bold">￥{reserveSuccessTicket.product.price}</span> (提货付款)</p>
                    <p className="text-[10px] text-emerald-700 bg-white/60 inline-block px-1.5 py-0.5 rounded-md mt-1">
                      ⚠️ 默认保留24小时，过时自动取消不扣违约金
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setReserveSuccessTicket(null)}
                  className="mt-3 w-full bg-emerald-600/10 text-emerald-700 font-bold py-1.5 rounded-lg text-[11px] hover:bg-emerald-600/20 active:scale-95 transition-all text-center"
                >
                  关闭凭证 (可在订单中查看)
                </button>
              </div>
            )}

            {/* neighborhood mini group purchases (邻里拼团) */}
            {currentStall.groupBuys && currentStall.groupBuys.length > 0 && (
              <div className="mx-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-amber-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-orange-950 flex items-center gap-1">
                    <Users className="w-4 h-4 text-orange-600" />
                    发起的邻里拼团 (2-3成团)
                  </span>
                  <span className="text-[10px] text-orange-800">成团即享超低价</span>
                </div>

                {currentStall.groupBuys.map((gb) => {
                  const hasJoined = gb.users.includes('你');
                  return (
                    <div key={gb.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg shadow-3xs">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{gb.productName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-black text-orange-600">￥{gb.price}</span>
                          <span className="text-[9px] text-slate-400">差 {gb.targetCount - gb.currentCount} 人成团</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-400 font-mono">还剩11小时</span>
                        <button
                          onClick={() => handleJoinGroupBuy(gb.id)}
                          disabled={hasJoined}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                            hasJoined 
                              ? 'bg-slate-100 text-slate-400' 
                              : 'bg-orange-500 hover:bg-orange-600 text-white shadow-3xs'
                          }`}
                        >
                          {hasJoined ? "已在拼单" : "一键参团"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Menu of Products */}
            <div className="px-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="text-xs font-bold text-slate-700">在售商品 ({currentStall.products.length})</span>
                <span className="text-[10px] text-slate-400">30秒预订 • 线下提货扫码付</span>
              </div>

              <div className="flex flex-col gap-3">
                {currentStall.products.map((p) => (
                  <div key={p.id} className="flex gap-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-3xs relative overflow-hidden">
                    
                    {p.isClearing && (
                      <div className="absolute top-0 right-0 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl">
                        当日清仓
                      </div>
                    )}
                    
                    {/* Visual representation of item */}
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-3xl shrink-0 shadow-3xs">
                      {p.image}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{p.name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 truncate mt-0.5">{p.description}</p>
                        
                        <div className="flex gap-1.5 mt-1 overflow-hidden">
                          {p.tags.map((t, idx) => (
                            <span key={idx} className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-md">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-end mt-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-black text-rose-500">￥{p.price}</span>
                          {p.originalPrice && (
                            <span className="text-[9px] text-slate-400 line-through">￥{p.originalPrice}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-400 font-sans">余 {p.stock}</span>
                          <button
                            onClick={() => setShowReserveModal(p)}
                            disabled={p.stock === 0}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold ${
                              p.stock === 0 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all shadow-3xs'
                            }`}
                          >
                            {p.stock === 0 ? "售空" : "到店自提预约"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DUAL WISH POOL (双向许愿池) */}
            <div className="mt-4 mx-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <FlameKindling className="w-4 h-4 text-emerald-600 animate-pulse" />
                    【{currentStall.name}】的许愿池
                  </span>
                  <p className="text-[10px] text-slate-400">想要吃什么、要什么款式发在这里，摊主会安排！</p>
                </div>
                
                <button
                  onClick={() => setShowWishModal(true)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>我也许愿</span>
                </button>
              </div>

              {/* Wish instances list */}
              <div className="flex flex-col gap-2.5 mt-1.5">
                {currentStall.wishes.map((w) => (
                  <div key={w.id} className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5">
                        <img src={w.userAvatar} alt="user" className="w-5 h-5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        <span className="text-[10px] font-bold text-slate-700">{w.userName}</span>
                        <span className="text-[8px] text-slate-400 font-mono">{w.date}</span>
                      </div>
                      
                      <button 
                        onClick={() => handleLikeWish(currentStall.id, w.id)}
                        className={`flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${
                          w.likedByUser 
                            ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold' 
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${w.likedByUser ? 'fill-rose-500' : ''}`} />
                        <span>{w.likes}</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-600 pl-0.5">{w.content}</p>

                    {/* Stallholder replies */}
                    {w.vendorReply ? (
                      <div className="bg-emerald-50/50 border-l-2 border-emerald-500 p-2 text-[10px] text-emerald-800 space-y-1 rounded-r-md">
                        <div className="flex justify-between items-center bg-emerald-100/30 px-1 py-0.5 rounded">
                          <span className="font-bold flex items-center gap-1 text-[9px] text-emerald-700">
                            👨‍🍳 摊主回馈答复：
                          </span>
                          <span className="text-[8px] text-slate-400">{w.vendorReplyDate}</span>
                        </div>
                        <p className="leading-relaxed font-sans">{w.vendorReply}</p>
                      </div>
                    ) : (
                      <div className="p-1 pl-1 flex items-center gap-1 bg-amber-50/50 rounded border border-dashed border-amber-100/50">
                        <span className="text-[8px] text-amber-700 font-bold">📢 备货筹备中... 已同步至摊主AI分析后台</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 text-center text-[10px] text-slate-400 mt-2">
              —— 已经是小店最底部了 ——
            </div>

          </div>
        )}

        {activeSubTab === 'square' && (
          <div className="p-4 flex flex-col gap-4">
            
            {/* Vibe Sweep intro banner */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow bg-[linear-gradient(220deg,rgb(49,46,129)_0%,rgb(15,23,42)_100%)] relative">
              <div className="absolute right-3 bottom-1 text-4xl opacity-15">🍢</div>
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-white">
                <Sparkles className="w-4 h-4 text-amber-400" />
                全民探店扫街广场
              </h3>
              <p className="text-[10px] text-slate-300 leading-normal mt-1">
                到线下夜市地摊买小吃/发饰，现场拍照发打卡，每次获得小店 50 积分！可直接兑换现金提货券。免费帮小摊主们留住同城回头客！
              </p>
            </div>

            {/* User post cards */}
            <div className="flex flex-col gap-3.5">
              {WECHAT_MOCK_COMMUNITIES.map((post) => (
                <div key={post.id} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-3xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={post.avatar} alt="User Avatar" className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-800 leading-none">{post.userName}</h4>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{post.time}</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0">
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        📌 {post.stallName.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-sans mt-1">
                    {post.content}
                  </p>

                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      ★ 已核销：已赚得50积分
                    </span>
                    
                    <button 
                      onClick={() => onAddNotification("点赞成功，已为推荐人打榜！👍", "success")}
                      className="flex items-center gap-1 text-[10px] hover:text-rose-500 transition-colors bg-slate-50 px-2 py-1 rounded"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                      <span>{post.likes} 赞</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Seed mock button */}
            <button
              onClick={() => onAddNotification("请先点左侧 of 『线上小店-自提预约』购买物品，核销后即可上传晒图 📸", "warning")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs flex justify-center items-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>我也发一条实拍探店打卡 (赢优惠券)</span>
            </button>
          </div>
        )}

        {activeSubTab === 'me' && (
          <div className="p-4 flex flex-col gap-4">
            {/* Header User Card */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120" 
                  alt="Avatar" 
                  className="w-12 h-12 rounded-full border-2 border-white object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">微信游客_周生</span>
                    <span className="text-[8px] bg-white/20 px-1.5 py-0.2 rounded-full text-white/90">
                      金牌探店客
                    </span>
                  </div>
                  <p className="text-[10px] text-teal-100 font-mono mt-0.5">qi.liang.zhou123@gmail.com</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-black/15 text-emerald-100 px-2 py-0.5 rounded-full block">
                  Lv.3 地摊粉
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-3xs text-center select-none">
              <button 
                onClick={() => onAddNotification("您的消费积分已为您同步记账，100积分可兑换5元优惠券 🧧", "success")}
                className="flex flex-col items-center justify-center p-1 active:scale-95 transition-all outline-none"
              >
                <span className="text-lg font-black text-slate-800 font-semibold">150</span>
                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-0.5 justify-center">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                  我的积分
                </span>
              </button>
              <button 
                onClick={() => onAddNotification("您目前拥有2张未使用的地摊核销代金券！🎫", "info")}
                className="flex flex-col items-center justify-center p-1 border-x border-slate-100 active:scale-95 transition-all outline-none"
              >
                <span className="text-lg font-black text-slate-800 font-semibold">2张</span>
                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-0.5 justify-center">
                  <Tag className="w-3 h-3 text-rose-500" />
                  优惠券
                </span>
              </button>
              <button 
                onClick={() => {
                  if (reserveSuccessTicket) {
                    onAddNotification("您当下有一笔在【手抓大鱿鱼】处预约自提的未完结订单 🍢", "info");
                  } else {
                    onAddNotification("您还没有在任何线上小店预留自提订单，去逛逛挑选一个吧！", "info");
                  }
                }}
                className="flex flex-col items-center justify-center p-1 active:scale-95 transition-all outline-none"
              >
                <span className="text-lg font-black text-slate-800 font-semibold">{reserveSuccessTicket ? 1 : 0}个</span>
                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-0.5 justify-center">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  自提预约
                </span>
              </button>
            </div>

            {/* ACTIVE RESERVATION CARD */}
            <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-3xs space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-start">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>我的已预订地摊提货凭证</span>
              </h4>

              {reserveSuccessTicket ? (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 flex flex-col gap-2 relative overflow-hidden text-left">
                  <div className="absolute top-0 right-0 bg-amber-500 text-slate-900 text-[8px] font-bold px-2 py-0.5 rounded-bl">
                    待到店自提
                  </div>

                  <div className="flex gap-2.5 items-center">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-xl shadow-3xs shrink-0">
                      {reserveSuccessTicket.product.image}
                    </div>
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-800">{reserveSuccessTicket.product.name}</h5>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        预约备注: {reserveNotes || <span className="italic text-slate-300">无备注要求</span>}
                      </p>
                    </div>
                  </div>

                  {/* Aesthetic Simulated Barcode with Line styles */}
                  <div className="bg-white border rounded-lg p-2.5 flex flex-col items-center justify-center gap-1 mt-1">
                    <span className="text-[10px] font-mono tracking-widest text-slate-800 font-extrabold">
                      {reserveSuccessTicket.code}
                    </span>
                    {/* Visual Barcode bars */}
                    <div className="flex h-6 justify-center items-stretch w-full max-w-[165px] opacity-80 gap-[1.5px]">
                      {Array.from({ length: 28 }).map((_, i) => {
                        const randomWidth = i % 2 === 0 ? (i % 3 === 0 ? 'w-[4px]' : 'w-[2px]') : 'w-[1px]';
                        const isWhite = i % 5 === 0;
                        return (
                          <div 
                            key={i} 
                            className={`${isWhite ? 'bg-transparent' : 'bg-slate-950'} ${randomWidth} h-full`} 
                          />
                        );
                      })}
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1">
                      提货规则: 到店出示此码, 核销无误后当场扫微信付款。
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-5 px-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-[11px] text-slate-400 leading-normal">
                    💡 您在【云逛小店】中预约的食物会同步出现在这里。免缴定金、极简自提核销保障！
                  </p>
                </div>
              )}
            </div>

            {/* DUAL ROLE SWITCHER CARD - USER REQUEST FOCUS! */}
            <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-3xs space-y-3.5 text-left">
              <div className="flex items-center gap-1.5 border-b pb-2">
                <Settings className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 font-sans">本地系统与用户设置</span>
              </div>

              <div className="divide-y divide-slate-100">
                
                {/* Switch Perspective Toggle (Perfect space saving) */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-700 block">切换至摊主工作台</span>
                      <span className="text-[9px] text-slate-400 block">一键管理菜品、查看AI黄金定价和语音改价</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (setActiveMode) {
                        setActiveMode('seller');
                        onAddNotification("已切到：摊主管理端工作台 🏪！已自动同步买家数据和最新心愿列表。", "success");
                      }
                    }}
                    className="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 bg-amber-500 hover:bg-amber-600 active:scale-95"
                  >
                    <span className="translate-x-5 pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200" />
                  </button>
                </div>

                {/* GPS High Precision Toggle */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-700 block">开启高精度实时定位</span>
                      <span className="text-[9px] text-slate-400 block">用于街角推荐、精准步道和附近地摊定位</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGpsLocationEnabled(!gpsLocationEnabled);
                      onAddNotification(`街角高精定位服务已${!gpsLocationEnabled ? '开启' : '关闭'}`, 'info');
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 active:scale-95 ${
                      gpsLocationEnabled ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                      gpsLocationEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Night Stall Push Notification Toggle */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-700 block">心仪摊主开摊智能微信提示</span>
                      <span className="text-[9px] text-slate-400 block">关注的主理人雷雨天或节假日临时变动，提前获知</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifyNightStall(!notifyNightStall);
                      onAddNotification(`摊主临时变动动态推送已${!notifyNightStall ? '开启' : '关闭'}`, 'info');
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 active:scale-95 ${
                      notifyNightStall ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                      notifyNightStall ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Coupon Expiry Toggle */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-rose-500 shrink-0" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-700 block">优惠券临期失效微信振动提请</span>
                      <span className="text-[9px] text-slate-400 block">优惠券临近失效时推送免白零钱打折预警</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCouponExpiryNotify(!couponExpiryNotify);
                      onAddNotification(`优惠券到期微信提示已${!couponExpiryNotify ? '开启' : '关闭'}`, 'info');
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 active:scale-95 ${
                      couponExpiryNotify ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                      couponExpiryNotify ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Vibrate on Claim Toggle */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-sky-500 shrink-0" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-700 block">抢券或许愿成功极速触感微震</span>
                      <span className="text-[9px] text-slate-400 block">微信端内振动作业提示反馈</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVibrateOnClaim(!vibrateOnClaim);
                      onAddNotification(`微信微震提示已${!vibrateOnClaim ? '开启' : '关闭'}`, 'info');
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 active:scale-95 ${
                      vibrateOnClaim ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                      vibrateOnClaim ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Dark Background Mode */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-700 block">深夜逛街低柔护眼环境</span>
                      <span className="text-[9px] text-slate-400 block">微光深夜逛吃不刺眼</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDarkBackground(!darkBackground);
                      onAddNotification(`深夜护眼环境调暗已${!darkBackground ? '开启' : '关闭'}`, 'success');
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 active:scale-95 ${
                      darkBackground ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                      darkBackground ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

              </div>
              
              {/* Reset memory and clear cache utilities */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                <div className="text-[9px] text-slate-400 leading-normal">
                  本地清理将重置优惠券领取、打卡记录。
                </div>
                <button
                  type="button"
                  onClick={() => onAddNotification("微信端本地核心数据及地摊打卡缓存清理完毕 ✔", "success")}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold py-1 px-2 rounded text-[9px] shrink-0 active:scale-95 transition-all"
                >
                  本地清理
                </button>
              </div>
            </div>

            {/* Logout button Customer Side */}
            <button
              type="button"
              onClick={() => {
                setIsLoggedIn(false);
                onAddNotification("已安全退出当前的市民账号！📴", "warning");
              }}
              className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-extrabold py-3 rounded-2xl text-xs flex justify-center items-center gap-2 transition-all shadow-3xs active:scale-98 mb-6"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="font-sans">退出当前的市民账号登录</span>
            </button>

            <p className="text-center text-[9px] text-slate-300">
              地摊经济轻量级商户方案 • Version 1.2.0
            </p>
          </div>
        )}
      </div>

      {/* Reservation Checkout Dialog modal */}
      <AnimatePresence>
        {showReserveModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-3xs flex items-end justify-center z-50">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white rounded-t-3xl w-full max-h-[90%] overflow-y-auto p-4 flex flex-col gap-3.5 shadow-xl"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-500">地摊自预约自留货</span>
                <button 
                  onClick={() => setShowReserveModal(null)} 
                  className="text-slate-400 font-bold hover:text-slate-700 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="flex gap-3 bg-slate-50 p-2.5 rounded-xl">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-3xl font-bold shadow-3xs shrink-0">
                  {showReserveModal.image}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{showReserveModal.name}</h4>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{showReserveModal.description}</p>
                  <p className="text-xs font-black text-rose-500 mt-1">￥{showReserveModal.price}</p>
                </div>
              </div>

              <form onSubmit={handleReserveSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    备注要求 (例如: 不要辣/多要千岛酱/下午8点过来自提)
                  </label>
                  <input 
                    type="text" 
                    placeholder="输入口味习惯、自提时间等，不打字也可留空" 
                    value={reserveNotes}
                    onChange={(e) => setReserveNotes(e.target.value)}
                    className="w-full bg-slate-100 rounded-lg p-2 text-xs text-slate-700 outline-none focus:ring-1 focus:focus:ring-emerald-500"
                  />
                </div>

                <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-3 space-y-1 text-[10px] text-amber-900 leading-normal">
                  <p className="font-bold shrink-0">🔒 极简预定规则说明 (专为地摊设计)：</p>
                  <p>1. 线上免预付款，自提验货满意后再微信扫码扫码。降低买卖心理阻力。</p>
                  <p>2. 如出摊时间因下雨临时变动，小程序会自动自动微信消息告知。</p>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs shadow-xs active:scale-95 transition-all text-center"
                >
                  确认预定并锁存货品 (免定金)
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wishing pool modal dialog */}
      <AnimatePresence>
        {showWishModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-3xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full p-4 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-800">向 【{currentStall.name}】 许愿一包</span>
                <button 
                  onClick={() => setShowWishModal(false)} 
                  className="text-slate-400 hover:text-slate-700 p-1 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddWish} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">
                    输入您希望摊主采购进货、预留定制、或者改口味的期盼：
                  </label>
                  <textarea 
                    rows={4}
                    required
                    placeholder="例如：周师傅我想吃爆浆芝士多肉鱿鱼烧！加微辣！/ 阿芳姐能否帮我进一点捕蝇草消灭蚊子啊..." 
                    value={newWishText}
                    onChange={(e) => setNewWishText(e.target.value)}
                    className="w-full bg-slate-100 rounded-xl p-3 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-sans"
                  />
                </div>

                <div className="bg-emerald-50 text-[10px] text-emerald-800 p-2.5 rounded-lg">
                  💡 摊主收到后会在他的AI驾驶舱查看许愿热力！一旦承接口碑，您将收到系统推送告知。
                </div>

                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setShowWishModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-xs font-semibold transition-all"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-3xs"
                  >
                    发射许愿纸 🛩️
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WeChat Bottom Custom Tab Navigation (The WeChat user mental model matching target config) */}
      <div className="h-14 shrink-0 bg-white border-t border-slate-100 px-3 flex justify-around items-center select-none z-30 shadow-md">
        <button 
          onClick={() => {
            setActiveSubTab('map');
            onAddNotification("已切到：附近摊点实景地图 🗺️", 'info');
          }}
          className={`flex flex-col items-center gap-0.5 justify-center flex-1 transition-all py-1 rounded-xl ${activeSubTab === 'map' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Map className="w-5 h-5 shrink-0" />
          <span className="text-[10px]">实景扫街</span>
        </button>

        <button 
          onClick={() => {
            setActiveSubTab('shop');
            onAddNotification(`已切到：${currentStall.name} 线上店 🛒`, 'info');
          }}
          className={`flex flex-col items-center gap-0.5 justify-center flex-1 transition-all py-1 rounded-xl ${activeSubTab === 'shop' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ShoppingBag className="w-5 h-5 shrink-0" />
          <span className="text-[10px]">云逛小店</span>
        </button>

        <button 
          onClick={() => {
            setActiveSubTab('square');
            onAddNotification("已切到：地摊打卡晒单 📸", 'info');
          }}
          className={`flex flex-col items-center gap-0.5 justify-center flex-1 transition-all py-1 rounded-xl ${activeSubTab === 'square' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Users className="w-5 h-5 shrink-0" />
          <span className="text-[10px]">探店晒广场</span>
        </button>

        <button 
          onClick={() => {
            setActiveSubTab('me');
            onAddNotification("已切到：个人中心 👤 在此切换体验视角", 'info');
          }}
          className={`flex flex-col items-center gap-0.5 justify-center flex-1 transition-all py-1 rounded-xl ${activeSubTab === 'me' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <User className="w-5 h-5 shrink-0" />
          <span className="text-[10px]">我的</span>
        </button>
      </div>

    </div>
  );
};
