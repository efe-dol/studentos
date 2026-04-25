'use client';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] flex flex-col items-center justify-center z-50">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-40 right-1/4 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl animate-pulse-slower"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Animated logo */}
        <div className="loading-spinner">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 border-r-purple-400 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
          </div>
        </div>

        {/* Loading text with animation */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
            StudentOS
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-400">Wird geladen</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
              <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full animate-loading-progress"></div>
        </div>
      </div>
    </div>
  );
}
