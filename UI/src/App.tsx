import { useState, useEffect } from 'react';
import { WeChatSimulator } from './components/WeChatSimulator';
import { CustomerApp } from './components/CustomerApp';
import { SellerApp } from './components/SellerApp';
import { INITIAL_STALLS } from './data/mockData';
import { Stall } from './types';
import { 
  Smartphone, User, Store, Sparkles, Star, Target, CheckCircle2,
  CloudRain, HelpCircle, Flame, Send, ArrowRight, Zap, BellRing, Info, Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [stalls, setStalls] = useState<Stall[]>(INITIAL_STALLS);
  const [selectedStallId, setSelectedStallId] = useState<string>('1');
  const [activeMode, setActiveMode] = useState<'customer' | 'seller'>('customer');

  // Interactive scenario logs/notifications
  const [notifications, setNotifications] = useState<{ id: string; msg: string; type: 'info' | 'success' | 'warning' }[]>([]);

  const addNotification = (msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    setNotifications(prev => [{ id, msg, type }, ...prev].slice(0, 4));
  };

  useEffect(() => {
    // Welcome message
    addNotification("欢迎体验【地摊烟火小店】全功能微信小程序原型！🎉", "success");
    addNotification("您可以随时在顶部切换『顾客端』与『摊主端』感受两端数据联动。", "info");
  }, []);

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Preset Scenario triggers
  const triggerRainyDayScenario = () => {
    // Turn off active stalls, set statuses
    setStalls(prevStalls => {
      return prevStalls.map(s => {
        if (s.id === '1') {
          return {
            ...s,
            status: 'offline',
            statusText: '已收摊 / 雨天打烊歇业',
            announcement: '🌧️ 大雨天气，老周已开启营业保护，线上预约暂停。已向昨日预订的12位用户发出改期通知。'
          };
        }
        return {
          ...s,
          status: 'offline',
          statusText: '已收摊 / 雨天打烊歇业'
        };
      });
    });
    addNotification("🌧️ 剧本触发：突发暴雨！已自动开启歇业保护与订单自适应免责告知！", "warning");
    addNotification("若现在切换到顾客端，将看见老周小店显示『打烊中』，拒绝无效客单纠纷。", "info");
  };

  const triggerAIPricingScenario = () => {
    addNotification("⚖️ 演示：摊主在下午进货时，输入猪肉进价，AI已自动按周围客流密度生成溢价方案。", "success");
    addNotification("AI已自动下调尾货熟食价格 20%，生成朋友圈九宫格文案！", "info");
  };

  const currentStall = stalls.find(s => s.id === selectedStallId) || stalls[0];

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Background radial atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[140px]" />
      </div>

      {/* Main Top Header bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4.5 z-10 select-none shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-md shadow-emerald-900/30">
              🍢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm bg-emerald-900/60 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-800/60 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-emerald-400 animate-pulse" />
                  地摊经济轻量级解决方案
                </span>
              </div>
              <h1 className="text-lg font-black text-white tracking-tight">
                地摊小微商户线上小店微信小程序 • 交互界面设计方案
              </h1>
            </div>
          </div>

          {/* Core toggle between customer and seller */}
          <div className="p-1 bg-slate-800 rounded-full border border-slate-700/80 flex items-center relative gap-1 shadow-inner select-none shrink-0 scale-102">
            <button
              onClick={() => {
                setActiveMode('customer');
                addNotification("已切到：顾客端小程序 🏕️。您可以体验地摊实景扫街、限时预订与双向许愿池系统。", 'info');
              }}
              className={`px-5 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all duration-300 ease-out ${
                activeMode === 'customer'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>顾客端小程序 🔍</span>
            </button>
            
            <button
              onClick={() => {
                setActiveMode('seller');
                addNotification("已切到：摊主管理端小程序 👨‍🍳。您可以试用大字极简模式、AI语音对话命令与极简账本系统。", 'info');
              }}
              className={`px-5 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all duration-300 ease-out ${
                activeMode === 'seller'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>摊主管理端 📟</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start z-10 overflow-hidden">
        
        {/* Left column: Design documentation and Scenario playbook list */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1 custom-scrollbar">
          
          {/* Interaction scenario test tools */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3.5 relative">
            <div className="absolute top-3 right-3 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
              互动剧本
            </div>
            
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              极速模拟地摊多维突发场景
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed leading-normal">
              下方预设了摊点日常突发剧本，点击即可<strong>一键注入两端数据包</strong>，感受小店对地摊高流动、客流短时的动态自适应逻辑：
            </p>

            <div className="space-y-2 pt-1">
              
              {/* Scenario 1 */}
              <button 
                onClick={triggerRainyDayScenario}
                className="w-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 p-3 rounded-xl text-left flex items-start gap-2.5 transition-all hover:border-slate-600 active:scale-98"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-900/50 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <CloudRain className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-bold text-slate-200">突发暴雨/城规变道 • 一键歇业保护</h4>
                  <p className="text-[10px] text-slate-400">两端同步打烊下架外卖，自提订单发无责推迟信，不扣定金，确保信誉。</p>
                </div>
              </button>

              {/* Scenario 2 */}
              <button 
                onClick={() => {
                  setStalls(prevStalls => {
                    return prevStalls.map(s => {
                      if (s.id === '1') {
                        const newWishList: any = [
                          {
                            id: `wish-scen-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
                            userName: '街坊李阿姨',
                            userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100',
                            content: '周师傅，下周重阳节能不能预定20串微脆鱿鱼须自提啊？老人家过生日想吃！',
                            date: '刚刚',
                            likes: 5,
                            likedByUser: false,
                            status: 'pending'
                          },
                          ...s.wishes
                        ];
                        return { ...s, wishes: newWishList };
                      }
                      return s;
                    });
                  });
                  addNotification("💌 顾客李阿姨刚才在线提交了一条【定制购买许愿】！", "success");
                  addNotification("请切到【摊主端】->【AI助手】查看许愿热力更新并及时回复！", "info");
                }}
                className="w-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 p-3 rounded-xl text-left flex items-start gap-2.5 transition-all hover:border-slate-600 active:scale-98"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-900/50 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-bold text-slate-200">顾客发起许愿 • 双向按需进货</h4>
                  <p className="text-[10px] text-slate-400">顾客求购某定制款式或大量订货，触发AI，摊主在线答复免亏损备漏。</p>
                </div>
              </button>

              {/* Scenario 3 */}
              <button 
                onClick={() => {
                  // Simulate client reservation order
                  addNotification("🛎️ 新订单警报：有顾客线上下单并领券【招牌大鱿鱼】自提！", "success");
                  addNotification("小店聚合码已增加提货单。摊主账本已增加 15 元今日预期营收！", "info");
                }}
                className="w-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 p-3 rounded-xl text-left flex items-start gap-2.5 transition-all hover:border-slate-600 active:scale-98"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Target className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-bold text-slate-200">老客线上扫码下单 • 一码汇集二次复购</h4>
                  <p className="text-[10px] text-slate-400">无需额外下载APP，直接调动附近小程序，实现地摊客单快速线上自提锁客。</p>
                </div>
              </button>

            </div>
          </div>

          {/* Design Principle Analysis Column */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4.5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              微信小程序交互规范对齐说明
            </h3>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <div className="space-y-1">
                <p className="font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  大字极探模式（摊主刚需）
                </p>
                <p className="text-[11px] text-slate-405 text-slate-400 pl-2.5">
                  摊主多中老年或现场爆爆炒、手上繁忙。我们提供一键切换【大字极简模式】，按键做成卡片，放大了行间距配高亮背景色，防误触。
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  极简免预付费心理摩擦
                </p>
                <p className="text-[11px] text-slate-400 pl-2.5">
                  顾客购买街头美食，对“线上付了定金怕被鸽”心理防砂强。小程序默认采用『免保证金自留自提』规则，现场扫码验货再付款，极大幅降低小程序使用心理门槛！
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  实景探店与流动挂载
                </p>
                <p className="text-[11px] text-slate-400 pl-2.5">
                  小程序内置 AI 轻量化去杂乱街景预览。不仅解决传统高德无法识别临时地摊的盲区，配合一键精准纠偏导航、正在出摊/收摊状态展示，彻底解决顾客“跑空、找不对街角”核心痛点。
                </p>
              </div>
            </div>
          </div>
          
        </div>

        {/* Center column: WeChat Mini Program Simulator display */}
        <div className="lg:col-span-4 flex justify-center py-2 h-full z-10">
          <WeChatSimulator 
            title={activeMode === 'customer' ? '顾客版 🍱 市民扫街小店' : '摊主版 👨‍🍳 AI智能副驾驶'}
            onRefresh={() => {
              setStalls(INITIAL_STALLS);
              addNotification("重置成初始状态！已还原所有点位和AI分析日志 🔄", "info");
            }}
          >
            {activeMode === 'customer' ? (
              <CustomerApp
                stalls={stalls}
                setStalls={setStalls}
                selectedStallId={selectedStallId}
                setSelectedStallId={setSelectedStallId}
                onAddNotification={addNotification}
                activeMode={activeMode}
                setActiveMode={setActiveMode}
              />
            ) : (
              <SellerApp
                stalls={stalls}
                setStalls={setStalls}
                selectedStallId={selectedStallId}
                setSelectedStallId={setSelectedStallId}
                onAddNotification={addNotification}
                activeMode={activeMode}
                setActiveMode={setActiveMode}
              />
            )}
          </WeChatSimulator>
        </div>

        {/* Right column: Interactive Quick Actions & Visual highlights */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-140px)] pl-1 custom-scrollbar">
          
          {/* Active Vendor status monitor (High fidelity sandbox) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3 relative">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Info className="w-4 h-4 text-emerald-400 animate-pulse" />
              两端沙盒数据实时共享联动面板
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300">
              
              <div className="bg-slate-800/40 p-2.5 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">
                  当前处于焦点的地摊：
                </span>
                <p className="font-bold text-sm text-emerald-400">{currentStall.name}</p>
                <p className="text-[11px] text-slate-400">{currentStall.location}</p>
              </div>

              <div className="flex justify-between items-center bg-slate-800/40 p-2.5 rounded-xl">
                <span>
                  当前在线在售货品数量：
                </span>
                <strong className="text-white text-sm">{currentStall.products.length} 样</strong>
              </div>

              <div className="bg-slate-805 bg-slate-800/40 p-2.5 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">
                  最热许愿词统计 (AI指导选品进货)：
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentStall.wishes.map((w, i) => (
                    <span key={i} className="text-[9px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md">
                      🎯 {w.content.substring(0, 7)}... ({w.likes}关注)
                    </span>
                  ))}
                </div>
              </div>

              <div className="border border-dashed border-slate-800 rounded-xl p-3 bg-emerald-900/10 text-[11px] text-emerald-300/90 leading-relaxed font-sans space-y-1.5">
                <p className="font-bold flex items-center gap-1 text-[10px]">
                  <HelpCircle className="w-3.5 h-3.5" />
                  提示：体验联动秘籍：
                </p>
                <p>
                  1. 在【摊主端】上架一个美食（或点击AI底部的语音指令），然后切回【顾客端】，线上菜单会<strong>神奇同步多出它</strong>！
                </p>
                <p>
                  2. 在【顾客端】提交一个预定订单或点击许愿，摊主的账本和AI推荐热力会<strong>同步新增分析</strong>！
                </p>
              </div>

            </div>
          </div>

          {/* Quick Stats list (Demonstrating Recharts or beautiful SVG visual metrics) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4.5 space-y-2">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              智地摊大白话经营风控模型
            </h3>

            <div className="text-xs text-slate-300 leading-normal space-y-2.5">
              <div className="flex justify-between items-center border-b border-slate-850 border-slate-800/50 pb-1.5">
                <span className="text-slate-400">一期上线核心：</span>
                <span className="bg-emerald-900/70 text-emerald-300 px-2 py-0.5 rounded text-[10px]">100% 覆盖闭环</span>
              </div>
              
              <div className="space-y-1">
                <p className="font-bold text-slate-200">资金分级一键极速清算</p>
                <p className="text-[10px] text-slate-450 text-slate-400">
                  支持按天、自动提款到微信钱包。提供一码聚合，路人可以直接扫码领下次入店5元首单券，直接把线下无名客锁定成线上高频老客，实现裂变！
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-slate-200">全渠道流转与免租期对账</p>
                <p className="text-[10px] text-slate-400">
                  自动合并记账。不管是线上顾客拼团，还是线下顾客自提，AI 都会剔除摊位费、材料货品成本，把今天「净利润具体赚了几块钱」翻译成纯白言表，中老年摊主也能看得津津有味。
                </p>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Floating Interactive Toast notifications list */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none select-none max-w-sm">
        <AnimatePresence>
          {notifications.map(notif => {
            const colors = {
              success: 'bg-emerald-600/95 border-emerald-500 text-white shadow-emerald-950/20',
              warning: 'bg-amber-600/95 border-amber-500 text-white shadow-amber-950/20',
              info: 'bg-slate-900/95 border-slate-800 text-slate-200 shadow-slate-950/20'
            };
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 shadow-lg backdrop-blur text-xs leading-normal pointer-events-auto ${colors[notif.type]}`}
              >
                <button 
                  onClick={() => clearNotification(notif.id)} 
                  className="p-0.5 bg-black/10 hover:bg-black/20 rounded font-bold shrink-0 text-[10px] flex items-center justify-center w-4 h-4 ml-auto order-last pointer-events-auto"
                >
                  ✕
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-black text-[10px] uppercase tracking-wide opacity-80">
                      系统实时播报:
                    </span>
                  </div>
                  <p>{notif.msg}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
}
