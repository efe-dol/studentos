'use client';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a]">
      <div
        className="w-10 h-10 rounded-full border-[3px] border-white/15 border-t-blue-400 animate-spin"
        role="status"
        aria-label="Wird geladen"
      />
    </div>
  );
}
