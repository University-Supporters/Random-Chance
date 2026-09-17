import React from 'react';
import { Sparkles, ShieldCheck, Settings, Award } from 'lucide-react';

export default function Header({ isAdmin, onToggleAdmin, onGoHome }) {
  return (
    <header className="w-full bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* 로고 & 타이틀 */}
        <div 
          onClick={onGoHome}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-amber-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                2026 축제 부스
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Award className="w-3 h-3" /> GS25 1만원권 50명
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5 mt-0.5">
              인권 서포터즈 <span className="text-indigo-400">혜윰</span>
            </h1>
          </div>
        </div>

        {/* 관리자 전환 버튼 */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={onToggleAdmin}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>사용자 화면 보기</span>
            </button>
          ) : (
            <button
              onClick={onToggleAdmin}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
              title="관리자 페이지"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">운영진 관리</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
