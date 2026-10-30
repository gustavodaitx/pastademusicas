import React from 'react';
import { Link } from 'react-router-dom';
import { Music, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 text-center">
      <div className="max-w-md w-full space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 mx-auto flex items-center justify-center">
          <Music className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">404</h1>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Página Não Encontrada</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          A rota solicitada não existe ou foi movida.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
