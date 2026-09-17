import React from 'react';
import { Shield, Clock, Globe, User, RefreshCw } from 'lucide-react';
import { formatDateTime } from '../lib/utils';

export default function AuditLogs({ logs = [], onRefresh }) {
  // 액션별 배지 스타일
  const getBadgeStyle = (action) => {
    switch (action) {
      case 'PARTICIPANT_REGISTER':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ADMIN_ADD_PARTICIPANT':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'ADMIN_DELETE_PARTICIPANT':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'RAFFLE_DRAW':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'RAFFLE_RESET':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'ADMIN_LOGIN_SUCCESS':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'ADMIN_LOGIN_FAIL':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getActionName = (action) => {
    switch (action) {
      case 'PARTICIPANT_REGISTER':
        return '사용자 응모';
      case 'ADMIN_ADD_PARTICIPANT':
        return '운영진 추가';
      case 'ADMIN_DELETE_PARTICIPANT':
        return '참여자 삭제';
      case 'RAFFLE_DRAW':
        return '50명 추첨 진행';
      case 'RAFFLE_RESET':
        return '추첨 초기화';
      case 'ADMIN_LOGIN_SUCCESS':
        return '관리자 로그인';
      case 'ADMIN_LOGIN_FAIL':
        return '로그인 실패';
      default:
        return action;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            작업 및 보안 감사 로그 (Audit Logs)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            모든 참여자 등록, 수동 추가, 삭제, 추첨 작업의 시간 및 IP가 기록됩니다.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 새로고침
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 font-bold text-slate-400 uppercase border-b border-slate-700">
              <tr>
                <th className="py-3 px-4 w-36">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 기록 일시
                  </div>
                </th>
                <th className="py-3 px-4 w-28">유형</th>
                <th className="py-3 px-4">작업 상세 내용</th>
                <th className="py-3 px-4 w-24">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> 작업자
                  </div>
                </th>
                <th className="py-3 px-4 w-36">
                  <div className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> 접속 IP
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500 font-medium">
                    기록된 감사 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] border ${getBadgeStyle(log.action)}`}>
                        {getActionName(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-bold">
                      {log.author || '시스템'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {log.ip || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
