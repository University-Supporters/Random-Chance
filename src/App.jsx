import React, { useState, useEffect } from 'react';
import { apiRequest } from './lib/api';
import Header from './components/Header';
import UserForm from './components/UserForm';
import SuccessCard from './components/SuccessCard';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import InstagramQrCard from './components/InstagramQrCard';
import InstagramIcon from './components/InstagramIcon';

export default function App() {
  const [view, setView] = useState('form'); // 'form' | 'success' | 'admin'
  const [participantName, setParticipantName] = useState('');
  const [showMobileQrModal, setShowMobileQrModal] = useState(false);
  const [adminToken, setAdminToken] = useState('');

  // URL 경로 감지 (/admin 직접 접근 지원)
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) {
      setView('admin');
    }
  }, []);

  const closeSession = async () => {
    if (adminToken) {
      try { await apiRequest('/api/admin/logout', {token: adminToken, method:'POST'}); }
      catch (error) { alert('로그아웃을 완료하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.'); return false; }
    }
    setAdminToken(''); return true;
  };
  const handleGoHome = async () => {
    if (!await closeSession()) return;
    setView('form');
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleToggleAdmin = async () => {
    if (view === 'admin') {
      if (!await closeSession()) return;
      setView('form');
      window.history.pushState({}, '', '/');
    } else {
      setView('admin');
      window.history.pushState({}, '', '/admin');
    }
  };

  const handleFormSuccess = (name) => {
    setParticipantName(name);
    setView('success');
  };

  const handleResetToForm = React.useCallback(() => {
    setView('form');
  }, []);

  const handleAdminLoginSuccess = (token) => {
    setAdminToken(token);

  };

  const handleAdminLogout = async () => {
    if (!await closeSession()) return;

    setView('form');
    window.history.pushState({}, '', '/');
  };

  useEffect(() => {
    try { localStorage.removeItem('heyum_admin_token'); sessionStorage.removeItem('heyum_super_token'); } catch {}
    const expire = () => setAdminToken('');
    const navigate = () => { setAdminToken(''); setView(window.location.pathname.startsWith('/admin') ? 'admin' : 'form'); };
    window.addEventListener('heyum:session-expired', expire);
    window.addEventListener('popstate', navigate);
    return () => { window.removeEventListener('heyum:session-expired', expire); window.removeEventListener('popstate', navigate); };
  }, []);
  const isUserView = view === 'form' || view === 'success';

  return (
    <div className={`w-full bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white ${
      isUserView ? 'kiosk-shell' : 'min-h-screen'
    }`}>
      {/* 1. 상단 슬림 네비게이션 헤더 */}
      <Header
        isAdmin={view === 'admin'}
        onToggleAdmin={handleToggleAdmin}
        onGoHome={handleGoHome}
      />

      {/* 2. 메인 콘텐츠 영역 (사용자 화면 시 스크롤 없이 수직 중앙 정렬) */}
      <main className={`flex-1 flex flex-col justify-center items-center px-4 ${
        isUserView ? 'kiosk-main' : 'py-8'
      }`}>
        {/* 사용자 응모 폼 & 인스타 QR 코드 화면 */}
        {view === 'form' && (
          <div className="kiosk-grid animate-fade-in">
            {/* 인스타그램 QR 카드 (데스크톱 및 태블릿에서 메인화면 옆에 큼직하게 나란히 배치) */}
            <div className="kiosk-qr-slot">
              <InstagramQrCard />
            </div>

            {/* 사용자 응모 폼 카드 */}
            <div className="kiosk-form-slot w-full max-w-md">
              {/* 모바일 화면용 인스타그램 QR 보기 토글 버튼 */}
              <div className="kiosk-mobile-qr flex justify-center mb-2">
                <button
                  type="button"
                  onClick={() => setShowMobileQrModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-amber-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold hover:bg-pink-500/25 transition-all shadow cursor-pointer"
                >
                  <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                  <span>인스타그램 팔로우 QR코드 보기</span>
                </button>
              </div>
              <UserForm onSuccess={handleFormSuccess} />
            </div>
          </div>
        )}

        {/* 응모 완료 화면 */}
        {view === 'success' && (
          <SuccessCard
            participantName={participantName}
            onReset={handleResetToForm}
          />
        )}

        {/* 관리자 화면 */}
        {view === 'admin' && (
          adminToken ? (
            <AdminDashboard
              token={adminToken}
              onLogout={handleAdminLogout}
            />
          ) : (
            <AdminLogin
              onLoginSuccess={handleAdminLoginSuccess}
              onCancel={handleGoHome}
            />
          )
        )}
      </main>

      {/* 3. 하단 미니멀 푸터 */}
      <footer className="w-full border-t border-white/[0.04] py-2.5 text-center text-[11px] text-slate-500 font-medium shrink-0">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>© 2026 인권 서포터즈 혜윰</span>
          <span className="text-slate-600 hidden sm:inline">모두가 존중받는 따뜻한 캠퍼스 문화</span>
        </div>
      </footer>

      {/* 4. 모바일용 인스타그램 QR 모달 */}
      {showMobileQrModal && (
        <div role="dialog" aria-modal="true" aria-label="인스타그램 QR 코드" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm animate-scale-up">
            <button
              aria-label="QR 코드 닫기"
              onClick={() => setShowMobileQrModal(false)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center border border-white/20 shadow-xl cursor-pointer"
            >
              ✕
            </button>
            <InstagramQrCard />
          </div>
        </div>
      )}
    </div>
  );
}
