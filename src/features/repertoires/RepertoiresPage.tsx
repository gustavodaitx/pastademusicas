import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Beer, Church, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { listMusics } from '../../services/musicRepository';
import type { MusicRecord } from '../../services/musicRepository';
import { addMusicToRepertoire, createRepertoire, deleteRepertoire, getRepertoireById, listRepertoires, removeMusicFromRepertoire, renameRepertoire, reorderRepertoireItems, RepertoireRepositoryError } from '../../services/repertoireRepository';
import type { RepertoireDetails, RepertoireRecord } from '../../services/repertoireRepository';
import type { RepertoireType } from '../../types/firestore';

const message = (error: unknown) => error instanceof RepertoireRepositoryError ? error.message : 'Não foi possível concluir a operação. Verifique sua conexão e tente novamente.';

export function RepertoiresPage() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<RepertoireRecord[]>([]);
  const [songs, setSongs] = useState<MusicRecord[]>([]);
  const [detail, setDetail] = useState<RepertoireDetails | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<RepertoireType>('igreja');
  const [editing, setEditing] = useState<RepertoireRecord | null>(null);
  const [selectedSong, setSelectedSong] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (authLoading) return;
    if (!user) { setRows([]); setLoading(false); setError('Entre na sua conta para acessar seus repertórios.'); return; }
    setLoading(true); setError(null);
    try { setRows(await listRepertoires()); } catch (e) { setError(message(e)); } finally { setLoading(false); }
  }, [authLoading, user]);
  useEffect(() => { void load(); }, [load]);
  const songsById = useMemo(() => new Map(songs.map((song) => [song.id, song])), [songs]);
  const available = useMemo(() => songs.filter((song) => !detail?.itens.some((item) => item.musicaId === song.id)), [songs, detail]);

  const open = async (id: string) => {
    setLoading(true); setError(null);
    try { const [repertoire, library] = await Promise.all([getRepertoireById(id), listMusics()]); setSongs(library); setDetail(repertoire); setSelectedSong(library.find((song) => !repertoire?.itens.some((item) => item.musicaId === song.id))?.id ?? ''); }
    catch (e) { setError(message(e)); } finally { setLoading(false); }
  };
  const refreshDetail = async (id: string) => { const result = await getRepertoireById(id); if (!result) throw new RepertoireRepositoryError('Repertório não encontrado.', 'not-found'); setDetail(result); };
  const save = async () => {
    setBusy(true); setError(null);
    try {
      if (editing) { await renameRepertoire(editing.id, name); setNotice('Repertório renomeado.'); }
      else { await createRepertoire({ nome: name, tipo: type, parametrosGeracao: null }); setNotice('Repertório criado.'); }
      setName(''); setEditing(null); await load();
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const remove = async (row: RepertoireRecord) => {
    if (!window.confirm(`Excluir “${row.nome}” e suas músicas? Essa ação não pode ser desfeita.`)) return;
    setBusy(true); setError(null);
    try { await deleteRepertoire(row.id); if (detail?.id === row.id) setDetail(null); setNotice('Repertório excluído.'); await load(); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const updateSongs = async (operation: () => Promise<void>, success: string) => {
    if (!detail) return; setBusy(true); setError(null);
    try { await operation(); await refreshDetail(detail.id); setNotice(success); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const move = (index: number, delta: -1 | 1) => {
    if (!detail) return; const ids = detail.itens.map((item) => item.musicaId); const next = index + delta;
    if (next < 0 || next >= ids.length) return; [ids[index], ids[next]] = [ids[next], ids[index]];
    void updateSongs(() => reorderRepertoireItems(detail.id, ids), 'Ordem atualizada.');
  };

  return <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Meus repertórios</h1><p className="mt-1 text-sm text-slate-500">Repertórios privados com músicas da sua biblioteca.</p></div></header>
    {error && <div role="alert" className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
    {notice && <div role="status" className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm">{notice}</div>}
    <section className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">{editing ? 'Renomear repertório' : 'Criar repertório'}</h2>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_12rem_auto] gap-2"><input aria-label="Nome do repertório" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" /><select aria-label="Tipo do repertório" value={type} onChange={(e) => setType(e.target.value as RepertoireType)} className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"><option value="igreja">Igreja</option><option value="barzinho">Barzinho</option></select><button type="button" disabled={busy || !name.trim()} onClick={() => void save()} className="inline-flex justify-center items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus className="w-4 h-4" />{editing ? 'Salvar' : 'Criar'}</button></div>
      {editing && <button type="button" onClick={() => { setEditing(null); setName(''); }} className="mt-2 text-sm text-slate-500">Cancelar edição</button>}
    </section>
    {loading && <p role="status" aria-busy="true" className="py-12 text-center text-sm text-slate-500">Carregando repertórios…</p>}
    {!loading && !error && rows.length === 0 && <p role="status" className="py-14 text-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">Você ainda não tem repertórios salvos.</p>}
    {!loading && rows.length > 0 && <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{rows.map((row) => <article key={row.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><div className="flex items-center gap-2 text-xs text-slate-500">{row.tipo === 'igreja' ? <Church className="w-4 h-4" /> : <Beer className="w-4 h-4" />}{row.tipo === 'igreja' ? 'Igreja' : 'Barzinho'}</div><h2 className="mt-2 font-bold text-slate-900 dark:text-slate-100">{row.nome}</h2><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void open(row.id)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">Abrir</button><button type="button" onClick={() => { setEditing(row); setName(row.nome); setType(row.tipo); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Renomear</button><button type="button" onClick={() => void remove(row)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600">Excluir</button></div></article>)}</section>}
    {detail && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"><section role="dialog" aria-modal="true" aria-label={detail.nome} className="my-6 w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl"><header className="flex justify-between gap-3"><div><h2 className="text-xl font-bold">{detail.nome}</h2><p className="text-sm text-slate-500">{detail.itens.length} músicas</p></div><button aria-label="Fechar repertório" onClick={() => setDetail(null)} className="p-2"><X className="w-5 h-5" /></button></header>
      {detail.itens.length === 0 ? <p role="status" className="my-5 rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Este repertório ainda está vazio.</p> : <ol className="my-5 space-y-2">{detail.itens.map((item, index) => <li key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3"><span className="w-6 text-center text-xs text-slate-400">{index + 1}</span><span className="flex-1 text-sm font-medium">{songsById.get(item.musicaId)?.titulo ?? 'Música indisponível na biblioteca'}</span><button aria-label={`Mover ${songsById.get(item.musicaId)?.titulo ?? item.musicaId} para cima`} disabled={busy || index === 0} onClick={() => move(index, -1)} className="p-1 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button><button aria-label={`Mover ${songsById.get(item.musicaId)?.titulo ?? item.musicaId} para baixo`} disabled={busy || index === detail.itens.length - 1} onClick={() => move(index, 1)} className="p-1 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button><button aria-label={`Remover ${songsById.get(item.musicaId)?.titulo ?? item.musicaId}`} disabled={busy} onClick={() => void updateSongs(() => removeMusicFromRepertoire(detail.id, item.musicaId), 'Música removida.')} className="p-1 text-rose-600"><Trash2 className="w-4 h-4" /></button></li>)}</ol>}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4"><h3 className="text-sm font-semibold">Adicionar música da biblioteca</h3>{available.length === 0 ? <p className="mt-2 text-xs text-slate-500">{songs.length === 0 ? 'Sua biblioteca ainda não tem músicas.' : 'Todas as músicas já estão neste repertório.'}</p> : <div className="mt-2 flex flex-col sm:flex-row gap-2"><select aria-label="Música para adicionar" value={selectedSong} onChange={(e) => setSelectedSong(e.target.value)} className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2 text-sm">{available.map((song) => <option key={song.id} value={song.id}>{song.titulo}{song.artista ? ` — ${song.artista}` : ''}</option>)}</select><button disabled={busy || !selectedSong} onClick={() => void updateSongs(() => addMusicToRepertoire(detail.id, selectedSong), 'Música adicionada.')} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Adicionar</button></div>}</div>
      </section></div>}
  </main>;
}
