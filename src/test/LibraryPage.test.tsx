import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryPage } from '../features/library/LibraryPage';
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

describe('LibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMusics.mockResolvedValue([]);
    mocks.getMusicById.mockResolvedValue(music);
    mocks.createMusic.mockResolvedValue('new-song');
    mocks.updateMusic.mockResolvedValue(undefined);
    mocks.deleteMusic.mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

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
    })));
    expect(await screen.findByRole('status')).toHaveTextContent('Música salva na sua biblioteca.');
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
});
