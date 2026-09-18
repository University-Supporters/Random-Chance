import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import InstagramIcon from './InstagramIcon';

export default function InstagramQrCard() {
  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center justify-between text-center max-w-sm w-full border border-pink-500/20 bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-slate-950/90 animate-fade-in">
      {/* 상단 뱃지 & 헤딩 */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-amber-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold mb-2">
          <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
          <span>공식 인스타그램 팔로우</span>
        </div>
        <h3 className="text-xl font-black text-white tracking-tight">
          인권 서포터즈 <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-amber-300">혜윰</span>
        </h3>
        <p className="text-xs font-mono font-bold text-pink-300 mt-0.5">
          @MJU_HUMANRIGHTS
        </p>
      </div>

      {/* QR코드 이미지 카드 */}
      <div className="my-3 sm:my-4 p-3 bg-white rounded-2xl shadow-xl shadow-pink-500/10 border-2 border-white/80 transform hover:scale-105 transition-transform duration-300 group">
        <img
          src="/instagram_qr.png"
          alt="인권 서포터즈 혜윰 인스타그램 QR코드"
          className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl"
        />
      </div>

      {/* 안내 및 외부 링크 버튼 */}
      <div className="w-full space-y-2.5">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          카메라로 <span className="text-pink-300 font-bold">QR 코드</span>를 스캔하거나 아래 버튼을 눌러 서포터즈 계정을 팔로우해 주세요!
        </p>
        <a
          href="https://www.instagram.com/mju_humanrights/"
          target="_blank"
          rel="noreferrer"
          className="w-full h-10 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-bold text-xs shadow-md shadow-pink-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <InstagramIcon className="w-4 h-4" />
          <span>인스타그램 바로가기</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>
    </div>
  );
}
