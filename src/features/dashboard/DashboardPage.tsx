import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Library, 
  ListMusic, 
  Upload, 
  Mic2, 
  Church, 
  Beer, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Search,
  BookOpen
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-10">
      
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-700 text-white p-6 sm:p-10 shadow-xl shadow-brand-500/10">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Versão 1.0 — 100% Gratuito</span>
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Seu repertório completo, cifras alinhadas e modo palco inteligente.
          </h1>
          
          <p className="text-sm sm:text-base text-indigo-100 font-normal leading-relaxed">
            Organize músicas para missas, cultos ou apresentações em barzinhos. Importe DOCX, PDF e TXT direto no navegador, com transposição de acordes e rolagem automática sem custo algum.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/biblioteca"
              id="hero-btn-library"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-brand-700 font-semibold text-sm hover:bg-slate-100 shadow-md transition-all active:scale-95"
            >
              <Library className="w-4 h-4" />
              <span>Explorar Biblioteca</span>
            </Link>
            <Link
              to="/palco"
              id="hero-btn-stage"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-950/60 text-white border border-white/20 font-semibold text-sm backdrop-blur-md transition-all active:scale-95"
            >
              <Mic2 className="w-4 h-4 text-amber-300" />
              <span>Abrir Modo Palco</span>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Quick Search Bar */}
      <section className="relative">
        <div className="relative max-w-2xl mx-auto">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por título, artista, tom ou trecho da letra..."
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm transition-all"
            readOnly
            onClick={() => window.location.href = '/biblioteca'}
          />
        </div>
      </section>

      {/* Quick Access Modules Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <span>Módulos Principais</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Card: Biblioteca */}
          <Link
            to="/biblioteca"
            className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Library className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Biblioteca de Cifras
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Acesse todas as suas músicas salvas com busca rápida, filtros por tom, categoria e tags.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir biblioteca</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card: Playlists Manuais */}
          <Link
            to="/playlists"
            className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ListMusic className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Playlists e Repertórios
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Monte repertórios personalizados, reordene músicas com facilidade e salve para suas apresentações.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
              <span>Gerenciar playlists</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card: Modo Igreja */}
          <Link
            to="/modo-igreja"
            className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Church className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Modo Igreja (10 Momentos)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Estrutura litúrgica oficial ordenada: Entrada, Perdão, Glória, Salmo até o Canto Final com sugestões do catálogo.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
              <span>Montar celebração</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card: Modo Barzinho */}
          <Link
            to="/modo-barzinho"
            className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Beer className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Modo Barzinho
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Gere repertórios para shows com filtro de estilo, quantidade de músicas e alternância de ritmo sem repetições.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
              <span>Gerar repertório</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card: Modo Palco */}
          <Link
            to="/palco"
            className="group p-5 rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mic2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                Modo Palco & Autoscroll
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Visualização de alta visibilidade com fundo escuro, rolagem suave automática, controle de velocidade e fonte.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Iniciar modo palco</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card: Importar Arquivos */}
          <Link
            to="/importar"
            className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Importação Local
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Carregue arquivos DOCX, PDF textual ou TXT do seu dispositivo com pré-visualização instantânea sem envio para servidores.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
              <span>Importar cifra</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

        </div>
      </section>

      {/* Zero Cost Security Card */}
      <section className="p-4 sm:p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-emerald-800 dark:text-emerald-300">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Garantia de Custo Zero Permanente</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              Todos os recursos operam em infraestrutura 100% gratuita, sem cobranças automáticas ou pegadinhas de cartão.
            </p>
          </div>
        </div>
        <Link
          to="/patrocinio"
          className="shrink-0 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
        >
          Saiba como apoiar voluntariamente
        </Link>
      </section>

    </div>
  );
};
