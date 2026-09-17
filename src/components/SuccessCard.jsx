import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Check, Sparkles, Gift } from 'lucide-react';

export default function SuccessCard({ participantName, onReset }) {
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 1. 화려한 Confetti 폭죽 팡 터뜨리기
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'],
        zIndex: 9999
      });
    } catch (e) {
      console.error(e);
    }

    // 2. 2초 후 페이드아웃 시작
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2000);

    // 3. 2.4초 후 자동으로 첫 화면으로 전환
    const resetTimer = setTimeout(() => {
      if (onResetRef.current) {
        onResetRef.current();
      }
    }, 2400);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(resetTimer);
    };
  }, []);

  return (
    <div className={`w-full max-w-sm mx-auto my-auto transition-all duration-300 transform ${
      isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-scale-up'
    }`}>
      <div className="glass-panel rounded-3xl p-7 text-center shadow-2xl relative overflow-hidden border border-emerald-500/30">
        {/* 상단 프로그레스 바 (2.4초 동안 부드럽게 감소) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 via-indigo-500 to-amber-400 animate-[pulse_1s_infinite] w-full" />
        </div>

        {/* 팡 터지는 체크마크 서클 애니메이션 */}
        <div className="relative w-20 h-20 mx-auto my-2">
          <div className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping opacity-75" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
            <Check className="w-10 h-10 stroke-[3] animate-bounce-slow" />
          </div>
        </div>

        {/* 축하 뱃지 */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-bold text-xs border border-emerald-500/25 mt-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>응모가 완료되었습니다!</span>
        </div>

        {/* 안내 텍스트 */}
        <h2 className="text-2xl font-black text-white tracking-tight">
          {participantName} 님 접수 완료
        </h2>

        <p className="mt-1.5 text-slate-400 text-xs font-medium">
          GS25 1만원권 50인 추첨에 정상 등록되었습니다.
        </p>

        {/* 안내 팁 */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-white/[0.06] text-xs text-slate-300 flex items-center justify-center gap-2 font-medium">
          <Gift className="w-4 h-4 text-amber-400 shrink-0" />
          <span>추첨 후 등록하신 번호로 기프티콘 발송</span>
        </div>

        {/* 자동 전환 힌트 */}
        <div className="mt-4 pt-2 text-[11px] text-slate-500 font-medium">
          잠시 후 다음 참여자 화면으로 자동 전환됩니다...
        </div>
      </div>
    </div>
  );
}
