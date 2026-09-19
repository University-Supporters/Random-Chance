import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  Trophy, 
  Shield, 
  LogOut, 
  RefreshCw, 
  Lock,
  KeyRound,
  Crown,
  X,
  AlertTriangle,
  HardDrive
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import ParticipantList from './ParticipantList';
import RaffleDrawer from './RaffleDrawer';
import AuditLogs from './AuditLogs';
import BackupManager from './BackupManager';

export default function AdminDashboard({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('participants');
  const [participants, setParticipants] = useState([]);
  const [logs, setLogs] = useState([]);
  const [winners, setWinners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const toastTimer = useRef();
  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(''), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // 상급 인증은 현재 화면 메모리에만 보관합니다.
  const [superToken, setSuperToken] = useState('');

  const [superAuthModal, setSuperAuthModal] = useState({
    isOpen: false,
    targetTab: null,
    password: '',
    error: '',
    isVerifying: false
  });

  const [storageMode, setStorageMode] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [showStorageGuide, setShowStorageGuide] = useState(false);

  const requestSequence = useRef(0);
  const fetchData = useCallback(async (silent = false) => {
    const sequence = ++requestSequence.current;
    if (silent !== true) setIsLoading(true);
    try {
      const data = await apiRequest('/api/admin/participants', { token });
      if (sequence !== requestSequence.current) return;
      setParticipants(data.participants); setStorageMode(data.storageMode); setStorageWarning(data.storage?.warning || '');
      if (superToken) {
        const result = await apiRequest('/api/admin/backup/vault', { token, superToken });
        if (sequence !== requestSequence.current) return;
        setLogs(result.db.logs); setWinners(result.db.winners);
        try {
          // Preserve the last nonempty emergency copy when a server unexpectedly returns empty.
          if (result.db.participants.length || !localStorage.getItem('heyum_emergency_db_vault')) {
            localStorage.setItem('heyum_emergency_db_vault', JSON.stringify({ ...result.db, _savedAt: new Date().toISOString() }));
            window.dispatchEvent(new Event('heyum:vault-updated'));
          }
        } catch { showToast('브라우저 금고 저장 공간이 부족합니다. JSON 백업을 다운로드해 주세요.'); }
      }
    } catch (error) { if (sequence === requestSequence.current) showToast(error.message); }
    finally { if (sequence === requestSequence.current) setIsLoading(false); }
  }, [token, superToken, showToast]);
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 10000);
    return () => { clearInterval(interval); requestSequence.current++; };
  }, [fetchData, activeTab]);
  useEffect(() => {
    const expire = () => {
      setSuperToken(''); setLogs([]); setActiveTab('participants');
      setSuperAuthModal({ isOpen: true, targetTab: activeTab === 'participants' ? 'backup' : activeTab, password: '', error: '상급 인증이 만료되었습니다. 다시 인증해 주세요.', isVerifying: false });
    };
    window.addEventListener('heyum:super-expired', expire);
    return () => window.removeEventListener('heyum:super-expired', expire);
  }, [activeTab]);

  // 상급 관리자 탭 접근 제어 (랜덤 추첨, 감사 로그) + 탭 전환 시 데이터 자동 갱신
  const handleSelectTab = (tabName) => {
    fetchData(true); // 탭 전환 시 항상 최신 데이터 즉각 갱신
    if (tabName === 'participants') {
      setActiveTab('participants');
      return;
    }

    // raffle 또는 logs는 상급 관리자 인증 필수
    if (superToken) {
      setActiveTab(tabName);
    } else {
      setSuperAuthModal({
        isOpen: true,
        targetTab: tabName,
        password: '',
        error: '',
        isVerifying: false
      });
    }
  };

  // 상급 관리자 비밀번호 검증
  const handleVerifySuperAuth = async (e) => {
    e.preventDefault();
    if (!superAuthModal.password.trim()) {
      setSuperAuthModal(prev => ({ ...prev, error: '상급 관리자 비밀번호를 입력해 주세요.' }));
      return;
    }

    setSuperAuthModal(prev => ({ ...prev, isVerifying: true, error: '' }));

    try {
      const data = await apiRequest('/api/admin/super-auth', { token, method: 'POST', body: { superPassword: superAuthModal.password.trim() } });
      if (data.superToken) {
        setSuperToken(data.superToken);

        const nextTab = superAuthModal.targetTab;
        setSuperAuthModal({ isOpen: false, targetTab: null, password: '', error: '', isVerifying: false });
        setActiveTab(nextTab);
        showToast('👑 상급 관리자 권한이 활성화되었습니다.');
        fetchData(true);
      } else {
        setSuperAuthModal(prev => ({ 
          ...prev, 
          isVerifying: false, 
          error: data.message || '비밀번호가 올바르지 않습니다.' 
        }));
      }
    } catch (err) {
      setSuperAuthModal(prev => ({ 
        ...prev, 
        isVerifying: false, 
        error: err.message 
      }));
    }
  };

  const mutate = async (url, body, method = 'POST', elevated = false) => {
    const data = await apiRequest(url, { token, superToken: elevated ? superToken : undefined, method, body });
    await fetchData(true);
    return data;
  };
  const handleAddParticipant = async entry => {
    try { await mutate('/api/admin/participants', entry); showToast('참여자가 추가되었습니다.'); return true; }
    catch (error) { showToast(error.message); return false; }
  };
  const handleDeleteParticipant = async (id, reason) => {
    try { await mutate('/api/admin/participants/' + encodeURIComponent(id), { reason }, 'DELETE'); showToast('참여자가 삭제되었습니다.'); }
    catch (error) { showToast(error.message); }
  };
  const handleDraw = async () => {
    const data = await mutate('/api/admin/draw', { count: 50 }, 'POST', true);
    setWinners(data.winners); showToast(data.winners.length + '명의 당첨자가 선정되었습니다.'); return data;
  };
  const handleResetDraw = async () => {
    if (!confirm('추첨 결과를 초기화하시겠습니까?')) return;
    try { await mutate('/api/admin/reset-draw', undefined, 'POST', true); showToast('추첨 결과가 초기화되었습니다.'); }
    catch (error) { showToast(error.message); }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* 알림 토스트 */}
      {storageWarning && <div role="alert" className="p-4 rounded-xl bg-amber-500/15 text-amber-200">{storageWarning} 현재 등록은 일시 중단됩니다. 데이터 백업 후 영구 저장소를 연결해 주세요.</div>}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-2xl animate-scale-up">
          {toastMessage}
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
              운영진
            </span>
            {superToken ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Crown className="w-3.5 h-3.5 text-amber-400" /> 상급 관리자 권한
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">
                <Lock className="w-3 h-3 text-slate-500" /> 일반 운영진 모드
              </span>
            )}
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
            onClick={() => fetchData()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
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
      <div className="flex flex-wrap border-b border-slate-800 gap-1">
        <button
          onClick={() => handleSelectTab('participants')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-colors cursor-pointer ${
            activeTab === 'participants'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>참여자 명단 ({participants.length})</span>
        </button>

        <button
          onClick={() => handleSelectTab('raffle')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-colors cursor-pointer ${
            activeTab === 'raffle'
              ? 'border-amber-400 text-amber-400 bg-amber-400/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>★ 50명 랜덤 추첨기</span>
          {!superToken && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> 상급전용
            </span>
          )}
          {winners.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold">
              완료
            </span>
          )}
        </button>

        <button
          onClick={() => handleSelectTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-colors cursor-pointer ${
            activeTab === 'logs'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>감사 로그 ({logs.length})</span>
          {!superToken && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> 상급전용
            </span>
          )}
        </button>

        <button
          onClick={() => handleSelectTab('backup')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-colors cursor-pointer ${
            activeTab === 'backup'
              ? 'border-teal-400 text-teal-400 bg-teal-400/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4 text-teal-400" />
          <span>데이터 백업 & 복원</span>
          {!superToken && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> 상급전용
            </span>
          )}
        </button>
      </div>

      {/* 상급 관리자 2차 인증 모달 */}
      {superAuthModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-white">
                  상급 관리자 2차 인증
                </h3>
              </div>
              <button
                onClick={() => setSuperAuthModal({ isOpen: false, targetTab: null, password: '', error: '', isVerifying: false })}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              <strong>{
                superAuthModal.targetTab === 'raffle' ? '랜덤 추첨 실행' :
                superAuthModal.targetTab === 'logs' ? '보안 감사 로그 열람' :
                '데이터 백업 및 복원'
              }</strong> 기능은 부스 총괄 상급 관리자만 접근할 수 있습니다.
            </p>

            {superAuthModal.error && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{superAuthModal.error}</span>
              </div>
            )}

            <form onSubmit={handleVerifySuperAuth} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  상급 관리자 비밀번호
                </label>
                <input
                  type="password"
                  value={superAuthModal.password}
                  onChange={(e) => setSuperAuthModal(prev => ({ ...prev, password: e.target.value, error: '' }))}
                  placeholder="비밀번호 입력..."
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSuperAuthModal({ isOpen: false, targetTab: null, password: '', error: '', isVerifying: false })}
                  className="w-1/2 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={superAuthModal.isVerifying}
                  className="w-1/2 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {superAuthModal.isVerifying ? (
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>잠금 해제</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

        {activeTab === 'raffle' && superToken && (
          <RaffleDrawer
            participants={participants}
            winners={winners}
            onDraw={handleDraw}
            onResetDraw={handleResetDraw}
          />
        )}

        {activeTab === 'logs' && superToken && (
          <AuditLogs
            logs={logs}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'backup' && superToken && (
          <BackupManager
            token={token}
            superToken={superToken}
            onRequireSuperAuth={() => window.dispatchEvent(new Event('heyum:super-expired'))}
            onRefreshAll={fetchData}
            showToast={showToast}
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

              <p className="text-slate-300 leading-relaxed">로컬 서버는 메인 DB, 미러 파일과 스냅샷을 저장합니다. 상급 인증 중에는 브라우저 금고도 동기화됩니다. 임시 파일 저장소는 서버 종료 후 유지되지 않을 수 있으므로 다운로드 백업을 보관해 주세요.</p>
            </div>
            <button onClick={() => setShowStorageGuide(false)} className="mt-5 w-full py-3 rounded-xl bg-indigo-600 text-white font-bold">확인</button>
          </div>
        </div>
      )}
    </div>
  );
}
