import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Minus, 
  Gauge, 
  Mic2,
  Maximize2,
  Minimize2
} from 'lucide-react';

export const StageModePage: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(3); // 1 to 10
  const [fontSize, setFontSize] = useState(18); // px
  const [transposedSemis, setTransposedSemis] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Smooth autoscroll engine using requestAnimationFrame
  useEffect(() => {
    let lastTime = performance.now();

    const scrollLoop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (isPlaying && scrollContainerRef.current) {
        // Pixel per second factor based on speed
        const pixelsPerSecond = scrollSpeed * 15;
        const step = (pixelsPerSecond * delta) / 1000;
        scrollContainerRef.current.scrollTop += step;
      }

      animationFrameRef.current = requestAnimationFrame(scrollLoop);
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(scrollLoop);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, scrollSpeed]);

  const handleReset = () => {
    setIsPlaying(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      
      {/* Stage Mode Floating Control Bar */}
      <header className="sticky top-0 z-30 w-full bg-slate-900/95 border-b border-slate-800 px-3 sm:px-6 py-2.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shadow-lg">
        
        {/* Left: Song info and Transpose */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Mic2 className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs sm:text-sm text-slate-100 truncate max-w-[140px] sm:max-w-xs">
              Como Zaqueu (Entra na Minha Casa)
            </span>
          </div>

          {/* Transpose button pill */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setTransposedSemis((s) => s - 1)}
              className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-amber-400 font-bold"
              title="Transpor -1 semitom"
            >
              -
            </button>
            <span className="px-1 font-mono text-[11px] text-slate-300">
              Tom {transposedSemis > 0 ? `+${transposedSemis}` : transposedSemis === 0 ? 'G (0)' : transposedSemis}
            </span>
            <button
              onClick={() => setTransposedSemis((s) => s + 1)}
              className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-amber-400 font-bold"
              title="Transpor +1 semitom"
            >
              +
            </button>
          </div>
        </div>

        {/* Center: Autoscroll Player Controls */}
        <div className="flex items-center gap-2">
          
          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            id="btn-stage-play-pause"
            type="button"
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-brand-600 hover:bg-brand-500 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Rolar</span>
              </>
            )}
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            id="btn-stage-reset"
            type="button"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
            title="Reiniciar rolagem ao topo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed Control Slider */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min={1}
              max={10}
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(Number(e.target.value))}
              className="w-16 h-1 accent-brand-500 cursor-pointer"
              title={`Velocidade de rolagem: ${scrollSpeed}`}
            />
            <span className="text-[11px] font-mono text-slate-300 font-bold w-4 text-center">
              {scrollSpeed}x
            </span>
          </div>

        </div>

        {/* Right: Font size & Fullscreen & Playlist Nav */}
        <div className="flex items-center gap-1.5">
          
          {/* Font size adjustments */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFontSize((f) => Math.max(12, f - 2))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Diminuir fonte"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-slate-400">{fontSize}px</span>
            <button
              onClick={() => setFontSize((f) => Math.min(36, f + 2))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Aumentar fonte"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Prev / Next buttons */}
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Música anterior na playlist"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Próxima música na playlist"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            type="button"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hidden md:inline-flex"
            title="Alternar tela cheia"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

        </div>

      </header>

      {/* Stage Sheet Content Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-12 py-8 max-w-4xl mx-auto w-full select-none"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
      >
        <div className="space-y-6">
          
          <div className="border-b border-slate-800 pb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-tight">
              Como Zaqueu (Entra na Minha Casa)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Artista: Regis Danese | Tom Original: G | Ritmo: Balada Litúrgica
            </p>
          </div>

          {/* Chord sheet preview with exact monospace alignment */}
          <pre 
            className="font-mono whitespace-pre text-slate-100 font-medium leading-relaxed overflow-x-auto"
            style={{ fontSize: 'inherit' }}
          >
{`[Intro] `}<span className="text-amber-400 font-bold">G  D/F#  Em  C  (2x)</span>{`

`}<strong>[Primeira Parte]</strong>{`
`}<span className="text-amber-400 font-bold">G                    D/F#</span>{`
Como Zaqueu, eu quero subir
`}<span className="text-amber-400 font-bold">Em                   C</span>{`
O mais alto que eu puder
`}<span className="text-amber-400 font-bold">G                       D/F#</span>{`
Só pra Te ver, olhar para Ti
`}<span className="text-amber-400 font-bold">           Em                  C</span>{`
E chamar Sua atenção para mim

`}<span className="text-amber-400 font-bold">Am                Em</span>{`
Preciso de Ti, Senhor
`}<span className="text-amber-400 font-bold">Am                Em</span>{`
Preciso de Ti, ó Pai
`}<span className="text-amber-400 font-bold">C                  G/B</span>{`
Sou pequeno demais
`}<span className="text-amber-400 font-bold">        Am                 D</span>{`
Me dá Tua paz, largo tudo pra Te seguir

`}<strong>[Refrão]</strong>{`
`}<span className="text-amber-400 font-bold">G</span>{`
Entra na minha casa,
`}<span className="text-amber-400 font-bold">D/F#</span>{`
Entra na minha vida,
`}<span className="text-amber-400 font-bold">Em</span>{`
Mexe na minha estrutura,
`}<span className="text-amber-400 font-bold">C</span>{`
Sara todas as feridas!

`}<span className="text-amber-400 font-bold">G</span>{`
Me ensina a ter santidade,
`}<span className="text-amber-400 font-bold">D/F#</span>{`
Quero amar somente a Ti,
`}<span className="text-amber-400 font-bold">Em</span>{`
Porque o Senhor é o meu bem maior,
`}<span className="text-amber-400 font-bold">C                      D      G</span>{`
Faz o milagre em mim!
`}
          </pre>

          <div className="pt-24 text-center text-xs text-slate-600">
            --- Fim da Cifra ---
          </div>
        </div>
      </div>

    </div>
  );
};
