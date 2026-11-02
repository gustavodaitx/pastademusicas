import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaylistsPage } from '../features/playlists/PlaylistsPage';
import type { PlaylistDetails, PlaylistRecord } from '../services/playlistRepository';
import type { MusicRecord } from '../services/musicRepository';

const mocks = vi.hoisted(() => ({
  user: { uid: 'test-user' },
  addMusicToPlaylist: vi.fn(),
  createPlaylist: vi.fn(),
  deletePlaylist: vi.fn(),
  getPlaylistById: vi.fn(),
  listPlaylists: vi.fn(),
  listMusics: vi.fn(),
  removeMusicFromPlaylist: vi.fn(),
  renamePlaylist: vi.fn(),
  reorderPlaylistItems: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock('../services/musicRepository', () => ({
  listMusics: mocks.listMusics,
  MusicRepositoryError: class MusicRepositoryError extends Error {},
}));
vi.mock('../services/playlistRepository', () => ({
  addMusicToPlaylist: mocks.addMusicToPlaylist,
  createPlaylist: mocks.createPlaylist,
  deletePlaylist: mocks.deletePlaylist,
  getPlaylistById: mocks.getPlaylistById,
  listPlaylists: mocks.listPlaylists,
  removeMusicFromPlaylist: mocks.removeMusicFromPlaylist,
  renamePlaylist: mocks.renamePlaylist,
  reorderPlaylistItems: mocks.reorderPlaylistItems,
  PlaylistRepositoryError: class PlaylistRepositoryError extends Error {},
}));

const timestamp = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));
const playlist: PlaylistRecord = {
  id: 'playlist-1', nome: 'Repertório real', tipo: 'manual', createdAt: timestamp, updatedAt: timestamp,
};
const detail: PlaylistDetails = { ...playlist, itens: [] };
const song: MusicRecord = {
  id: 'song-1', titulo: 'Canção salva', artista: 'Artista', tomOriginal: 'C', conteudoCifrado: 'C\nLetra',
  categorias: [], tags: [], momentosLiturgicos: [], estilo: [], origemTipo: 'manual', driveFileId: null,
  arquivoNome: null, licencaOuPermissao: null, createdAt: timestamp, updatedAt: timestamp,
};
const detailWithSong: PlaylistDetails = {
  ...playlist,
  itens: [{ id: song.id, musicaId: song.id, posicao: 1, momento: null, tomPersonalizado: null }],
};
const renderPage = () => render(<MemoryRouter><PlaylistsPage /></MemoryRouter>);

describe('PlaylistsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPlaylists.mockResolvedValue([]);
    mocks.listMusics.mockResolvedValue([]);
    mocks.getPlaylistById.mockResolvedValue(detail);
    mocks.createPlaylist.mockResolvedValue('playlist-1');
    mocks.renamePlaylist.mockResolvedValue(undefined);
    mocks.deletePlaylist.mockResolvedValue(undefined);
    mocks.addMusicToPlaylist.mockResolvedValue(undefined);
    mocks.removeMusicFromPlaylist.mockResolvedValue(undefined);
    mocks.reorderPlaylistItems.mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the empty state and no sample playlists', async () => {
    renderPage();
    expect(await screen.findByText('Você ainda não tem playlists')).toBeInTheDocument();
    expect(screen.queryByText('Missa 28º Domingo do Tempo Comum')).not.toBeInTheDocument();
  });

  it('surfaces a list loading error', async () => {
    mocks.listPlaylists.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a operação. Verifique sua conexão e tente novamente.');
    expect(screen.queryByText('Você ainda não tem playlists')).not.toBeInTheDocument();
  });

  it('creates only after explicit form submission and opens the saved playlist', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Criar playlist' }));
    expect(mocks.createPlaylist).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: 'Ensaio de sábado' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Criar playlist' }));

    await waitFor(() => expect(mocks.createPlaylist).toHaveBeenCalledWith({ nome: 'Ensaio de sábado', tipo: 'manual' }));
    expect(await screen.findByRole('dialog', { name: 'Repertório real' })).toBeInTheDocument();
    expect(screen.getByText('Esta playlist ainda está vazia.')).toBeInTheDocument();
  });

  it('adds an existing library song from playlist details', async () => {
    mocks.listPlaylists.mockResolvedValue([playlist]);
    mocks.listMusics.mockResolvedValue([song]);
    mocks.getPlaylistById.mockResolvedValueOnce(detail).mockResolvedValueOnce(detailWithSong);
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
    await screen.findByRole('dialog', { name: 'Repertório real' });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(mocks.addMusicToPlaylist).toHaveBeenCalledWith('playlist-1', 'song-1'));
    expect(await screen.findByText('Canção salva')).toBeInTheDocument();
  });

  it('renames a saved playlist', async () => {
    mocks.listPlaylists.mockResolvedValue([playlist]);
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Renomear Repertório real' }));
    fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: 'Novo nome' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));

    await waitFor(() => expect(mocks.renamePlaylist).toHaveBeenCalledWith('playlist-1', 'Novo nome'));
    expect(await screen.findByRole('status')).toHaveTextContent('Playlist renomeada.');
  });

  it('asks before deleting a playlist', async () => {
    mocks.listPlaylists.mockResolvedValue([playlist]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
    await screen.findByRole('dialog', { name: 'Repertório real' });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir playlist' }));

    await waitFor(() => expect(mocks.deletePlaylist).toHaveBeenCalledWith('playlist-1'));
  });
});
