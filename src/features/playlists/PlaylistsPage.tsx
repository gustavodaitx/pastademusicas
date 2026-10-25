import React from 'react';
import { Link } from 'react-router-dom';
import { ListMusic, Plus, Church, Beer, Calendar, Music2, ArrowRight } from 'lucide-react';

interface MockPlaylist {
  id: string;
  nome: string;
  tipo: 'igreja' | 'barzinho' | 'manual';
  qtdMusicas: number;
  data: string;
}

const SAMPLE_PLAYLISTS: MockPlaylist[] = [
  {
    id: 'p1',
    nome: 'Missa 28º Domingo do Tempo Comum',
    tipo: 'igreja',
    qtdMusicas: 10,
    data: '24/10/2026',
  },
  {
    id: 'p2',
    nome: 'Repertório Sexta Acústica — Bar do Zé',
    tipo: 'barzinho',
    qtdMusicas: 25,
    data: '20/10/2026',
  },
  {
    id: 'p3',
    nome: 'Clássicos MPB e Voz & Violão',
    tipo: 'manual',
    qtdMusicas: 14,
    data: '15/10/2026',
  },
];

export const PlaylistsPage: React.FC = () => {
  const getTypeBadge = (tipo: MockPlaylist['tipo']) => {
    switch (tipo) {
      case 'igreja':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Church className="w-3 h-3" /> Modo Igreja
          </span>
        );
      case 'barzinho':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Beer className="w-3 h-3" /> Modo Barzinho
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            <ListMusic className="w-3 h-3" /> Manual
          </span>
        );
    }
  };

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ListMusic className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Playlists e Repertórios</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize listas de músicas ordenadas para celebrações, apresentações e ensaios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/modo-igreja"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 transition-colors"
          >
            <Church className="w-3.5 h-3.5" />
            <span>Modo Igreja</span>
          </Link>
          <Link
            to="/modo-barzinho"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors"
          >
            <Beer className="w-3.5 h-3.5" />
            <span>Modo Barzinho</span>
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova</span>
          </button>
        </div>
      </div>

      {/* Grid of Playlists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SAMPLE_PLAYLISTS.map((pl) => (
          <div
            key={pl.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-sm transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {getTypeBadge(pl.tipo)}
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {pl.data}
                </span>
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {pl.nome}
              </h3>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Music2 className="w-4 h-4 text-brand-500" />
                <span>{pl.qtdMusicas} músicas ordenadas</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Link
                to="/palco"
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform flex items-center gap-1"
              >
                <span>Abrir no Palco</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
