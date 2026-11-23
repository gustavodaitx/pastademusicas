import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Maximize2,
  Mic2,
  Minimize2,
  Minus,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getMusicById, listMusics } from '../../services/musicRepository';
import { getChurchPlaylist, getPlaylistById, PlaylistRepositoryError } from '../../services/playlistRepository';
import {
  calculateSemitoneDistance,
  transposeCipher,
  transposeNote,
} from './chordTransposer';
import { useAutoscroll } from './useAutoscroll';

const FONT_SIZE_STORAGE_KEY = 'pasta_de_musica_font_size';
const AUTOSCROLL_STORAGE_KEY = 'pasta_de_musica_scroll_speed';

function readCachedNumber(key: string, fallback: number, min: number, max: number): number {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  } catch {
    return fallback;
  }
}

export type StageSongItem = {
  id: string;
  titulo: string;
  artista: string | null;
  tomOriginal: string | null;
  tomExecucao: string | null;
  conteudoCifrado: string;
  momento?: string | null;
};

export const StageModePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const musicaIdParam = searchParams.get('musicaId');
  const playlistIdParam = searchParams.get('playlistId');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Estados de configuração e cache local
  const [scrollSpeed, setScrollSpeed] = useState(() =>
    readCachedNumber(`${AUTOSCROLL_STORAGE_KEY}:${user?.uid ?? ''}`, 3, 1, 10),
  );
  const [fontSize, setFontSize] = useState(() =>
    readCachedNumber(`${FONT_SIZE_STORAGE_KEY}:${user?.uid ?? ''}`, 18, 10, 72),
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estados dos dados de repertório
  const [songs, setSongs] = useState<StageSongItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [playlistTitle, setPlaylistTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailableSongCount, setUnavailableSongCount] = useState(0);

  // Estado da transposição ao vivo (delta em semitons adicionado sobre o tom da música)
  const [semitoneDelta, setSemitoneDelta] = useState<number>(0);

  // Drawer / Menu de faixas da playlist
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Motor de Autoscroll via RAF
  const {
    isPlaying,
    speed,
    pause,
    toggle,
    rewind,
    setSpeed,
    speedUp,
    slowDown,
  } = useAutoscroll(scrollContainerRef, {
    initialSpeed: scrollSpeed,
  });

  const cacheValue = useCallback(
    (key: string, value: number) => {
      try {
        localStorage.setItem(key, String(value));
      } catch {
        /* Permite uso transparente mesmo com restrições de storage */
      }
    },
    [],
  );

  // Sincroniza velocidade com o hook e cache local
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    setScrollSpeed(newSpeed);
    cacheValue(`${AUTOSCROLL_STORAGE_KEY}:${user?.uid ?? ''}`, newSpeed);
  };

  const handleSpeedUp = () => {
    speedUp();
    const next = Math.min(10, speed + 1);
    setScrollSpeed(next);
    cacheValue(`${AUTOSCROLL_STORAGE_KEY}:${user?.uid ?? ''}`, next);
  };

  const handleSlowDown = () => {
    slowDown();
    const next = Math.max(1, speed - 1);
    setScrollSpeed(next);
    cacheValue(`${AUTOSCROLL_STORAGE_KEY}:${user?.uid ?? ''}`, next);
  };

  const handleFontSizeChange = (delta: number) => {
    setFontSize((current) => {
      const next = Math.max(10, Math.min(72, current + delta));
      cacheValue(`${FONT_SIZE_STORAGE_KEY}:${user?.uid ?? ''}`, next);
      return next;
    });
  };

  const handleResetFontSize = () => {
    setFontSize(18);
    cacheValue(`${FONT_SIZE_STORAGE_KEY}:${user?.uid ?? ''}`, 18);
  };

  // Fullscreen API com listener de sincronização
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Carregamento de música única ou playlist
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      rewind();
      if (!playlistIdParam && !musicaIdParam) {
        setSongs([]);
        setCurrentIndex(0);
        setPlaylistTitle(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setUnavailableSongCount(0);
      setSemitoneDelta(0);

      try {
        if (playlistIdParam) {
          // Playlists estruturadas da Igreja usam o contrato específico da T07.
          let playlistDetails;
          try {
            playlistDetails = await getPlaylistById(playlistIdParam);
          } catch (playlistError) {
            if (!(playlistError instanceof PlaylistRepositoryError)
              || playlistError.code !== 'structured-playlist') throw playlistError;

            const churchResult = await getChurchPlaylist(playlistIdParam);
            if (!churchResult || churchResult.kind !== 'structured') throw playlistError;
            const library = await listMusics();
            const musicMap = new Map(library.map((music) => [music.id, music]));
            const loadedSongs: StageSongItem[] = [];
            let unavailableCount = 0;
            churchResult.playlist.momentosIgreja.forEach((moment) => {
              const musicId = 'referenciaMusical' in moment
                ? moment.referenciaMusical?.musicaId
                : moment.musicaId;
              if (!musicId) return;
              const music = musicMap.get(musicId);
              if (!music) {
                unavailableCount += 1;
                return;
              }
              loadedSongs.push({
                id: music.id,
                titulo: music.titulo,
                artista: music.artista,
                tomOriginal: music.tomOriginal,
                tomExecucao: moment.tomPersonalizado || music.tomOriginal,
                conteudoCifrado: music.conteudoCifrado,
                momento: moment.momentoId,
              });
            });

            if (!isMounted) return;
            setPlaylistTitle(churchResult.playlist.nome);
            setUnavailableSongCount(unavailableCount);
            setSongs(loadedSongs);
            setCurrentIndex(0);
            return;
          }
          if (playlistDetails) {
            const library = await listMusics();
            const musicMap = new Map(library.map((m) => [m.id, m]));

            const loadedSongs: StageSongItem[] = [];
            let unavailableCount = 0;
            for (const item of playlistDetails.itens) {
              const music = musicMap.get(item.musicaId);
              if (music) {
                loadedSongs.push({
                  id: music.id,
                  titulo: music.titulo,
                  artista: music.artista,
                  tomOriginal: music.tomOriginal,
                  tomExecucao: item.tomPersonalizado || music.tomOriginal,
                  conteudoCifrado: music.conteudoCifrado,
                  momento: item.momento,
                });
              } else {
                unavailableCount += 1;
              }
            }

            if (!isMounted) return;
            setPlaylistTitle(playlistDetails.nome);
            setUnavailableSongCount(unavailableCount);
            setSongs(loadedSongs);
            setCurrentIndex(0);
            return;
          }

          throw new Error('Playlist não encontrada.');
        } else if (musicaIdParam) {
          // Música individual
          const music = await getMusicById(musicaIdParam);
          if (!music) {
            throw new Error('Música não encontrada na biblioteca.');
          }

          if (!isMounted) return;
          setPlaylistTitle(null);
          setSongs([
            {
              id: music.id,
              titulo: music.titulo,
              artista: music.artista,
              tomOriginal: music.tomOriginal,
              tomExecucao: music.tomOriginal,
              conteudoCifrado: music.conteudoCifrado,
            },
          ]);
          setCurrentIndex(0);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar conteúdo do Modo Palco.');
          setSongs([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [musicaIdParam, playlistIdParam, rewind]);

  const currentSong = songs[currentIndex] ?? null;

  // Cálculo da transposição:
  // Base delta = distância entre tomOriginal e tomExecucao (definido na playlist)
  // Total delta = Base delta + semitoneDelta (ajuste ao vivo com botões + / -)
  const baseDelta = useMemo(() => {
    if (!currentSong || !currentSong.tomOriginal || !currentSong.tomExecucao) return 0;
    return calculateSemitoneDistance(currentSong.tomOriginal, currentSong.tomExecucao);
  }, [currentSong]);

  const effectiveDelta = baseDelta + semitoneDelta;

  const currentKey = useMemo(() => {
    if (!currentSong) return '';
    const baseKey = currentSong.tomExecucao || currentSong.tomOriginal || '';
    if (!baseKey) return '';
    return transposeNote(baseKey, semitoneDelta);
  }, [currentSong, semitoneDelta]);

  // Cifra transposta e memorizada para renderização ultrarrápida
  const displayedCipher = useMemo(() => {
    if (!currentSong) return '';
    return transposeCipher(currentSong.conteudoCifrado, effectiveDelta);
  }, [currentSong, effectiveDelta]);

  // Navegação de músicas na playlist
  const goToSong = (index: number) => {
    if (index < 0 || index >= songs.length) return;
    pause();
    setCurrentIndex(index);
    setSemitoneDelta(0);
    rewind();
    setIsDrawerOpen(false);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      goToSong(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < songs.length - 1) {
      goToSong(currentIndex + 1);
    }
  };

  // Se não houver música selecionada e não estiver carregando, exibe estado vazio padrão
  if (!loading && (!currentSong || songs.length === 0)) {
    return (
      <div className="flex min-h-screen flex-1 flex-col bg-slate-950 text-slate-100">
        <header className="sticky top-0 z-30 flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-3 py-3 shadow-lg backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold">Modo Palco</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              Autoscroll
              <input
                aria-label="Velocidade do autoscroll"
                type="range"
                min="1"
                max="10"
                value={scrollSpeed}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  handleSpeedChange(value);
                }}
                className="w-24 accent-brand-500"
              />
              <span className="w-4 text-center font-mono">{scrollSpeed}</span>
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1">
              <button
                type="button"
                aria-label="Diminuir fonte"
                disabled={fontSize <= 10}
                onClick={() => handleFontSizeChange(-2)}
                className="text-slate-300 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-12 text-center font-mono text-xs text-slate-300">
                {fontSize}px
              </span>
              <button
                type="button"
                aria-label="Aumentar fonte"
                disabled={fontSize >= 72}
                onClick={() => handleFontSizeChange(2)}
                className="text-slate-300 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main
          className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-12 text-center"
          style={{ fontSize: `${fontSize}px` }}
        >
          <section className="max-w-xl space-y-4">
            <h1 className="text-2xl font-bold text-amber-400">Nenhuma música selecionada</h1>
            <p className="text-sm text-slate-400">
              O Modo Palco não carrega uma cifra de demonstração. Escolha uma música salva na sua
              biblioteca para abrir a cifra.
            </p>
            {error && (
              <p role="alert" className="text-xs text-rose-400">
                {error}
              </p>
            )}
            {unavailableSongCount > 0 && (
              <p role="status" className="text-sm text-amber-300">
                {unavailableSongCount} {unavailableSongCount === 1 ? 'música da playlist está indisponível' : 'músicas da playlist estão indisponíveis'} e foram ignoradas.
              </p>
            )}
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                to="/biblioteca"
                className="inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
              >
                Abrir Biblioteca
              </Link>
              <Link
                to="/playlists"
                className="inline-flex rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Abrir Playlists
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] w-screen flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Barra Superior de Palco */}
      <header className="sticky top-0 z-30 flex w-full items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/95 px-3 py-2.5 shadow-lg backdrop-blur-md sm:px-5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={playlistIdParam ? '/playlists' : '/biblioteca'}
            title="Sair do Modo Palco"
            aria-label="Sair do Modo Palco"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-100 truncate flex items-center gap-2">
              <span>{currentSong?.titulo || 'Carregando...'}</span>
              {currentSong?.momento && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentSong.momento}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 truncate">
              {currentSong?.artista || 'Artista não informado'}
              {playlistTitle && ` • ${playlistTitle} (${currentIndex + 1}/${songs.length})`}
            </p>
          </div>
        </div>

        {/* Controles de Cabeçalho: Transposição, Fonte e Tela Cheia */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Transposição */}
          {currentSong?.tomOriginal && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/90 px-1.5 py-1">
              <button
                type="button"
                onClick={() => setSemitoneDelta((d) => d - 1)}
                title="Abaixar meio tom (-1 semitom)"
                aria-label="Abaixar meio tom"
                className="min-h-10 min-w-10 inline-flex items-center justify-center rounded text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSemitoneDelta(0)}
                title={semitoneDelta !== 0 ? 'Restaurar tom original' : 'Tom atual'}
                className="px-1.5 py-0.5 text-xs font-mono font-bold text-amber-400 hover:underline"
              >
                Tom: {currentKey}
                {semitoneDelta !== 0 && (
                  <span className="text-[10px] text-slate-400 ml-0.5">
                    ({semitoneDelta > 0 ? `+${semitoneDelta}` : semitoneDelta})
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSemitoneDelta((d) => d + 1)}
                title="Subir meio tom (+1 semitom)"
                aria-label="Subir meio tom"
                className="min-h-10 min-w-10 inline-flex items-center justify-center rounded text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Ajuste de Tamanho de Fonte */}
          {/* Lista de Músicas da Playlist */}
          {songs.length > 1 && (
            <button
              type="button"
              onClick={() => setIsDrawerOpen((open) => !open)}
              title="Ver lista de músicas da playlist"
              aria-label="Ver repertório da playlist"
              className={`p-2 rounded-lg border transition-colors ${
                isDrawerOpen
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <ListMusic className="w-4 h-4" />
            </button>
          )}

          {/* Tela Cheia */}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Área Principal de Leitura da Cifra */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Carregando música para o palco...
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            tabIndex={0}
            aria-label="Área da cifra"
            className="h-full w-full overflow-y-auto overflow-x-auto px-4 sm:px-8 lg:px-16 pt-6 pb-28 focus:outline-none"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.55 }}
          >
            <div className="max-w-4xl mx-auto">
              {unavailableSongCount > 0 && (
                <p role="status" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {unavailableSongCount} {unavailableSongCount === 1 ? 'música da playlist está indisponível' : 'músicas da playlist estão indisponíveis'} e foram ignoradas.
                </p>
              )}
              <pre className="font-mono whitespace-pre font-normal text-slate-100 tracking-normal select-text">
                {displayedCipher}
              </pre>
            </div>
          </div>
        )}

        {/* Drawer lateral com o repertório da playlist */}
        {isDrawerOpen && songs.length > 1 && (
          <aside
            aria-label="Lista da playlist"
            className="absolute top-0 right-0 bottom-0 z-40 w-72 sm:w-80 border-l border-slate-800 bg-slate-900/98 shadow-2xl backdrop-blur-md flex flex-col"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">{playlistTitle || 'Playlist'}</h3>
                <p className="text-xs text-slate-400">{songs.length} músicas no repertório</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {songs.map((song, index) => {
                const isSelected = index === currentIndex;
                return (
                  <button
                    key={`${song.id}-${index}`}
                    type="button"
                    onClick={() => goToSong(index)}
                    className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-center justify-between gap-2 text-xs ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="mr-2 text-slate-400">{index + 1}.</span>
                      <span className="truncate">{song.titulo}</span>
                    </div>
                    {song.tomExecucao && (
                      <span className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {song.tomExecucao}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* Barra Flutuante Inferior de Execução e Autoscroll */}
      <footer className="sticky bottom-0 z-30 w-full border-t border-slate-800/80 bg-slate-900/95 px-4 py-2.5 shadow-2xl backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Navegação entre músicas da playlist */}
          <div className="flex items-center gap-1.5">
            {songs.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  aria-label="Música anterior"
                  title="Música anterior"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex >= songs.length - 1}
                  aria-label="Próxima música"
                  title="Próxima música"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                <span>Modo Solo</span>
              </span>
            )}
          </div>

          {/* Controles Centrais do Autoscroll: Rewind, Play/Pause, Velocidade */}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/90 px-2 py-1" aria-label="Controles de tamanho da fonte">
              <button
                type="button"
                aria-label="Diminuir fonte"
                disabled={fontSize <= 10}
                onClick={() => handleFontSizeChange(-2)}
                className="min-h-9 min-w-9 inline-flex items-center justify-center rounded text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetFontSize}
                title="Resetar fonte (18px)"
                className="min-h-9 min-w-12 text-center font-mono text-xs text-slate-300 hover:text-white"
              >
                {fontSize}px
              </button>
              <button
                type="button"
                aria-label="Aumentar fonte"
                disabled={fontSize >= 72}
                onClick={() => handleFontSizeChange(2)}
                className="min-h-9 min-w-9 inline-flex items-center justify-center rounded text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={rewind}
              aria-label="Reiniciar rolagem (topo)"
              title="Voltar ao início da cifra"
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? 'Pausar autoscroll' : 'Iniciar autoscroll'}
              title={isPlaying ? 'Pausar rolagem automática' : 'Iniciar rolagem automática'}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              <span>{isPlaying ? 'Pausar' : 'Rolar'}</span>
            </button>

            {/* Controle de Velocidade com Slider e Botões */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-2.5 py-1">
              <button
                type="button"
                onClick={handleSlowDown}
                disabled={speed <= 1}
                aria-label="Diminuir velocidade"
                className="min-h-9 min-w-9 inline-flex items-center justify-center rounded text-slate-400 hover:text-white disabled:opacity-30"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono font-bold w-4 text-center">{speed}</span>
                <input
                  aria-label="Velocidade do autoscroll"
                  type="range"
                  min="1"
                  max="10"
                  value={speed}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                  className="w-16 sm:w-24 accent-emerald-500 cursor-pointer"
                />
              </label>
              <button
                type="button"
                onClick={handleSpeedUp}
                disabled={speed >= 10}
                aria-label="Aumentar velocidade"
                className="min-h-9 min-w-9 inline-flex items-center justify-center rounded text-slate-400 hover:text-white disabled:opacity-30"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
