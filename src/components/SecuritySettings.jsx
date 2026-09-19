import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export default function SecuritySettings({ token, superToken, showToast }) {
  const [status, setStatus] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [superPassword, setSuperPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest('/api/admin/security', {token,superToken}).then(setStatus).catch(e=>setError(e.message)); }, [token,superToken]);
  const save = async event => {
    event.preventDefault();
    if (!confirm('비밀번호를 변경하면 현재 로그인된 모든 운영진 세션이 종료됩니다. 변경하시겠습니까?')) return;
    setBusy(true); setError('');
    try {
      await apiRequest('/api/admin/security/passwords', {token,superToken,method:'POST',body:{adminPassword,superPassword}});
      setAdminPassword(''); setSuperPassword(''); showToast('비밀번호가 변경되었습니다. 다시 로그인해 주세요.');
      window.dispatchEvent(new Event('heyum:session-expired'));
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  };
  return <section className="glass-panel p-4 rounded-2xl space-y-3">
    <h4 className="font-bold">운영 비밀번호 관리</h4>
    {status && (status.defaultAdminPassword || status.defaultSuperPassword) && <p className="text-xs text-amber-300">공개된 기본 비밀번호를 사용 중입니다. 행사 전에 일반·상급 비밀번호를 서로 다르게 변경해 주세요.</p>}
    <form onSubmit={save} className="grid sm:grid-cols-3 gap-3">
      <label className="text-xs text-slate-300">새 일반 관리자 비밀번호<input aria-label="새 일반 관리자 비밀번호" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} placeholder="변경할 때만 입력 (12자 이상)" className="modern-input w-full h-10 mt-1 px-3 rounded-xl" /></label>
      <label className="text-xs text-slate-300">새 상급 관리자 비밀번호<input aria-label="새 상급 관리자 비밀번호" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={superPassword} onChange={e=>setSuperPassword(e.target.value)} placeholder="변경할 때만 입력 (12자 이상)" className="modern-input w-full h-10 mt-1 px-3 rounded-xl" /></label>
      <button disabled={busy || (!adminPassword && !superPassword)} className="self-end h-10 bg-indigo-600 rounded-xl text-sm font-bold disabled:opacity-40">{busy?'변경 중…':'비밀번호 변경'}</button>
    </form>
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
  </section>;
}
