import React, { useState, useEffect } from 'react';
import { Signal, Wifi, Battery, MoreHorizontal, CircleDot, RefreshCw } from 'lucide-react';

interface WeChatSimulatorProps {
  children: React.ReactNode;
  title: string;
  onRefresh?: () => void;
  appName?: string;
}

export const WeChatSimulator: React.FC<WeChatSimulatorProps> = ({
  children,
  title,
  onRefresh,
  appName = "地摊烟火小店"
}) => {
  const [time, setTime] = useState('19:42');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours().toString().padStart(2, '0');
      let minutes = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-[390px] h-[780px] bg-slate-50 rounded-[40px] border-[12px] border-slate-900 overflow-hidden relative flex flex-col wechat-phone-shadow font-sans">
      {/* Phone Camera Notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-900 rounded-full z-50 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-slate-800 ml-auto mr-4" />
      </div>

      {/* Top Mobile Status Bar (iOS Style) */}
      <div className="h-10 bg-slate-100 px-6 pt-3 flex justify-between items-center text-xs text-slate-800 font-medium select-none z-40">
        <span>{time}</span>
        <div className="flex items-center gap-1.5">
          <Signal className="w-3.5 h-3.5" />
          <span className="text-[10px]">5G</span>
          <Wifi className="w-3.5 h-3.5" />
          <Battery className="w-4 h-4 text-slate-800 fill-slate-800" />
        </div>
      </div>

      {/* WeChat Mini Program Header Bar */}
      <div className="h-12 bg-white border-b border-slate-100 flex items-center justify-between px-3 select-none z-40">
        <div className="flex items-center gap-2 max-w-[200px]">
          <button 
            onClick={onRefresh}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
            title="重新加载"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 truncate">{appName}</span>
            <span className="text-[9px] text-slate-400 -mt-0.5 font-mono">{title}</span>
          </div>
        </div>

        {/* The Classic WeChat Capsule Menu Button (胶囊按钮) */}
        <div className="flex items-center gap-2.5 bg-white/70 backdrop-blur border border-slate-200/80 rounded-full px-2.5 py-1.5 shadow-sm">
          <button className="text-slate-800 hover:text-slate-500 active:scale-90 transition-transform">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-3 bg-slate-200" />
          <button className="text-slate-900 hover:text-rose-600 active:scale-90 transition-transform">
            <CircleDot className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Application Body Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col bg-slate-100 custom-scrollbar">
        {children}
      </div>

      {/* Swipe Home Indicator (iOS Bar) */}
      <div className="h-3.5 bg-white flex justify-center items-center select-none shrink-0 border-t border-slate-50">
        <div className="w-28 h-1 bg-slate-800 rounded-full" />
      </div>
    </div>
  );
};
