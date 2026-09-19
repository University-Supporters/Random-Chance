import React, { useEffect, useState } from 'react';
import { CloudUpload, WifiOff } from 'lucide-react';

export default function QueuedCard({ onReset }) {
  const [seconds, setSeconds] = useState(5);
  useEffect(() => {
    const tick = setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    const reset = setTimeout(onReset, 5000);
    return () => { clearInterval(tick); clearTimeout(reset); };
  }, [onReset]);
  return <div className="w-full max-w-sm mx-auto glass-panel rounded-3xl p-6 text-center border border-amber-500/40 shadow-2xl animate-fade-in" role="status">
    <WifiOff className="w-12 h-12 text-amber-300 mx-auto mb-3" />
    <h2 className="text-xl font-extrabold text-amber-200">이 기기에 임시 보관했습니다</h2>
    <p className="text-sm text-slate-300 mt-3">아직 응모가 완료되지 않았습니다. 인터넷이 돌아오면 이 노트북이 자동으로 다시 전송합니다.</p>
    <p className="text-xs text-slate-400 mt-3 flex items-center justify-center gap-1"><CloudUpload size={14} /> 전송 완료 전까지 이 브라우저의 데이터를 지우지 마세요.</p>
    <button type="button" onClick={onReset} className="mt-5 text-xs font-semibold text-indigo-300 hover:text-white">다음 응모 화면으로 이동 · {seconds}초 후 자동 전환</button>
  </div>;
}
