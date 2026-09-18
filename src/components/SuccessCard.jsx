import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Check, Sparkles, Gift, ArrowRight } from 'lucide-react';

export default function SuccessCard({ participantName, onReset }) {
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  const [secondsLeft, setSecondsLeft] = useState(5);
  const [isExiting, setIsExiting] = useState(false);

  // 즉시 넘어가기 핸들러
  const handleInstantSkip = () => {
    onResetRef.current?.();
  };

  useEffect(() => {
    // 1. 화려한 Confetti 폭죽 팡 터뜨리기
    try {
      confetti({
        disableForReducedMotion: true,
        particleCount: 85,
        spread: 85,
        origin: { y: 0.55 },
        colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'],
        zIndex: 9999
      });
    } catch (e) {
      console.error(e);
    }

    // 2. 실시간 초 카운트다운 (5초)
    const countdownInterval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 3. 4.8초 후 페이드아웃 시작
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 4800);

    // 4. 5초 후 최종 화면 전환
    const resetTimer = setTimeout(() => {
      if (onResetRef.current) {
        onResetRef.current();
      }
    }, 5000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(exitTimer);
      clearTimeout(resetTimer);
    };
  }, []);

  return (
    <div 
      onClick={handleInstantSkip}
      className={`w-full max-w-sm mx-auto my-auto transition-all duration-400 transform cursor-pointer select-none group ${
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-scale-up'
      }`}
      title="터치하면 즉시 다음 참여자 화면으로 넘어갑니다"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-7 text-center shadow-2xl relative overflow-hidden border border-emerald-500/30">
        {/* 상단 프로그레스 바 (5초 동안 부드럽게 감소) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-400 via-indigo-500 to-amber-400 transition-all duration-1000 ease-linear"
            style={{ width: `${(secondsLeft / 5) * 100}%` }}
          />
        </div>

        {/* 팡 터지는 체크마크 서클 애니메이션 */}
        <div className="relative w-16 h-16 mx-auto my-2">
          <div className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping opacity-75" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
            <Check className="w-9 h-9 stroke-[3] animate-bounce-slow" />
          </div>
        </div>

        {/* 축하 뱃지 */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-bold text-xs border border-emerald-500/25 mt-1.5 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>응모가 완료되었습니다!</span>
        </div>

        {/* 안내 텍스트 */}
        <h2 className="text-2xl font-black text-white tracking-tight">
          {participantName} 님 접수 완료
        </h2>

        <p className="mt-1 text-slate-400 text-xs font-medium">
          GS25 1만원권 50인 추첨에 정상 등록되었습니다.
        </p>

        {/* 안내 카드 */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-950/60 border border-white/[0.06] text-xs text-slate-300 flex items-center justify-center gap-2 font-medium">
          <Gift className="w-4 h-4 text-amber-400 shrink-0" />
          <span>추첨 후 등록하신 번호로 기프티콘 발송</span>
        </div>

        {/* 자동 전환 게이지 및 즉시 넘어가기 힌트 */}
        <div className="mt-4 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1 text-slate-500">
            <span>화면 터치 시 즉시 이동</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
          <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {secondsLeft}초 후 전환
          </span>
        </div>
      </div>
    </div>
  );
}
