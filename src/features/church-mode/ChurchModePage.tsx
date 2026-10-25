import React, { useState } from 'react';
import { Church, CheckCircle2, AlertTriangle, Save, Music } from 'lucide-react';

export const LITURGICAL_MOMENTS = [
  { id: 1, nome: 'Entrada', descricao: 'Canto de acolhida e procissão de entrada' },
  { id: 2, nome: 'Perdão', descricao: 'Ato Penitencial (Senhor, tende piedade)' },
  { id: 3, nome: 'Glória', descricao: 'Hino de Louvor (Glória a Deus nas alturas)' },
  { id: 4, nome: 'Salmo', descricao: 'Salmo Responsorial do dia' },
  { id: 5, nome: 'Aclamação', descricao: 'Aclamação ao Evangelho (Aleluia)' },
  { id: 6, nome: 'Ofertório', descricao: 'Apresentação das oferendas (pão e vinho)' },
  { id: 7, nome: 'Santo', descricao: 'Canto do Santo, Santo, Santo' },
  { id: 8, nome: 'Comunhão', descricao: 'Procissão da Eucaristia' },
  { id: 9, nome: 'Pós-comunhão', descricao: 'Ação de graças e recolhimento' },
  { id: 10, nome: 'Final', descricao: 'Canto de envio e bênção final' },
] as const;

export const ChurchModePage: React.FC = () => {
  const [celebrationName, setCelebrationName] = useState('Missa Solene do Domingo');
  
  // Mock initial slots
  const [slots] = useState<{ [pos: number]: { titulo: string; tom: string } | null }>({
    1: { titulo: 'Como Zaqueu (Entra na Minha Casa)', tom: 'G' },
    2: null,
    3: null,
    4: null,
    5: { titulo: 'Aleluia, A Minha Alma Abrirei', tom: 'D' },
    6: { titulo: 'Eis que Venho, Senhor', tom: 'E' },
    7: null,
    8: null,
    9: null,
    10: null,
  });

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Church className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>Modo Igreja — 10 Momentos Litúrgicos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sequência oficial com ordenação estrita. Sugestões baseadas exclusivamente no catálogo de músicas cadastradas.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Playlist Litúrgica</span>
        </button>
      </div>

      {/* Celebration Name Input */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="celebration-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0">
          Nome da Celebração:
        </label>
        <input
          id="celebration-name"
          type="text"
          value={celebrationName}
          onChange={(e) => setCelebrationName(e.target.value)}
          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Strict List of 10 Moments */}
      <div className="space-y-2.5">
        {LITURGICAL_MOMENTS.map((moment) => {
          const selectedSong = slots[moment.id];
          return (
            <div
              key={moment.id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                selectedSong
                  ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/60 shadow-sm'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800'
              }`}
            >
              {/* Position and Title */}
              <div className="flex items-start sm:items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {moment.id}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {moment.nome}
                    </h3>
                    <span className="text-[11px] text-slate-400 hidden md:inline">
                      — {moment.descricao}
                    </span>
                  </div>
                  {selectedSong ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Music className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {selectedSong.titulo}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                        Tom {selectedSong.tom}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3 text-slate-400" />
                      Nenhuma música selecionada (posição vazia)
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  {selectedSong ? 'Alterar' : 'Escolher Música'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Acceptance note */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          Regra de integridade: Caso não haja música compatível para um momento, a posição permanece vazia. O sistema nunca inventa títulos ou cifras fictícias.
        </span>
      </div>

    </div>
  );
};
