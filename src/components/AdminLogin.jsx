import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AdminLogin({ onLoginSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '비밀번호가 올바르지 않습니다.');
      }

      onLoginSuccess(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto outdoor-contrast-card rounded-3xl p-6 sm:p-8 border-4 border-slate-700 shadow-2xl animate-scale-up">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 사용자 화면으로
        </button>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
          서포터즈 운영진 전용
        </span>
      </div>

      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black text-slate-900">관리자 인증</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">
          부스 운영진 비밀번호를 입력해주세요.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-100 border border-red-400 text-red-900 text-sm font-bold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-slate-700 font-bold text-sm mb-1.5 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-indigo-600" /> 운영진 비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            autoFocus
            required
            className="w-full text-lg font-bold px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-base shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>관리자 대시보드 로그인</span>
          )}
        </button>
      </form>
    </div>
  );
}
