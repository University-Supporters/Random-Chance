import React from 'react';
import { Sparkles, ShieldCheck, Settings, Gift } from 'lucide-react';

export default function Header({ isAdmin, onToggleAdmin, onGoHome, operator, onOpenDeviceSelect }) {
  return (
    <header className="w-full bg-slate-950/40 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-30 shrink-0">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 로고 & 타이틀 */}
        <div 
          onClick={onGoHome}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
              인권 서포터즈 <span className="text-indigo-400">혜윰</span>
            </span>
            <span className="hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
              GS25 1만원권 50명
            </span>
          </div>
        </div>

        {/* 우측 단말기 표시 & 모드 전환 */}
        <div className="flex items-center gap-2">
          {/* 단말기 담당자 배지 */}
          <button
            onClick={onOpenDeviceSelect}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
            title="단말기 담당 서포터즈 변경"
          >
            <span>💻</span>
            <span className="font-bold text-white">{operator || '기기선택'}</span>
            <span className="text-[10px] text-indigo-400">▾</span>
          </button>
          {isAdmin ? (
            <button
              onClick={onToggleAdmin}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>응모 화면</span>
            </button>
          ) : (
            <button
              onClick={onToggleAdmin}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer"
              title="운영진 페이지"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">운영진</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
