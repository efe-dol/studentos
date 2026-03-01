'use client';

import React, { useState, useEffect } from 'react'

export default function AuthBackground() {
  const [dots, setDots] = useState<Array<{top: number, left: number, size: number, delay: number}>>([])

  useEffect(() => {
    setDots([...Array(3)].map(() => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 250 + 150,
      delay: Math.random() * 3,
    })))
  }, [])

  return (
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a]" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px] [mask-image:linear-gradient(to_bottom,transparent,60%,white)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-none absolute h-[60vh] w-[60vh] rounded-full bg-white/5 blur-3xl" />
      </div>
      {dots.map((dot, i) => (
        <div
          key={i}
          className="absolute animate-pulse opacity-40"
          style={{
            top: `${dot.top}%`,
            left: `${dot.left}%`,
            animationDelay: `${dot.delay}s`,
            animationDuration: '4s',
            width: `${dot.size}px`,
            height: `${dot.size}px`,
          }}
        >
          <div className="absolute inset-0 rounded-full bg-white/10 blur-3xl" />
        </div>
      ))}
    </div>
  )
}
