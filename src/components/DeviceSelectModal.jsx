import React from 'react';
import { Laptop, Check, UserCheck, X } from 'lucide-react';

export const OPERATOR_LIST = [
  '병일', '기헌', '예본',
  '재림', '영서', '나연',
  '솔비', '지우', '지수'
];

export default function DeviceSelectModal({ 
  isOpen, 
  currentOperator, 
  onSelectOperator, 
  onClose,
  canClose = false 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 animate-scale-up">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                부스 단말기 담당자 선택
              </h3>
              <p className="text-[11px] text-slate-400">
                현재 노트북을 사용하는 서포터즈를 선택해주세요.
              </p>
            </div>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 9인 팀원 그리드 버튼 */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {OPERATOR_LIST.map((name) => {
            const isSelected = currentOperator === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelectOperator(name)}
                className={`py-3 px-2 rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/50 scale-[1.02]'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-300" />}
                </div>
                <span className="text-[10px] font-normal text-slate-400">
                  {isSelected ? '선택됨' : '노트북'}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500 leading-relaxed">
          선택한 이름은 모든 응모 및 감사 로그에 기기 식별자로 함께 기록됩니다. (언제든 상단에서 변경 가능)
        </p>
      </div>
    </div>
  );
}
