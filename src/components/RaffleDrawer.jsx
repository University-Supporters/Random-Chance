import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, Trophy, Download, Copy, RotateCcw, AlertTriangle, Check, Users, ExternalLink } from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import { exportToCSV, formatDateTime } from '../lib/utils';

export default function RaffleDrawer({ 
  participants = [], 
  winners = [], 
  onDraw, 
  onResetDraw 
}) {
  const [targetCount, setTargetCount] = useState(50);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rollerText, setRollerText] = useState('추첨 준비 완료');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 추첨 애니메이션 효과
  const triggerConfetti = () => {
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const handleStartDraw = async () => {
    if (participants.length === 0) {
      setErrorMsg('추첨할 참여자가 없습니다. 먼저 응모를 받아주세요.');
      return;
    }

    setErrorMsg('');
    setIsDrawing(true);

    // 롤링 애니메이션 (랜덤 이름이 빠르게 바뀌는 연출)
    let rollTimer;
    let count = 0;
    const maxRolls = 30;

    rollTimer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * participants.length);
      const p = participants[randomIndex];
      setRollerText(`🎲 추첨 중... [${p.studentId}] ${p.name}`);
      count++;

      if (count >= maxRolls) {
        clearInterval(rollTimer);
        // 실제 백엔드 추첨 API 호출
        onDraw(targetCount).then((res) => {
          setIsDrawing(false);
          setRollerText('🎉 50명 추첨 완료!');
          triggerConfetti();
        }).catch((err) => {
          setIsDrawing(false);
          setErrorMsg(err.message || '추첨 중 오류가 발생했습니다.');
        });
      }
    }, 80);
  };

  // 클립보드 복사 (인스타그램 아이디 포함)
  const handleCopyClipboard = () => {
    if (winners.length === 0) return;
    const text = [
      `🎁 [인권 서포터즈 혜윰] 축제 부스 GS25 1만원권 당첨자 명단 (총 ${winners.length}명) 🎁`,
      '',
      ...winners.map((w, i) => `${i + 1}. [${w.studentId}] ${w.name} (${w.phone.slice(0, 3)}-****-${w.phone.slice(-4)}) | 인스타: ${w.instagram || '없음'}`)
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // CSV 다운로드 (인스타그램 아이디 열 포함)
  const handleDownloadCSV = () => {
    if (winners.length === 0) return;
    const headers = ['당첨순위', '학번', '이름', '전화번호', '인스타그램', '참여일시', '추첨일시'];
    const rows = winners.map((w, idx) => [
      idx + 1,
      w.studentId,
      w.name,
      w.phone,
      w.instagram || '없음',
      formatDateTime(w.createdAt),
      formatDateTime(w.wonAt)
    ]);
    exportToCSV(`혜윰_축제부스_당첨자50명_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* 추첨 제어 상단 배너 */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs sm:text-sm font-black mb-3">
            <Trophy className="w-4 h-4 text-amber-400" />
            GS25 1만원권 50인 랜덤 추첨 머신
          </div>

          <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            공정하고 투명한 랜덤 당첨자 추첨
          </h3>

          <p className="mt-2 text-slate-400 text-sm sm:text-base font-medium max-w-xl mx-auto">
            현재 등록된 총 <span className="font-bold text-amber-400 font-mono">{participants.length}</span>명의 참가자 중 중복 없이 무작위로 50명을 선발합니다.
          </p>

          {/* 롤링 디스플레이 박스 */}
          <div className="mt-6 max-w-lg mx-auto bg-slate-950 border-2 border-indigo-500/50 rounded-2xl p-4 shadow-inner">
            <p className="text-amber-400 font-mono font-black text-lg sm:text-2xl tracking-wide min-h-[36px] flex items-center justify-center">
              {rollerText}
            </p>
          </div>

          {errorMsg && (
            <div className="mt-4 max-w-md mx-auto p-3 bg-red-900/50 border border-red-500/60 rounded-xl text-red-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 추첨 버튼 */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleStartDraw}
              disabled={isDrawing || participants.length === 0}
              className="py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-95 text-slate-950 font-black text-lg sm:text-xl shadow-xl shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-6 h-6 text-slate-950" />
              <span>{isDrawing ? '추첨 룰렛 회전 중...' : (winners.length > 0 ? '다시 50명 재추첨하기' : '✨ 50명 랜덤 추첨 시작!')}</span>
            </button>

            {winners.length > 0 && (
              <button
                onClick={onResetDraw}
                disabled={isDrawing}
                className="py-4 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 transition-colors flex items-center gap-1.5"
                title="결과 초기화"
              >
                <RotateCcw className="w-4 h-4" />
                <span>추첨 초기화</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 당첨자 명단 섹션 */}
      {winners.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h4 className="text-xl font-black text-white">
                  축하합니다! 최종 당첨자 명단 ({winners.length}명)
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                GS25 1만원권 기프티콘 발송 대상자 명단입니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyClipboard}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '복사 완료!' : '명단 텍스트 복사'}</span>
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition-all"
              >
                <Download className="w-4 h-4" />
                <span>당첨자 CSV 저장</span>
              </button>
            </div>
          </div>

          {/* 50명 그리드 카드 뷰 */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-[550px] overflow-y-auto pr-1">
            {winners.map((w, idx) => (
              <div
                key={w.id || idx}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 transition-all flex flex-col justify-between group hover:border-amber-400/50 shadow"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-mono font-black text-xs flex items-center justify-center border border-amber-400/30">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {w.studentId}
                  </span>
                </div>
                <div>
                  <h5 className="font-black text-white text-base group-hover:text-amber-300 transition-colors">
                    {w.name}
                  </h5>
                  <p className="font-mono text-xs text-indigo-400 mt-0.5">
                    {w.phone}
                  </p>
                </div>
                {w.instagram && w.instagram !== '없음' ? (
                  <a
                    href={`https://instagram.com/${w.instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 hover:bg-pink-500/25 hover:border-pink-500/50 transition-all w-fit"
                    title={`${w.name}님의 인스타 열기 (팔로우 확인)`}
                  >
                    <InstagramIcon className="w-3 h-3 text-pink-400" />
                    <span>{w.instagram}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                ) : (
                  <span className="mt-2.5 text-[10px] text-slate-500 font-medium px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 w-fit">
                    인스타 없음
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
