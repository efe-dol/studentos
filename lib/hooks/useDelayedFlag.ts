'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `true` only once `active` has stayed truthy for `delayMs`.
 * Used to keep the full-screen loading animation from flashing on quick
 * page/data loads – it should appear only when something actually takes a
 * moment (cold login, slow backend), not on every route change.
 */
export function useDelayedFlag(active: boolean, delayMs = 400): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, delayMs]);

  return active && elapsed;
}
