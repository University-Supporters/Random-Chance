import React, { useState } from 'react';
import { Search, Trash2, UserPlus, Download, RefreshCw, AlertCircle, X, ExternalLink } from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import { formatDateTime, formatPhoneNumber, exportToCSV } from '../lib/utils';

export default function ParticipantList({ 
  participants = [], 
  onRefresh, 
  onDelete, 
  onAdd, 
  token 
}) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ studentId: '', name: '', phone: '', instagram: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [actionError, setActionError] = useState('');

  // 최신 등록 순 정렬 (최신 입력자가 항상 최상단에 노출)
  const sortedParticipants = [...participants].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
    const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  // 필터링된 참여자 목록 (학번, 이름, 전화번호, 인스타그램 검색 지원)
  const filtered = sortedParticipants.filter((p) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.studentId && p.studentId.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.instagram && p.instagram.toLowerCase().includes(q))
    );
  });

  // 수동 추가 처리
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    if (!newEntry.studentId || !newEntry.name || !newEntry.phone) {
      setActionError('학번, 이름, 전화번호를 입력해주세요.');
      return;
    }
    if (!/^60\d{6}$/.test(newEntry.studentId.trim())) {
      setActionError('학번은 60으로 시작하는 8자리 숫자여야 합니다. (예: 60241234)');
      return;
    }
    const formattedInsta = newEntry.instagram.trim() 
      ? `@${newEntry.instagram.trim().replace(/^@/, '')}` 
      : '없음';
    const success = await onAdd({ ...newEntry, instagram: formattedInsta });
    if (success) {
      setShowAddModal(false);
      setNewEntry({ studentId: '', name: '', phone: '', instagram: '' });
    }
  };

  // 삭제 확인 처리
  const handleConfirmDelete = async (id) => {
    await onDelete(id, deleteReason || '운영진 목록 정리');
    setDeleteConfirmId(null);
    setDeleteReason('');
  };

  // CSV 내보내기 (최신순)
  const handleExportCSV = () => {
    const headers = ['번호', '학번', '이름', '전화번호', '인스타그램', '참여일시', '접속IP'];
    const rows = sortedParticipants.map((p, idx) => [
      idx + 1,
      p.studentId,
      p.name,
      p.phone,
      p.instagram || '없음',
      formatDateTime(p.createdAt),
      p.ip || '-'
    ]);
    exportToCSV(`혜윰_축제부스_전체참여자_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* 액션 바 */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* 검색 인풋 */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="학번, 이름, 전화번호 검색..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-400 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* 버튼 모음 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>수동 추가</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={participants.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>CSV 저장</span>
          </button>
        </div>
      </div>

      {/* 참여자 명단 테이블 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">학번</th>
                <th className="py-3.5 px-4">이름</th>
                <th className="py-3.5 px-4">전화번호</th>
                <th className="py-3.5 px-4">인스타그램</th>
                <th className="py-3.5 px-4 hidden md:table-cell">참여일시</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">접속 IP</th>
                <th className="py-3.5 px-4 text-right w-20">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                    {search ? '검색 결과와 일치하는 참여자가 없습니다.' : '아직 등록된 참여자가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-500 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {p.studentId}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {p.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-indigo-400">
                      {p.phone}
                    </td>
                    <td className="py-3 px-4">
                      {p.instagram && p.instagram !== '없음' ? (
                        <a
                          href={`https://instagram.com/${p.instagram.replace(/^@/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/25 hover:bg-pink-500/20 hover:border-pink-500/40 transition-all group/link"
                          title={`${p.name}님의 인스타그램 프로필 열기`}
                        >
                          <InstagramIcon className="w-3 h-3 text-pink-400" />
                          <span>{p.instagram}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/link:opacity-100" />
                        </a>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700/60">
                          계정 없음
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-xs text-slate-400">
                      {formatDateTime(p.createdAt)}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell font-mono text-xs text-slate-500">
                      {p.ip || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600/80 transition-colors"
                        title="참여자 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수동 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-slate-900 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="font-black text-lg text-slate-900">참여자 수동 추가</h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && (
              <p className="mt-3 p-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg">
                {actionError}
              </p>
            )}
            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">학번 (60xxxxxx)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={newEntry.studentId}
                  onChange={(e) => setNewEntry({ ...newEntry, studentId: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="예: 60241234"
                  maxLength={8}
                  required
                  className="w-full px-3 py-2 border rounded-xl font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">이름</label>
                <input
                  type="text"
                  value={newEntry.name}
                  onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                  placeholder="예: 홍길동"
                  maxLength={20}
                  required
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">전화번호</label>
                <input
                  type="text"
                  value={newEntry.phone}
                  onChange={(e) => setNewEntry({ ...newEntry, phone: formatPhoneNumber(e.target.value) })}
                  placeholder="010-0000-0000"
                  required
                  className="w-full px-3 py-2 border rounded-xl font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">인스타그램 아이디 (선택)</label>
                <input
                  type="text"
                  value={newEntry.instagram}
                  onChange={(e) => setNewEntry({ ...newEntry, instagram: e.target.value })}
                  placeholder="@hyeyum 또는 비워둠"
                  className="w-full px-3 py-2 border rounded-xl font-mono text-sm"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 (사유 입력 및 감사 로그 연동) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-red-200 text-slate-900 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-black text-lg text-center text-slate-900">
              참여자 삭제 확인
            </h4>
            <p className="mt-1 text-xs text-center text-slate-500">
              삭제된 내역은 감사 로그에 IP 및 시간과 함께 영구 기록됩니다.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-600 mb-1">삭제 사유</label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="예: 본인 요청 / 중복 입력 등"
                className="w-full px-3 py-2 border rounded-xl text-xs"
              />
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow"
              >
                삭제 진행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
