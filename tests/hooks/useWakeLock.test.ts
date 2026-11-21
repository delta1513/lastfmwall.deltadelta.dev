import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWakeLock } from '@/hooks/useWakeLock';

type FakeSentinel = EventTarget & { release: Mock<() => Promise<void>>; released: boolean };

const makeSentinel = (): FakeSentinel => {
  const target = new EventTarget() as FakeSentinel;
  target.released = false;
  target.release = vi.fn(async () => {
    target.released = true;
    target.dispatchEvent(new Event('release'));
  });
  return target;
};

let visibility: DocumentVisibilityState;
let request: ReturnType<typeof vi.fn>;
let sentinels: FakeSentinel[];

const setVisibility = (state: DocumentVisibilityState) => {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
};

/** Lets pending promise callbacks (the async acquire) settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  visibility = 'visible';
  sentinels = [];
  request = vi.fn(async () => {
    const sentinel = makeSentinel();
    sentinels.push(sentinel);
    return sentinel;
  });
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
});

afterEach(() => {
  // jsdom has no Wake Lock API, so removing the stub restores the "unsupported" state.
  Reflect.deleteProperty(navigator, 'wakeLock');
});

describe('useWakeLock', () => {
  it("requests a 'screen' lock on mount", async () => {
    renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith('screen');
  });

  it('does not request a lock while the document is hidden', async () => {
    visibility = 'hidden';
    renderHook(() => useWakeLock());
    await flush();
    expect(request).not.toHaveBeenCalled();
  });

  it('requests the lock once the tab becomes visible', async () => {
    visibility = 'hidden';
    renderHook(() => useWakeLock());
    await flush();
    expect(request).not.toHaveBeenCalled();

    setVisibility('visible');
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  });

  it('re-requests the lock after the browser released it and the tab becomes visible again', async () => {
    renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await flush();

    // The browser releases the lock when the tab is hidden.
    setVisibility('hidden');
    await sentinels[0].release();
    expect(request).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('does not request a second lock while one is still held', async () => {
    renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await flush();

    setVisibility('visible');
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not re-request when the visibility change is to hidden', async () => {
    renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await sentinels[0].release();

    setVisibility('hidden');
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('releases the lock on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await flush();

    unmount();
    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
  });

  it('stops listening for visibility changes after unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await flush();
    await sentinels[0].release();
    unmount();

    setVisibility('visible');
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('releases a lock that resolves after the component unmounted', async () => {
    let resolveRequest!: (sentinel: FakeSentinel) => void;
    request.mockImplementationOnce(
      () =>
        new Promise<FakeSentinel>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { unmount } = renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    unmount();

    const late = makeSentinel();
    resolveRequest(late);
    await waitFor(() => expect(late.release).toHaveBeenCalledTimes(1));
  });

  it('does nothing and does not throw when the Wake Lock API is unsupported', async () => {
    Reflect.deleteProperty(navigator, 'wakeLock');
    expect('wakeLock' in navigator).toBe(false);

    const { unmount } = renderHook(() => useWakeLock());
    await flush();
    expect(() => setVisibility('visible')).not.toThrow();
    expect(() => unmount()).not.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it('does nothing when enabled is false', async () => {
    const { unmount } = renderHook(() => useWakeLock(false));
    await flush();
    setVisibility('visible');
    await flush();
    expect(request).not.toHaveBeenCalled();
    expect(() => unmount()).not.toThrow();
  });

  it('acquires the lock when enabled flips to true and releases it when it flips to false', async () => {
    const { rerender } = renderHook(({ enabled }) => useWakeLock(enabled), { initialProps: { enabled: false } });
    await flush();
    expect(request).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await flush();

    rerender({ enabled: false });
    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejected request and retries on the next visibility change', async () => {
    request.mockRejectedValueOnce(new DOMException('Low battery', 'NotAllowedError'));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    try {
      const { unmount } = renderHook(() => useWakeLock());
      await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
      await flush();

      setVisibility('visible');
      await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
      await flush();
      expect(unhandled).not.toHaveBeenCalled();
      expect(() => unmount()).not.toThrow();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('swallows a rejection when releasing on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await flush();
    sentinels[0].release.mockRejectedValueOnce(new Error('already released'));

    expect(() => unmount()).not.toThrow();
    await flush();
  });
});
