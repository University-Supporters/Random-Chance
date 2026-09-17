import React from 'react';
import { CheckCircle, Gift, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function SuccessCard({ participantName, onReset }) {
  return (
    <div className="w-full max-w-xl mx-auto outdoor-contrast-card rounded-3xl p-6 sm:p-10 text-center border-4 border-emerald-400 animate-scale-up">
      <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
        <CheckCircle className="w-12 h-12" />
      </div>

      <span className="inline-block mt-4 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-sm border border-emerald-300">
        응모 접수 완료
      </span>

      <h2 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
        {participantName} 님, 응모 완료되었습니다!
      </h2>

      <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed">
        인권 서포터즈 <span className="font-bold text-indigo-600">혜윰</span> 축제 부스 이벤트에 참여해주셔서 진심으로 감사드립니다.
      </p>

      {/* 상품 안내 카드 */}
      <div className="mt-6 bg-gradient-to-br from-indigo-50 to-amber-50 border-2 border-indigo-200 rounded-2xl p-5 text-left">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400 text-slate-900 rounded-xl font-bold shadow">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-lg">GS25 1만원권 모바일 상품권</h4>
            <p className="text-sm font-bold text-indigo-700">총 50명 랜덤 추첨 증정</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-indigo-100 space-y-1.5 text-xs sm:text-sm text-slate-600 font-medium">
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            추첨 후 당첨자 50분께 등록하신 휴대폰 번호로 개별 발송됩니다.
          </p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            정보가 일치하지 않거나 중복 응모된 경우 당첨이 취소될 수 있습니다.
          </p>
        </div>
      </div>

      {/* 인권 서포터즈 응원 문구 */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-500 font-semibold">
        <HeartHandshake className="w-4 h-4 text-indigo-500" />
        모두가 존중받는 따뜻한 캠퍼스, 혜윰이 함께합니다.
      </div>

      {/* 다음 참여자 버튼 */}
      <div className="mt-8">
        <button
          onClick={onReset}
          className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-black text-lg shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 transition-all"
        >
          <span>새로운 참여자 등록하기</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
