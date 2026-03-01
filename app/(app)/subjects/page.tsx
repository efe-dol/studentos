'use client';

import { useRouter } from 'next/navigation';
import SubjectListSettings from '@/app/components/grades/SubjectListSettings';
import AuthBackground from '@/app/components/common/AuthBackground';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function SubjectsPage() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex flex-col animate-in fade-in duration-300">
      <AuthBackground />

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:scale-105 duration-200 animate-in fade-in duration-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg animate-in fade-in zoom-in-95 duration-500 delay-100">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
              <h1 className="text-3xl font-semibold">Fächer verwalten</h1>
              <p className="text-sm text-gray-400">Erstelle, bearbeite und organisiere deine Fächer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto z-10">
        <div className="max-w-6xl mx-auto px-6 py-8 pb-24">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 animate-in fade-in zoom-in-95 duration-500 delay-200">
            <SubjectListSettings />
          </div>
        </div>
      </div>
    </div>
  );
}
