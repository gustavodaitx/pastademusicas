import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Beer,
  Sliders,
  RefreshCw,
  Save,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Music,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { listMusics, MusicRepositoryError } from '../../services/musicRepository';
import type { MusicRecord } from '../../services/musicRepository';
import {
  createPlaylistWithItems,
  PlaylistRepositoryError,
} from '../../services/playlistRepository';
import {
  classifyTempo,
  extractUniqueStyles,
  generateBarRepertoire,
  KeyPreference,
} from './barModeGenerator';

function errorMessage(error: unknown): string {
  if (error instanceof MusicRepositoryError || error instanceof PlaylistRepositoryError) {
    return error.message;
  }
  return 'Não foi possível concluir a operação. Verifique sua conexão e tente novamente.';
}

export const BarModePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // Parâmetros de geração
  const [style, setStyle] = useState<string>('Todos');
  const [quantity, setQuantity] = useState<number>(15);
  const [keyPreference, setKeyPreference] = useState<KeyPreference>('Qualquer');
  const [alternateRhythm, setAlternateRhythm] = useState<boolean>(true);

  // Estados de dados
  const [catalog, setCatalog] = useState<MusicRecord[]>([]);
  const [generatedMusics, setGeneratedMusics] = useState<MusicRecord[]>([]);
  const [warning, setWarning] = useState<string | null>(null);

  // Estados de persistência
  const [playlistName, setPlaylistName] = useState<string>(() => {
    const today = new Date().toLocaleDateString('pt-BR');
    return `Show Barzinho - ${today}`;
  });

  // Estados de UI
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const availableStyles = useMemo(() => extractUniqueStyles(catalog), [catalog]);

  const runGeneration = useCallback(
    (
      currentCatalog: MusicRecord[],
      currentStyle: string,
      currentQty: number,
      currentKey: KeyPreference,
      currentAlt: boolean,
    ) => {
      const result = generateBarRepertoire(currentCatalog, {
        estilo: currentStyle,
        quantidade: currentQty,
        preferenciaTom: currentKey,
        alternarRitmo: currentAlt,
      });

      setGeneratedMusics(result.musicas);
      if (result.houveCorte && result.aviso) {
        setWarning(result.aviso);
      } else {
        setWarning(null);
      }
    },
    [],
  );

  const loadCatalog = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setCatalog([]);
      setGeneratedMusics([]);
      setLoading(false);
      setError('Entre na sua conta para acessar o Modo Barzinho.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const musics = await listMusics();
      setCatalog(musics);
      runGeneration(musics, style, quantity, keyPreference, alternateRhythm);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const handleStyleChange = (newStyle: string) => {
    setStyle(newStyle);
    runGeneration(catalog, newStyle, quantity, keyPreference, alternateRhythm);
  };

  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    runGeneration(catalog, style, newQty, keyPreference, alternateRhythm);
  };

  const handleKeyPreferenceChange = (newKey: KeyPreference) => {
    setKeyPreference(newKey);
    runGeneration(catalog, style, quantity, newKey, alternateRhythm);
  };

  const handleAlternateRhythmChange = (newAlt: boolean) => {
    setAlternateRhythm(newAlt);
    runGeneration(catalog, style, quantity, keyPreference, newAlt);
  };

  const handleRegenerate = () => {
    setError(null);
    setNotice(null);
    runGeneration(catalog, style, quantity, keyPreference, alternateRhythm);
  };

  const handleRemoveMusic = (musicId: string) => {
    setGeneratedMusics((current) => current.filter((m) => m.id !== musicId));
  };

  const handleSavePlaylist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!playlistName.trim()) {
      setError('Informe o nome da playlist.');
      return;
    }
    if (generatedMusics.length === 0) {
      setError('Gere um repertório com ao menos uma música antes de salvar.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await createPlaylistWithItems({
        nome: playlistName.trim(),
        tipo: 'barzinho',
        musicIds: generatedMusics.map((m) => m.id),
      });

      setNotice(`Playlist "${playlistName.trim()}" salva com sucesso com ${generatedMusics.length} músicas!`);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

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
            onClick={handleRegenerate}
            disabled={loading || catalog.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Regenerar</span>
          </button>
          <Link
            to="/playlists"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Ver Playlists</span>
          </Link>
        </div>
      </div>

      {/* Notifications and Alerts */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
          <Link
            to="/playlists"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 transition-colors"
          >
            <span>Ir para Playlists</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {warning && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-2.5"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Aviso sobre o repertório:</p>
            <p className="text-xs sm:text-sm">{warning}</p>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-500" />
          <span>Parâmetros de Geração</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Estilo */}
          <div className="space-y-1.5">
            <label htmlFor="filter-style" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Estilo Musical:
            </label>
            <select
              id="filter-style"
              value={style}
              onChange={(e) => handleStyleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Todos">Todos os estilos</option>
              {availableStyles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Quantidade */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label htmlFor="filter-quantity" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Músicas no Show:
              </label>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{quantity}</span>
            </div>
            <input
              id="filter-quantity"
              type="range"
              min={5}
              max={40}
              value={quantity}
              onChange={(e) => handleQuantityChange(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5 músicas</span>
              <span>40 músicas</span>
            </div>
          </div>

          {/* Preferência de Tom */}
          <div className="space-y-1.5">
            <label htmlFor="filter-key-preference" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Preferência de Tom:
            </label>
            <select
              id="filter-key-preference"
              value={keyPreference}
              onChange={(e) => handleKeyPreferenceChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Qualquer">Qualquer Tom</option>
              <option value="graves">Tons Graves (C, D)</option>
              <option value="medios">Tons Médios (E, F, G)</option>
              <option value="altos">Tons Altos (A, B)</option>
            </select>
          </div>

          {/* Alternar Ritmo */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <label
              htmlFor="filter-alternate-rhythm"
              className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <input
                id="filter-alternate-rhythm"
                type="checkbox"
                checked={alternateRhythm}
                onChange={(e) => handleAlternateRhythmChange(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Alternar ritmos (lenta / animada)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Save as Playlist Form */}
      <form
        onSubmit={handleSavePlaylist}
        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Salvar como Playlist Editável
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transforme a seleção atual em uma playlist pessoal que você poderá ordenar e personalizar depois.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {generatedMusics.length} {generatedMusics.length === 1 ? 'música selecionada' : 'músicas selecionadas'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Nome da playlist (ex: Show Barzinho - Sexta)"
            disabled={saving}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={saving || generatedMusics.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar como Playlist'}</span>
          </button>
        </div>
      </form>

      {/* Generated Setlist Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Repertório Gerado ({generatedMusics.length} {generatedMusics.length === 1 ? 'música' : 'músicas'})
          </h3>
          <span className="text-xs text-slate-400">Sem músicas duplicadas</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Carregando biblioteca e gerando repertório...
          </div>
        ) : generatedMusics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-2">
            <Music className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Nenhuma música encontrada com os filtros atuais.
            </p>
            <p className="text-xs text-slate-500">
              Tente mudar o estilo, diminuir a quantidade ou cadastrar novas músicas na Biblioteca.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {generatedMusics.map((music, index) => {
              const tempo = classifyTempo(music);
              return (
                <div
                  key={music.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {music.titulo}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {music.artista || 'Artista não informado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {music.tomOriginal && (
                      <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Tom: {music.tomOriginal}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                        tempo === 'animada'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : tempo === 'lenta'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          : 'bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {tempo === 'animada' ? 'Animada' : tempo === 'lenta' ? 'Lenta' : 'Neutra'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMusic(music.id)}
                      aria-label={`Remover ${music.titulo}`}
                      title="Remover do repertório gerado"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          O gerador seleciona apenas músicas reais disponíveis em seu catálogo pessoal. Se não houver quantidade suficiente, o sistema avisará sem inventar músicas.
        </span>
      </div>
    </div>
  );
};
