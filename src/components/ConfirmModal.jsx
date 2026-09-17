import React from 'react';
import { AlertTriangle, CheckCircle2, X, User, Phone, GraduationCap } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, formData, isSubmitting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-amber-400 transform transition-all animate-scale-up">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              입력 정보 확인
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 확인 안내 문구 */}
        <p className="mt-4 text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
          작성하신 정보가 본인의 정보와 일치하는지 다시 한 번 꼼꼼히 확인해 주세요.
        </p>

        {/* 입력한 정보 카드 - 고시인성 대형 텍스트 */}
        <div className="mt-5 bg-slate-50 border-2 border-slate-300 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="flex items-center gap-2 text-slate-600 font-bold text-base sm:text-lg">
              <GraduationCap className="w-5 h-5 text-indigo-600" /> 학번
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider">
              {formData.studentId}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="flex items-center gap-2 text-slate-600 font-bold text-base sm:text-lg">
              <User className="w-5 h-5 text-indigo-600" /> 이름
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {formData.name}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600 font-bold text-base sm:text-lg">
              <Phone className="w-5 h-5 text-indigo-600" /> 전화번호
            </span>
            <span className="text-xl sm:text-2xl font-black text-indigo-700 tracking-wider">
              {formData.phone}
            </span>
          </div>
        </div>

        {/* ⚠️ 요구사항 핵심 강조 경고 박스 */}
        <div className="mt-6 bg-gradient-to-r from-red-500 to-amber-500 rounded-2xl p-0.5 shadow-lg shadow-red-500/20">
          <div className="bg-amber-50 rounded-[14px] p-4 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-red-600 text-white shrink-0 mt-0.5 shadow">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-red-900 font-black text-base sm:text-lg tracking-tight">
                ⚠️ 정보 불일치 시 당첨 취소 안내
              </h4>
              <p className="mt-1 text-red-800 text-sm sm:text-base font-bold leading-snug">
                당첨 이후 등록된 학번/이름/전화번호가 실제 본인 정보와 일치하지 않을 경우, <span className="underline decoration-2 decoration-red-600 text-red-950 font-black">상품권 증정이 취소될 수 있습니다!</span>
              </p>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-base transition-colors"
          >
            다시 수정하기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-base sm:text-lg shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                등록 중...
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>네, 맞습니다! 응모 완료</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
