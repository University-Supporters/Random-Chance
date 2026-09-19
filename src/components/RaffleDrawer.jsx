import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, Trophy, Download, Copy, RotateCcw, AlertTriangle, Check, Users, ExternalLink, UserX, RefreshCw, ChevronDown, ChevronUp, History, Undo2, X } from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import { exportToCSV, formatDateTime } from '../lib/utils';

const REASON_PRESETS = [
  '인스타그램 미팔로우 (계정 미확인 또는 미팔로우)',
  '본인 확인 불일치 (학번 / 성명 상이)',
  '축제 부스 참여 필수 미션 미충족',
  '중복 응모 및 비정상 참여 의심',
  '직접 입력'
];

export default function RaffleDrawer({ 
  participants = [], 
  winners = [], 
  disqualified = [],
  onDraw, 
  onResetDraw,
  onDisqualifyWinner,
  onSupplementDraw,
  onRestoreDisqualified
}) {
  const [targetCount, setTargetCount] = useState(50);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSupplementing, setIsSupplementing] = useState(false);
  const [rollerText, setRollerText] = useState('추첨 준비 완료');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDisqualifiedList, setShowDisqualifiedList] = useState(false);

  // 제외 모달 상태
  const [disqualifyModal, setDisqualifyModal] = useState({
    isOpen: false,
    winner: null,
    reason: REASON_PRESETS[0],
    customReason: '',
    isSubmitting: false,
    error: ''
  });

  const vacancyCount = Math.max(0, 50 - winners.length);

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

  // 최초 50인 추첨
  const handleStartDraw = async () => {
    if (participants.length === 0) {
      setErrorMsg('추첨할 참여자가 없습니다. 먼저 응모를 받아주세요.');
      return;
    }

    setErrorMsg('');
    setIsDrawing(true);

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

  // 제외된 공석만큼만 보충 추첨
  const handleStartSupplementDraw = async () => {
    if (vacancyCount <= 0) return;
    setIsSupplementing(true);
    setErrorMsg('');

    let rollTimer;
    let count = 0;
    const maxRolls = 25;

    const existingWinnerIds = new Set(winners.map(w => w.id));
    const disqualifiedIds = new Set(disqualified.map(d => d.id));
    const availablePool = participants.filter(p => !existingWinnerIds.has(p.id) && !disqualifiedIds.has(p.id));

    if (availablePool.length === 0) {
      setIsSupplementing(false);
      setErrorMsg('추가로 추첨할 수 있는 미당첨 참가자가 없습니다.');
      return;
    }

    rollTimer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * availablePool.length);
      const p = availablePool[randomIndex];
      setRollerText(`🎲 공석 ${vacancyCount}명 추가 보충 추첨 중... [${p.studentId}] ${p.name}`);
      count++;

      if (count >= maxRolls) {
        clearInterval(rollTimer);
        onSupplementDraw(50).then((res) => {
          setIsSupplementing(false);
          setRollerText(`🎉 공석 ${res.supplementCount || vacancyCount}명 추가 보충 선발 완료 (총 50명 달성)!`);
          triggerConfetti();
        }).catch((err) => {
          setIsSupplementing(false);
          setErrorMsg(err.message || '보충 추첨 중 오류가 발생했습니다.');
        });
      }
    }, 80);
  };

  // 제외 모달 열기
  const handleOpenDisqualifyModal = (winner) => {
    setDisqualifyModal({
      isOpen: true,
      winner,
      reason: REASON_PRESETS[0],
      customReason: '',
      isSubmitting: false,
      error: ''
    });
  };

  // 제외 확정 처리
  const handleConfirmDisqualify = async (e) => {
    e?.preventDefault();
    if (!disqualifyModal.winner) return;

    const finalReason = disqualifyModal.reason === '직접 입력'
      ? (disqualifyModal.customReason.trim() || '조건 미충족')
      : disqualifyModal.reason;

    setDisqualifyModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
    try {
      if (onDisqualifyWinner) {
        await onDisqualifyWinner(disqualifyModal.winner.id, finalReason);
      }
      setDisqualifyModal({
        isOpen: false,
        winner: null,
        reason: REASON_PRESETS[0],
        customReason: '',
        isSubmitting: false,
        error: ''
      });
      setRollerText(`⚠️ 당첨자 제외 완료 (${disqualifyModal.winner.name}님). 보충 추첨을 진행해 주세요.`);
    } catch (err) {
      setDisqualifyModal(prev => ({ ...prev, isSubmitting: false, error: err.message || '제외 처리에 실패했습니다.' }));
    }
  };

  // 제외자 복원 처리
  const handleRestore = async (participantId) => {
    if (winners.length >= 50) {
      alert('이미 당첨자가 50명으로 꽉 차 있어 복원할 수 없습니다. 먼저 인원을 제외해 주세요.');
      return;
    }
    if (!confirm('해당 인원을 다시 당첨자 명단으로 복원하시겠습니까?')) return;

    try {
      if (onRestoreDisqualified) {
        await onRestoreDisqualified(participantId);
      }
    } catch (err) {
      alert(err.message || '복원 중 오류가 발생했습니다.');
    }
  };

  // 클립보드 복사 (인스타그램 아이디 포함)
  const handleCopyClipboard = () => {
    if (winners.length === 0) return;
    const text = [
      `🎁 [인권 서포터즈 혜윰] 축제 부스 GS25 1만원권 당첨자 명단 (총 ${winners.length}명) 🎁`,
      '',
      ...winners.map((w, i) => `${i + 1}. [${w.studentId}] ${w.name} (${w.phone.slice(0, 3)}-****-${w.phone.slice(-4)}) | 인스타: ${w.instagram || '없음'}${w.isSupplement ? ' (보충선발)' : ''}`)
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // CSV 다운로드 (인스타그램 아이디 열 포함)
  const handleDownloadCSV = () => {
    if (winners.length === 0) return;
    const headers = ['당첨순위', '학번', '이름', '전화번호', '인스타그램', '구분', '참여일시', '추첨일시'];
    const rows = winners.map((w, idx) => [
      idx + 1,
      w.studentId,
      w.name,
      w.phone,
      w.instagram || '없음',
      w.isSupplement ? '보충선발' : '정규선발',
      formatDateTime(w.createdAt),
      formatDateTime(w.wonAt)
    ]);
    exportToCSV(`혜윰_축제부스_당첨자_${winners.length}명_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
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

          {/* 추첨 버튼 그룹 */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleStartDraw}
              disabled={isDrawing || isSupplementing || participants.length === 0}
              className="py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-95 text-slate-950 font-black text-lg sm:text-xl shadow-xl shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-6 h-6 text-slate-950" />
              <span>
                {isDrawing 
                  ? '추첨 룰렛 회전 중...' 
                  : (winners.length > 0 ? '처음부터 50명 전체 재추첨하기' : '✨ 50명 랜덤 추첨 시작!')}
              </span>
            </button>

            {winners.length > 0 && (
              <button
                onClick={onResetDraw}
                disabled={isDrawing || isSupplementing}
                className="py-4 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="추첨 및 제외 이력 초기화"
              >
                <RotateCcw className="w-4 h-4" />
                <span>추첨 초기화</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 공석 발생 시 보충 추첨 안내 배너 */}
      {winners.length > 0 && vacancyCount > 0 && (
        <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-orange-950/70 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 animate-fade-in">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-black text-2xl shrink-0">
              ⚠️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-lg sm:text-xl font-black text-white">
                  조건 미충족으로 인한 공석 발생
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black font-mono">
                  현재 {winners.length}명 / 목표 50명 ({vacancyCount}명 공석)
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                조건 미충족(인스타 미팔로우 등) 인원을 제외하였습니다. <br className="hidden sm:inline" />
                기존 정규 당첨자 및 제외된 인원을 뺀 나머지 참여자 중에서 <strong className="text-amber-400 font-bold">비어있는 {vacancyCount}명만 즉시 추가 보충 추첨</strong>할 수 있습니다.
              </p>
            </div>
          </div>

          <button
            onClick={handleStartSupplementDraw}
            disabled={isDrawing || isSupplementing}
            className="w-full md:w-auto shrink-0 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isSupplementing ? 'animate-spin' : ''}`} />
            <span>{isSupplementing ? '보충 추첨 진행 중...' : `🎲 제외된 ${vacancyCount}명 추가 보충 추첨하기`}</span>
          </button>
        </div>
      )}

      {/* 당첨자 명단 섹션 */}
      {winners.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h4 className="text-xl font-black text-white">
                  축하합니다! 현재 당첨자 명단 ({winners.length}명)
                </h4>
                {vacancyCount === 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
                    50인 충원 완료
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono">
                    {vacancyCount}명 공석 발생 중
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                인스타그램 팔로우 여부 등 조건을 확인하고, 미충족 인원은 우측 [✕ 제외] 버튼으로 제외할 수 있습니다.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyClipboard}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '복사 완료!' : '명단 텍스트 복사'}</span>
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>당첨자 CSV 저장</span>
              </button>
            </div>
          </div>

          {/* 당첨자 그리드 카드 뷰 */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-[550px] overflow-y-auto pr-1">
            {winners.map((w, idx) => (
              <div
                key={w.id || idx}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 transition-all flex flex-col justify-between group hover:border-amber-400/50 shadow relative"
              >
                {/* 상단 순위 & 학번 & 제외 버튼 */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-mono font-black text-xs flex items-center justify-center border border-amber-400/30">
                      {idx + 1}
                    </span>
                    {w.isSupplement && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40" title="공석 보충 선발자">
                        보충
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-slate-400">
                      {w.studentId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenDisqualifyModal(w)}
                      className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                      title="조건 미충족으로 명단에서 제외"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 이름 & 전화번호 */}
                <div>
                  <h5 className="font-black text-white text-base group-hover:text-amber-300 transition-colors">
                    {w.name}
                  </h5>
                  <p className="font-mono text-xs text-indigo-400 mt-0.5">
                    {w.phone}
                  </p>
                </div>

                {/* 인스타그램 아이디 링크 */}
                <div className="mt-2.5 flex items-center justify-between gap-1 pt-2 border-t border-slate-700/50">
                  {w.instagram && w.instagram !== '없음' ? (
                    <a
                      href={`https://instagram.com/${w.instagram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 hover:bg-pink-500/25 hover:border-pink-500/50 transition-all truncate max-w-[140px]"
                      title={`${w.name}님의 인스타 열기 (팔로우 여부 확인)`}
                    >
                      <InstagramIcon className="w-3 h-3 text-pink-400 shrink-0" />
                      <span className="truncate">{w.instagram}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60">
                      인스타 없음
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenDisqualifyModal(w)}
                    className="text-[10px] text-rose-400/80 hover:text-rose-300 font-bold px-1.5 py-0.5 rounded hover:bg-rose-500/15 transition-colors cursor-pointer shrink-0"
                  >
                    제외
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 조건 미충족 제외 이력 아코디언 */}
      {disqualified.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all">
          <button
            type="button"
            onClick={() => setShowDisqualifiedList(!showDisqualifiedList)}
            className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>조건 미충족 제외 이력</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-black">
                    {disqualified.length}명
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  당첨 후 제외된 인원은 보충 추첨 대상에서도 자동 배제됩니다. (실수로 제외한 경우 복원 가능)
                </p>
              </div>
            </div>

            <div className="text-slate-400">
              {showDisqualifiedList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          {showDisqualifiedList && (
            <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-800/80 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {disqualified.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/20 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm line-through text-slate-400">
                            {d.name}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {d.studentId}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {d.phone} | 인스타: {d.instagram || '없음'}
                        </p>
                      </div>

                      {winners.length < 50 && (
                        <button
                          type="button"
                          onClick={() => handleRestore(d.id)}
                          className="shrink-0 flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                          title="명단으로 복원"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>복원</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-[11px] text-rose-300/90 flex items-center justify-between gap-2">
                      <span className="truncate" title={d.reason}>
                        사유: {d.reason || '조건 미충족'}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px] shrink-0">
                        {d.disqualifiedAt ? formatDateTime(d.disqualifiedAt) : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 당첨자 제외 모달 */}
      {disqualifyModal.isOpen && disqualifyModal.winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-400" />
                <span>당첨자 제외 처리</span>
              </h3>
              <button
                type="button"
                onClick={() => setDisqualifyModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDisqualify} className="mt-4 space-y-4">
              {/* 대상자 정보 카드 */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">제외 대상 참가자</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-base font-black text-white">
                    {disqualifyModal.winner.name} ({disqualifyModal.winner.studentId})
                  </span>
                  <span className="text-xs font-mono text-indigo-400">
                    {disqualifyModal.winner.phone}
                  </span>
                </div>
                {disqualifyModal.winner.instagram && disqualifyModal.winner.instagram !== '없음' && (
                  <p className="text-xs text-pink-400 mt-1 flex items-center gap-1">
                    <InstagramIcon className="w-3 h-3" />
                    <span>인스타그램: {disqualifyModal.winner.instagram}</span>
                  </p>
                )}
              </div>

              {/* 제외 사유 선택 */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  제외 사유 선택
                </label>
                <div className="space-y-1.5">
                  {REASON_PRESETS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        disqualifyModal.reason === reason
                          ? 'bg-rose-500/15 border-rose-500 text-white font-bold'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="disqualifyReason"
                        checked={disqualifyModal.reason === reason}
                        onChange={() => setDisqualifyModal(prev => ({ ...prev, reason }))}
                        className="text-rose-500 focus:ring-rose-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 직접 입력인 경우 텍스트 인풋 */}
              {disqualifyModal.reason === '직접 입력' && (
                <div>
                  <input
                    type="text"
                    value={disqualifyModal.customReason}
                    onChange={(e) => setDisqualifyModal(prev => ({ ...prev, customReason: e.target.value }))}
                    placeholder="제외 사유를 구체적으로 작성해 주세요..."
                    maxLength={100}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              )}

              {disqualifyModal.error && (
                <div className="p-3 bg-red-900/50 border border-red-500/60 rounded-xl text-red-200 text-xs font-bold">
                  {disqualifyModal.error}
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed">
                ※ 제외된 인원은 당첨 취소되며, 이후 진행되는 추가 보충 추첨 대상에서도 영구 제외됩니다.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisqualifyModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-1/2 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={disqualifyModal.isSubmitting}
                  className="w-1/2 h-11 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {disqualifyModal.isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserX className="w-4 h-4" />
                      <span>제외 확정하기</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
