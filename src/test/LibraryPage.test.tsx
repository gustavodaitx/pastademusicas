import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryPage } from '../features/library/LibraryPage';
import type { ImportMusicDraft } from '../features/import-music/importMusicDraft';
import type { MusicRecord } from '../services/musicRepository';

const mocks = vi.hoisted(() => ({
  user: { uid: 'test-user' },
  createMusic: vi.fn(),
  deleteMusic: vi.fn(),
  getMusicById: vi.fn(),
  listMusics: vi.fn(),
  updateMusic: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, loading: false }),
}));

vi.mock('../services/musicRepository', () => ({
  createMusic: mocks.createMusic,
  deleteMusic: mocks.deleteMusic,
  getMusicById: mocks.getMusicById,
  listMusics: mocks.listMusics,
  updateMusic: mocks.updateMusic,
  MusicRepositoryError: class MusicRepositoryError extends Error {},
}));

const music: MusicRecord = {
  id: 'song-1',
  titulo: 'Canção persistida',
  artista: 'Artista real',
  tomOriginal: 'G',
  conteudoCifrado: 'G\nLetra e cifra salvas',
  categorias: ['MPB'],
  tags: ['Acústico'],
  momentosLiturgicos: [],
  estilo: ['Lenta'],
  origemTipo: 'manual',
  driveFileId: null,
  arquivoNome: null,
  licencaOuPermissao: null,
  createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
  updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
};

const renderPage = () => render(<MemoryRouter><LibraryPage /></MemoryRouter>);
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
};

describe('LibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMusics.mockResolvedValue([]);
    mocks.getMusicById.mockResolvedValue(music);
    mocks.createMusic.mockResolvedValue('new-song');
    mocks.updateMusic.mockResolvedValue(undefined);
    mocks.deleteMusic.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows a clear empty state instead of sample songs', async () => {
    renderPage();

    expect(await screen.findByText('Sua biblioteca está vazia')).toBeInTheDocument();
    expect(screen.queryByText('Como Zaqueu (Entra na Minha Casa)')).not.toBeInTheDocument();
  });

  it('shows a clear error when the saved music list cannot be loaded', async () => {
    mocks.listMusics.mockRejectedValueOnce(new Error('offline'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a operação. Verifique sua conexão e tente novamente.');
    expect(screen.queryByText('Sua biblioteca está vazia')).not.toBeInTheDocument();
  });

  it('loads persisted songs and fetches the selected song by ID', async () => {
    mocks.listMusics.mockResolvedValue([music]);
    renderPage();

    expect(await screen.findByText('Canção persistida')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Cifra' }));

    const detailDialog = await screen.findByRole('dialog', { name: 'Canção persistida' });
    expect(detailDialog.querySelector('pre')?.textContent).toBe('G\nLetra e cifra salvas');
    expect(detailDialog).not.toHaveTextContent('Compositor:');
    expect(detailDialog).not.toHaveTextContent('Observações');
    expect(mocks.getMusicById).toHaveBeenCalledWith('song-1');
  });

  it('displays whitespace and line breaks literally in the scrollable cipher preview', async () => {
    const content = '  C\tG   Am/F#  \n\nCanção    e música   ';
    mocks.listMusics.mockResolvedValue([{ ...music, conteudoCifrado: content }]);
    mocks.getMusicById.mockResolvedValue({ ...music, conteudoCifrado: content });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Ver Cifra' }));
    const cipher = await screen.findByText((_, element) => element?.tagName === 'PRE' && element.textContent === content);

    expect(cipher.textContent).toBe(content);
    expect(cipher).toHaveClass('whitespace-pre', 'overflow-auto', 'font-mono');
  });

  it('shows optional composer and notes, while omitting them for legacy songs', async () => {
    const songWithNotes = { ...music, id: 'song-with-notes', compositor: 'Compositora Áurea', observacoes: 'Introdução\nAndamento moderado' };
    mocks.listMusics.mockResolvedValue([songWithNotes, music]);
    mocks.getMusicById.mockResolvedValue(songWithNotes);
    renderPage();

    await screen.findAllByText('Canção persistida');
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver Cifra' })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Canção persistida' });
    expect(dialog).toHaveTextContent('Compositora Áurea');
    expect(dialog).toHaveTextContent('Introdução');
    expect(dialog.querySelector('pre')?.textContent).toBe('G\nLetra e cifra salvas');
    expect(dialog).not.toHaveTextContent('null');
    expect(dialog).not.toHaveTextContent('undefined');
  });

  it('edits optional fields and keeps entered values after a save failure', async () => {
    mocks.listMusics.mockResolvedValue([music]);
    mocks.updateMusic.mockRejectedValueOnce(new Error('offline'));
    renderPage();

    await screen.findByText('Canção persistida');
    fireEvent.click(screen.getByRole('button', { name: 'Editar Canção persistida' }));
    fireEvent.change(screen.getByLabelText(/Compositor/), { target: { value: '  João Ávila  ' } });
    fireEvent.change(screen.getByLabelText(/Observações/), { target: { value: 'Introdução\n  Crescendo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    await waitFor(() => expect(mocks.updateMusic).toHaveBeenCalledOnce());
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.getByLabelText(/Compositor/)).toHaveValue('  João Ávila  ');
    expect(screen.getByLabelText(/Observações/)).toHaveValue('Introdução\n  Crescendo');
    expect(mocks.updateMusic).toHaveBeenCalledWith('song-1', expect.objectContaining({
      compositor: 'João Ávila',
      observacoes: 'Introdução\n  Crescendo',
      licencaOuPermissao: null,
    }));
  });

  it('combines normalized content search with the existing key and category filters', async () => {
    mocks.listMusics.mockResolvedValue([
      { ...music, titulo: 'Canção de teste', conteudoCifrado: '   G#m7\nLÉT-RA azul', tomOriginal: 'G#m', categorias: ['MPB'] },
      { ...music, id: 'other', titulo: 'Outra', conteudoCifrado: 'C\nOutra letra', tomOriginal: 'C', categorias: ['Rock'] },
    ]);
    renderPage();

    await screen.findByText('Canção de teste');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  let-ra   AZUL ' } });
    fireEvent.change(screen.getByLabelText('Tom:'), { target: { value: 'G#m' } });
    fireEvent.click(screen.getByRole('button', { name: 'MPB' }));

    expect(screen.getByText('Canção de teste')).toBeInTheDocument();
    expect(screen.queryByText('Outra')).not.toBeInTheDocument();
  });

  it('requires explicit submission before creating a music document', async () => {
    renderPage();
    await screen.findByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);

    expect(screen.getByRole('dialog', { name: 'Nova música' })).toBeInTheDocument();
    expect(mocks.createMusic).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Nova canção' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nConteúdo escrito pelo usuário' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'Nova canção',
      conteudoCifrado: 'C\nConteúdo escrito pelo usuário',
      origemTipo: 'manual',
    }), expect.anything()));
    expect(await screen.findByRole('status')).toHaveTextContent('Música salva na sua biblioteca.');
  });

  it('closes the form after confirmed save without waiting for the list refresh', async () => {
    const refresh = deferred<MusicRecord[]>();
    mocks.listMusics.mockResolvedValueOnce([]).mockReturnValueOnce(refresh.promise);
    renderPage();
    await screen.findByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Salva antes da recarga' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Música salva na sua biblioteca.')).toBeInTheDocument();
    await act(async () => refresh.resolve([]));
  });

it('releases the submission lock after 20 seconds without confirmation, closes the form, and preserves data for recovery', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let resolveSave: (id: string) => void = () => undefined;
    mocks.createMusic.mockReturnValueOnce(new Promise<string>((resolve) => { resolveSave = resolve; }));
    renderPage();
    await act(async () => {});
    screen.getByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Salva com atraso' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await act(async () => {});

    expect(screen.getByRole('button', { name: /Salvando/ })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(20000); });
    await act(async () => {});
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('demorando para ser confirmado');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nova Música' })).toHaveLength(1);

    await act(async () => { resolveSave('delayed-song'); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not keep the modal frozen when the auxiliary library refresh is slow after a confirmed save', async () => {
    const refresh = deferred<MusicRecord[]>();
    mocks.listMusics.mockResolvedValueOnce([]).mockReturnValueOnce(refresh.promise);
    renderPage();
    await screen.findByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Salva com recarga lenta' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledOnce());
    expect(await screen.findByText('Música salva na sua biblioteca.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await act(async () => refresh.resolve([]));
  });

  it('does not keep the modal frozen when the auxiliary library refresh fails after a confirmed save', async () => {
    mocks.listMusics.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('offline'));
    renderPage();
    await screen.findByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Salva com recarga com falha' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    expect(await screen.findByText('Música salva na sua biblioteca.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.createMusic).toHaveBeenCalledOnce();
  });

  it('keeps the form data and releases the lock after a real save failure', async () => {
    mocks.createMusic.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    await screen.findByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Falha real' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra preservada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Salvar música' })).not.toBeDisabled();
    expect(screen.queryByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Título/)).toHaveValue('Falha real');
    expect(screen.getByLabelText(/Conteúdo\/cifra/)).toHaveValue('C\nLetra preservada');
    expect(screen.getByRole('button', { name: 'Salvar música' })).toBeEnabled();
  });

  it('does not reopen the import form when the effect reruns with a changed location.key and the same draft', async () => {
    const draft: ImportMusicDraft = { content: 'C\nConteúdo importado', fileName: 'Canção.docx', format: 'docx' };
    function ReimportButton({ target }: { target: ImportMusicDraft }) {
      const navigate = useNavigate();
      return <button onClick={() => navigate('/biblioteca?import=1', { replace: true, state: { importDraft: target } })}>Reimportar rascunho</button>;
    }
    render(
      <MemoryRouter initialEntries={[{ pathname: '/biblioteca', state: { importDraft: draft } }]}>
        <ReimportButton target={draft} />
        <LibraryPage />
      </MemoryRouter>,
    );
    await screen.findByRole('dialog', { name: 'Nova música' });
    expect(screen.getByLabelText(/Conteúdo\/cifra/)).toHaveValue('C\nConteúdo importado');

    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Canção importada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await screen.findByText('Música importada e salva na sua biblioteca.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reimportar rascunho' }));
    await act(async () => {});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the form for a new import when the file name repeats but the content differs', async () => {
    const draftA: ImportMusicDraft = { content: 'C\nPrimeira', fileName: 'Canção.docx', format: 'docx' };
    const draftB: ImportMusicDraft = { content: 'C\nSegunda', fileName: 'Canção.docx', format: 'docx' };
    function ReimportButton({ target }: { target: ImportMusicDraft }) {
      const navigate = useNavigate();
      return <button onClick={() => navigate('/biblioteca?import=2', { replace: true, state: { importDraft: target } })}>Reimportar rascunho</button>;
    }
    render(
      <MemoryRouter initialEntries={[{ pathname: '/biblioteca', state: { importDraft: draftA } }]}>
        <ReimportButton target={draftB} />
        <LibraryPage />
      </MemoryRouter>,
    );
    await screen.findByRole('dialog', { name: 'Nova música' });
    expect(screen.getByLabelText(/Conteúdo\/cifra/)).toHaveValue('C\nPrimeira');

    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Canção A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await screen.findByText('Música importada e salva na sua biblioteca.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reimportar rascunho' }));
    await screen.findByRole('dialog', { name: 'Nova música' });
    expect(screen.getByLabelText(/Conteúdo\/cifra/)).toHaveValue('C\nSegunda');
  });

  it('updates an existing saved song from the edit form', async () => {
    mocks.listMusics.mockResolvedValue([music]);
    renderPage();
    await screen.findByText('Canção persistida');

    fireEvent.click(screen.getByRole('button', { name: 'Editar Canção persistida' }));
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Canção revisada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    await waitFor(() => expect(mocks.updateMusic).toHaveBeenCalledWith('song-1', expect.objectContaining({ titulo: 'Canção revisada' })));
    expect(await screen.findByRole('status')).toHaveTextContent('Música atualizada.');
  });

  it('confirms deletion and removes the song from the visible list after success', async () => {
    mocks.listMusics.mockResolvedValue([music]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    await screen.findByText('Canção persistida');
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Canção persistida' }));

    await waitFor(() => expect(mocks.deleteMusic).toHaveBeenCalledWith('song-1'));
    await waitFor(() => expect(screen.queryByText('Canção persistida')).not.toBeInTheDocument());
  });

  it('reutiliza o mesmo document id na retentativa após timeout, criando apenas um documento', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const receivedIds: (string | undefined)[] = [];
    mocks.createMusic.mockImplementation(async (_input, options?) => {
      receivedIds.push(options?.documentId);
      if (receivedIds.length === 1) {
        return new Promise(() => undefined);
      }
      return options?.documentId ?? 'auto';
    });
    renderPage();
    await act(async () => {});
    await screen.findByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Canção única' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(1));

    act(() => { vi.advanceTimersByTime(20000); });
    await act(async () => {});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(2));

    expect(receivedIds).toHaveLength(2);
    expect(receivedIds[0]).toMatch(/^m-/);
    expect(receivedIds[1]).toBe(receivedIds[0]);
  });

  it('allows retry after a definitive save failure and keeps form data', async () => {
    mocks.createMusic.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    await screen.findByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Falha e retry' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra preservada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Salvar música' })).not.toBeDisabled();
    expect(screen.queryByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Título/)).toHaveValue('Falha e retry');
    expect(screen.getByLabelText(/Conteúdo\/cifra/)).toHaveValue('C\nLetra preservada');

    mocks.createMusic.mockResolvedValueOnce('retry-ok');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(2));
    await screen.findByText('Música salva na sua biblioteca.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('allows retry with the same document id after a failed first attempt', async () => {
    const receivedIds: string[] = [];
    let attempt = 0;
    mocks.createMusic.mockImplementation(async (_input, options?) => {
      attempt += 1;
      receivedIds.push(options?.documentId ?? 'auto');
      if (attempt === 1) {
        throw new Error('offline');
      }
      return options?.documentId ?? 'auto-' + attempt;
    });
    renderPage();
    await screen.findByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Mesmo ID após falha' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(1));
    expect(mocks.createMusic).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ documentId: expect.stringMatching(/^m-/) }));
    expect(await screen.findByRole('button', { name: 'Salvar música' })).not.toBeDisabled();
    expect(screen.getByLabelText(/Título/)).toHaveValue('Mesmo ID após falha');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(2));
    await screen.findByText('Música salva na sua biblioteca.');

    expect(receivedIds).toHaveLength(2);
    expect(receivedIds[0]).toBe(receivedIds[1]);
  });

  it('gera identificadores distintos para músicas novas consecutivas', async () => {
    const receivedIds: (string | undefined)[] = [];
    mocks.createMusic.mockImplementation(async (_input, options?) => {
      receivedIds.push(options?.documentId);
      return options?.documentId ?? 'auto';
    });
    renderPage();
    await screen.findByText('Sua biblioteca está vazia');

    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Primeira' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(1));
    await screen.findByText('Música salva na sua biblioteca.');

    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Segunda' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'G\nLetra B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(2));

    expect(receivedIds).toHaveLength(2);
    expect(receivedIds[0]).toMatch(/^m-/);
    expect(receivedIds[1]).toMatch(/^m-/);
    expect(receivedIds[1]).not.toBe(receivedIds[0]);
  });

  it('não sobrescreve a música anterior quando o conteúdo é idêntico', async () => {
    const receivedIds: (string | undefined)[] = [];
    mocks.createMusic.mockImplementation(async (_input, options?) => {
      receivedIds.push(options?.documentId);
      return options?.documentId ?? 'auto';
    });
    renderPage();
    await screen.findByText('Sua biblioteca está vazia');

    const saveIdentical = async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
      fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Igual' } });
      fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nMesma cifra' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    };

    await saveIdentical();
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(1));
    await screen.findByText('Música salva na sua biblioteca.');

    await saveIdentical();
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(2));

    expect(receivedIds).toHaveLength(2);
    expect(receivedIds[0]).toMatch(/^m-/);
    expect(receivedIds[1]).not.toBe(receivedIds[0]);
  });

  it('gera um novo identificador ao cancelar o formulário após uma falha', async () => {
    const receivedIds: (string | undefined)[] = [];
    mocks.createMusic.mockImplementation(async (_input, options?) => {
      receivedIds.push(options?.documentId);
      if (receivedIds.length === 1) {
        throw new Error('offline');
      }
      return options?.documentId ?? 'auto';
    });
    renderPage();
    await screen.findByText('Sua biblioteca está vazia');

    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Cancelar e refazer' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Refeito' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(2));

    expect(receivedIds).toHaveLength(2);
    expect(receivedIds[1]).not.toBe(receivedIds[0]);
  });

  it('não reaproveita o identificador de um cadastro pendente ao editar outra música', async () => {
    mocks.listMusics.mockResolvedValue([music]);
    mocks.createMusic.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    await screen.findByText('Canção persistida');

    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Cadastro pendente' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nPendente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Editar Canção persistida' }));
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Canção revisada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    await waitFor(() => expect(mocks.updateMusic).toHaveBeenCalledWith('song-1', expect.objectContaining({ titulo: 'Canção revisada' })));
    expect(mocks.createMusic).toHaveBeenCalledTimes(1);
  });

  it('atualiza a biblioteca quando a confirmação tardia chega após o timeout sem reabrir o formulário', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let resolveSave: (id: string) => void = () => undefined;
    mocks.createMusic.mockReturnValueOnce(new Promise<string>((resolve) => { resolveSave = resolve; }));
    renderPage();
    await act(async () => {});
    await screen.findByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Salva com atraso' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await act(async () => {});

    expect(screen.getByRole('button', { name: /Salvando/ })).toBeDisabled();

    await act(async () => { vi.advanceTimersByTime(20000); });
    await act(async () => {});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('demorando para ser confirmado');

    await act(async () => { resolveSave('delayed-song'); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.listMusics).toHaveBeenCalledTimes(2));
  });

  it('reutiliza o mesmo id na repetição da mesma operação após timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const receivedIds: (string | undefined)[] = [];
    mocks.createMusic.mockImplementation(async (_input, options?) => {
      receivedIds.push(options?.documentId);
      if (receivedIds.length === 1) {
        return new Promise(() => undefined);
      }
      return options?.documentId ?? 'auto';
    });
    renderPage();
    await act(async () => {});
    await screen.findByText('Sua biblioteca está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Retry mesmo id' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nLetra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(1));

    act(() => { vi.advanceTimersByTime(20000); });
    await act(async () => {});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    await screen.findByRole('dialog', { name: 'Nova música' });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(2));

    expect(receivedIds).toHaveLength(2);
    expect(receivedIds[0]).toMatch(/^m-/);
    expect(receivedIds[1]).toBe(receivedIds[0]);
  });

  it('confirmação tardia de operação antiga não interfere em novo cadastro', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const receivedIds: (string | undefined)[] = [];
    let resolveSave: (id: string) => void = () => undefined;
    mocks.createMusic.mockImplementation(async (_input, options?) => {
      receivedIds.push(options?.documentId);
      if (receivedIds.length === 1) {
        return new Promise<string>((resolve) => { resolveSave = resolve; });
      }
      return options?.documentId ?? 'auto-new';
    });
    renderPage();
    await act(async () => {});
    await screen.findByText('Sua biblioteca está vazia');

    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Operação antiga' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'C\nAntiga' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(1));
    act(() => { vi.advanceTimersByTime(20000); });
    await act(async () => {});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const oldId = receivedIds[0];

    await act(async () => { resolveSave('old-song'); });
    await act(async () => {});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Nova Música' })[0]);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Nova operação' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo\/cifra/), { target: { value: 'G\nNova' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));
    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledTimes(2));

    expect(receivedIds).toHaveLength(2);
    expect(receivedIds[1]).toMatch(/^m-/);
    expect(receivedIds[1]).not.toBe(oldId);
  });
});
