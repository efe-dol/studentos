'use client';
import { useEffect } from 'react';

type ToastProps = {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
};

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-6 pointer-events-none">
      <div
        className={`
          pointer-events-auto max-w-md w-full p-4 rounded-xl backdrop-blur-xl border shadow-2xl
          animate-[slideUpSmooth_0.4s_cubic-bezier(0.16,1,0.3,1)]
          ${type === 'success' 
            ? 'bg-green-500/20 border-green-500/30 text-green-100' 
            : 'bg-red-500/20 border-red-500/30 text-red-100'
          }
        `}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">
            {type === 'success' ? '✓' : '⚠'}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
