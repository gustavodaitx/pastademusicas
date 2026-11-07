import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Filter, Mic2, Music as MusicIcon, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  createMusic,
  deleteMusic,
  getMusicById,
  listMusics,
  MusicRepositoryError,
  updateMusic,
} from '../../services/musicRepository';
import type { MusicInput, MusicRecord } from '../../services/musicRepository';
import { isImportMusicDraft } from '../import-music/importMusicDraft';
import type { ImportMusicDraft } from '../import-music/importMusicDraft';
import { validateExtractedText } from '../import-music/fileImportValidation';
import { createMusicSearchIndex, normalizeMusicSearchText } from './musicSearch';

type MusicForm = {
  titulo: string;
  artista: string;
  compositor: string;
  tomOriginal: string;
  conteudoCifrado: string;
  observacoes: string;
  categorias: string;
  tags: string;
};

const emptyForm: MusicForm = {
  titulo: '',
  artista: '',
  compositor: '',
  tomOriginal: '',
  conteudoCifrado: '',
  observacoes: '',
  categorias: '',
  tags: '',
};

const splitValues = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

function formFromMusic(music: MusicRecord): MusicForm {
  return {
    titulo: music.titulo,
    artista: music.artista ?? '',
    compositor: music.compositor ?? '',
    tomOriginal: music.tomOriginal ?? '',
    conteudoCifrado: music.conteudoCifrado,
    observacoes: music.observacoes ?? '',
    categorias: music.categorias.join(', '),
    tags: music.tags.join(', '),
  };
}

function inputFromForm(form: MusicForm, existing?: MusicRecord): MusicInput {
  return {
    titulo: form.titulo,
    artista: form.artista || null,
    compositor: form.compositor.trim() || null,
    tomOriginal: form.tomOriginal || null,
    conteudoCifrado: form.conteudoCifrado,
    observacoes: form.observacoes.trim() || null,
    categorias: splitValues(form.categorias),
    tags: splitValues(form.tags),
    momentosLiturgicos: existing?.momentosLiturgicos ?? [],
    estilo: existing?.estilo ?? [],
    origemTipo: existing?.origemTipo ?? 'manual',
    driveFileId: existing?.driveFileId ?? null,
    arquivoNome: existing?.arquivoNome ?? null,
    licencaOuPermissao: existing?.licencaOuPermissao ?? null,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof MusicRepositoryError) return error.message;
  return 'Não foi possível concluir a operação. Verifique sua conexão e tente novamente.';
}

export const LibraryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [musics, setMusics] = useState<MusicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedKey, setSelectedKey] = useState('Todos');
  const [form, setForm] = useState<MusicForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMusic, setEditingMusic] = useState<MusicRecord | null>(null);
  const [importDraft, setImportDraft] = useState<ImportMusicDraft | null>(null);
  const [viewingMusic, setViewingMusic] = useState<MusicRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMusics = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setMusics([]);
      setLoading(false);
      setError('Entre na sua conta para acessar suas músicas.');
      return;
    }

    setLoading(true);
    setError(null);
    setMusics([]);
    try {
      setMusics(await listMusics());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    void loadMusics();
  }, [loadMusics]);

  useEffect(() => {
    const state = location.state;
    const draft = typeof state === 'object' && state !== null && 'importDraft' in state
      ? state.importDraft
      : null;
    if (!isImportMusicDraft(draft)) return;

    try {
      validateExtractedText(draft.content, draft.format);
      setImportDraft(draft);
      setEditingMusic(null);
      setForm({ ...emptyForm, conteudoCifrado: draft.content });
      setFormOpen(true);
      setError(null);
    } catch (draftError) {
      setError(errorMessage(draftError));
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.key, location.pathname, location.state, navigate]);

  const categories = useMemo(
    () => ['Todas', ...Array.from(new Set(musics.flatMap((music) => music.categorias))).sort((a, b) => a.localeCompare(b))],
    [musics],
  );
  const keys = useMemo(
    () => ['Todos', ...Array.from(new Set(musics.map((music) => music.tomOriginal).filter((key): key is string => Boolean(key)))).sort()],
    [musics],
  );

  const musicSearchIndex = useMemo(() => createMusicSearchIndex(musics), [musics]);
  const filteredMusics = useMemo(() => {
    const term = normalizeMusicSearchText(searchTerm);
    return musicSearchIndex.filter(({ music, normalizedFields }) => {
      const matchesSearch = !term || normalizedFields.some((field) => field.includes(term));
      const matchesCategory = selectedCategory === 'Todas' || music.categorias.includes(selectedCategory);
      const matchesKey = selectedKey === 'Todos' || music.tomOriginal === selectedKey;
      return matchesSearch && matchesCategory && matchesKey;
    }).map(({ music }) => music);
  }, [musicSearchIndex, searchTerm, selectedCategory, selectedKey]);

  const openCreate = () => {
    setImportDraft(null);
    setEditingMusic(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError(null);
  };

  const openEdit = (music: MusicRecord) => {
    setImportDraft(null);
    setEditingMusic(music);
    setForm(formFromMusic(music));
    setFormOpen(true);
    setError(null);
    setViewingMusic(null);
  };

  const closeForm = () => {
    if (importDraft) {
      navigate('/importar', { state: { importDraft } });
      return;
    }
    setEditingMusic(null);
    setForm(emptyForm);
    setFormOpen(false);
    setError(null);
  };

  const openDetails = async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const music = await getMusicById(id);
      if (!music) {
        setError('Essa música não foi encontrada. Atualize a lista e tente novamente.');
        await loadMusics();
        return;
      }
      setViewingMusic(music);
    } catch (detailError) {
      setError(errorMessage(detailError));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const baseInput = inputFromForm(form, editingMusic ?? undefined);
      const input = importDraft
        ? { ...baseInput, origemTipo: 'upload_local' as const, arquivoNome: importDraft.fileName, driveFileId: null }
        : baseInput;
      if (editingMusic) {
        await updateMusic(editingMusic.id, input);
        setNotice('Música atualizada.');
      } else {
        await createMusic(input);
        setNotice(importDraft ? 'Música importada e salva na sua biblioteca.' : 'Música salva na sua biblioteca.');
      }
      setImportDraft(null);
      setEditingMusic(null);
      setForm(emptyForm);
      setFormOpen(false);
      await loadMusics();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (music: MusicRecord) => {
    if (!window.confirm(`Excluir “${music.titulo}” da sua biblioteca? Essa ação não pode ser desfeita.`)) return;
    setDeletingId(music.id);
    setError(null);
    try {
      await deleteMusic(music.id);
      setMusics((current) => current.filter((item) => item.id !== music.id));
      if (viewingMusic?.id === music.id) setViewingMusic(null);
      setNotice('Música excluída.');
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MusicIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Biblioteca de Músicas</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Suas músicas salvas na nuvem, privadas para sua conta.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/importar" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Importar Arquivo
          </Link>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            <span>Nova Música</span>
          </button>
        </div>
      </div>

      {error && <div role="alert" className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
      {notice && <div role="status" className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 text-sm">{notice}</div>}

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" aria-label="Pesquisar músicas" placeholder="Pesquisar título, artista, tag, letra ou cifra..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:inline" />
            <label htmlFor="music-key" className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Tom:</label>
            <select id="music-key" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm">
              {keys.map((key) => <option key={key} value={key}>{key === 'Todos' ? 'Todos os Tons' : `Tom ${key}`}</option>)}
            </select>
          </div>
        </div>
        {categories.length > 1 && <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Categorias">
          {categories.map((category) => <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${selectedCategory === category ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{category}</button>)}
        </div>}
      </div>

      {loading && <div role="status" aria-busy="true" className="py-16 text-center text-sm text-slate-500">Carregando suas músicas…</div>}
      {!loading && !error && musics.length === 0 && <div className="py-16 px-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
        <MusicIcon className="w-8 h-8 mx-auto text-slate-400" />
        <h2 className="mt-3 font-semibold text-slate-800 dark:text-slate-100">Sua biblioteca está vazia</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Adicione uma música para começar. Nenhuma música de exemplo é exibida como persistida.</p>
        <button type="button" onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"><Plus className="w-4 h-4" />Nova Música</button>
      </div>}
      {!loading && !error && musics.length > 0 && filteredMusics.length === 0 && <p role="status" className="py-10 text-center text-sm text-slate-500">Nenhuma música corresponde aos filtros.</p>}

      {!loading && filteredMusics.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMusics.map((music) => <article key={music.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-sm transition-all flex flex-col justify-between group">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="font-bold text-base text-slate-900 dark:text-slate-100">{music.titulo}</h2><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{music.artista || 'Artista não informado'}</p></div>
              {music.tomOriginal && <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-mono font-bold">Tom {music.tomOriginal}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {music.categorias.map((category) => <span key={category} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">{category}</span>)}
              {music.tags.map((tag) => <span key={tag} className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium flex items-center gap-1"><Tag className="w-2.5 h-2.5" />{tag}</span>)}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => openEdit(music)} aria-label={`Editar ${music.titulo}`} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200">Editar</button>
              <button type="button" onClick={() => void handleDelete(music)} disabled={deletingId === music.id} aria-label={`Excluir ${music.titulo}`} className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/palco" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"><Mic2 className="w-3.5 h-3.5" /><span>Palco</span></Link>
              <button type="button" onClick={() => void openDetails(music.id)} disabled={detailLoading} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300">Ver Cifra</button>
            </div>
          </div>
        </article>)}
      </div>}

      {detailLoading && <div role="status" className="fixed inset-0 z-40 grid place-items-center bg-black/30"><div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-xl">Carregando música…</div></div>}

      {formOpen && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closeForm(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="music-form-title" className="my-8 w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl">
          <div className="flex items-center justify-between gap-3"><div><h2 id="music-form-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingMusic ? 'Editar música' : 'Nova música'}</h2>{importDraft && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Conteúdo importado de {importDraft.fileName}; revise os dados antes de salvar.</p>}</div><button type="button" onClick={closeForm} disabled={saving} aria-label={importDraft ? 'Voltar à prévia' : 'Fechar'} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button></div>
          <form onSubmit={(event) => void handleSave(event)} className="mt-5 space-y-4">
            {error && <div role="alert" className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 text-sm">{error}</div>}
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Título <span className="text-rose-500">*</span><input required maxLength={200} value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" /></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Artista<input maxLength={200} value={form.artista} onChange={(event) => setForm({ ...form, artista: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" /></label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Compositor<input maxLength={200} value={form.compositor} onChange={(event) => setForm({ ...form, compositor: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" /></label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tom original<input maxLength={12} value={form.tomOriginal} onChange={(event) => setForm({ ...form, tomOriginal: event.target.value })} placeholder="Ex.: C, F#m, Bb" className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" /></label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Categorias <span className="text-xs font-normal text-slate-500">separadas por vírgula</span><input maxLength={1000} value={form.categorias} onChange={(event) => setForm({ ...form, categorias: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" /></label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tags <span className="text-xs font-normal text-slate-500">separadas por vírgula</span><input maxLength={2000} value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" /></label>
            </div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Observações <span className="text-xs font-normal text-slate-500">opcional, até 5.000 caracteres</span><textarea maxLength={5000} rows={4} value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" /></label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Conteúdo/cifra <span className="text-rose-500">*</span><textarea required maxLength={800000} rows={12} value={form.conteudoCifrado} onChange={(event) => setForm({ ...form, conteudoCifrado: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono" /></label>
            <div className="flex justify-end gap-2 pt-2"><button type="button" disabled={saving} onClick={closeForm} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{importDraft ? 'Voltar à prévia' : 'Cancelar'}</button><button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm font-semibold text-white">{saving ? 'Salvando…' : 'Salvar música'}</button></div>
          </form>
        </section>
      </div>}

      {viewingMusic && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingMusic(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="music-detail-title" className="my-8 w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 id="music-detail-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">{viewingMusic.titulo}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">{viewingMusic.artista && <span>Intérprete: {viewingMusic.artista}</span>}{viewingMusic.compositor && <span>Compositor: {viewingMusic.compositor}</span>}{viewingMusic.tomOriginal && <span>Tom: {viewingMusic.tomOriginal}</span>}</div>{(viewingMusic.categorias.length > 0 || viewingMusic.tags.length > 0) && <div className="mt-3 flex flex-wrap gap-1.5">{viewingMusic.categorias.map((category) => <span key={category} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">{category}</span>)}{viewingMusic.tags.map((tag) => <span key={tag} className="rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-xs text-indigo-600 dark:text-indigo-400">{tag}</span>)}</div>}</div><button type="button" onClick={() => setViewingMusic(null)} aria-label="Fechar cifra" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button></div>
          <pre className="mt-5 max-h-[65vh] overflow-auto whitespace-pre rounded-xl bg-slate-50 dark:bg-slate-950 p-4 text-sm font-mono leading-relaxed text-slate-800 dark:text-slate-100">{viewingMusic.conteudoCifrado}</pre>
          {viewingMusic.observacoes?.trim() && <section className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4"><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Observações</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">{viewingMusic.observacoes}</p></section>}
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => openEdit(viewingMusic)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-semibold">Editar</button><button type="button" onClick={() => setViewingMusic(null)} className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-sm font-semibold text-white">Fechar</button></div>
        </section>
      </div>}
    </div>
  );
};
