'use client'

import { useEffect } from 'react';

/**
 * Keeps the device's screen awake while the calling component is mounted, using the Screen Wake Lock API.
 *
 * Browsers release the lock whenever the tab is hidden, so it is requested again when the tab becomes
 * visible. Unsupported browsers and rejected requests (e.g. low battery) are ignored silently.
 */
export function useWakeLock(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible' || sentinel) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await lock.release();
          return;
        }
        sentinel = lock;
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        // Not allowed right now; we retry on the next visibility change.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      const held = sentinel;
      sentinel = null;
      if (held) void held.release().catch(() => {});
    };
  }, [enabled]);
}
