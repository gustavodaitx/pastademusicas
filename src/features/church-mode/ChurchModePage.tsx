import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Church, CheckCircle2, AlertTriangle, Save, Music, Trash2, FolderOpen } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { listMusics, MusicRepositoryError } from '../../services/musicRepository';
import type { MusicRecord } from '../../services/musicRepository';
import {
  createChurchPlaylistV2,
  getChurchPlaylist,
  listPlaylists,
  PlaylistRepositoryError,
  updateChurchMoment,
} from '../../services/playlistRepository';
import type { PlaylistRecord } from '../../services/playlistRepository';
import { MOMENTOS_IGREJA } from '../../types/firestore';
import type { MomentoIgrejaId } from '../../types/firestore';
import { ExportActions } from '../export/ExportActions';
import type { ExportPlaylist } from '../export/exportFormatters';

export const LITURGICAL_MOMENTS = MOMENTOS_IGREJA.map((moment, index) => ({
  ...moment,
  momentoId: moment.id,
  id: index + 1,
}));

type ChurchSlot = { musicId: string | null; tom: string | null };
type ChurchSlots = Record<MomentoIgrejaId, ChurchSlot>;

export function normalizeLiturgicalMoment(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function getChurchMusicSuggestions(
  catalog: readonly MusicRecord[],
  momentId: MomentoIgrejaId,
): MusicRecord[] {
  const moment = MOMENTOS_IGREJA.find(({ id }) => id === momentId);
  if (!moment) return [];
  const accepted = new Set([normalizeLiturgicalMoment(momentId), normalizeLiturgicalMoment(moment.nome)]);
  return catalog.filter((music) => music.momentosLiturgicos.some((value) => accepted.has(normalizeLiturgicalMoment(value))));
}

function emptySlots(): ChurchSlots {
  return Object.fromEntries(MOMENTOS_IGREJA.map(({ id }) => [id, { musicId: null, tom: null }])) as ChurchSlots;
}

function slotsAreEqual(left: ChurchSlot, right: ChurchSlot): boolean {
  return left.musicId === right.musicId && left.tom === right.tom;
}

function errorMessage(error: unknown): string {
  if (error instanceof MusicRepositoryError || error instanceof PlaylistRepositoryError) return error.message;
  return 'Não foi possível concluir a operação. Verifique sua conexão e tente novamente.';
}

export const ChurchModePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [celebrationName, setCelebrationName] = useState('');
  const [slots, setSlots] = useState<ChurchSlots>(emptySlots);
  const [savedSlots, setSavedSlots] = useState<ChurchSlots | null>(null);
  const [catalog, setCatalog] = useState<MusicRecord[]>([]);
  const [savedChurchPlaylists, setSavedChurchPlaylists] = useState<PlaylistRecord[]>([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<1 | 2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [includeExportMetadata, setIncludeExportMetadata] = useState(true);

  const catalogById = useMemo(() => new Map(catalog.map((music) => [music.id, music])), [catalog]);
  const churchExport: ExportPlaylist = useMemo(() => ({
    nome: celebrationName,
    itens: MOMENTOS_IGREJA.map(({ id, nome }) => ({
      music: slots[id].musicId ? catalogById.get(slots[id].musicId!) ?? null : null,
      momento: nome,
      tomPersonalizado: slots[id].tom,
    })),
  }), [celebrationName, catalogById, slots]);

  const loadCatalog = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setCatalog([]);
      setSavedChurchPlaylists([]);
      setLoading(false);
      setError('Entre na sua conta para acessar o Modo Igreja.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [musics, playlists] = await Promise.all([listMusics(), listPlaylists()]);
      setCatalog(musics);
      setSavedChurchPlaylists(playlists.filter((playlist) => playlist.tipo === 'igreja'));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const openPlaylist = async (playlistId: string) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await getChurchPlaylist(playlistId);
      if (!result) throw new PlaylistRepositoryError('Essa playlist não foi encontrada.', 'not-found');
      if (result.kind !== 'structured') throw new PlaylistRepositoryError('Esta playlist não possui estrutura litúrgica compatível.', 'invalid-playlist-format');

      const reopened = emptySlots();
      result.playlist.momentosIgreja.forEach((moment) => {
        const musicId = 'referenciaMusical' in moment
          ? moment.referenciaMusical?.musicaId ?? null
          : moment.musicaId;
        reopened[moment.momentoId] = {
          musicId,
          tom: moment.tomPersonalizado,
        };
      });
      setSlots(reopened);
      setSavedSlots(reopened);
      setCelebrationName(result.playlist.nome);
      setCurrentPlaylistId(playlistId);
      setCurrentVersion(result.playlist.versaoEstrutura);
      setNotice('Playlist litúrgica aberta para edição.');
    } catch (openError) {
      setError(errorMessage(openError));
    } finally {
      setLoading(false);
    }
  };

  const selectMusic = (momentId: MomentoIgrejaId, musicId: string) => {
    if (!catalogById.has(musicId)) {
      setError('A música selecionada não pertence ao catálogo atual.');
      return;
    }
    setSlots((current) => ({
      ...current,
      [momentId]: {
        musicId,
        tom: catalogById.get(musicId)?.tomOriginal ?? null,
      },
    }));
    setNotice(null);
  };

  const removeMusic = (momentId: MomentoIgrejaId) => {
    setSlots((current) => ({ ...current, [momentId]: { musicId: null, tom: null } }));
  };

  const savePlaylist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!celebrationName.trim()) {
      setError('Informe o nome da celebração.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const momentosIgreja = MOMENTOS_IGREJA.map(({ id }) => ({
        momentoId: id,
        referenciaMusical: slots[id].musicId ? { musicaId: slots[id].musicId! } : null,
        tomPersonalizado: slots[id].tom,
      }));

      if (currentPlaylistId && currentVersion) {
        const changedMoments = MOMENTOS_IGREJA.filter(({ id }) => (
          !savedSlots || !slotsAreEqual(slots[id], savedSlots[id])
        ));
        for (const moment of changedMoments) {
          const slot = slots[moment.id];
          await updateChurchMoment(currentPlaylistId, moment.id, currentVersion === 1
            ? {
              versaoEstrutura: 1,
              musicaId: slot.musicId,
              tomPersonalizado: slot.tom,
            }
            : {
              versaoEstrutura: 2,
              referenciaMusical: slot.musicId ? { musicaId: slot.musicId } : null,
              tomPersonalizado: slot.tom,
            });
        }
        setSavedSlots(slots);
        setNotice('Playlist litúrgica atualizada.');
      } else if (currentPlaylistId) {
        setError('Esta é uma playlist v1 legada. Conserve-a sem migração automática; crie uma nova playlist v2 para editar este conteúdo.');
        return;
      } else {
        const id = await createChurchPlaylistV2({ nome: celebrationName.trim(), momentosIgreja });
        setCurrentPlaylistId(id);
        setCurrentVersion(2);
        setSavedSlots(slots);
        setNotice('Playlist litúrgica salva. Ela já está disponível para reabertura.');
        await loadCatalog();
      }
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-6">
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

        <Link to="/repertorios" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors">
          <Save className="w-4 h-4" />
          <span>Gerenciar Repertórios</span>
        </Link>
      </div>

      {error && <div role="alert" className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
      {notice && <div role="status" className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">{notice}</div>}

      <form onSubmit={savePlaylist} className="space-y-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <label htmlFor="celebration-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0">Nome da Celebração:</label>
          <input id="celebration-name" type="text" value={celebrationName} placeholder="Nome da celebração" onChange={(e) => setCelebrationName(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>

        {savedChurchPlaylists.length > 0 && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-amber-600" />
            <label htmlFor="saved-church-playlist" className="text-sm font-semibold">Abrir playlist salva:</label>
            <select id="saved-church-playlist" value="" onChange={(event) => { if (event.target.value) void openPlaylist(event.target.value); }}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm">
              <option value="">Selecionar...</option>
              {savedChurchPlaylists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.nome}</option>)}
            </select>
          </div>
        )}

      <div className="space-y-2.5">
        {LITURGICAL_MOMENTS.map((moment) => {
          const slot = slots[moment.momentoId];
          const selectedSong = slot.musicId ? catalogById.get(slot.musicId) : undefined;
          const suggestions = getChurchMusicSuggestions(catalog, moment.momentoId);
          return (
            <div
              key={moment.id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                selectedSong
                  ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/60 shadow-sm'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800'
              }`}
            >
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
                        Tom {slot.tom ?? 'não definido'}
                      </span>
                    </div>
                  ) : slot.musicId ? (
                    <span role="status" className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      Referência histórica não encontrada (ID: {slot.musicId}); mantida até remoção ou substituição explícita.
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3 text-slate-400" />
                      Nenhuma música selecionada — selecione manualmente outra música do catálogo
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <select aria-label={`Música para ${moment.nome}`} value={slot.musicId ?? ''} onChange={(event) => event.target.value ? selectMusic(moment.momentoId, event.target.value) : removeMusic(moment.momentoId)}
                  className="max-w-64 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  {slot.musicId && !selectedSong && <option value={slot.musicId} disabled>Referência não encontrada: {slot.musicId}</option>}
                  <option value="">Nenhuma — seleção manual</option>
                  {suggestions.length > 0 && <optgroup label="Sugestões para este momento">
                    {suggestions.map((music) => <option key={`suggestion-${music.id}`} value={music.id}>{music.titulo}{music.tomOriginal ? ` — Tom ${music.tomOriginal}` : ''}</option>)}
                  </optgroup>}
                  <optgroup label="Todas as músicas do catálogo">
                    {catalog.filter((music) => !suggestions.some((suggestion) => suggestion.id === music.id)).map((music) => <option key={`catalog-${music.id}`} value={music.id}>{music.titulo}{music.tomOriginal ? ` — Tom ${music.tomOriginal}` : ''}</option>)}
                  </optgroup>
                </select>
                {slot.musicId && <button type="button" aria-label={`Remover música de ${moment.nome}`} onClick={() => removeMusic(moment.momentoId)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && catalog.length === 0 && <div className="text-sm text-slate-500">Seu catálogo está vazio. Nenhuma sugestão será inventada; você poderá selecionar músicas após cadastrá-las na biblioteca.</div>}

      <button type="submit" disabled={loading || saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm">
        <Save className="w-4 h-4" /> {saving ? 'Salvando...' : currentPlaylistId ? 'Atualizar Playlist Litúrgica' : 'Salvar como Nova Playlist'}
      </button>
      </form>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Exportar playlist litúrgica</p>
        <ExportActions playlist={churchExport} includeMetadata={includeExportMetadata} onMetadataChange={setIncludeExportMetadata} />
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
