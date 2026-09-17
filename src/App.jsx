import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserForm from './components/UserForm';
import SuccessCard from './components/SuccessCard';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [view, setView] = useState('form'); // 'form' | 'success' | 'admin'
  const [participantName, setParticipantName] = useState('');
  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem('heyum_admin_token') || '';
  });

  // URL 경로 감지 (예: /admin 직접 접근 시 관리자 화면으로)
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) {
      setView('admin');
    }
  }, []);

  // 사용자 화면 전환
  const handleGoHome = () => {
    setView('form');
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
  };

  // 관리자 전환 토글
  const handleToggleAdmin = () => {
    if (view === 'admin') {
      setView('form');
      window.history.pushState({}, '', '/');
    } else {
      setView('admin');
      window.history.pushState({}, '', '/admin');
    }
  };

  // 응모 성공
  const handleFormSuccess = (name) => {
    setParticipantName(name);
    setView('success');
  };

  // 관리자 로그인 성공
  const handleAdminLoginSuccess = (token) => {
    setAdminToken(token);
    localStorage.setItem('heyum_admin_token', token);
  };

  // 관리자 로그아웃
  const handleAdminLogout = () => {
    setAdminToken('');
    localStorage.removeItem('heyum_admin_token');
    setView('form');
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* 상단 네비게이션 헤더 */}
      <Header
        isAdmin={view === 'admin'}
        onToggleAdmin={handleToggleAdmin}
        onGoHome={handleGoHome}
      />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex flex-col justify-center px-4 py-8 sm:py-12">
        {/* 1. 사용자 응모 폼 */}
        {view === 'form' && (
          <UserForm onSuccess={handleFormSuccess} />
        )}

        {/* 2. 응모 완료 화면 */}
        {view === 'success' && (
          <SuccessCard
            participantName={participantName}
            onReset={() => setView('form')}
          />
        )}

        {/* 3. 관리자 화면 */}
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

      {/* 하단 푸터 */}
      <footer className="w-full border-t border-slate-900/80 py-6 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p>© 2026 인권 서포터즈 혜윰. All Rights Reserved.</p>
          <p>모두가 평등하고 존중받는 따뜻한 캠퍼스 문화를 만들어갑니다.</p>
        </div>
      </footer>
    </div>
  );
}
