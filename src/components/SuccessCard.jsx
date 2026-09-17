import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Gift, Sparkles } from 'lucide-react';

export default function SuccessCard({ participantName, onReset }) {
  const [countdown, setCountdown] = useState(3);

  // 마운트 시 축하 Confetti 폭죽 & 자동 화면 전환 타이머
  useEffect(() => {
    // Confetti 파티클
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#10b981', '#f59e0b']
    });

    // 1초마다 카운트다운 감소
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onReset]);

  return (
    <div 
      onClick={onReset}
      className="w-full max-w-md mx-auto my-auto glass-panel rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-scale-up cursor-pointer select-none group relative overflow-hidden"
      title="화면을 터치하면 즉시 다음 화면으로 넘어갑니다"
    >
      {/* 상단 프로그레스 바 (자동 전환 게이지) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-amber-400 transition-all duration-1000 ease-linear"
          style={{ width: `${(countdown / 3) * 100}%` }}
        />
      </div>

      {/* 완료 아이콘 펄스 애니메이션 */}
      <div className="relative w-16 h-16 mx-auto mb-3">
        <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping opacity-60" />
        <div className="relative w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
          <CheckCircle2 className="w-9 h-9 animate-bounce-slow" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold text-xs border border-emerald-500/20 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span>응모 완료되었습니다!</span>
      </div>

      <h2 className="text-2xl font-extrabold text-white tracking-tight">
        {participantName} 님, 접수 완료!
      </h2>

      <p className="mt-1.5 text-slate-400 text-xs sm:text-sm font-medium">
        인권 서포터즈 <span className="text-indigo-400 font-bold">혜윰</span> 부스에 참여해주셔서 감사합니다.
      </p>

      {/* 경품 안내 카드 */}
      <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/60 border border-white/[0.06] text-left flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/20 shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-white text-sm">GS25 1만원권 모바일 상품권</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">50명 추첨 후 등록하신 번호로 발송됩니다</p>
        </div>
      </div>

      {/* 자동 전환 알림 안내 */}
      <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>잠시 후 입력 화면으로 전환됩니다</span>
        <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
          {countdown}초
        </span>
      </div>
    </div>
  );
}
