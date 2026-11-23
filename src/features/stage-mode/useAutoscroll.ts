import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type UseAutoscrollOptions = {
  initialSpeed?: number;
  onEnd?: () => void;
};

export type UseAutoscrollReturn = {
  isPlaying: boolean;
  speed: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  rewind: () => void;
  setSpeed: (value: number | ((prev: number) => number)) => void;
  speedUp: () => void;
  slowDown: () => void;
};

/**
 * Hook para controle de rolagem suave com requestAnimationFrame.
 * Suporta velocidades de 1 a 10 com acumulador de subpixels para fluidez microscópica.
 */
export function useAutoscroll(
  containerRef: RefObject<HTMLElement | null>,
  options: UseAutoscrollOptions = {},
): UseAutoscrollReturn {
  const { initialSpeed = 3, onEnd } = options;

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeedState] = useState<number>(() => Math.max(1, Math.min(10, initialSpeed)));

  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const subpixelAccumulatorRef = useRef<number>(0);

  // Mantemos referências atualizadas para o loop de animação sem causar reinicialização do RAF
  const speedRef = useRef<number>(speed);
  speedRef.current = speed;

  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const cancelLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastTimeRef.current = null;
    subpixelAccumulatorRef.current = 0;
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    cancelLoop();
  }, [cancelLoop]);

  const rewind = useCallback(() => {
    pause();
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    subpixelAccumulatorRef.current = 0;
  }, [containerRef, pause]);

  const play = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Se já estiver no fim, faz rewind suave antes de começar
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll > 0 && container.scrollTop >= maxScroll - 2) {
      container.scrollTop = 0;
    }

    setIsPlaying(true);
  }, [containerRef]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const setSpeed = useCallback((action: number | ((prev: number) => number)) => {
    setSpeedState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      return Math.max(1, Math.min(10, Math.round(next)));
    });
  }, []);

  const speedUp = useCallback(() => {
    setSpeed((s) => s + 1);
  }, [setSpeed]);

  const slowDown = useCallback(() => {
    setSpeed((s) => s - 1);
  }, [setSpeed]);

  // Efeito principal do loop requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      cancelLoop();
      return;
    }

    const step = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const elapsedMs = Math.min(timestamp - lastTimeRef.current, 100);
      lastTimeRef.current = timestamp;

      const container = containerRef.current;
      if (container) {
        const maxScroll = container.scrollHeight - container.clientHeight;

        if (maxScroll <= 0 || container.scrollTop >= maxScroll - 1) {
          // Chegou ao fim do documento
          setIsPlaying(false);
          cancelLoop();
          onEndRef.current?.();
          return;
        }

        // Fórmula calibrada: velocidade 1 = ~12px/s, velocidade 10 = ~120px/s
        const pixelsPerSecond = 10 + (speedRef.current - 1) * 12;
        const deltaPixels = (pixelsPerSecond * elapsedMs) / 1000;

        subpixelAccumulatorRef.current += deltaPixels;

        if (subpixelAccumulatorRef.current >= 1) {
          const pixelsToScroll = Math.floor(subpixelAccumulatorRef.current);
          container.scrollTop += pixelsToScroll;
          subpixelAccumulatorRef.current -= pixelsToScroll;
        }
      }

      rafIdRef.current = requestAnimationFrame(step);
    };

    rafIdRef.current = requestAnimationFrame(step);

    return () => {
      cancelLoop();
    };
  }, [containerRef, cancelLoop, isPlaying]);

  return {
    isPlaying,
    speed,
    play,
    pause,
    toggle,
    rewind,
    setSpeed,
    speedUp,
    slowDown,
  };
}
