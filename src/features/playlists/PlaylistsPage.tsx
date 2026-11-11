import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowDown, ArrowRight, ArrowUp, Beer, Calendar, Church, Copy, GripVertical, ListMusic, Music2, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { listMusics, MusicRepositoryError } from '../../services/musicRepository';
import type { MusicRecord } from '../../services/musicRepository';
import type { PlaylistType } from '../../types/firestore';
import {
  addMusicToPlaylist,
  createPlaylist,
  deletePlaylist,
  duplicatePlaylist,
  getPlaylistById,
  listPlaylists,
  PlaylistRepositoryError,
  removeMusicFromPlaylist,
  reorderPlaylistItems,
  updatePlaylistItemKey,
  updatePlaylist,
} from '../../services/playlistRepository';
import type { PlaylistDetails, PlaylistRecord } from '../../services/playlistRepository';

type PlaylistForm = { nome: string; tipo: PlaylistType };

const emptyForm: PlaylistForm = { nome: '', tipo: 'manual' };

function errorMessage(error: unknown): string {
  if (error instanceof PlaylistRepositoryError || error instanceof MusicRepositoryError) return error.message;
  return 'Não foi possível concluir a operação. Verifique sua conexão e tente novamente.';
}

function TypeBadge({ type }: { type: PlaylistType }) {
  if (type === 'igreja') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"><Church className="w-3 h-3" />Modo Igreja</span>;
  if (type === 'barzinho') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"><Beer className="w-3 h-3" />Modo Barzinho</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"><ListMusic className="w-3 h-3" />Manual</span>;
}

export const PlaylistsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistRecord | null>(null);
  const [form, setForm] = useState<PlaylistForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistDetails | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<MusicRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedMusicId, setSelectedMusicId] = useState('');
  const [busy, setBusy] = useState(false);
  const [duplicatingPlaylistId, setDuplicatingPlaylistId] = useState<string | null>(null);
  const [editingTomItemId, setEditingTomItemId] = useState<string | null>(null);
  const [tomDraft, setTomDraft] = useState('');
  const [tomSaving, setTomSaving] = useState(false);
  const [tomError, setTomError] = useState<string | null>(null);
  const [tomNotice, setTomNotice] = useState<string | null>(null);
  const [draggedMusicId, setDraggedMusicId] = useState<string | null>(null);

  const loadPlaylists = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setPlaylists([]);
      setLoading(false);
      setError('Entre na sua conta para acessar suas playlists.');
      return;
    }
    setLoading(true);
    setError(null);
    setPlaylists([]);
    try {
      setPlaylists(await listPlaylists());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => { void loadPlaylists(); }, [loadPlaylists]);

  const musicById = useMemo(() => new Map(playlistSongs.map((music) => [music.id, music])), [playlistSongs]);
  const playlistMusicIds = useMemo(() => new Set(selectedPlaylist?.itens.map((item) => item.musicaId) ?? []), [selectedPlaylist]);
  const availableSongs = useMemo(() => playlistSongs.filter((music) => !playlistMusicIds.has(music.id)), [playlistSongs, playlistMusicIds]);

  const openCreate = () => {
    setEditingPlaylist(null);
    setForm(emptyForm);
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (playlist: PlaylistRecord) => {
    setSelectedPlaylist(null);
    setEditingPlaylist(playlist);
    setForm({ nome: playlist.nome, tipo: playlist.tipo });
    setError(null);
    setFormOpen(true);
  };

  const openDetails = async (playlistId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const [playlist, songs] = await Promise.all([getPlaylistById(playlistId), listMusics()]);
      if (!playlist) {
        setError('Essa playlist não foi encontrada. Atualize a lista e tente novamente.');
        await loadPlaylists();
        return;
      }
      setPlaylistSongs(songs);
      setSelectedPlaylist(playlist);
      setSelectedMusicId(songs.find((song) => !playlist.itens.some((item) => item.musicaId === song.id))?.id ?? '');
    } catch (detailError) {
      setError(errorMessage(detailError));
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetails = async (playlistId: string) => {
    const playlist = await getPlaylistById(playlistId);
    if (!playlist) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
    setSelectedPlaylist(playlist);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingPlaylist) {
        await updatePlaylist(editingPlaylist.id, form);
        setNotice('Playlist atualizada.');
        await loadPlaylists();
      } else {
        const id = await createPlaylist(form);
        setNotice('Playlist criada.');
        await loadPlaylists();
        setFormOpen(false);
        setEditingPlaylist(null);
        await openDetails(id);
        return;
      }
      setFormOpen(false);
      setEditingPlaylist(null);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (playlist: PlaylistRecord) => {
    if (!window.confirm(`Excluir a playlist “${playlist.nome}” e remover suas associações com as músicas? As músicas permanecerão na Biblioteca. Essa ação não pode ser desfeita.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deletePlaylist(playlist.id);
      setSelectedPlaylist(null);
      setNotice('Playlist excluída.');
      await loadPlaylists();
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (playlist: PlaylistRecord) => {
    if (busy || duplicatingPlaylistId) return;
    setDuplicatingPlaylistId(playlist.id);
    setError(null);
    try {
      await duplicatePlaylist(playlist.id);
      setNotice('Playlist duplicada.');
      await loadPlaylists();
    } catch (duplicateError) {
      setError(errorMessage(duplicateError));
    } finally {
      setDuplicatingPlaylistId(null);
    }
  };

  const handleAddMusic = async () => {
    if (!selectedPlaylist || !selectedMusicId) return;
    setBusy(true);
    setError(null);
    try {
      await addMusicToPlaylist(selectedPlaylist.id, selectedMusicId);
      await refreshDetails(selectedPlaylist.id);
      setSelectedMusicId(playlistSongs.find((song) => !selectedPlaylist.itens.some((item) => item.musicaId === song.id) && song.id !== selectedMusicId)?.id ?? '');
      setNotice('Música adicionada à playlist.');
    } catch (addError) {
      setError(errorMessage(addError));
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMusic = async (musicId: string) => {
    if (!selectedPlaylist) return;
    setBusy(true);
    setError(null);
    try {
      await removeMusicFromPlaylist(selectedPlaylist.id, musicId);
      await refreshDetails(selectedPlaylist.id);
      setSelectedMusicId(musicId);
      setNotice('Música removida da playlist.');
    } catch (removeError) {
      setError(errorMessage(removeError));
    } finally {
      setBusy(false);
    }
  };

  const handleReorder = async (musicId: string, targetIndex: number) => {
    if (!selectedPlaylist || busy || tomSaving) return;
    const sourceIndex = selectedPlaylist.itens.findIndex((item) => item.musicaId === musicId);
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= selectedPlaylist.itens.length || sourceIndex === targetIndex) return;

    const previousPlaylist = selectedPlaylist;
    const reorderedItems = [...selectedPlaylist.itens];
    const [movedItem] = reorderedItems.splice(sourceIndex, 1);
    reorderedItems.splice(targetIndex, 0, movedItem);
    const orderedIds = reorderedItems.map((item) => item.musicaId);
    setBusy(true);
    setError(null);
    setNotice(null);
    setSelectedPlaylist({ ...selectedPlaylist, itens: reorderedItems });
    try {
      await reorderPlaylistItems(selectedPlaylist.id, orderedIds);
      await refreshDetails(selectedPlaylist.id);
      setNotice('Ordem da playlist atualizada.');
    } catch (reorderError) {
      setSelectedPlaylist(previousPlaylist);
      setError(errorMessage(reorderError));
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    if (busy || tomSaving || !selectedPlaylist) return;
    const item = selectedPlaylist.itens[index];
    if (item) await handleReorder(item.musicaId, index + direction);
  };

  const handleDrop = (targetMusicId: string) => {
    if (!draggedMusicId || !selectedPlaylist || busy || tomSaving) return;
    const targetIndex = selectedPlaylist.itens.findIndex((item) => item.musicaId === targetMusicId);
    void handleReorder(draggedMusicId, targetIndex);
    setDraggedMusicId(null);
  };

  const handleReorderKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    void handleMove(index, event.key === 'ArrowUp' ? -1 : 1);
  };

  const handleEditTom = (musicId: string, personalizedKey: string | null) => {
    setEditingTomItemId(musicId);
    setTomDraft(personalizedKey ?? '');
    setTomError(null);
    setTomNotice(null);
  };

  const handleSaveTom = async (value: string = tomDraft) => {
    if (!selectedPlaylist || !editingTomItemId || tomSaving || busy) return;
    setTomSaving(true);
    setTomError(null);
    setTomNotice(null);
    try {
      await updatePlaylistItemKey(selectedPlaylist.id, editingTomItemId, value);
      await refreshDetails(selectedPlaylist.id);
      setEditingTomItemId(null);
      setTomDraft('');
      setTomNotice('Tom personalizado salvo.');
    } catch (saveError) {
      setTomError(errorMessage(saveError));
    } finally {
      setTomSaving(false);
    }
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingPlaylist(null);
    setForm(emptyForm);
    setError(null);
  };

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2"><ListMusic className="w-6 h-6 text-brand-600 dark:text-brand-400" /><span>Playlists e Repertórios</span></h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Organize suas músicas em listas privadas para celebrações, apresentações e ensaios.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/modo-igreja" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 transition-colors"><Church className="w-3.5 h-3.5" /><span>Modo Igreja</span></Link>
          <Link to="/modo-barzinho" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors"><Beer className="w-3.5 h-3.5" /><span>Modo Barzinho</span></Link>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"><Plus className="w-4 h-4" /><span>Criar Nova</span></button>
        </div>
      </div>

      {error && !selectedPlaylist && <div role="alert" className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
      {notice && <div role="status" className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 text-sm">{notice}</div>}

      {loading && <div role="status" aria-busy="true" className="py-16 text-center text-sm text-slate-500">Carregando suas playlists…</div>}
      {!loading && !error && playlists.length === 0 && <div className="py-16 px-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
        <ListMusic className="w-8 h-8 mx-auto text-slate-400" />
        <h2 className="mt-3 font-semibold text-slate-800 dark:text-slate-100">Você ainda não tem playlists</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crie uma playlist e adicione músicas que já estão na sua biblioteca.</p>
        <button type="button" onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"><Plus className="w-4 h-4" />Criar playlist</button>
      </div>}

      {!loading && playlists.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {playlists.map((playlist) => <article key={playlist.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-sm transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2"><TypeBadge type={playlist.tipo} /><span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{playlist.updatedAt.toDate().toLocaleDateString('pt-BR')}</span></div>
            <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{playlist.nome}</h2>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Music2 className="w-4 h-4 text-brand-500" />Abra para ver e organizar as músicas.</p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Link to="/palco" className="text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform flex items-center gap-1"><span>Abrir no Palco</span><ArrowRight className="w-3.5 h-3.5" /></Link>
            <div className="flex items-center gap-1"><button type="button" onClick={() => openEdit(playlist)} aria-label={`Editar ${playlist.nome}`} className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Editar</button><button type="button" onClick={() => void handleDuplicate(playlist)} disabled={busy || duplicatingPlaylistId !== null} aria-label={`Duplicar ${playlist.nome}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"><Copy className="w-3.5 h-3.5" /><span>{duplicatingPlaylistId === playlist.id ? 'Duplicando…' : 'Duplicar'}</span></button><button type="button" onClick={() => void openDetails(playlist.id)} aria-label={`Abrir ${playlist.nome}`} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white">Abrir</button></div>
          </div>
        </article>)}
      </div>}

      {formOpen && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="playlist-form-title" className="my-8 w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl">
          <div className="flex items-center justify-between gap-3"><h2 id="playlist-form-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingPlaylist ? 'Editar playlist' : 'Criar playlist'}</h2><button type="button" onClick={closeForm} disabled={saving} aria-label="Fechar" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button></div>
          <form onSubmit={(event) => void handleSave(event)} className="mt-5 space-y-4">
            {error && <div role="alert" className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 text-sm">{error}</div>}
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Nome <span className="text-rose-500">*</span><input required maxLength={120} value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" /></label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tipo<select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as PlaylistType })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"><option value="manual">Manual</option><option value="igreja">Modo Igreja</option><option value="barzinho">Modo Barzinho</option></select></label>
            <div className="flex justify-end gap-2 pt-2"><button type="button" disabled={saving} onClick={closeForm} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm font-semibold text-white">{saving ? 'Salvando…' : editingPlaylist ? 'Salvar alterações' : 'Criar playlist'}</button></div>
          </form>
        </section>
      </div>}

      {detailLoading && <div role="status" className="fixed inset-0 z-40 grid place-items-center bg-black/30"><div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-xl">Carregando playlist…</div></div>}

      {selectedPlaylist && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy && !tomSaving) setSelectedPlaylist(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="playlist-detail-title" className="my-8 w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><div className="mb-2"><TypeBadge type={selectedPlaylist.tipo} /></div><h2 id="playlist-detail-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedPlaylist.nome}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedPlaylist.itens.length} {selectedPlaylist.itens.length === 1 ? 'música' : 'músicas'}</p></div><button type="button" disabled={busy || tomSaving} onClick={() => setSelectedPlaylist(null)} aria-label="Fechar playlist" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"><X className="w-5 h-5" /></button></div>
          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
          {tomError && <p role="alert" className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{tomError}</p>}
          {tomNotice && <p role="status" className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{tomNotice}</p>}
          <p id="playlist-reorder-instructions" className="sr-only">Arraste o botão de alça para reordenar. Pelo teclado, use as setas para cima e para baixo. Os botões de mover também estão disponíveis.</p>
          {busy && <p role="status" aria-live="polite" className="mt-4 text-sm text-brand-700 dark:text-brand-300">Salvando alterações na playlist…</p>}
          <div className="mt-5">
            {selectedPlaylist.itens.length === 0 ? <p role="status" className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500">Esta playlist ainda está vazia.</p> : <ol className="space-y-2">
              {selectedPlaylist.itens.map((item, index) => {
                const music = musicById.get(item.musicaId);
                return <li
                  key={item.id}
                  onDragOver={(event) => {
                    if (!draggedMusicId || busy || tomSaving) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDrop(item.musicaId);
                  }}
                  className={`flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center ${draggedMusicId === item.musicaId ? 'opacity-50' : ''}`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span className="w-7 shrink-0 pt-0.5 text-center text-xs font-semibold text-slate-400">{index + 1}</span>
                    <button
                      type="button"
                      draggable={!busy && !tomSaving && editingTomItemId === null}
                      disabled={busy || tomSaving || editingTomItemId !== null}
                      aria-label={`Arrastar ${music?.titulo ?? item.musicaId} para reordenar`}
                      aria-describedby="playlist-reorder-instructions"
                      aria-keyshortcuts="ArrowUp ArrowDown"
                      onKeyDown={(event) => handleReorderKeyDown(event, index)}
                      onDragStart={(event) => {
                        if (busy || tomSaving || editingTomItemId !== null) {
                          event.preventDefault();
                          return;
                        }
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', item.musicaId);
                        setDraggedMusicId(item.musicaId);
                      }}
                      onDragEnd={() => setDraggedMusicId(null)}
                      className="touch-none rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <GripVertical className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{music?.titulo ?? 'Música não encontrada na biblioteca'}</p>
                      <p className="truncate text-xs text-slate-500">{music?.artista ?? item.musicaId}</p>
                      <p className="mt-1 text-xs text-slate-500">Tom original: {music?.tomOriginal ?? 'Não informado'}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Tom personalizado: {item.tomPersonalizado ?? 'Não definido'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {editingTomItemId === item.musicaId ? <>
                      <label className="sr-only" htmlFor={`playlist-key-${item.musicaId}`}>Tom personalizado para {music?.titulo ?? item.musicaId}</label>
                      <input id={`playlist-key-${item.musicaId}`} maxLength={12} value={tomDraft} onChange={(event) => setTomDraft(event.target.value)} disabled={tomSaving || busy} placeholder="Ex.: G#m" className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
                      <button type="button" disabled={tomSaving || busy} onClick={() => void handleSaveTom()} className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{tomSaving ? 'Salvando…' : 'Salvar tom'}</button>
                      {item.tomPersonalizado && <button type="button" disabled={tomSaving || busy} onClick={() => void handleSaveTom('')} className="rounded-lg px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/40">Limpar tom</button>}
                      <button type="button" disabled={tomSaving || busy} onClick={() => { setEditingTomItemId(null); setTomDraft(''); setTomError(null); }} className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                    </> : <>
                      <button type="button" disabled={busy || tomSaving} onClick={() => handleEditTom(item.musicaId, item.tomPersonalizado)} aria-label={`Editar tom personalizado de ${music?.titulo ?? item.musicaId}`} className="rounded-lg px-2 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-brand-950/40">Editar tom</button>
                      <button type="button" disabled={busy || tomSaving || index === 0} onClick={() => void handleMove(index, -1)} aria-label={`Mover ${music?.titulo ?? item.musicaId} para cima`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" disabled={busy || tomSaving || index === selectedPlaylist.itens.length - 1} onClick={() => void handleMove(index, 1)} aria-label={`Mover ${music?.titulo ?? item.musicaId} para baixo`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" disabled={busy || tomSaving} onClick={() => void handleRemoveMusic(item.musicaId)} aria-label={`Remover ${music?.titulo ?? item.musicaId}`} className="rounded-lg p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                    </>}
                  </div>
                </li>;
              })}
            </ol>}
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Adicionar música da biblioteca</h3>
            {availableSongs.length === 0 ? <p className="mt-2 text-xs text-slate-500">{playlistSongs.length === 0 ? 'Sua biblioteca ainda não tem músicas.' : 'Todas as músicas da biblioteca já estão nesta playlist.'}</p> : <div className="mt-2 flex flex-col sm:flex-row gap-2"><select aria-label="Música para adicionar" value={selectedMusicId} onChange={(event) => setSelectedMusicId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">{availableSongs.map((music) => <option key={music.id} value={music.id}>{music.titulo}{music.artista ? ` — ${music.artista}` : ''}</option>)}</select><button type="button" disabled={busy || tomSaving || !selectedMusicId} onClick={() => void handleAddMusic()} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm font-semibold text-white"><Plus className="w-4 h-4" />Adicionar</button></div>}
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-2"><button type="button" disabled={busy || tomSaving} onClick={() => { const { id, nome, tipo, createdAt, updatedAt } = selectedPlaylist; openEdit({ id, nome, tipo, createdAt, updatedAt }); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50">Editar</button><button type="button" disabled={busy || tomSaving} onClick={() => void handleDelete(selectedPlaylist)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 disabled:opacity-50"><Trash2 className="w-4 h-4" />Excluir playlist</button></div>
        </section>
      </div>}
    </div>
  );
};
