import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2, Mic2, Minus, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const FONT_SIZE_STORAGE_KEY = 'pasta_de_musica_font_size';
const AUTOSCROLL_STORAGE_KEY = 'pasta_de_musica_scroll_speed';

function readCachedNumber(key: string, fallback: number, min: number, max: number): number {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  } catch { return fallback; }
}

export const StageModePage: React.FC = () => {
  const { user } = useAuth();
  const [scrollSpeed, setScrollSpeed] = useState(() => readCachedNumber(`${AUTOSCROLL_STORAGE_KEY}:${user?.uid ?? ''}`, 3, 1, 10));
  const [fontSize, setFontSize] = useState(() => readCachedNumber(`${FONT_SIZE_STORAGE_KEY}:${user?.uid ?? ''}`, 18, 10, 72));
  const [isFullscreen, setIsFullscreen] = useState(false);

  const cacheValue = (key: string, value: number) => {
    try { localStorage.setItem(key, String(value)); } catch { /* Preferences stay usable for this session. */ }
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
    <div className="flex min-h-screen flex-1 flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-3 py-3 shadow-lg backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2"><Mic2 className="h-4 w-4 text-amber-400" /><span className="text-sm font-bold">Modo Palco</span></div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-300">Autoscroll
            <input aria-label="Velocidade do autoscroll" type="range" min="1" max="10" value={scrollSpeed} onChange={(event) => { const value = Number(event.target.value); setScrollSpeed(value); cacheValue(`${AUTOSCROLL_STORAGE_KEY}:${user?.uid ?? ''}`, value); }} className="w-24 accent-brand-500" />
            <span className="w-4 text-center font-mono">{scrollSpeed}</span>
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1">
            <button type="button" aria-label="Diminuir fonte" disabled={fontSize <= 10} onClick={() => setFontSize((current) => { const value = Math.max(10, current - 2); cacheValue(`${FONT_SIZE_STORAGE_KEY}:${user?.uid ?? ''}`, value); return value; })} className="text-slate-300 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
            <span className="min-w-12 text-center font-mono text-xs text-slate-300">{fontSize}px</span>
            <button type="button" aria-label="Aumentar fonte" disabled={fontSize >= 72} onClick={() => setFontSize((current) => { const value = Math.min(72, current + 2); cacheValue(`${FONT_SIZE_STORAGE_KEY}:${user?.uid ?? ''}`, value); return value; })} className="text-slate-300 disabled:opacity-40"><Plus className="h-4 w-4" /></button>
          </div>
          <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300"><Maximize2 className="h-4 w-4" /></button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-12 text-center" style={{ fontSize: `${fontSize}px` }}>
        <section className="max-w-xl space-y-4">
          <h1 className="text-2xl font-bold text-amber-400">Nenhuma música selecionada</h1>
          <p className="text-sm text-slate-400">O Modo Palco não carrega uma cifra de demonstração. Escolha uma música salva na sua biblioteca para abrir a cifra.</p>
          <Link to="/biblioteca" className="inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500">Abrir Biblioteca</Link>
        </section>
      </main>
    </div>
  );
};
