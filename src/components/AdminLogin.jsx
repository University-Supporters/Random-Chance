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
    <div className="w-full max-w-sm mx-auto my-auto glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl animate-scale-up">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 응모 화면
        </button>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
          서포터즈 운영진
        </span>
      </div>

      <div className="text-center mb-5">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center mb-2.5 shadow-inner">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-black text-white">관리자 로그인</h3>
        <p className="mt-0.5 text-xs text-slate-400">
          부스 운영진 비밀번호를 입력해 주세요.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> 운영진 비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            autoFocus
            required
            className="modern-input w-full h-11 px-3.5 rounded-xl text-sm font-bold"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 active:scale-[0.99] text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>로그인하기</span>
          )}
        </button>
      </form>
    </div>
  );
}
