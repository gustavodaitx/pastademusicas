import React, { useState } from 'react';
import { Beer, Sliders, RefreshCw, Save, AlertCircle } from 'lucide-react';

export const BarModePage: React.FC = () => {
  const [style, setStyle] = useState('Pop/Rock');
  const [quantity, setQuantity] = useState(15);
  const [keyPreference, setKeyPreference] = useState('Qualquer');
  const [alternateRhythm, setAlternateRhythm] = useState(true);

  // Mock generated setlist
  const generatedSongs = [
    { pos: 1, titulo: 'O Sol', artista: 'Jota Quest', tom: 'A', ritmo: 'Animada' },
    { pos: 2, titulo: 'Tocando em Frente', artista: 'Almir Sater', tom: 'D', ritmo: 'Lenta' },
    { pos: 3, titulo: 'Pais e Filhos', artista: 'Legião Urbana', tom: 'C', ritmo: 'Média' },
    { pos: 4, titulo: 'Exagerado', artista: 'Cazuza', tom: 'G', ritmo: 'Animada' },
    { pos: 5, titulo: 'Como Nossos Pais', artista: 'Elis Regina', tom: 'D', ritmo: 'Lenta' },
  ];

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Beer className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Modo Barzinho — Gerador de Repertório</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gere repertórios dinâmicos para shows, alternando andamentos e respeitando as músicas reais da sua biblioteca.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerar</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Playlist</span>
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-500" />
          <span>Parâmetros de Geração</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Estilo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Estilo Musical:
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Pop/Rock">Pop / Rock Nacional</option>
              <option value="MPB">MPB Clássica</option>
              <option value="Sertanejo">Sertanejo Acústico</option>
              <option value="Todos">Misto / Variado</option>
            </select>
          </div>

          {/* Quantidade */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Músicas no Show:
              </label>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{quantity}</span>
            </div>
            <input
              type="range"
              min={5}
              max={40}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5 músicas</span>
              <span>40 músicas</span>
            </div>
          </div>

          {/* Preferência de Tom */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Preferência de Tom:
            </label>
            <select
              value={keyPreference}
              onChange={(e) => setKeyPreference(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Qualquer">Qualquer Tom</option>
              <option value="C">Tons Graves (C, D)</option>
              <option value="G">Tons Médios (E, F, G)</option>
              <option value="A">Tons Altos (A, B)</option>
            </select>
          </div>

          {/* Alternar Ritmo */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={alternateRhythm}
                onChange={(e) => setAlternateRhythm(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Alternar ritmos (lenta / animada)
              </span>
            </label>
          </div>

        </div>
      </div>

      {/* Generated Setlist Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Ordem Sugerida para a Apresentação ({generatedSongs.length} músicas geradas)
          </h3>
          <span className="text-xs text-slate-400">Sem duplicatas</span>
        </div>

        <div className="space-y-2">
          {generatedSongs.map((song) => (
            <div
              key={song.pos}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {song.pos}
                </span>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {song.titulo}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {song.artista}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {song.ritmo}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {song.tom}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          O gerador seleciona apenas músicas reais disponíveis em seu catálogo pessoal e público. Se não houver quantidade suficiente, o sistema avisará sem inventar músicas.
        </span>
      </div>

    </div>
  );
};
