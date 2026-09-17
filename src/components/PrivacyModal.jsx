import React from 'react';
import { ShieldCheck, X, Check } from 'lucide-react';

export default function PrivacyModal({ isOpen, onClose, onAgree }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 animate-scale-up max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                개인정보 수집 및 이용 동의 안내
              </h3>
              <p className="text-[11px] text-slate-400">
                인권 서포터즈 혜윰 축제 부스 이벤트
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 내용 (스크롤 가능 영역) */}
        <div className="mt-4 overflow-y-auto pr-1 space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p className="text-slate-400">
            인권 서포터즈 혜윰은 축제 부스 이벤트 진행 및 GS25 모바일 상품권 경품 지급을 위하여 아래와 같이 개인정보를 수집·이용하고자 합니다. 내용을 자세히 확인하신 후 동의해 주시기 바랍니다.
          </p>

          {/* 1. 수집 항목 */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/[0.06] space-y-1.5">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              1. 수집하는 개인정보 항목
            </span>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5 pl-1 text-[11px]">
              <li><strong>필수 정보</strong>: 학번, 성명, 휴대폰 번호</li>
              <li><strong>자동 수집</strong>: 참여 일시, 단말기 식별자, 접속 IP</li>
            </ul>
          </div>

          {/* 2. 수집 및 이용 목적 */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/[0.06] space-y-1.5">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              2. 개인정보 수집 및 이용 목적
            </span>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5 pl-1 text-[11px]">
              <li>부스 방문 이벤트 1인 1회 응모 자격 확인 및 중복 응모 방지</li>
              <li>GS25 1만원권 모바일 상품권 50인 랜덤 추첨 대상자 선정</li>
              <li>당첨자 본인 일치 여부 검증 및 모바일 기프티콘 개별 발송</li>
            </ul>
          </div>

          {/* 3. 보유 및 이용 기간 */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/[0.06] space-y-1.5">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              3. 개인정보 보유 및 이용 기간
            </span>
            <p className="text-[11px] text-amber-300 font-medium pl-1">
              이벤트 추첨 및 당첨자 모바일 상품권 발송 완료 후 14일 이내 안전하게 영구 파기됩니다.
            </p>
          </div>

          {/* 4. 동의 거부 권리 */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/[0.06] space-y-1.5">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              4. 동의 거부 권리 및 불이익 안내
            </span>
            <p className="text-[11px] text-slate-400 pl-1">
              귀하는 개인정보 수집 및 이용 동의를 거부할 권리가 있습니다. 단, 필수 정보 수집에 동의하지 않으실 경우 이벤트 응모 및 상품권 추첨 대상에서 제외됩니다.
            </p>
          </div>
        </div>

        {/* 푸터 액션 버튼 */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 h-10 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onAgree}
            className="w-2/3 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>내용 확인 및 동의</span>
          </button>
        </div>
      </div>
    </div>
  );
}
