import React from 'react';
import { AlertTriangle, CheckCircle2, X, User, Phone, GraduationCap } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, formData, isSubmitting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900/95 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 transform transition-all animate-scale-up">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              입력 정보 확인
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 확인 정보 리스트 */}
        <div className="mt-4 bg-slate-950/60 border border-white/[0.06] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <GraduationCap className="w-4 h-4 text-indigo-400" /> 학번
            </span>
            <span className="font-mono font-bold text-white tracking-wider">
              {formData.studentId}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-white/[0.04]">
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <User className="w-4 h-4 text-indigo-400" /> 이름
            </span>
            <span className="font-bold text-white">
              {formData.name}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-white/[0.04]">
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Phone className="w-4 h-4 text-indigo-400" /> 연락처
            </span>
            <span className="font-mono font-bold text-indigo-300 tracking-wider">
              {formData.phone}
            </span>
          </div>
        </div>

        {/* ⚠️ 요구사항 필수 반영: 취소 경고 강조 카드 (모던 앰버 틴트) */}
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-amber-300 font-bold text-xs tracking-tight">
              정보 불일치 시 당첨 취소 유의사항
            </h4>
            <p className="mt-0.5 text-[11px] text-amber-200/80 leading-relaxed">
              추첨 당첨 이후 기재하신 정보가 본인과 다를 경우, <span className="text-amber-100 font-bold underline decoration-amber-400 decoration-1">상품권 지급 대상에서 제외 및 취소</span>될 수 있습니다.
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            수정하기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>네, 정보가 맞습니다</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
