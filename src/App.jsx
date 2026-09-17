import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserForm from './components/UserForm';
import SuccessCard from './components/SuccessCard';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import DeviceSelectModal from './components/DeviceSelectModal';

export default function App() {
  const [view, setView] = useState('form'); // 'form' | 'success' | 'admin'
  const [participantName, setParticipantName] = useState('');
  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem('heyum_admin_token') || '';
  });

  // 단말기 담당 서포터즈 상태 (병일, 기헌, 예본, 재림, 영서, 나연, 솔비, 지우, 지수)
  const [operator, setOperator] = useState(() => {
    return localStorage.getItem('heyum_device_operator') || '';
  });
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  // 첫 방문 시 단말기 담당자 설정 유도
  useEffect(() => {
    if (!localStorage.getItem('heyum_device_operator')) {
      setShowDeviceModal(true);
    }
  }, []);

  const handleSelectOperator = (name) => {
    setOperator(name);
    localStorage.setItem('heyum_device_operator', name);
    setShowDeviceModal(false);
  };

  // URL 경로 감지 (/admin 직접 접근 지원)
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) {
      setView('admin');
    }
  }, []);

  const handleGoHome = () => {
    setView('form');
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleToggleAdmin = () => {
    if (view === 'admin') {
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
    localStorage.setItem('heyum_admin_token', token);
  };

  const handleAdminLogout = () => {
    setAdminToken('');
    localStorage.removeItem('heyum_admin_token');
    setView('form');
    window.history.pushState({}, '', '/');
  };

  const isUserView = view === 'form' || view === 'success';

  return (
    <div className={`w-full bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white ${
      isUserView ? 'h-screen max-h-screen overflow-hidden justify-between' : 'min-h-screen'
    }`}>
      {/* 1. 상단 슬림 네비게이션 헤더 */}
      <Header
        isAdmin={view === 'admin'}
        onToggleAdmin={handleToggleAdmin}
        onGoHome={handleGoHome}
        operator={operator}
        onOpenDeviceSelect={() => setShowDeviceModal(true)}
      />

      {/* 2. 메인 콘텐츠 영역 (사용자 화면 시 스크롤 없이 수직 중앙 정렬) */}
      <main className={`flex-1 flex flex-col justify-center items-center px-4 ${
        isUserView ? 'py-1 overflow-hidden' : 'py-8'
      }`}>
        {/* 사용자 응모 폼 */}
        {view === 'form' && (
          <UserForm onSuccess={handleFormSuccess} operator={operator} />
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

      {/* 4. 부스 단말기 서포터즈 선택 모달 */}
      <DeviceSelectModal
        isOpen={showDeviceModal}
        currentOperator={operator}
        onSelectOperator={handleSelectOperator}
        onClose={() => setShowDeviceModal(false)}
        canClose={Boolean(operator)}
      />
    </div>
  );
}
