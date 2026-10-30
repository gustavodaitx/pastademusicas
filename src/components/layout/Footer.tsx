import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Heart, ShieldCheck, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Brand info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <Music className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Pasta de Música</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Custo Zero
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Organizador inteligente de cifras e repertórios. 100% gratuito e livre de cobranças obrigatórias.
            </p>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Link to="/biblioteca" className="hover:text-brand-600 dark:hover:text-brand-400">Biblioteca</Link>
            <Link to="/playlists" className="hover:text-brand-600 dark:hover:text-brand-400">Playlists</Link>
            <Link to="/modo-igreja" className="hover:text-brand-600 dark:hover:text-brand-400">Modo Igreja</Link>
            <Link to="/modo-barzinho" className="hover:text-brand-600 dark:hover:text-brand-400">Modo Barzinho</Link>
            <Link to="/palco" className="hover:text-brand-600 dark:hover:text-brand-400">Modo Palco</Link>
            <Link to="/patrocinio" className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1">
              <Heart className="w-3 h-3 fill-rose-500" /> Apoiar via Pix
            </Link>
          </div>

          {/* Copyright & credits */}
          <div className="text-xs text-slate-400 dark:text-slate-500 text-center md:text-right flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>PDS Pasta de Música &copy; {new Date().getFullYear()}</span>
          </div>

        </div>
      </div>
    </footer>
  );
};
