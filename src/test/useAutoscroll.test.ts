import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoscroll } from '../features/stage-mode/useAutoscroll';

describe('useAutoscroll', () => {
  let fakeContainer: HTMLElement;
  let rafCallbacks: ((timestamp: number) => void)[] = [];
  let rafIdCounter = 0;

  beforeEach(() => {
    fakeContainer = {
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 400,
    } as HTMLElement;

    rafCallbacks = [];
    rafIdCounter = 0;

    vi.stubGlobal('requestAnimationFrame', (cb: (timestamp: number) => void) => {
      const id = ++rafIdCounter;
      rafCallbacks.push(cb);
      return id;
    });

    vi.stubGlobal('cancelAnimationFrame', vi.fn(() => {
      rafCallbacks = [];
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes with default options and paused state', () => {
    const containerRef = { current: fakeContainer };
    const { result } = renderHook(() => useAutoscroll(containerRef, { initialSpeed: 4 }));

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.speed).toBe(4);
  });

  it('clamps initial speed between 1 and 10', () => {
    const containerRef = { current: fakeContainer };
    const { result: low } = renderHook(() => useAutoscroll(containerRef, { initialSpeed: -5 }));
    expect(low.current.speed).toBe(1);

    const { result: high } = renderHook(() => useAutoscroll(containerRef, { initialSpeed: 99 }));
    expect(high.current.speed).toBe(10);
  });

  it('starts and pauses scrolling via play, pause and toggle', () => {
    const containerRef = { current: fakeContainer };
    const { result } = renderHook(() => useAutoscroll(containerRef));

    act(() => {
      result.current.play();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isPlaying).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isPlaying).toBe(false);
  });

  it('rewinds scroll position to top and pauses', () => {
    fakeContainer.scrollTop = 250;
    const containerRef = { current: fakeContainer };
    const { result } = renderHook(() => useAutoscroll(containerRef));

    act(() => {
      result.current.play();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.rewind();
    });
    expect(result.current.isPlaying).toBe(false);
    expect(fakeContainer.scrollTop).toBe(0);
  });

  it('adjusts speed up and down within bounds 1 to 10', () => {
    const containerRef = { current: fakeContainer };
    const { result } = renderHook(() => useAutoscroll(containerRef, { initialSpeed: 9 }));

    act(() => {
      result.current.speedUp();
    });
    expect(result.current.speed).toBe(10);

    act(() => {
      result.current.speedUp(); // At maximum 10
    });
    expect(result.current.speed).toBe(10);

    act(() => {
      result.current.setSpeed(2);
    });
    expect(result.current.speed).toBe(2);

    act(() => {
      result.current.slowDown();
    });
    expect(result.current.speed).toBe(1);

    act(() => {
      result.current.slowDown(); // At minimum 1
    });
    expect(result.current.speed).toBe(1);
  });

  it('advances scrollTop during animation loop', () => {
    const containerRef = { current: fakeContainer };
    const { result } = renderHook(() => useAutoscroll(containerRef, { initialSpeed: 5 }));

    act(() => {
      result.current.play();
    });

    // Simulate 3 animation frames (elapsed ~100ms)
    act(() => {
      if (rafCallbacks.length > 0) {
        const cb = rafCallbacks.shift()!;
        cb(1000);
      }
      if (rafCallbacks.length > 0) {
        const cb = rafCallbacks.shift()!;
        cb(1050); // +50ms
      }
      if (rafCallbacks.length > 0) {
        const cb = rafCallbacks.shift()!;
        cb(1100); // +50ms
      }
    });

    expect(fakeContainer.scrollTop).toBeGreaterThan(0);
  });

  it('applies live speed changes without creating a second frame loop and pauses movement', () => {
    const containerRef = { current: fakeContainer };
    const { result } = renderHook(() => useAutoscroll(containerRef, { initialSpeed: 1 }));

    act(() => result.current.play());
    expect(rafCallbacks).toHaveLength(1);
    act(() => rafCallbacks.shift()?.(1000));
    expect(rafCallbacks).toHaveLength(1);

    act(() => result.current.setSpeed(10));
    expect(rafCallbacks).toHaveLength(1);
    act(() => rafCallbacks.shift()?.(1100));
    expect(fakeContainer.scrollTop).toBe(11);
    expect(rafCallbacks).toHaveLength(1);

    act(() => result.current.pause());
    const pausedAt = fakeContainer.scrollTop;
    expect(rafCallbacks).toHaveLength(0);
    expect(result.current.isPlaying).toBe(false);
    expect(fakeContainer.scrollTop).toBe(pausedAt);
  });

  it('caps a long suspended interval to prevent a large jump', () => {
    const containerRef = { current: fakeContainer };
    const { result } = renderHook(() => useAutoscroll(containerRef, { initialSpeed: 10 }));

    act(() => result.current.play());
    act(() => rafCallbacks.shift()?.(1000));
    act(() => rafCallbacks.shift()?.(60_000));

    expect(fakeContainer.scrollTop).toBe(11);
    expect(rafCallbacks).toHaveLength(1);
  });

  it('pauses and calls onEnd when reaching the bottom', () => {
    fakeContainer.scrollTop = 590; // maxScroll is 1000 - 400 = 600
    const onEndMock = vi.fn();
    const containerRef = { current: fakeContainer };
    const { result } = renderHook(() => useAutoscroll(containerRef, { initialSpeed: 10, onEnd: onEndMock }));

    act(() => {
      result.current.play();
    });

    act(() => {
      if (rafCallbacks.length > 0) {
        const cb = rafCallbacks.shift()!;
        cb(1000);
      }
      if (rafCallbacks.length > 0) {
        const cb = rafCallbacks.shift()!;
        cb(1200); // +200ms at speed 10 = ~24px -> reaches > 600
      }
      if (rafCallbacks.length > 0) {
        const cb = rafCallbacks.shift()!;
        cb(1210);
      }
    });

    expect(result.current.isPlaying).toBe(false);
    expect(onEndMock).toHaveBeenCalled();
  });

  it('cancels animation frame on unmount', () => {
    const containerRef = { current: fakeContainer };
    const { result, unmount } = renderHook(() => useAutoscroll(containerRef));

    act(() => {
      result.current.play();
    });

    unmount();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
  });
});
