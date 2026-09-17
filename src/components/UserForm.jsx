import React, { useState } from 'react';
import { GraduationCap, User, Phone, CheckSquare, Sparkles, ShieldCheck } from 'lucide-react';
import { formatPhoneNumber } from '../lib/utils';
import ConfirmModal from './ConfirmModal';

export default function UserForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    phone: '',
  });

  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 학번 변경 (숫자만 입력 허용)
  const handleStudentIdChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, studentId: val }));
    setErrorMessage('');
  };

  // 이름 변경
  const handleNameChange = (e) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
    setErrorMessage('');
  };

  // 전화번호 변경 (자동 하이픈)
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    setErrorMessage('');
  };

  // 1차 '확인' 버튼 클릭 시 유효성 검증 후 확인 팝업 오픈
  const handleFirstCheck = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.studentId || formData.studentId.length < 6) {
      setErrorMessage('올바른 학번(최소 6자리 이상)을 입력해 주세요.');
      return;
    }
    if (!formData.name.trim()) {
      setErrorMessage('이름을 입력해 주세요.');
      return;
    }
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setErrorMessage('전화번호 10~11자리를 정확히 입력해 주세요.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('상품권 추첨 및 지급을 위한 개인정보 수집 이용에 동의해 주세요.');
      return;
    }

    // 모달 표시
    setShowConfirmModal(true);
  };

  // 2차 '맞습니다! 응모 완료' 클릭 시 서버에 최종 전송
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || '응모 처리 중 오류가 발생했습니다.');
      }

      setShowConfirmModal(false);
      onSuccess(formData.name);
    } catch (err) {
      setErrorMessage(err.message || '네트워크 오류가 발생했습니다.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* 부스 타이틀 배너 */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-sm sm:text-base font-extrabold mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          축제 부스 방문 이벤트
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
          GS25 1만원권 상품권 <br />
          <span className="text-amber-400 underline decoration-indigo-500 decoration-wavy decoration-2">
            50명 추첨 응모
          </span>
        </h2>
        <p className="mt-2 text-slate-300 text-base sm:text-lg font-medium">
          부스에 오신 여러분을 환영합니다! 정확한 정보를 입력해 주세요.
        </p>
      </div>

      {/* 야외 직사광선에서도 잘 보이는 고대비 화이트 폼 카드 */}
      <div className="outdoor-contrast-card rounded-3xl p-6 sm:p-10 border-4 border-indigo-600">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-100 border-2 border-red-500 text-red-900 font-black text-sm sm:text-base animate-shake flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleFirstCheck} className="space-y-6">
          {/* 1. 학번 입력란 - 대형 폰트 */}
          <div>
            <label className="block text-slate-900 font-black text-lg sm:text-xl mb-2 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-indigo-600" />
              <span>학번</span>
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">필수</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={formData.studentId}
              onChange={handleStudentIdChange}
              placeholder="예: 20241234"
              maxLength={12}
              required
              className="w-full text-2xl sm:text-3xl font-black px-5 py-4 rounded-2xl border-4 border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none text-slate-900 placeholder:text-slate-400 tracking-wider transition-all"
            />
          </div>

          {/* 2. 이름 입력란 - 대형 폰트 */}
          <div>
            <label className="block text-slate-900 font-black text-lg sm:text-xl mb-2 flex items-center gap-2">
              <User className="w-6 h-6 text-indigo-600" />
              <span>이름</span>
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">필수</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="예: 홍길동"
              maxLength={20}
              required
              className="w-full text-2xl sm:text-3xl font-black px-5 py-4 rounded-2xl border-4 border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none text-slate-900 placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* 3. 전화번호 입력란 - 대형 폰트 */}
          <div>
            <label className="block text-slate-900 font-black text-lg sm:text-xl mb-2 flex items-center gap-2">
              <Phone className="w-6 h-6 text-indigo-600" />
              <span>전화번호</span>
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">필수</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="010-0000-0000"
              maxLength={13}
              required
              className="w-full text-2xl sm:text-3xl font-black px-5 py-4 rounded-2xl border-4 border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none text-indigo-900 placeholder:text-slate-400 tracking-wider transition-all"
            />
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 font-bold">
              ※ 당첨 시 모바일 상품권이 발송될 휴대폰 번호입니다.
            </p>
          </div>

          {/* 개인정보 수집 및 이용 동의 */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-100 border-2 border-slate-200 cursor-pointer hover:bg-slate-200/70 transition-colors select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500 border-gray-400 mt-0.5 cursor-pointer"
              />
              <div className="text-xs sm:text-sm text-slate-700 leading-snug">
                <span className="font-black text-slate-900">[필수] 개인정보 수집 및 이용 동의</span>
                <p className="mt-0.5 text-slate-500">
                  수집 항목: 학번, 이름, 전화번호 | 수집 목적: 축제 부스 상품권 추첨 및 경품 발송 | 보유 기간: 축제 종료 및 상품 전달 완료 후 일괄 파기
                </p>
              </div>
            </label>
          </div>

          {/* 1차 확인 버튼 (클릭 시 확인 팝업 오픈) */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-xl sm:text-2xl shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              <span>확인</span>
            </button>
            <p className="text-center mt-2.5 text-xs sm:text-sm text-slate-500 font-bold">
              확인을 누르면 입력하신 정보를 다시 한 번 검토할 수 있습니다.
            </p>
          </div>
        </form>
      </div>

      {/* 2차 확인 모달 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleFinalSubmit}
        formData={formData}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
