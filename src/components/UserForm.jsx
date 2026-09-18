import React, { useState, useRef } from 'react';
import { GraduationCap, User, Phone, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import { formatPhoneNumber } from '../lib/utils';
import { apiRequest } from '../lib/api';
import ConfirmModal from './ConfirmModal';
import PrivacyModal from './PrivacyModal';

export default function UserForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    phone: '',
    instagram: '',
  });
  const [noInstagram, setNoInstagram] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const submitLock = useRef(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleStudentIdChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, studentId: val }));
    setErrorMessage('');
  };

  const handleNameChange = (e) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
    setErrorMessage('');
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    setErrorMessage('');
  };

  const handleInstagramChange = (e) => {
    setFormData(prev => ({ ...prev, instagram: e.target.value.replace(/^@+/, '') }));
    setErrorMessage('');
  };

  const handleToggleNoInstagram = (e) => {
    const checked = e.target.checked;
    setNoInstagram(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, instagram: '' }));
    }
    setErrorMessage('');
  };

  const handleFirstCheck = (e) => {
    e.preventDefault();
    setErrorMessage('');

    // 60xxxxxx 8자리 학번 검증
    if (!/^60\d{6}$/.test(formData.studentId)) {
      setErrorMessage('학번은 60으로 시작하는 8자리 숫자여야 합니다. (예: 60241234)');
      return;
    }
    if (!formData.name.trim()) {
      setErrorMessage('이름을 입력해 주세요.');
      return;
    }
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setErrorMessage('올바른 휴대폰 번호를 입력해 주세요.');
      return;
    }
    if (!noInstagram && !/^[A-Za-z0-9._]{1,30}$/.test(formData.instagram.trim())) {
      setErrorMessage('인스타그램 아이디를 입력하시거나 [계정 없음]을 체크해 주세요.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('개인정보 수집 및 이용에 동의해 주세요.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setErrorMessage('');

    const formattedInstagram = noInstagram 
      ? '없음' 
      : (formData.instagram.trim() ? `@${formData.instagram.trim().replace(/^@/, '')}` : '없음');

    try {
      await apiRequest('/api/participants', {
        method: 'POST', body: { ...formData, name: formData.name.trim(), instagram: formattedInstagram, noInstagram }
      });

      setShowConfirmModal(false);
      onSuccess(formData.name);
    } catch (err) {
      setErrorMessage(err.message || '네트워크 오류가 발생했습니다.');
      setShowConfirmModal(false);
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="user-form w-full max-w-md mx-auto">
      {/* 컴팩트 헤딩 (스크롤 방지를 위한 최적화) */}
      <div className="form-heading text-center mb-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>2026 축제 부스 이벤트</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          GS25 1만원권 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">50명 추첨</span>
        </h2>
        <p className="mt-0.5 text-slate-400 text-xs sm:text-sm font-medium">
          정보를 입력하고 행운의 상품권에 도전하세요!
        </p>
      </div>

      {/* 모던 슬릭 글래스 카드 */}
      <div className="form-panel glass-panel rounded-3xl p-4 sm:p-5 shadow-2xl">
        {errorMessage && (
          <div role="alert" className="form-error mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form autoComplete="off" onSubmit={handleFirstCheck} className="space-y-3">
          {/* 학번 & 이름 (스크롤 방지를 위해 모바일에서도 2열 그리드로 정돈) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> 학번
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={formData.studentId}
                id="studentId" name="studentId" aria-label="학번" onChange={handleStudentIdChange}
                placeholder="60241234"
                maxLength={8}
                required
                className="modern-input w-full h-10 px-3 rounded-xl text-sm sm:text-base font-bold tracking-wider placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400" /> 이름
              </label>
              <input
                type="text"
                value={formData.name}
                id="name" name="name" aria-label="이름" onChange={handleNameChange}
                placeholder="홍길동"
                maxLength={20}
                required
                className="modern-input w-full h-10 px-3 rounded-xl text-sm sm:text-base font-bold placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* 전화번호 */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-indigo-400" /> 휴대폰 번호
              </span>
              <span className="text-[10px] text-indigo-400 font-medium">기프티콘 발송용</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={formData.phone}
              id="phone" name="phone" aria-label="휴대폰 번호" onChange={handlePhoneChange}
              placeholder="010-1234-5678"
              maxLength={13}
              required
              className="modern-input w-full h-10 px-3 rounded-xl text-sm sm:text-base font-bold tracking-wider placeholder:text-slate-600 font-mono"
            />
          </div>

          {/* 인스타그램 아이디 & 계정 없음 토글 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <InstagramIcon className="w-3.5 h-3.5 text-pink-400" /> 인스타그램 아이디
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noInstagram}
                  onChange={handleToggleNoInstagram}
                  className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-700 bg-slate-900 cursor-pointer"
                />
                <span className={`text-[11px] ${noInstagram ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
                  계정 없음
                </span>
              </label>
            </div>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${noInstagram ? 'text-slate-600' : 'text-slate-400'}`}>
                @
              </span>
              <input
                type="text"
                value={noInstagram ? '계정 없음 (인스타 미사용)' : formData.instagram}
                id="instagram" name="instagram" aria-label="인스타그램 아이디" onChange={handleInstagramChange}
                disabled={noInstagram}
                placeholder="hyeyum_official"
                maxLength={30}
                className={`modern-input w-full h-10 pl-7 pr-3 rounded-xl text-sm font-semibold placeholder:text-slate-600 transition-all ${
                  noInstagram ? 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed italic' : ''
                }`}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
              <span>※ 당첨 시 서포터즈 인스타 팔로우 여부를 확인합니다.</span>
              {noInstagram && <span className="text-amber-400 font-medium">※ 계정 없음으로 응모</span>}
            </p>
          </div>

          {/* 개인정보 동의 및 상세보기 버튼 */}
          <div className="pt-0.5">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
              <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900 cursor-pointer shrink-0"
                />
                <span className="text-[11px] text-slate-300 leading-tight truncate">
                  <strong className="text-indigo-400">[필수]</strong> 개인정보 수집 및 이용 동의
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="text-[11px] font-semibold text-slate-400 hover:text-indigo-300 underline underline-offset-2 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              >
                상세보기
              </button>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>확인하기</span>
            </button>
            <p className="text-center mt-1.5 text-[10px] sm:text-[11px] text-slate-500 font-medium">
              확인을 누르면 입력 정보 검토 및 유의사항이 안내됩니다.
            </p>
          </div>
        </form>
      </div>

      {/* 2차 확인 모달 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleFinalSubmit}
        formData={{
          ...formData,
          instagram: noInstagram ? '없음' : (formData.instagram.trim() ? `@${formData.instagram.trim().replace(/^@/, '')}` : '없음')
        }}
        isSubmitting={isSubmitting}
      />

      {/* 개인정보 수집 및 이용 동의 상세 모달 */}
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAgree={() => {
          setAgreeTerms(true);
          setShowPrivacyModal(false);
        }}
      />
    </div>
  );
}
