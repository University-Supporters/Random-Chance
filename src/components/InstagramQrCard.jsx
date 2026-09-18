import React from 'react';
import InstagramIcon from './InstagramIcon';

export default function InstagramQrCard() {
  return (
    <div className="instagram-card glass-panel rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col items-center justify-between text-center max-w-[420px] w-full border border-pink-500/30 bg-gradient-to-b from-slate-900/95 via-slate-900/98 to-slate-950/95 animate-fade-in">
      {/* 상단 헤딩 & 뱃지 */}
      <div className="w-full flex flex-col items-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-amber-500/20 border border-pink-500/35 text-pink-300 text-xs font-bold mb-1.5 shadow-sm">
          <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
          <span>공식 인스타그램 팔로우</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          인권 서포터즈 <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-amber-300">혜윰</span>
        </h3>
      </div>

      {/* 대형 QR코드 이미지 카드 (카드 너비에 꽉 차도록 여백 최소화 및 크기 극대화) */}
      <div className="qr-image-frame w-full my-3 p-2 bg-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-pink-500/20 border-4 border-white transform hover:scale-[1.01] transition-transform duration-300 flex items-center justify-center">
        <img
          src="/instagram_qr.png"
          alt="인권 서포터즈 혜윰 인스타그램 QR코드"
          width="390" height="390" className="qr-image aspect-square object-contain"
        />
      </div>

      {/* 직관적인 현장 스캔 안내 문구 */}
      <div className="w-full bg-slate-800/80 rounded-2xl p-2.5 sm:p-3 border border-pink-500/25">
        <p className="text-xs sm:text-[13px] font-bold text-slate-200 leading-snug">
          📱 스마트폰 카메라로 <span className="text-pink-400 font-extrabold underline underline-offset-4 decoration-pink-500/70">QR 코드</span>를 스캔하여
          <br />
          인스타그램 팔로우 후 응모해 주세요!
        </p>
      </div>
    </div>
  );
}

