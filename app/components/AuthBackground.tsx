'use client';

import React from 'react'

export default function AuthBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a]" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px] [mask-image:linear-gradient(to_bottom,transparent,60%,white)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-none absolute h-[60vh] w-[60vh] rounded-full bg-white/3 opacity-50" />
      </div>
    </div>
  )
}
