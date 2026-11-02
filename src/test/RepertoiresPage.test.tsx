import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepertoiresPage } from '../features/repertoires/RepertoiresPage';
import type { RepertoireRecord } from '../services/repertoireRepository';

const mocks = vi.hoisted(() => ({
  user: { uid: 'test-user' }, listRepertoires: vi.fn(), createRepertoire: vi.fn(), renameRepertoire: vi.fn(),
  deleteRepertoire: vi.fn(), getRepertoireById: vi.fn(), addMusicToRepertoire: vi.fn(),
  removeMusicFromRepertoire: vi.fn(), reorderRepertoireItems: vi.fn(), listMusics: vi.fn(),
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock('../services/musicRepository', () => ({ listMusics: mocks.listMusics }));
vi.mock('../services/repertoireRepository', () => ({
  listRepertoires: mocks.listRepertoires, createRepertoire: mocks.createRepertoire,
  renameRepertoire: mocks.renameRepertoire, deleteRepertoire: mocks.deleteRepertoire,
  getRepertoireById: mocks.getRepertoireById, addMusicToRepertoire: mocks.addMusicToRepertoire,
  removeMusicFromRepertoire: mocks.removeMusicFromRepertoire, reorderRepertoireItems: mocks.reorderRepertoireItems,
  RepertoireRepositoryError: class RepertoireRepositoryError extends Error {},
}));
const timestamp = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));
const row: RepertoireRecord = { id: 'set-1', nome: 'Celebração', tipo: 'igreja', parametrosGeracao: null, createdAt: timestamp, updatedAt: timestamp };

describe('RepertoiresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.listRepertoires.mockResolvedValue([]); mocks.listMusics.mockResolvedValue([]);
    mocks.createRepertoire.mockResolvedValue('set-1'); mocks.renameRepertoire.mockResolvedValue(undefined);
    mocks.deleteRepertoire.mockResolvedValue(undefined); mocks.getRepertoireById.mockResolvedValue({ ...row, itens: [] });
    mocks.addMusicToRepertoire.mockResolvedValue(undefined); mocks.removeMusicFromRepertoire.mockResolvedValue(undefined);
    mocks.reorderRepertoireItems.mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());
  it('shows an empty real-data state without sample songs', async () => {
    render(<RepertoiresPage />);
    expect(await screen.findByText('Você ainda não tem repertórios salvos.')).toBeInTheDocument();
    expect(screen.queryByText('O Sol')).not.toBeInTheDocument();
  });
  it('creates only after explicit user submission and opens empty state via the list on refresh', async () => {
    render(<RepertoiresPage />);
    fireEvent.change(screen.getByLabelText('Nome do repertório'), { target: { value: 'Domingo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    await waitFor(() => expect(mocks.createRepertoire).toHaveBeenCalledWith({ nome: 'Domingo', tipo: 'igreja', parametrosGeracao: null }));
    expect(await screen.findByText('Você ainda não tem repertórios salvos.')).toBeInTheDocument();
  });
  it('opens a saved repertory, adds a library song and handles rename and deletion', async () => {
    mocks.listRepertoires.mockResolvedValue([row]);
    mocks.listMusics.mockResolvedValue([{ id: 'song-1', titulo: 'Canção salva', artista: null }]);
    render(<RepertoiresPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));
    await screen.findByRole('dialog', { name: 'Celebração' });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(mocks.addMusicToRepertoire).toHaveBeenCalledWith('set-1', 'song-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar repertório' }));
    fireEvent.click(screen.getByRole('button', { name: 'Renomear' }));
    fireEvent.change(screen.getByLabelText('Nome do repertório'), { target: { value: 'Novo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.renameRepertoire).toHaveBeenCalledWith('set-1', 'Novo'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(mocks.deleteRepertoire).toHaveBeenCalledWith('set-1'));
  });
  it('shows errors loading repertories', async () => {
    mocks.listRepertoires.mockRejectedValueOnce(new Error('offline'));
    render(<RepertoiresPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a operação. Verifique sua conexão e tente novamente.');
  });
  it('reorders and removes saved songs, and shows persistence failures', async () => {
    mocks.listRepertoires.mockResolvedValue([row]);
    mocks.listMusics.mockResolvedValue([{ id: 'song-1', titulo: 'Uma' }, { id: 'song-2', titulo: 'Duas' }]);
    mocks.getRepertoireById.mockResolvedValue({ ...row, itens: [
      { id: 'song-1', musicaId: 'song-1', posicao: 1, momento: null, tomPersonalizado: null },
      { id: 'song-2', musicaId: 'song-2', posicao: 2, momento: null, tomPersonalizado: null },
    ] });
    mocks.reorderRepertoireItems.mockRejectedValueOnce(new Error('offline'));
    render(<RepertoiresPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));
    await screen.findByRole('dialog', { name: 'Celebração' });
    fireEvent.click(screen.getByRole('button', { name: 'Mover Duas para cima' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(mocks.reorderRepertoireItems).toHaveBeenCalledWith('set-1', ['song-2', 'song-1']));
    fireEvent.click(screen.getByRole('button', { name: 'Remover Uma' }));
    await waitFor(() => expect(mocks.removeMusicFromRepertoire).toHaveBeenCalledWith('set-1', 'song-1'));
  });
});
