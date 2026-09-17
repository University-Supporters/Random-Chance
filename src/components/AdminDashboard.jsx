import React, { useState, useEffect } from 'react';
import { Users, Trophy, Shield, LogOut, RefreshCw, BarChart3, Trash2 } from 'lucide-react';
import ParticipantList from './ParticipantList';
import RaffleDrawer from './RaffleDrawer';
import AuditLogs from './AuditLogs';

export default function AdminDashboard({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'raffle' | 'logs'
  const [participants, setParticipants] = useState([]);
  const [winners, setWinners] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState('');

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const [storageMode, setStorageMode] = useState('');
  const [showStorageGuide, setShowStorageGuide] = useState(false);

  // 데이터 로드
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resPart, resLogs] = await Promise.all([
        fetch('/api/admin/participants', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/logs', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (resPart.ok) {
        const dataPart = await resPart.json();
        setParticipants(dataPart.participants || []);
        setWinners(dataPart.winners || []);
        if (dataPart.storageMode) setStorageMode(dataPart.storageMode);
      }
      if (resLogs.ok) {
        const dataLogs = await resLogs.json();
        setLogs(dataLogs.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // 참여자 수동 추가
  const handleAddParticipant = async (entry) => {
    try {
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(entry),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || '추가 실패');
        return false;
      }
      showToast('참여자가 성공적으로 추가되었습니다.');
      fetchData();
      return true;
    } catch (err) {
      alert('추가 중 오류가 발생했습니다.');
      return false;
    }
  };

  // 참여자 삭제
  const handleDeleteParticipant = async (id, reason) => {
    try {
      const res = await fetch(`/api/admin/participants/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || '삭제 실패');
        return;
      }
      showToast('참여자가 삭제되었으며 감사 로그에 기록되었습니다.');
      fetchData();
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 추첨 실행
  const handleDraw = async (count = 50) => {
    const res = await fetch('/api/admin/draw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ count }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || '추첨 실패');
    }
    setWinners(data.winners || []);
    showToast(`${data.winners?.length}명의 당첨자가 선정되었습니다!`);
    fetchData();
    return data;
  };

  // 추첨 초기화
  const handleResetDraw = async () => {
    if (!confirm('정말로 추첨 결과를 초기화하시겠습니까?')) return;
    try {
      const res = await fetch('/api/admin/reset-draw', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWinners([]);
        showToast('추첨 결과가 초기화되었습니다.');
        fetchData();
      }
    } catch (err) {
      alert('초기화 실패');
    }
  };

  // 모든 데이터 전체 초기화 (참여자, 감사로그 일괄 삭제 - 전용 보안 비밀번호 확인)
  const handleResetAll = async () => {
    const inputPassword = window.prompt(
      '⚠️ [보안 경고] 모든 참여자 명단, 당첨자 내역, 감사 로그가 영구 삭제됩니다.\n\n계속 진행하시려면 초기화 전용 관리자 비밀번호를 입력해 주세요:'
    );
    if (inputPassword === null) return; // 사용자가 취소함
    if (!inputPassword.trim()) {
      alert('초기화 비밀번호가 입력되지 않았습니다.');
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-all', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ resetPassword: inputPassword.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setParticipants([]);
        setWinners([]);
        setLogs([]);
        showToast('모든 참여자 명단 및 감사 로그가 초기화되었습니다.');
        fetchData();
      } else {
        alert(data.message || '초기화 실패: 비밀번호가 올바르지 않습니다.');
      }
    } catch (err) {
      alert('전체 초기화 중 통신 오류가 발생했습니다.');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* 알림 토스트 */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-2xl animate-scale-up">
          {notification}
        </div>
      )}

      {/* 통계 요약 카드 & 상단 바 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              부스 운영 대시보드
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              서포터즈 관리자
            </span>
            {storageMode && (
              <button
                onClick={() => setShowStorageGuide(true)}
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 flex items-center gap-1 transition-colors cursor-pointer"
                title="스토리지 상태 확인"
              >
                <span>📦 스토리지: {storageMode}</span>
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            부스 이벤트 참여 현황 관리 및 50명 랜덤 추첨기
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </button>
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30 transition-colors cursor-pointer"
            title="모든 참여자 명단 및 감사 로그 일괄 초기화"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>데이터 전체 초기화</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>

      {/* 통계 카드 3종 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 카드 1: 총 참여자 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">총 참여자 수</span>
            <p className="text-3xl font-black text-white mt-1 font-mono">{participants.length} <span className="text-sm font-sans font-bold text-slate-400">명</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* 카드 2: 당첨자 현황 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">추첨 당첨자</span>
            <p className="text-3xl font-black text-amber-400 mt-1 font-mono">
              {winners.length} <span className="text-sm font-sans font-bold text-slate-400">/ 50명</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* 카드 3: 기록된 로그 수 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">감사 로그 건수</span>
            <p className="text-3xl font-black text-emerald-400 mt-1 font-mono">{logs.length} <span className="text-sm font-sans font-bold text-slate-400">건</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('participants')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-colors ${
            activeTab === 'participants'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>참여자 명단 ({participants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('raffle')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-colors ${
            activeTab === 'raffle'
              ? 'border-amber-400 text-amber-400 bg-amber-400/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>★ 50명 랜덤 추첨기</span>
          {winners.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold">
              완료
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>감사 로그 ({logs.length})</span>
        </button>
      </div>

      {/* 탭 본문 영역 */}
      <div className="pt-2">
        {activeTab === 'participants' && (
          <ParticipantList
            participants={participants}
            onRefresh={fetchData}
            onDelete={handleDeleteParticipant}
            onAdd={handleAddParticipant}
            token={token}
          />
        )}

        {activeTab === 'raffle' && (
          <RaffleDrawer
            participants={participants}
            winners={winners}
            onDraw={handleDraw}
            onResetDraw={handleResetDraw}
          />
        )}

        {activeTab === 'logs' && (
          <AuditLogs
            logs={logs}
            onRefresh={fetchData}
          />
        )}
      </div>

      {/* Vercel 스토리지 설정 안내 모달 */}
      {showStorageGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>📦 스토리지 연동 상태 및 안내</span>
              </h3>
              <button
                onClick={() => setShowStorageGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-xs text-slate-400">현재 활성화된 저장소:</span>
                <p className="text-base font-black text-amber-400 mt-0.5">{storageMode}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white">🌐 Vercel에서 영구 저장을 유지하는 방법 (택 1)</h4>
                
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                  <span className="font-bold text-indigo-300">방법 A: Vercel KV / Upstash (권장, 원클릭)</span>
                  <p className="text-xs text-slate-300 mt-1">
                    Vercel 대시보드 → 프로젝트의 <strong>Storage</strong> 탭 → <strong>Create KV Database</strong> 생성 후 연결하면 환경변수가 자동 등록되어 즉시 초고속 영구 저장소로 작동합니다.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <span className="font-bold text-emerald-300">방법 B: GitHub 토큰 등록 (무료, 무설치)</span>
                  <p className="text-xs text-slate-300 mt-1">
                    Vercel 대시보드 → <strong>Settings → Environment Variables</strong>에 다음 2개를 등록하면 GitHub 레포에 자동 커밋되어 영구 보존됩니다:
                  </p>
                  <code className="block mt-1.5 p-2 bg-slate-950 rounded text-emerald-400 font-mono text-[11px]">
                    GITHUB_TOKEN: 본인의 GitHub Personal Access Token<br />
                    GITHUB_REPO: University-Supporters/Random-Chance
                  </code>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowStorageGuide(false)}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow transition-all"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
