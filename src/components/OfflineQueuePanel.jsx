import React, { useCallback, useEffect, useState } from 'react';
import { discardQueued, flushQueued, listQueued } from '../lib/offlineQueue';

export default function OfflineQueuePanel({ onRefresh }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(() => listQueued().then(setItems).catch(err => setError(err.message)), []);
  useEffect(() => {
    refresh();
    window.addEventListener('heyum:queue-updated', refresh);
    return () => window.removeEventListener('heyum:queue-updated', refresh);
  }, [refresh]);
  if (!items.length) return null;
  const retry = async () => {
    setBusy(true); setError('');
    try { await flushQueued(); await refresh(); await onRefresh(true); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const discard = async item => {
    if (!window.confirm(`${item.body.name} (${item.body.studentId})님의 임시 기록을 삭제하시겠습니까? 서버에 등록되지 않았다면 복구할 수 없습니다.`)) return;
    setBusy(true); setError('');
    try { await discardQueued(item.id); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm" aria-label="이 노트북의 임시 응모 기록">
    <div className="flex flex-wrap justify-between gap-2 items-center"><div><h3 className="font-bold text-amber-200">이 노트북의 임시 응모 {items.length}건</h3><p className="text-xs text-slate-300 mt-1">대기 건은 연결 복구 시 자동 전송됩니다. 확인 필요 건은 중복 여부를 살펴보고, 필요하면 수동 등록한 뒤 임시 기록을 정리해 주세요.</p></div><button disabled={busy} onClick={retry} className="px-3 py-2 rounded-lg bg-amber-400/20 text-amber-100 font-semibold disabled:opacity-40">대기 건 재전송</button></div>
    {error && <p role="alert" className="mt-2 text-rose-300">{error}</p>}
    <div className="mt-3 space-y-2">{items.map(item => <div key={item.id} className="rounded-lg bg-slate-950/40 p-3 flex flex-wrap justify-between gap-2 items-center"><div><p className="font-semibold">{item.body.name} · {item.body.studentId} · {item.body.phone}</p><p className="text-xs text-slate-400 mt-1">{item.state === 'pending' ? '자동 전송 대기' : `운영진 확인 필요 · ${item.error}`}</p></div><button disabled={busy} onClick={() => discard(item)} className="text-xs text-rose-300 underline disabled:opacity-40">기록 삭제</button></div>)}</div>
  </section>;
}
