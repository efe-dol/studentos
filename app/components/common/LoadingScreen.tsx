'use client';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a]">
      <div
        className="app-spinner w-10 h-10 rounded-full border-[3px] border-white/15 border-t-blue-400"
        role="status"
        aria-label="Wird geladen"
      />
      <p className="text-sm text-gray-400">Wird geladen …</p>
    </div>
  );
}
