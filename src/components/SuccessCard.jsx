import React from 'react';
import { CheckCircle2, Gift, ArrowRight, HeartHandshake } from 'lucide-react';

export default function SuccessCard({ participantName, onReset }) {
  return (
    <div className="w-full max-w-md mx-auto my-auto glass-panel rounded-3xl p-6 sm:p-7 text-center shadow-2xl animate-scale-up">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-inner">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <span className="inline-block mt-3 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold text-xs border border-emerald-500/20">
        응모 접수 완료
      </span>

      <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-white tracking-tight">
        {participantName} 님, 등록 완료!
      </h2>

      <p className="mt-1 text-slate-400 text-xs sm:text-sm font-medium">
        인권 서포터즈 <span className="text-indigo-400 font-bold">혜윰</span> 부스에 참여해주셔서 감사합니다.
      </p>

      {/* 모던 경품 안내 카드 */}
      <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/60 border border-white/[0.06] text-left flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/20 shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-white text-sm">GS25 1만원권 모바일 상품권</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">총 50명 추첨 후 등록된 번호로 발송</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
        <HeartHandshake className="w-3.5 h-3.5 text-indigo-400" />
        모두가 존중받는 따뜻한 캠퍼스 문화를 만들어갑니다.
      </div>

      {/* 다음 참여자 등록 버튼 */}
      <div className="mt-5">
        <button
          onClick={onReset}
          className="w-full h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-[0.99] text-white font-bold text-xs border border-white/10 shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <span>새로운 참여자 등록하기</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
