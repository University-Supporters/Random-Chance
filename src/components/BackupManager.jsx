import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, Camera, HardDrive, RefreshCw } from 'lucide-react';
import { apiRequest, downloadJson, readVault } from '../lib/api';
import { formatDateTime } from '../lib/utils';

export default function BackupManager({ token, superToken, onRequireSuperAuth, onRefreshAll, showToast }) {
  const [snapshots, setSnapshots] = useState([]);
  const [vault, setVault] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const fileInput = useRef(null);
  const lock = useRef(false);
  const refresh = useCallback(async () => {
    const result = await apiRequest('/api/admin/backup/snapshots', { token, superToken });
    setSnapshots(result.snapshots);
    try { setVault(readVault()); } catch (err) { setError(err.message); }
  }, [token, superToken]);
  useEffect(() => {
    refresh().catch(err => setError(err.message));
    const updateVault = () => { try { setVault(readVault()); } catch (err) { setError(err.message); } };
    window.addEventListener('heyum:vault-updated', updateVault);
    return () => window.removeEventListener('heyum:vault-updated', updateVault);
  }, [refresh]);
  const run = async work => {
    if (!superToken) { onRequireSuperAuth(); return; }
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await work(); }
    catch (err) { setError(err.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 목록을 새로고침하여 처리 결과를 확인해 주세요.' : err.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const selectFile = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setError('');
    try {
      if (!file.name.toLowerCase().endsWith('.json') || file.size > 9 * 1024 * 1024) throw new Error('9MB 이하의 JSON 백업 파일을 선택해 주세요.');
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.participants) || (data.winners !== undefined && !Array.isArray(data.winners)) || (data.logs !== undefined && !Array.isArray(data.logs))) throw new Error('백업 데이터 형식이 올바르지 않습니다.');
      setPending({ filename: file.name, data });
    } catch (err) { setError(err instanceof SyntaxError ? 'JSON 파일을 읽을 수 없습니다.' : err.message); }
  };
  const restore = () => run(async () => {
    const result = await apiRequest(pending.snapshot ? '/api/admin/backup/rollback-snapshot' : '/api/admin/backup/restore', {
      token, superToken, method: 'POST', body: pending.snapshot ? { filename: pending.filename } : { backupData: pending.data }
    });
    setPending(null); showToast(result.message); await onRefreshAll(); await refresh();
  });
  const button = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold bg-indigo-500/20 border border-indigo-400/30 hover:bg-indigo-500/30 transition-colors disabled:opacity-40';
  return (
    <section className="space-y-4 animate-fade-in" aria-busy={busy}>
      <div className="glass-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div><h3 className="text-lg font-bold">데이터 백업 & 복원</h3><p className="text-xs text-slate-400 mt-1">실시간 미러 · 롤링 스냅샷 · 다운로드 백업 · 브라우저 로컬 금고</p></div>
        <button className={button} disabled={busy} onClick={() => run(async () => {
          const db = await apiRequest('/api/admin/backup/download', { token, superToken });
          downloadJson(db, `혜윰_전체DB백업_${new Date().toISOString().slice(0,10)}.json`); showToast('백업 다운로드를 시작했습니다.');
        })}><Download size={16} />전체 DB 백업 다운로드 (.json)</button>
      </div>
      {error && <div role="alert" className="rounded-xl p-3 bg-rose-500/10 text-rose-300 text-sm">{error}</div>}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="glass-panel rounded-2xl p-4 space-y-3"><h4 className="font-bold">서버 안전 스냅샷</h4><p className="text-xs text-slate-400">현재 데이터와 감사 로그를 함께 보관합니다.</p><button className={button} disabled={busy} onClick={() => run(async () => { await apiRequest('/api/admin/backup/snapshot', { token, superToken, method: 'POST' }); await refresh(); showToast('스냅샷이 생성되었습니다.'); })}><Camera size={16} />지금 스냅샷 찍기</button></div>
        <div className="glass-panel rounded-2xl p-4 space-y-3"><h4 className="font-bold">백업 파일 업로드 복원</h4><p className="text-xs text-slate-400">파일 검증과 복원 전 스냅샷 저장 후 복원합니다.</p><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={selectFile} /><button className={button} disabled={busy} onClick={() => fileInput.current.click()}><Upload size={16} />백업 파일 선택</button></div>
        <div className="glass-panel rounded-2xl p-4 space-y-3"><h4 className="font-bold">브라우저 로컬 금고</h4><p className="text-xs text-slate-400">{vault ? `${vault.participants.length}명 · ${formatDateTime(vault._savedAt)}` : '보관된 데이터가 없습니다.'}</p><button className={button} disabled={busy || !vault} onClick={() => setPending({ filename: '브라우저 로컬 금고', data: vault })}><HardDrive size={16} />금고에서 서버로 복원</button></div>
      </div>
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 flex items-center justify-between"><h4 className="font-bold">스냅샷 기록 ({snapshots.length})</h4><button aria-label="스냅샷 새로고침" disabled={busy} onClick={() => run(refresh)}><RefreshCw size={16} className={busy ? 'animate-spin' : ''} /></button></div>
        <div className="max-h-72 overflow-auto divide-y divide-white/5">
          {!snapshots.length && <p className="p-6 text-sm text-slate-400">보관된 스냅샷이 없습니다.</p>}
          {snapshots.map(s => <div key={s.filename} className="p-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-mono break-all">{s.filename}</p><p className="text-xs text-slate-500 mt-1">{formatDateTime(s.createdAt)} · {(s.sizeBytes / 1024).toFixed(1)} KB</p></div><button className={button + ' shrink-0'} disabled={busy} onClick={() => setPending({ filename: s.filename, snapshot: true })}>복원</button></div>)}
        </div>
      </div>
      {pending && <div role="dialog" aria-modal="true" aria-labelledby="restore-title" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-slate-900 border border-amber-400/30 rounded-2xl p-6 w-full max-w-md max-h-[90dvh] overflow-auto"><h3 id="restore-title" className="text-lg font-bold">이 백업으로 복원하시겠습니까?</h3><p className="text-sm text-slate-400 mt-3 break-all">{pending.filename}</p>{pending.data && <p className="mt-2 text-sm">참여자 {pending.data.participants.length}명 · 당첨자 {pending.data.winners?.length || 0}명</p>}<p className="text-xs text-amber-300 mt-3">현재 데이터를 교체합니다. 복원 전 상태는 안전 스냅샷으로 보관합니다.</p>{error && <p role="alert" className="text-rose-300 text-sm mt-3">{error}</p>}<div className="flex gap-3 mt-5"><button className={button} disabled={busy} onClick={() => setPending(null)}>취소</button><button className={button} disabled={busy} onClick={restore}>{busy ? '복원 중…' : '확인 및 복원'}</button></div></div></div>}
    </section>
  );
}
