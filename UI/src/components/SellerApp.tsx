import React, { useState } from 'react';
import { Stall, Product, DailyLedger } from '../types';
import { MOCK_LEDGERS } from '../data/mockData';
import { 
  Sparkles, Mic, Plus, Trash2, TrendingUp, Settings, DollarSign,
  QrCode, AlertTriangle, CloudRain, Sun, Landmark, FileText, Check, 
  MapPin, HelpCircle, ArrowLeftRight, ChevronRight, Zap, Info, Volume2, Grid, Layers,
  X, ChevronLeft, Store, User, ShoppingBag, LogOut, ShieldCheck, Award, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SellerAppProps {
  stalls: Stall[];
  setStalls: React.Dispatch<React.SetStateAction<Stall[]>>;
  selectedStallId: string;
  setSelectedStallId?: (id: string) => void;
  onAddNotification: (msg: string, type: 'info' | 'success' | 'warning') => void;
  activeMode?: 'customer' | 'seller';
  setActiveMode?: (mode: 'customer' | 'seller') => void;
}

export const SellerApp: React.FC<SellerAppProps> = ({
  stalls,
  setStalls,
  selectedStallId,
  setSelectedStallId,
  onAddNotification,
  activeMode,
  setActiveMode
}) => {
  // Toggle for "大字极简模式" (Big font simple mode)
  const [bigFontMode, setBigFontMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'assistant' | 'products' | 'pricing' | 'ledger' | 'me'>('assistant');
  
  // Simulated Logged in status for Seller/User
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  
  // Custom states for user-level settings
  const [soundNotification, setSoundNotification] = useState<boolean>(true);
  const [vibrateNotification, setVibrateNotification] = useState<boolean>(true);
  const [autoAcceptOrder, setAutoAcceptOrder] = useState<boolean>(true);
  const [voiceVolume, setVoiceVolume] = useState<number>(80);
  const [eyeProtectionMode, setEyeProtectionMode] = useState<boolean>(false);

  // Food safety certificate management states
  const [foodSafetyCertNo, setFoodSafetyCertNo] = useState<string>('JY23201040319881');
  const [foodSafetyCertDate, setFoodSafetyCertDate] = useState<string>('2025-06-20');
  const [foodSafetyCertExpiry, setFoodSafetyCertExpiry] = useState<string>('2028-06-20');
  const [foodSafetyCertStatus, setFoodSafetyCertStatus] = useState<'verified' | 'reviewing' | 'expired'>('verified');
  const [foodSafetyCertHolder, setFoodSafetyCertHolder] = useState<string>('周师傅 (主理人)');
  const [showFoodSafetyModal, setShowFoodSafetyModal] = useState<boolean>(false);

  // Stall switching & registration modal states
  const [showStallModal, setShowStallModal] = useState<boolean>(false);
  const [isCreatingNewStall, setIsCreatingNewStall] = useState<boolean>(false);

  // New stall form states
  const [newStallName, setNewStallName] = useState<string>('');
  const [newStallOwner, setNewStallOwner] = useState<string>('周师傅');
  const [newStallCategory, setNewStallCategory] = useState<'小吃美食' | '服饰饰品' | '生鲜果蔬' | '手工文创' | '日用杂货'>('小吃美食');
  const [newStallLocation, setNewStallLocation] = useState<string>('校区南门迎宾路段');
  const [newStallTime, setNewStallTime] = useState<string>('18:00 - 23:00');
  const [newStallPhone, setNewStallPhone] = useState<string>('138-8888-9999');
  const [newStallDesc, setNewStallDesc] = useState<string>('真材实料，地道美味！');
  const [newStallProduct, setNewStallProduct] = useState<string>('自制冰糖葫芦');
  const [newStallPrice, setNewStallPrice] = useState<string>('10');

  // Selected state
  const currentStall = stalls.find(s => s.id === selectedStallId) || stalls[0];

  // AI Assistant states
  const [voiceQuery, setVoiceQuery] = useState<string>('');
  const [aiSpeechLog, setAISpeechLog] = useState<{ role: 'user' | 'assistant'; text: string; actionApplied?: boolean }[]>([
    { role: 'assistant', text: '您好周师傅！我是您的【智地摊·AI语音助手】。摆摊忙没空打字？直接跟我说！\n\n试试点击下方推荐指令，我会帮您自动改价、上货或发券！' }
  ]);
  const [isAITyping, setIsAITyping] = useState<boolean>(false);

  // AI Pricing states
  const [costPrice, setCostPrice] = useState<string>('5.5');
  const [rentPrice, setRentPrice] = useState<string>('20');
  const [marketPrice, setMarketPrice] = useState<string>('15');
  const [foodType, setFoodType] = useState<string>('小吃食品');
  const [pricingResults, setPricingResults] = useState<{
    suggested: number;
    clearance: number;
    premium: number;
    margin: number;
    breakEven: number;
  } | null>({
    suggested: 15,
    clearance: 9.9,
    premium: 18,
    margin: 63,
    breakEven: 3
  });

  // Product addition states
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<string>('招牌美食');
  const [newItemIcon, setNewItemIcon] = useState<string>('🍛');

  // Triggering simulated Voice execution
  const runVoiceCommand = (commandText: string) => {
    setAISpeechLog(prev => [...prev, { role: 'user', text: commandText }]);
    setIsAITyping(true);

    setTimeout(() => {
      let replyText = '';
      let triggerStateChange = false;

      const txt = commandText;
      if (txt.includes('上架') || txt.includes('煎饼果子') || txt.includes('冷面')) {
        // Run product addition
        const parsedName = txt.includes('冷面') ? '招牌烤冷面' : '黄金煎饼果子';
        const parsedPrice = txt.includes('12元') ? 12 : 10;
        
        setStalls(prevStalls => {
          return prevStalls.map(s => {
            if (s.id === currentStall.id) {
              const itemExists = s.products.some(p => p.name === parsedName);
              if (itemExists) return s;
              
              const newProduct: Product = {
                id: `p-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
                name: parsedName,
                price: parsedPrice,
                originalPrice: parsedPrice + 3,
                stock: 80,
                soldCount: 0,
                image: parsedName.includes('面') ? '🍜' : '🥞',
                category: '经典美食',
                tags: ['AI语音上架', '热呼'],
                description: '由AI语言助手一键录入。食材新鲜，出货飞快。'
              };
              return { ...s, products: [newProduct, ...s.products] };
            }
            return s;
          });
        });
        
        replyText = `📢 【AI操作完成！】已自动为您上架货品：\n👉 商品：${parsedName}\n👉 设定售价：￥${parsedPrice}\n👉 初始库存：80份\n已优化生成背景纯净的白底AI宣传照与详情！`;
        triggerStateChange = true;
      } else if (txt.includes('改价格') || txt.includes('西瓜') || txt.includes('大条鱿鱼')) {
        // Change price of Squid (currentStall id 1-1)
        setStalls(prevStalls => {
          return prevStalls.map(s => {
            if (s.id === currentStall.id) {
              return {
                ...s,
                products: s.products.map(p => {
                  if (p.id === '1-1') {
                    return { ...p, price: 9.9, isClearing: true, tags: ['限时清仓', ...p.tags] };
                  }
                  return p;
                })
              };
            }
            return s;
          });
        });
        replyText = `📢 【AI操作完成！】已自动把【招牌爆浆大鱿鱼】的价格修改为打骨折清仓价 ￥9.9 元！正在同城引流中，已提醒 200 米内的过路食客！`;
        triggerStateChange = true;
      } else if (txt.includes('休摊') || txt.includes('歇业') || txt.includes('雨天')) {
        setStalls(prevStalls => {
          return prevStalls.map(s => {
            if (s.id === currentStall.id) {
              return { ...s, status: 'offline', statusText: '已收摊 / 下雨打烊' };
            }
            return s;
          });
        });
        replyText = `🌧️ 【歇业防护开启！】已切换为【雨天打烊保障】。已自动：\n1. 线上小店下架即时外卖选项，仅保留中长期定制咨询。\n2. 已通过系统消息通知 12 名已预订客户：“摊位大雨，为您无责保留订单，明天见。” 避免引起任何纠纷。`;
        triggerStateChange = true;
      } else if (txt.includes('出摊') || txt.includes('在南门')) {
        setStalls(prevStalls => {
          return prevStalls.map(s => {
            if (s.id === currentStall.id) {
              return { ...s, status: 'active', statusText: '正在出摊（17:30 - Midnight）' };
            }
            return s;
          });
        });
        replyText = `🔥 【雄风出摊啦！】已切换状态为【正在出摊】。已自动把您的精确坐标推送到 3 公里内的微信常购回头客。今晚好运，烟火兴旺！`;
        triggerStateChange = true;
      } else {
        replyText = `收到您的指令：“${txt}”。小二正在努力学习该动作！目前支持：一键上架、修改菜价开启清仓、一键雨天打烊歇业、以及一键摆摊定位修改。`;
      }

      setAISpeechLog(prev => [...prev, { role: 'assistant', text: replyText, actionApplied: triggerStateChange }]);
      setIsAITyping(false);
      onAddNotification("AI语音指令处理完毕 🌟", "success");
    }, 1200);
  };

  // AI Pricing logic handler
  const handleCalculatePricing = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(costPrice) || 0;
    const rent = parseFloat(rentPrice) || 0;
    const market = parseFloat(marketPrice) || 0;

    // Simulated complex algorithm
    const suggested = +(cost * 2.3 + rent * 0.15).toFixed(1);
    const clearance = +(cost * 1.2).toFixed(1);
    const premium = +(suggested * 1.25).toFixed(1);
    const margin = Math.round(((suggested - cost) / suggested) * 100);
    const breakeven = Math.ceil(rent / (suggested - cost || 1));

    setPricingResults({
      suggested,
      clearance,
      premium,
      margin,
      breakEven: breakeven
    });
    onAddNotification("AI 针对摊点区位与耗材测算出了建议价格方案！", "success");
  };

  // Manually add product
  const handleManualAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice.trim()) return;

    const pr = parseFloat(newItemPrice) || 10;
    const p: Product = {
      id: `p-man-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      name: newItemName,
      price: pr,
      stock: 50,
      soldCount: 0,
      image: newItemIcon,
      category: newItemCategory,
      tags: ['今日生鲜', '手拉手推荐'],
      description: '手动上传精品货品。'
    };

    setStalls(prevStalls => {
      return prevStalls.map(s => {
        if (s.id === currentStall.id) {
          return { ...s, products: [p, ...s.products] };
        }
        return s;
      });
    });

    onAddNotification(`已手动上架商品：${newItemName}`, "success");
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleDeleteProduct = (productId: string) => {
    setStalls(prevStalls => {
      return prevStalls.map(s => {
        if (s.id === currentStall.id) {
          return {
            ...s,
            products: s.products.filter(p => p.id !== productId)
          };
        }
        return s;
      });
    });
    onAddNotification("商品下架成功", "warning");
  };

  const toggleOutingStatus = () => {
    const isOffline = currentStall.status === 'offline';
    setStalls(prevStalls => {
      return prevStalls.map(s => {
        if (s.id === currentStall.id) {
          return {
            ...s,
            status: isOffline ? 'active' : 'offline',
            statusText: isOffline ? '正在出摊（17:30 - Midnight）' : '已收摊 / 雨天休整'
          };
        }
        return s;
      });
    });
    onAddNotification(isOffline ? "已开启【出摊状态】，线上小店开启对外迎客！📣" : "已切换为【休摊状态】，线上顾客已无法预约下单。🌧️", "info");
  };

  const handleCreateNewStall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStallName.trim()) {
      onAddNotification("地摊名称不能为空哦！⛺", "warning");
      return;
    }

    const newId = `stall-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newStallObj: Stall = {
      id: newId,
      name: newStallName,
      ownerName: newStallOwner || '周师傅',
      category: newStallCategory,
      status: 'active',
      statusText: `正在出摊 (${newStallTime})`,
      location: newStallLocation || '迎宾路口绿洲街区',
      coordinate: { 
        x: Math.round(15 + Math.random() * 65), 
        y: Math.round(20 + Math.random() * 60) 
      },
      distance: '120m',
      rating: 5.0,
      vibeImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600',
      vibeImageOptimized: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600',
      出摊时间: newStallTime,
      phone: newStallPhone,
      description: newStallDesc,
      isHot: true,
      announcement: '🎉 新店开张！精选好物奉上，支持线上预订线下取！',
      products: [
        {
          id: `p-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          name: newStallProduct || '招牌主打美食',
          price: parseFloat(newStallPrice) || 10,
          originalPrice: (parseFloat(newStallPrice) || 10) + 3,
          stock: 60,
          soldCount: 0,
          image: newStallCategory === '生鲜果蔬' ? '🍓' : (newStallCategory === '服饰饰品' ? '🧣' : (newStallCategory === '手工文创' ? '🧸' : '🍡')),
          category: '人气招牌',
          tags: ['经典热卖', '掌柜推荐'],
          description: '开业特惠主打款，地摊严选。'
        }
      ],
      coupons: [
        {
          id: `c-${Date.now()}-${Math.floor(Math.random() * 1000000)}-1`,
          title: '3元开业尝鲜券',
          discount: 3,
          minSpend: 15,
          expiry: '次日零点失效',
          claimed: false,
          type: 'cash'
        }
      ],
      wishes: [],
      groupBuys: []
    };

    setStalls(prev => [...prev, newStallObj]);
    if (setSelectedStallId) {
      setSelectedStallId(newId);
    }
    setShowStallModal(false);
    setIsCreatingNewStall(false);
    onAddNotification(`恭喜！您的全新地摊【${newStallName}】特许入驻成功！已在实景地图上标记插旗 🏕️`, 'success');
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col h-full bg-slate-50 text-slate-800">
        {/* Simulating WeChat styled title bar */}
        <div className="bg-emerald-850 text-white p-4 sticky top-0 flex items-center justify-between z-10 shadow-xs select-none">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <span className="text-xs font-black">地摊智多星 • 摊主端授权</span>
          </div>
          <button 
            type="button"
            onClick={() => {
              if (setActiveMode) {
                setActiveMode('customer');
                onAddNotification("已切回市民地图，无需登录即可云逛地摊 🏕️", "info");
              }
            }}
            className="text-[9px] bg-emerald-700/80 hover:bg-emerald-600 font-bold px-2 py-1 rounded"
          >
            切换到市民端
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-teal-500/5 rounded-full blur-2xl" />

          {/* Logo container */}
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-700 text-white rounded-3xl flex items-center justify-center text-3xl shadow-sm mb-4">
            🏪
          </div>
          <h2 className="text-sm font-black text-slate-800 tracking-tight font-sans text-center mb-1">
            地摊智多星 • 摊主云管家
          </h2>
          <p className="text-[10px] text-slate-400 text-center mb-6 max-w-[240px]">
            专为数字摆摊量身定制的 AI经营参谋、语音改价、极简流水账和聚合收款台
          </p>

          {/* Form container */}
          <div className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-3.5">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 block font-black">手机号码</label>
              <div className="flex gap-2 bg-slate-50 border rounded-xl p-2 items-center">
                <span className="text-xs text-slate-400 font-bold border-r pr-2 shrink-0">+86</span>
                <input 
                  type="tel" 
                  placeholder="请输入手机号" 
                  defaultValue="13888889999"
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
                    defaultValue="6688"
                    className="w-full bg-transparent text-xs outline-none text-slate-800 font-bold"
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => onAddNotification("验证码已模拟发送至您的手机，请输入 6688 🚀", "info")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] px-2.5 font-bold rounded-xl transition-all border border-slate-200"
                >
                  模拟获取
                </button>
              </div>
            </div>

            {/* Simulated verification suggestion */}
            <div className="text-[9px] text-amber-600/90 leading-normal bg-amber-50 p-2.5 rounded-lg border border-amber-100/60 font-medium">
              💡 演示系统：已预装演示主理人账号，可直接点击登录或一键授权！
            </div>

            {/* Login button */}
            <button 
              type="button"
              onClick={() => {
                setIsLoggedIn(true);
                onAddNotification(`已重新以摊主【${currentStall.ownerName}】身份成功登录地摊后台！👏`, 'success');
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-3xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              登录进入工作台
            </button>

            {/* WeChat authorization login button */}
            <button 
              type="button"
              onClick={() => {
                setIsLoggedIn(true);
                onAddNotification(`微信快捷授权成功，已重新以【${currentStall.ownerName}】开摊管理！🚀`, 'success');
              }}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-extrabold py-2 rounded-xl text-xs border border-slate-200 flex justify-center items-center gap-1.5 active:scale-98 transition-all"
            >
              <span className="text-sm">💬</span>
              <span>微信一键免密授权</span>
            </button>
          </div>

          <div className="text-[8px] text-slate-400 mt-8 text-center leading-normal">
            登录即代表同意并遵守 《小微数字地摊管理条例》
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* Upper Control Bar (WeChat Header with BIG-TEXT-MODE toggle!) */}
      <div className="bg-emerald-800 text-white p-4 pb-3 sticky top-0 flex flex-col gap-2 z-10 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <div 
              onClick={() => {
                setShowStallModal(true);
                setIsCreatingNewStall(false);
                onAddNotification("已开启地摊列表与注册入驻窗口 🚀", "info");
              }}
              className="cursor-pointer group flex flex-col hover:bg-white/10 p-1 px-1.5 rounded-lg transition-all"
              title="切换极简账目或新增地摊点位"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-emerald-700/80 px-2 py-0.5 rounded-full block text-white/95 leading-none">
                  主理人: {currentStall.ownerName}
                </span>
                <span className="text-[8px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded-sm scale-90 -ml-1 flex items-center gap-0.5 shadow-2xs">
                  <Plus className="w-2 h-2" />
                  切换/新增
                </span>
              </div>
              <h2 className="text-xs font-extrabold -mt-0.5 flex items-center gap-1 font-sans text-white group-hover:text-amber-300">
                {currentStall.name}
                <ChevronRight className="w-3.5 h-3.5 opacity-80" />
              </h2>
            </div>
          </div>
          
          {/* Big text switcher */}
          <button
            onClick={() => {
              setBigFontMode(!bigFontMode);
              onAddNotification(!bigFontMode ? "已经进入：老中青摆摊『大字极简按钮模式』👵" : "已切回：专业全配置经营后台", "info");
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
              bigFontMode 
                ? 'bg-amber-400 text-slate-900 border-none scale-102 ring-2 ring-white shadow-md' 
                : 'bg-emerald-700 border border-emerald-600 text-emerald-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{bigFontMode ? "大字极简模式【开】" : "大字关"}</span>
          </button>
        </div>

        {/* Small Out status indicator */}
        <div className="flex justify-between items-center bg-black/15 rounded-md px-2.5 py-1.5 text-xs text-white/95">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${currentStall.status === 'active' ? 'bg-rose-400 animate-ping' : 'bg-slate-400'}`} />
            状态：<strong className="text-white">{currentStall.status === 'active' ? "正在出摊中" : "打烊休整中"}</strong>
          </span>
          <button 
            onClick={toggleOutingStatus}
            className="bg-white/20 hover:bg-white/30 text-[10px] font-extrabold px-3 py-1 rounded"
          >
            {currentStall.status === 'active' ? "休一摊" : "开一摊"}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto pb-16">
        
        {/* BIG FONT SIMPLIFIED VENDOR INTERFACE (大字极简模式 - 0基础、中老年摊主适配) */}
        {bigFontMode ? (
          <div className="p-4 space-y-4">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-2xl pt-1">💡</span>
              <p className="text-xs text-amber-900 leading-relaxed font-black">
                【大字极简模式】已启动。精简屏幕上多余的英文与参数，字大如斗，手指好认，让您在爆炒鱿鱼或包装鲜花时一拍即中！
              </p>
            </div>

            {/* Simulated 4 Massive Buttons */}
            <div className="grid grid-cols-1 gap-3.5">
              
              {/* Massive Button 1: Voice command */}
              <button 
                onClick={() => {
                  setBigFontMode(false);
                  setActiveTab('assistant');
                  onAddNotification("已切到语音助手，请点击预设按钮或输入指令", "info");
                }}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-3xl p-6 shadow-md flex items-center justify-between text-left active:scale-98 transition-all"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <Mic className="w-6 h-6 animate-pulse" />
                    1. 张嘴说人话AI操作
                  </h3>
                  <p className="text-sm text-teal-100">语音自动改价、上货、歇业通知</p>
                </div>
                <ChevronRight className="w-6 h-6 shrink-0" />
              </button>

              {/* Massive Button 2: Add food */}
              <button 
                onClick={() => {
                  setBigFontMode(false);
                  setActiveTab('products');
                  onAddNotification("已切到商品管理，可快速增减商品", "info");
                }}
                className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-3xl p-6 shadow-md flex items-center justify-between text-left active:scale-98 transition-all"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <Plus className="w-6 h-6" />
                    2. 增加在售的东西
                  </h3>
                  <p className="text-sm text-sky-100">一键改价、修改上下架</p>
                </div>
                <ChevronRight className="w-6 h-6 shrink-0" />
              </button>

              {/* Massive Button 3: Check money */}
              <button 
                onClick={() => {
                  setBigFontMode(false);
                  setActiveTab('ledger');
                  onAddNotification("欢迎查看大白话财务报表！", "info");
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-3xl p-6 shadow-md flex items-center justify-between text-left active:scale-98 transition-all"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <DollarSign className="w-6 h-6" />
                    3. 查看今天赚多少钱
                  </h3>
                  <p className="text-sm text-orange-100">日结对账、查看纯利润、今日流水</p>
                </div>
                <ChevronRight className="w-6 h-6 shrink-0" />
              </button>

              {/* Massive Button 4: Stall placement */}
              <button 
                onClick={() => {
                  setBigFontMode(false);
                  setActiveTab('me');
                  onAddNotification("已切到我的中心与出摊设置，支持导出多效合一收款码 🚀", "info");
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-3xl p-6 shadow-md flex items-center justify-between text-left active:scale-98 transition-all"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <MapPin className="w-6 h-6" />
                    4. 定位与生成聚合收款码
                  </h3>
                  <p className="text-sm text-purple-100">插旗标到地图、导出多用聚合码</p>
                </div>
                <ChevronRight className="w-6 h-6 shrink-0" />
              </button>

            </div>
            
          </div>
        ) : (
          /* REGULAR RICH CONTROLS */
          <div className="p-4 flex flex-col gap-4">
            
            {/* Category Sub-Views */}
            {activeTab === 'assistant' && (
              <div className="flex flex-col gap-4">
                
                {/* Simulated Voice Chat Bubble */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 border-b pb-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span className="text-xs font-bold text-slate-800">AI 智能经营语音助手 (语音免打字)</span>
                  </div>

                  {/* Bubble history */}
                  <div className="space-y-3.5 max-h-[280px] overflow-y-auto no-scrollbar py-1">
                    {aiSpeechLog.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-2 max-w-[85%] ${
                          item.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                          item.role === 'user' ? 'bg-amber-100' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.role === 'user' ? '👨‍🍳' : '🤖'}
                        </div>

                        <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                          item.role === 'user' 
                            ? 'bg-amber-100 text-amber-900 rounded-tr-none' 
                            : 'bg-slate-100 text-slate-700 whitespace-pre-wrap rounded-tl-none font-sans'
                        }`}>
                          {item.text}
                        </div>
                      </div>
                    ))}

                    {isAITyping && (
                      <div className="flex gap-2 max-w-[80%]">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-slate-400 flex items-center justify-center text-xs">
                          🤖
                        </div>
                        <div className="p-2.5 rounded-2xl bg-slate-100/60 text-slate-400 text-xs rounded-tl-none animate-pulse">
                          AI 正在调取定价引擎/纠合状态信息中...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Click suggested voice queries (extremely simple) */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                      试试点一下，模拟摆摊双手忙时的语音喊话：
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "上架招牌烤冷面，价格12元",
                        "大条鱿鱼特惠改价格为9.9",
                        "现在大雨，我要一键雨天歇业通知",
                        "开始出摊，定位在南门"
                      ].map((cmd, index) => (
                        <button
                          key={index}
                          onClick={() => runVoiceCommand(cmd)}
                          disabled={isAITyping}
                          className="text-[10px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-full px-2.5 py-1 text-slate-600 transition-all font-sans"
                        >
                          💬 "{cmd}"
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Typing query interface (Fallback text simulator) */}
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      placeholder="打字也可以: 如'上架香波20元'" 
                      value={voiceQuery}
                      onChange={(e) => setVoiceQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && voiceQuery.trim()) {
                          runVoiceCommand(voiceQuery);
                          setVoiceQuery('');
                        }
                      }}
                      className="flex-1 bg-slate-50 border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      onClick={() => {
                        if (voiceQuery.trim()) {
                          runVoiceCommand(voiceQuery);
                          setVoiceQuery('');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 text-xs font-semibold"
                    >
                      发送
                    </button>
                  </div>
                </div>

                {/* AI pricing warning panel */}
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex gap-3.5">
                  <span className="text-2xl shrink-0">🤖</span>
                  <div className="text-[10px] text-violet-950 font-medium">
                    <p className="font-bold">AI 智慧客源偏好提示 (夜市研判千人推送)：</p>
                    <p className="mt-1 leading-normal">
                      系统发现南门观光夜市昨晚“宝妈”和“年轻人”浏览许愿比例环比上升 23%，其中【古风缠花饰品】与【平价鲜花】搜索上升。建议可在下周多备一些儿童手工和迷你多肉款花束。
                    </p>
                  </div>
                </div>

                {/* Moved AI Pricing module inside AI Assistant */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-4">
                  <div className="flex items-center gap-1.5 border-b pb-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">AI 智能估定价助手 (防止亏本)</span>
                  </div>

                  <form onSubmit={handleCalculatePricing} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block">货品采购成本 (单条/件)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">￥</span>
                          <input 
                            type="text" 
                            required
                            value={costPrice}
                            onChange={(e) => setCostPrice(e.target.value)}
                            className="w-full bg-slate-50 border rounded pl-6 pr-2 py-1 text-xs font-bold text-slate-700"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block">同城同类同行均价</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">￥</span>
                          <input 
                            type="text" 
                            required
                            value={marketPrice}
                            onChange={(e) => setMarketPrice(e.target.value)}
                            className="w-full bg-slate-50 border rounded pl-6 pr-2 py-1 text-xs font-bold text-slate-700"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block">一日点位摊位费(元)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">￥</span>
                          <input 
                            type="text" 
                            required
                            value={rentPrice}
                            onChange={(e) => setRentPrice(e.target.value)}
                            className="w-full bg-slate-50 border rounded pl-6 pr-2 py-1 text-xs font-bold text-slate-700"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block">品类大项</label>
                        <select 
                          value={foodType}
                          onChange={(e) => setFoodType(e.target.value)}
                          className="w-full bg-slate-50 border rounded p-1 text-xs"
                        >
                          <option value="生鲜蔬果花卉">🍓 生鲜蔬果花卉</option>
                          <option value="小吃食品">🍢 街头熟食小吃</option>
                          <option value="服饰配饰手工">🎗️ 手工簪花精品</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs"
                    >
                      AI 综合测算黄金定价 🚀
                    </button>
                  </form>

                  {/* Pricing results statement */}
                  {pricingResults && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50 space-y-3">
                      <h4 className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        AI 推荐多阶定价明细：
                      </h4>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white p-2 rounded-lg border text-center">
                          <span className="text-[9px] text-slate-400 block">建议正常价</span>
                          <strong className="text-xs text-slate-800">￥{pricingResults.suggested}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border text-center">
                          <span className="text-[9px] text-slate-400 block">引流/清仓价</span>
                          <strong className="text-xs text-rose-600">￥{pricingResults.clearance}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-lg border text-center">
                          <span className="text-[9px] text-slate-400 block">周末/溢价档</span>
                          <strong className="text-xs text-amber-600">￥{pricingResults.premium}</strong>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-white border rounded-lg px-2.5 py-1.5 text-[10px]">
                        <div>
                          毛利水准: <strong className="text-emerald-600/95 font-bold font-mono">{pricingResults.margin}%</strong>
                        </div>
                        <div className="text-slate-300">|</div>
                        <div>
                          今日卖足 <strong className="text-slate-800 font-bold">{pricingResults.breakEven} 件</strong> 即弥补摊位费保本
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'products' && (
              <div className="flex flex-col gap-4">
                
                {/* Fast manual add */}
                <form onSubmit={handleManualAddProduct} className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b pb-1">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>快速上架新货 (AI自动填充背景)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 block">商品图标/表情</label>
                      <select 
                        value={newItemIcon}
                        onChange={(e) => setNewItemIcon(e.target.value)}
                        className="w-full bg-slate-50 border rounded p-1.5 text-xs outline-none focus:ring-1 focus:focus:ring-emerald-500"
                      >
                        <option value="🍛">🍛 小吃盘</option>
                        <option value="🍢">🍢 烤串</option>
                        <option value="🍺">🍺 扎啤</option>
                        <option value="🌸">🌸 玫瑰朵</option>
                        <option value="🍉">🍉 西瓜切</option>
                        <option value="📱">📱 靓丽手机壳</option>
                        <option value="💍">💍 闪耀戒指</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 block">上架分类</label>
                      <input 
                        type="text" 
                        value={newItemCategory}
                        required
                        onChange={(e) => setNewItemCategory(e.target.value)}
                        className="w-full bg-slate-50 border rounded p-1.5 text-xs outline-none focus:ring-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 items-end">
                    <div className="col-span-3 space-y-1">
                      <label className="text-[10px] text-slate-500 block">货品名字</label>
                      <input 
                        type="text" 
                        required
                        placeholder="例如: 黄金铁板五花肉" 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="w-full bg-slate-50 border rounded p-1.5 text-xs outline-none focus:ring-1"
                      />
                    </div>
                    
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] text-slate-500 block">售价(元)</label>
                      <input 
                        type="number" 
                        required
                        placeholder="18" 
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        className="w-full bg-slate-50 border rounded p-1.5 text-xs outline-none focus:ring-1"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs"
                  >
                    一键摆摊上架 (AI自动美图)
                  </button>
                </form>

                {/* List items with down-to-earth layout */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-500 px-1">当前摆摊货物 ({currentStall.products.length})</div>

                  {currentStall.products.map(p => (
                    <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xl shrink-0">
                          {p.image}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{p.name}</h4>
                          <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>售价: <strong className="text-rose-600">￥{p.price}</strong></span>
                            <span>库存: <strong className="text-slate-700">{p.stock}</strong></span>
                            <span>已售: {p.soldCount}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 hover:bg-rose-50 rounded"
                        title="下架商品"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {activeTab === 'ledger' && (
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3.5">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">简易经营台账 (大白话营收表)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">微信收款直通</span>
                </div>

                {/* Big numbers summary */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 block">今日入账</span>
                    <strong className="text-sm font-black text-slate-800">￥1250</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 block">首级进料费</span>
                    <strong className="text-sm font-black text-slate-500">￥420</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 block">纯利挣得</span>
                    <strong className="text-sm font-black text-emerald-600">￥830</strong>
                  </div>
                </div>

                {/* Day-by-Day scrolling table */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 block">本周财务走势账本：</span>
                  <div className="space-y-1.5 h-36 overflow-y-auto custom-scrollbar pr-1">
                    {MOCK_LEDGERS.map((led, index) => (
                      <div key={index} className="flex justify-between items-center text-[10px] p-2 bg-slate-50/50 hover:bg-slate-100 rounded border border-slate-100">
                        <span className="font-semibold text-slate-650 shrink-0">{led.date}</span>
                        <div className="flex gap-3 text-right">
                          <span>出货:{led.onlineOrders + led.offlineOrders}单</span>
                          <span>总收:<strong className="text-slate-800">￥{led.revenue}</strong></span>
                          <span>净挣:<strong className="text-emerald-700 font-bold">￥{led.profit}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* One click withdrawal */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="text-[9px] text-slate-400">
                    微信担保账期透明。当天提现最快1分到账，收取小微通道费 0.1% 
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => onAddNotification("提现 ￥830 成功！微信零钱已到账，请查看您的微信零钱明细 🧧", "success")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] shrink-0"
                  >
                    一键提现到微信
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'me' && (
              <div className="flex flex-col gap-4">
                
                {/* 1. Owner Card Profile */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-sm space-y-3.5 text-left relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                  
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 border border-white/40 rounded-full flex items-center justify-center text-2xl font-black shrink-0 shadow-inner">
                      👨‍🍳
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-black">{currentStall.ownerName}</h4>
                        <span className="text-[8px] bg-amber-400 text-amber-950 font-black px-1.5 py-0.5 rounded leading-none">
                          Lv.4 传奇自营
                        </span>
                      </div>
                      <p className="text-[10px] text-teal-100 mt-0.5">名誉摊名: 【{currentStall.name}】</p>
                    </div>
                  </div>
                  
                  {/* Stall Holder Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-black/15 p-2 rounded-xl text-center select-none relative z-10">
                    <div>
                      <span className="block text-[8px] text-teal-100 font-bold">今日线上买单</span>
                      <strong className="text-xs text-white">4 笔</strong>
                    </div>
                    <div className="border-x border-white/10">
                      <span className="block text-[8px] text-teal-100 font-bold">顾客口碑打分</span>
                      <strong className="text-xs text-white">⭐ 4.9</strong>
                    </div>
                    <div>
                      <span className="block text-[8px] text-teal-100 font-bold">摊位出摊信誉</span>
                      <strong className="text-xs text-white">99分 满额</strong>
                    </div>
                  </div>
                </div>

                {/* 2. System and User Settings (Toggles) */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3.5 text-left">
                  <div className="flex items-center gap-1.5 border-b pb-2">
                    <Settings className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 font-sans">本地系统与用户设置</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    
                    {/* Perspective Switch Toggle (Saves substantial space!) */}
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-amber-600 shrink-0" />
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-700 block">市民顾客体验视角</span>
                          <span className="text-[9px] text-slate-400 block">一键云逛街点餐</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (setActiveMode) {
                            setActiveMode('customer');
                            onAddNotification(`已切换回市民顾客端！🏕️ 可以在地图上找到并云逛【${currentStall.name}】啦！`, 'success');
                          }
                        }}
                        className="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 bg-amber-500 hover:bg-amber-600 active:scale-95"
                      >
                        <span className="translate-x-5 pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200" />
                      </button>
                    </div>

                    {/* Big Font Mode Toggle */}
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-700 block">老中青大字极简辅助模式</span>
                          <span className="text-[9px] text-slate-400 block">超大按钮，防按错设计</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBigFontMode(!bigFontMode);
                          onAddNotification(!bigFontMode ? "大字极简模式已开 👵" : "已切回全配置经营后台", "info");
                        }}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 active:scale-95 ${
                          bigFontMode ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                          bigFontMode ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Sound Broadcast Toggle */}
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-sky-600 shrink-0" />
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-700 block">顾客付款成功AI语音播报</span>
                          <span className="text-[9px] text-slate-400 block">在推车嘈杂环境中极其实用</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSoundNotification(!soundNotification);
                          onAddNotification(`已${!soundNotification ? '开启' : '关闭'}付款AI语音播报`, 'info');
                        }}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 active:scale-95 ${
                          soundNotification ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                          soundNotification ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Vibrate Notification Toggle */}
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-700 block">订单预定微信极速微震</span>
                          <span className="text-[9px] text-slate-400 block">有新预约时触感振动提示</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVibrateNotification(!vibrateNotification);
                          onAddNotification(`微信微震提示已${!vibrateNotification ? '开启' : '关闭'}`, 'info');
                        }}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 active:scale-95 ${
                          vibrateNotification ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                          vibrateNotification ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Auto Accept Order Toggle */}
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-700 block">交易金额自动结算入总账</span>
                          <span className="text-[9px] text-slate-400 block">省去每笔手动录单，账目更清爽</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAutoAcceptOrder(!autoAcceptOrder);
                          onAddNotification(`营业额自动记账已${!autoAcceptOrder ? '开启' : '关闭'}`, 'info');
                        }}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 active:scale-95 ${
                          autoAcceptOrder ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                          autoAcceptOrder ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Night Eye Protection Toggle */}
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-700 block">夜间护眼微光低亮度模式</span>
                          <span className="text-[9px] text-slate-400 block">夜市出摊防刺眼</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEyeProtectionMode(!eyeProtectionMode);
                          onAddNotification(`护眼暗调微光已${!eyeProtectionMode ? '一键开启' : '关闭'}`, 'success');
                        }}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 active:scale-95 ${
                          eyeProtectionMode ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                          eyeProtectionMode ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                  </div>
                </div>

                {/* Food Safety Certification Management Setting Item */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3 text-left">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 font-sans">食品安全证照认证管理</span>
                    </div>
                    <div>
                      {foodSafetyCertStatus === 'verified' && (
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> 微信官方已验证
                        </span>
                      )}
                      {foodSafetyCertStatus === 'reviewing' && (
                        <span className="text-[8px] bg-amber-100 text-amber-850 font-extrabold px-1.5 py-0.5 rounded-sm">
                          ⏳ 平台人工审核中
                        </span>
                      )}
                      {foodSafetyCertStatus === 'expired' && (
                        <span className="text-[8px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-sm">
                          ⚠️ 已逾期失效
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/60 space-y-1.5 text-[10px] text-slate-600">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-medium text-slate-500">主体证明持有人：</span>
                      <strong className="font-extrabold text-slate-800">{foodSafetyCertHolder}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-medium text-slate-500">备案登记/许可证码：</span>
                      <strong className="font-mono font-bold text-slate-850">{foodSafetyCertNo}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-medium text-slate-500">有效期至：</span>
                      <strong className={`font-mono ${foodSafetyCertStatus === 'expired' ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                        {foodSafetyCertExpiry}
                      </strong>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFoodSafetyModal(true)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-1.5 rounded-lg text-xs flex justify-center items-center gap-1 transition-all"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>查看或更新健安证明/食品备案</span>
                    </button>
                  </div>
                </div>

                {/* 3. The Aggregate QR Code Card (Restored back as requested) */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-4 text-left">
                  <div className="flex items-center gap-1.5 border-b pb-2">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 font-sans">一码多效•地摊推广聚合码</span>
                  </div>

                  <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                    <div className="relative p-2.5 bg-white rounded-lg border border-slate-200 shrink-0">
                      <div className="w-20 h-20 bg-emerald-50 rounded flex flex-col items-center justify-center border-2 border-emerald-300">
                        <div className="text-xl">📱</div>
                        <span className="text-[7px] text-emerald-800 font-black -mt-1 uppercase tracking-wide">
                          扫我在线自提
                        </span>
                        <span className="text-[6px] text-slate-400">聚合出摊码</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[10px] text-slate-600">
                      <p className="font-bold text-slate-800 leading-none">📢 摆摊聚合码使用指南：</p>
                      <p>打印并张贴在推车或现场。路人微信扫该码即可：</p>
                      <p className="flex items-center gap-1"><strong className="text-emerald-700">1.</strong> 领优惠券，引导当场消费</p>
                      <p className="flex items-center gap-1"><strong className="text-emerald-700">2.</strong> 进入小店，加您的微信留私域</p>
                      <p className="flex items-center gap-1"><strong className="text-emerald-700">3.</strong> 查看您的下一出摊时间和点位避免白跑</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onAddNotification("聚合二维码下载完毕，准备打印张贴 🖨️", "success")}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-1.5 rounded-lg text-xs"
                    >
                      保存下载聚合海报码
                    </button>
                  </div>
                </div>

                {/* 3. System Utility options */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3.5 text-left">
                  <div className="flex items-center gap-1.5 border-b pb-2">
                    <Info className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-800 font-sans">关于与数据管理</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 block">小程序本地核心数据缓存</span>
                        <span className="text-[9px] text-slate-400 block">包含地摊商品及未上传流水账目</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddNotification("微信小程序核心缓存清理成功！数据已优化 🛠️", "success")}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 transition-all active:scale-95"
                      >
                        清除缓存
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-xs border-t pt-3">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 block">地摊智多星 v2.4 软件协议</span>
                        <span className="text-[9px] text-slate-400 block">由社区开源共建，服务地摊微创业</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddNotification("《城市地摊数字运营规范与支持指南》：支持摊主合法合规合流营商！🏕️", "info")}
                        className="text-slate-500 hover:text-slate-800 text-[10px] font-bold flex items-center gap-0.5 transition-all"
                      >
                        <span>阅读协议</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Stall placement information details */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3 text-left">
                  <div className="flex items-center gap-1.5 border-b pb-2">
                    <MapPin className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800 font-sans">当前在售地摊档口信息</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-400 block">出摊名称</span>
                      <strong className="text-slate-800">{currentStall.name}</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-400 block">经营分类</span>
                      <strong className="text-slate-800">{currentStall.category}</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg col-span-2">
                      <span className="text-slate-400 block font-sans">预设出摊段/具体地址</span>
                      <strong className="text-slate-800">{currentStall.location}</strong>
                    </div>
                  </div>
                </div>

                {/* 5. Logout Button (The core requirement!) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoggedIn(false);
                    onAddNotification("已安全退出主理人账号工作台！📴", "warning");
                  }}
                  className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-extrabold py-3 rounded-2xl text-xs flex justify-center items-center gap-2 transition-all shadow-3xs active:scale-98 mb-6"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="font-sans">退出当前摊主账号登录</span>
                </button>

              </div>
            )}

          </div>
        )}

        {/* Stall Switcher & Registration Modal */}
        <AnimatePresence>
          {showStallModal && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-3xs flex items-end justify-center z-50">
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="bg-white rounded-t-3xl w-full max-h-[92%] overflow-y-auto p-4 flex flex-col gap-3.5 shadow-xl text-left"
              >
                {/* Modal Title and close button */}
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-xs">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>地摊广场管理中心</span>
                  </div>
                  <button 
                    onClick={() => {
                      setShowStallModal(false);
                      setIsCreatingNewStall(false);
                    }} 
                    className="text-slate-400 font-bold hover:text-slate-700 p-1 bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                  >
                    ✕
                  </button>
                </div>

                {/* Sub-tab selection */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl select-none text-center">
                  <button
                    onClick={() => setIsCreatingNewStall(false)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !isCreatingNewStall 
                        ? 'bg-white text-slate-800 shadow-3xs' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    切换已有地摊
                  </button>
                  <button
                    onClick={() => setIsCreatingNewStall(true)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isCreatingNewStall 
                        ? 'bg-emerald-600 text-white shadow-3xs' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    📝 登记注册新地摊
                  </button>
                </div>

                {/* TAB 1: Stall Selector List */}
                {!isCreatingNewStall ? (
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
                    <div className="text-[10px] text-slate-400">选择您要进行管理盘货、记账的地摊点位：</div>
                    <div className="space-y-2">
                      {stalls.map(s => {
                        const isCurrent = s.id === currentStall.id;
                        return (
                          <div 
                            key={s.id}
                            onClick={() => {
                              if (setSelectedStallId) {
                                setSelectedStallId(s.id);
                                setShowStallModal(false);
                                onAddNotification(`已成功切换管理地摊：【${s.name}】📣 已加载对应的财务和货架`, 'success');
                              }
                            }}
                            className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                              isCurrent 
                                ? 'bg-emerald-50/60 border-emerald-500' 
                                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex gap-2.5 items-center">
                              <span className="text-xl">🎪</span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-black text-slate-800">{s.name}</h4>
                                  <span className="text-[8px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-sans leading-none">
                                    {s.category}
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1">主理人: {s.ownerName} • 位置: {s.location}</p>
                              </div>
                            </div>

                            {isCurrent ? (
                              <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full shrink-0">
                                自理中
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 shrink-0 font-sans group-hover:text-emerald-600">
                                点击管理 ⚙️
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // TAB 2: Registration Form
                  <form onSubmit={handleCreateNewStall} className="space-y-3.5 flex-1 max-h-[360px] overflow-y-auto pr-1">
                    <div className="text-[10px] text-slate-400 leading-normal bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-100/60">
                      💡 注册新地摊将在市民小程序“实景地图”上插上标识灯。免交场地费。
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block font-bold">地摊招牌名称 (必填)</label>
                        <input 
                          type="text" 
                          required
                          placeholder="例如: 老王秘制烤面筋" 
                          value={newStallName}
                          onChange={(e) => setNewStallName(e.target.value)}
                          className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 block font-bold">摊主大名/称呼</label>
                          <input 
                            type="text" 
                            placeholder="老王" 
                            value={newStallOwner}
                            onChange={(e) => setNewStallOwner(e.target.value)}
                            className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 block font-bold">摆摊大类</label>
                          <select 
                            value={newStallCategory}
                            onChange={(e: any) => setNewStallCategory(e.target.value)}
                            className="w-full bg-slate-50 border rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="小吃美食">小吃美食</option>
                            <option value="服饰饰品">服饰饰品</option>
                            <option value="生鲜果蔬">生鲜果蔬</option>
                            <option value="手工文创">手工文创</option>
                            <option value="日用杂货">日用杂货</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block font-bold">出摊预设路段/地段</label>
                        <input 
                          type="text" 
                          placeholder="校区南门迎宾路段" 
                          value={newStallLocation}
                          onChange={(e) => setNewStallLocation(e.target.value)}
                          className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:ring-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 block font-bold">每日出摊时间</label>
                          <input 
                            type="text" 
                            placeholder="18:00 - 23:00" 
                            value={newStallTime}
                            onChange={(e) => setNewStallTime(e.target.value)}
                            className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:ring-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 block font-bold">微信收款联系手机</label>
                          <input 
                            type="text" 
                            placeholder="138-8888-9999" 
                            value={newStallPhone}
                            onChange={(e) => setNewStallPhone(e.target.value)}
                            className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:ring-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block font-bold">地摊特色介绍 (好口才集客)</label>
                        <textarea 
                          rows={2}
                          placeholder="二十年秘制酱汁，真材实料，地道美味！支持小程序在线自提，不跑空！" 
                          value={newStallDesc}
                          onChange={(e) => setNewStallDesc(e.target.value)}
                          className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:ring-1 resize-none"
                        />
                      </div>

                      <div className="border-t pt-2.5 pb-1 mt-1">
                        <span className="text-[11px] font-bold text-emerald-800 block">🎁 上线首发爆品货架初始化 (自动生成精修图)：</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 block font-bold">菜品/货品名字</label>
                          <input 
                            type="text" 
                            placeholder="经典烤面筋(4串)" 
                            value={newStallProduct}
                            onChange={(e) => setNewStallProduct(e.target.value)}
                            className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:ring-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 block font-bold">爆浆尝鲜价 (元)</label>
                          <input 
                            type="number" 
                            placeholder="10" 
                            value={newStallPrice}
                            onChange={(e) => setNewStallPrice(e.target.value)}
                            className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:ring-1"
                          />
                        </div>
                      </div>

                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-750 text-white font-extrabold py-2 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5 shadow-sm active:scale-98 transition-all"
                      >
                        <span>立即插旗开摊！🏕️</span>
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Food Safety Certification Management Modal */}
        <AnimatePresence>
          {showFoodSafetyModal && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-3xs flex items-end justify-center z-50">
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="bg-white rounded-t-3xl w-full max-h-[90%] overflow-y-auto p-5 flex flex-col gap-4 shadow-xl text-left"
              >
                <div className="flex justify-between items-center pb-2 border-b">
                  <div className="flex items-center gap-1.5 font-sans">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 animate-pulse" />
                    <h3 className="text-sm font-black text-slate-800">食品安全与健康证明认证中心</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowFoodSafetyModal(false)}
                    className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] text-slate-500 leading-normal">
                    根据《小微数字地摊与城市商圈合规营商标准》，食品类地摊必须如实填写食品从业健康合格证或地摊流动备案登记，在微信端内扫码验真通过后，将自动对游园市民买家公示【✅ 绿码健安商家】专属标识，极力提升市民信任度、点单转化率和夜市推荐机率！
                  </p>

                  <div className="space-y-3">
                    {/* Holder input */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 block font-bold">从业/备案证明持有人</label>
                      <input 
                        type="text" 
                        placeholder="周师傅 (主理人)" 
                        value={foodSafetyCertHolder}
                        onChange={(e) => setFoodSafetyCertHolder(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                      />
                    </div>

                    {/* Certificate Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 block font-bold">发证机关等级/许可证备案号</label>
                      <input 
                        type="text" 
                        placeholder="JY23201040319881" 
                        value={foodSafetyCertNo}
                        onChange={(e) => setFoodSafetyCertNo(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                      />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block font-bold">发证备案日期</label>
                        <input 
                          type="date" 
                          value={foodSafetyCertDate}
                          onChange={(e) => setFoodSafetyCertDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block font-bold">资质有效期截止</label>
                        <input 
                          type="date" 
                          value={foodSafetyCertExpiry}
                          onChange={(e) => setFoodSafetyCertExpiry(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Cert status selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 block font-bold">模拟更新平台认证状态</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setFoodSafetyCertStatus('verified')}
                          className={`py-2 px-1 text-[10px] rounded-lg border font-bold text-center transition-all ${
                            foodSafetyCertStatus === 'verified' 
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          🟢 官方已验证
                        </button>
                        <button
                          type="button"
                          onClick={() => setFoodSafetyCertStatus('reviewing')}
                          className={`py-2 px-1 text-[10px] rounded-lg border font-bold text-center transition-all ${
                            foodSafetyCertStatus === 'reviewing' 
                              ? 'bg-amber-50 border-amber-500 text-amber-800' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          ⏳ 平台审核中
                        </button>
                        <button
                          type="button"
                          onClick={() => setFoodSafetyCertStatus('expired')}
                          className={`py-2 px-1 text-[10px] rounded-lg border font-bold text-center transition-all ${
                            foodSafetyCertStatus === 'expired' 
                              ? 'bg-rose-50 border-rose-500 text-rose-800' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          🔴 资质已逾期
                        </button>
                      </div>
                    </div>

                    {/* Simulation image upload block */}
                    <div className="border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center">
                      <Upload className="w-6 h-6 text-emerald-600 mb-1 shrink-0" />
                      <span className="text-[10px] font-bold text-slate-700 block">营业执照/食品经营/从业健康证明扫描件</span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">支持JPG, PNG, PDF，大小不超过5M (微信内置极速识别)</span>
                      
                      {/* Fake preview */}
                      <div className="mt-3 py-1.5 px-3 bg-white border rounded-full text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>已预装电子亮照资质.jpg (542KB)</span>
                      </div>
                    </div>

                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFoodSafetyModal(false);
                        onAddNotification("食品安全与从业证照参数更新成功，已实时在顾客端同步绿色标识！✅", "success");
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs text-center shadow-3xs active:scale-98 transition-all"
                    >
                      保存并提交审核认证
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>

      {/* Persistent Bottom Nav Bar for Seller (常驻操作功能，带我的及顾客角色切换) */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-150 px-2 py-1 flex items-center justify-around z-20 shadow-lg select-none">
        <button 
          onClick={() => {
            setActiveTab('assistant');
            onAddNotification("已切到：🎙️ AI助手", 'info');
          }}
          className={`flex flex-col items-center gap-1 justify-center flex-1 transition-all py-1.5 rounded-xl ${
            activeTab === 'assistant' ? 'text-emerald-600 font-extrabold scale-102' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Mic className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-sans">AI助手</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('products');
            onAddNotification("已切到：🍢 商品管理及定价盘库", 'info');
          }}
          className={`flex flex-col items-center gap-1 justify-center flex-1 transition-all py-1.5 rounded-xl ${
            activeTab === 'products' ? 'text-emerald-600 font-extrabold scale-102' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShoppingBag className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-sans">商品管理</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('ledger');
            onAddNotification("已切到：💰 地摊极简收支账本", 'info');
          }}
          className={`flex flex-col items-center gap-1 justify-center flex-1 transition-all py-1.5 rounded-xl ${
            activeTab === 'ledger' ? 'text-emerald-600 font-extrabold scale-102' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <DollarSign className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-sans">日账单</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('me');
            onAddNotification("已切到：👤 摊主中心。可在此切换回普通市民视角", 'info');
          }}
          className={`flex flex-col items-center gap-1 justify-center flex-1 transition-all py-1.5 rounded-xl ${
            activeTab === 'me' ? 'text-emerald-600 font-extrabold scale-102' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-sans">我的</span>
        </button>
      </div>

    </div>
  );
};
