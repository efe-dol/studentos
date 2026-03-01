'use client';
import { useEffect, useState } from 'react';

type ToastProps = {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
};

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, Math.max(0, duration - 280));

    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-6 pointer-events-none">
      <div
        className={`
          pointer-events-auto max-w-md w-full rounded-xl backdrop-blur-xl border shadow-2xl overflow-hidden
          ${isExiting ? 'animate-[toastSlideOut_0.28s_ease-in_forwards]' : 'animate-[slideUpSmooth_0.4s_cubic-bezier(0.16,1,0.3,1)]'}
          ${type === 'success' 
            ? 'bg-green-500/20 border-green-500/30 text-green-100' 
            : 'bg-red-500/20 border-red-500/30 text-red-100'
          }
        `}
      >
        <div className="relative p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-30 animate-[toastShimmer_1.8s_ease-in-out_infinite]"></div>
          <div className="relative flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">
              {type === 'success' ? '✓' : '⚠'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm leading-relaxed">{message}</p>
            </div>
            <button
              onClick={() => setIsExiting(true)}
              className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="h-1 w-full bg-black/20">
          <div
            className={`h-full ${type === 'success' ? 'bg-green-300/80' : 'bg-red-300/80'} animate-[toastProgress_linear_forwards]`}
            style={{ animationDuration: `${duration}ms` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
