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
  duplicatePlaylist: vi.fn(),
  getPlaylistById: vi.fn(),
  listPlaylists: vi.fn(),
  listMusics: vi.fn(),
  removeMusicFromPlaylist: vi.fn(),
  reorderPlaylistItems: vi.fn(),
  updatePlaylist: vi.fn(),
  updatePlaylistItemKey: vi.fn(),
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
  duplicatePlaylist: mocks.duplicatePlaylist,
  getPlaylistById: mocks.getPlaylistById,
  listPlaylists: mocks.listPlaylists,
  removeMusicFromPlaylist: mocks.removeMusicFromPlaylist,
  reorderPlaylistItems: mocks.reorderPlaylistItems,
  updatePlaylist: mocks.updatePlaylist,
  updatePlaylistItemKey: mocks.updatePlaylistItemKey,
  PlaylistRepositoryError: class PlaylistRepositoryError extends Error {},
}));

const timestamp = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));
const playlist: PlaylistRecord = {
  id: 'playlist-1', nome: 'Repertório real', tipo: 'manual', createdAt: timestamp, updatedAt: timestamp,
};
const detail: PlaylistDetails = { ...playlist, itens: [] };
const song: MusicRecord = {
  id: 'song-1', titulo: 'Canção salva', artista: 'Artista', tomOriginal: 'G', conteudoCifrado: 'C\nLetra',
  categorias: [], tags: [], momentosLiturgicos: [], estilo: [], origemTipo: 'manual', driveFileId: null,
  arquivoNome: null, licencaOuPermissao: null, createdAt: timestamp, updatedAt: timestamp,
};
const detailWithSong: PlaylistDetails = {
  ...playlist,
  itens: [{ id: song.id, musicaId: song.id, posicao: 1, momento: 'Entrada', tomPersonalizado: null }],
};
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => { resolve = complete; });
  return { promise, resolve };
};
const renderPage = () => render(<MemoryRouter><PlaylistsPage /></MemoryRouter>);

describe('PlaylistsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPlaylists.mockResolvedValue([]);
    mocks.listMusics.mockResolvedValue([]);
    mocks.getPlaylistById.mockResolvedValue(detail);
    mocks.createPlaylist.mockResolvedValue('playlist-1');
    mocks.duplicatePlaylist.mockResolvedValue('playlist-copy');
    mocks.updatePlaylist.mockResolvedValue(undefined);
    mocks.updatePlaylistItemKey.mockResolvedValue(undefined);
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

  it.each(['adding', 'removing', 'reordering', 'saving a personalized key'] as const)(
    'keeps the playlist dialog open while %s and permits closing after completion',
    async (operation) => {
      const completion = deferred();
      const songs = operation === 'adding'
        ? [song]
        : [song, { ...song, id: 'song-2', titulo: 'Canção dois' }];
      const playlistDetails: PlaylistDetails = operation === 'adding'
        ? detail
        : operation === 'reordering'
          ? {
            ...playlist,
            itens: [
              { id: song.id, musicaId: song.id, posicao: 1, momento: null, tomPersonalizado: null },
              { id: 'song-2', musicaId: 'song-2', posicao: 2, momento: null, tomPersonalizado: null },
            ],
          }
          : detailWithSong;
      mocks.listPlaylists.mockResolvedValue([playlist]);
      mocks.listMusics.mockResolvedValue(songs);
      mocks.getPlaylistById.mockResolvedValue(playlistDetails);
      if (operation === 'adding') mocks.addMusicToPlaylist.mockReturnValue(completion.promise);
      if (operation === 'removing') mocks.removeMusicFromPlaylist.mockReturnValue(completion.promise);
      if (operation === 'reordering') mocks.reorderPlaylistItems.mockReturnValue(completion.promise);
      if (operation === 'saving a personalized key') mocks.updatePlaylistItemKey.mockReturnValue(completion.promise);

      renderPage();
      await screen.findByText('Repertório real');
      fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
      const dialog = await screen.findByRole('dialog', { name: 'Repertório real' });
      if (operation === 'adding') {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar' }));
      } else if (operation === 'removing') {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Remover Canção salva' }));
      } else if (operation === 'reordering') {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Mover Canção salva para baixo' }));
      } else {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Editar tom personalizado de Canção salva' }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar tom' }));
      }

      const closeButton = within(dialog).getByRole('button', { name: 'Fechar playlist' });
      await waitFor(() => expect(closeButton).toBeDisabled());
      fireEvent.click(closeButton);
      fireEvent.mouseDown(dialog.parentElement!);
      expect(screen.getByRole('dialog', { name: 'Repertório real' })).toBeInTheDocument();

      completion.resolve();
      await waitFor(() => expect(closeButton).toBeEnabled());
      expect(screen.getByRole('dialog', { name: 'Repertório real' })).toBeInTheDocument();
      fireEvent.click(closeButton);
      expect(screen.queryByRole('dialog', { name: 'Repertório real' })).not.toBeInTheDocument();
    },
  );

  it('closes the playlist dialog normally when no mutation is in progress', async () => {
    mocks.listPlaylists.mockResolvedValue([playlist]);
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
    const dialog = await screen.findByRole('dialog', { name: 'Repertório real' });
    const closeButton = within(dialog).getByRole('button', { name: 'Fechar playlist' });

    expect(closeButton).toBeEnabled();
    fireEvent.click(closeButton);
    expect(screen.queryByRole('dialog', { name: 'Repertório real' })).not.toBeInTheDocument();
  });

  it('shows a missing library reference and can remove it without deleting music', async () => {
    const orphanedDetail: PlaylistDetails = {
      ...detailWithSong,
      itens: [{ ...detailWithSong.itens[0], musicaId: 'deleted-song', id: 'deleted-song' }],
    };
    mocks.listPlaylists.mockResolvedValue([playlist]);
    mocks.listMusics.mockResolvedValue([]);
    mocks.getPlaylistById.mockResolvedValue(orphanedDetail);
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
    const dialog = await screen.findByRole('dialog', { name: 'Repertório real' });

    expect(within(dialog).getByText('Música não encontrada na biblioteca')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remover deleted-song' }));

    await waitFor(() => expect(mocks.removeMusicFromPlaylist).toHaveBeenCalledWith('playlist-1', 'deleted-song'));
    expect(mocks.listMusics).toHaveBeenCalledTimes(1);
  });

  it('drags songs to the first and last positions while preserving item and library data', async () => {
    const songs: MusicRecord[] = [
      song,
      { ...song, id: 'song-2', titulo: 'Canção dois', tomOriginal: 'A' },
      { ...song, id: 'song-3', titulo: 'Canção três', tomOriginal: 'E' },
    ];
    let storedPlaylist: PlaylistDetails = {
      ...playlist,
      itens: [
        { id: 'song-1', musicaId: 'song-1', posicao: 1, momento: 'Entrada', tomPersonalizado: 'D' },
        { id: 'song-2', musicaId: 'song-2', posicao: 2, momento: 'Comunhão', tomPersonalizado: null },
        { id: 'song-3', musicaId: 'song-3', posicao: 3, momento: null, tomPersonalizado: 'F#m' },
      ],
    };
    mocks.listPlaylists.mockResolvedValue([playlist]);
    mocks.listMusics.mockResolvedValue(songs);
    mocks.getPlaylistById.mockImplementation(async () => storedPlaylist);
    mocks.reorderPlaylistItems.mockImplementation(async (_playlistId: string, orderedIds: string[]) => {
      storedPlaylist = {
        ...storedPlaylist,
        itens: orderedIds.map((id, index) => ({
          ...storedPlaylist.itens.find((item) => item.musicaId === id)!,
          posicao: index + 1,
        })),
      };
    });
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
    const dialog = await screen.findByRole('dialog', { name: 'Repertório real' });
    const getTitles = () => within(dialog).getAllByRole('listitem')
      .map((item) => item.querySelector('p.font-semibold')?.textContent);
    const drag = (sourceId: string, targetId: string) => {
      const dataTransfer = {
        effectAllowed: 'none',
        dropEffect: 'none',
        setData: vi.fn(),
      };
      fireEvent.dragStart(within(dialog).getByRole('button', { name: `Arrastar ${songs.find((entry) => entry.id === sourceId)?.titulo} para reordenar` }), { dataTransfer });
      fireEvent.dragOver(within(dialog).getAllByRole('listitem').find((item) => item.textContent?.includes(songs.find((entry) => entry.id === targetId)?.titulo ?? ''))!, { dataTransfer });
      fireEvent.drop(within(dialog).getAllByRole('listitem').find((item) => item.textContent?.includes(songs.find((entry) => entry.id === targetId)?.titulo ?? ''))!, { dataTransfer });
    };

    expect(getTitles()).toEqual(['Canção salva', 'Canção dois', 'Canção três']);
    drag('song-3', 'song-1');
    await waitFor(() => expect(mocks.reorderPlaylistItems).toHaveBeenNthCalledWith(1, 'playlist-1', ['song-3', 'song-1', 'song-2']));
    await waitFor(() => expect(getTitles()).toEqual(['Canção três', 'Canção salva', 'Canção dois']));
    expect(storedPlaylist.itens[0]).toMatchObject({ posicao: 1, momento: null, tomPersonalizado: 'F#m' });
    expect(storedPlaylist.itens[1]).toMatchObject({ posicao: 2, momento: 'Entrada', tomPersonalizado: 'D' });

    drag('song-3', 'song-2');
    await waitFor(() => expect(mocks.reorderPlaylistItems).toHaveBeenNthCalledWith(2, 'playlist-1', ['song-1', 'song-2', 'song-3']));
    await waitFor(() => expect(getTitles()).toEqual(['Canção salva', 'Canção dois', 'Canção três']));
    expect(storedPlaylist.itens.map(({ musicaId, posicao }) => [musicaId, posicao]))
      .toEqual([['song-1', 1], ['song-2', 2], ['song-3', 3]]);
    expect(storedPlaylist.itens[0]).toMatchObject({ momento: 'Entrada', tomPersonalizado: 'D' });
    expect(storedPlaylist.itens[2]).toMatchObject({ momento: null, tomPersonalizado: 'F#m' });

    fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Arrastar Canção salva para reordenar' }), { key: 'ArrowDown' });
    await waitFor(() => expect(mocks.reorderPlaylistItems).toHaveBeenNthCalledWith(3, 'playlist-1', ['song-2', 'song-1', 'song-3']));
    await waitFor(() => expect(getTitles()).toEqual(['Canção dois', 'Canção salva', 'Canção três']));

    expect(mocks.listMusics).toHaveBeenCalledTimes(1);
    expect(songs.map(({ id, tomOriginal }) => [id, tomOriginal]))
      .toEqual([['song-1', 'G'], ['song-2', 'A'], ['song-3', 'E']]);
  });

  it('keeps the accessible move buttons and reverts optimistic order after a persistence failure', async () => {
    const songs: MusicRecord[] = [
      song,
      { ...song, id: 'song-2', titulo: 'Canção dois' },
    ];
    const twoSongPlaylist: PlaylistDetails = {
      ...playlist,
      itens: [
        { id: 'song-1', musicaId: 'song-1', posicao: 1, momento: 'Entrada', tomPersonalizado: 'D' },
        { id: 'song-2', musicaId: 'song-2', posicao: 2, momento: null, tomPersonalizado: null },
      ],
    };
    mocks.listPlaylists.mockResolvedValue([playlist]);
    mocks.listMusics.mockResolvedValue(songs);
    mocks.getPlaylistById.mockResolvedValue(twoSongPlaylist);
    let rejectReorder: ((error: Error) => void) | undefined;
    mocks.reorderPlaylistItems.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
      rejectReorder = reject;
    }));
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
    const dialog = await screen.findByRole('dialog', { name: 'Repertório real' });
    const getTitles = () => within(dialog).getAllByRole('listitem')
      .map((item) => item.querySelector('p.font-semibold')?.textContent);

    const moveDown = within(dialog).getByRole('button', { name: 'Mover Canção salva para baixo' });
    fireEvent.click(moveDown);
    expect(moveDown).toBeDisabled();
    expect(getTitles()).toEqual(['Canção dois', 'Canção salva']);
    fireEvent.click(moveDown);
    expect(mocks.reorderPlaylistItems).toHaveBeenCalledTimes(1);
    expect(mocks.reorderPlaylistItems).toHaveBeenCalledWith('playlist-1', ['song-2', 'song-1']);

    rejectReorder?.(new Error('offline'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a operação. Verifique sua conexão e tente novamente.');
    await waitFor(() => expect(getTitles()).toEqual(['Canção salva', 'Canção dois']));
  });

  it('duplicates a playlist, refreshes the list, and prevents repeated clicks', async () => {
    const copy: PlaylistRecord = { ...playlist, id: 'playlist-copy', nome: 'Repertório real (cópia)' };
    mocks.listPlaylists
      .mockResolvedValueOnce([playlist])
      .mockResolvedValueOnce([copy, playlist]);
    let finishDuplicate: (() => void) | undefined;
    mocks.duplicatePlaylist.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishDuplicate = resolve;
    }));
    renderPage();
    await screen.findByText('Repertório real');
    const duplicateButton = screen.getByRole('button', { name: 'Duplicar Repertório real' });
    fireEvent.click(duplicateButton);
    expect(duplicateButton).toBeDisabled();
    fireEvent.click(duplicateButton);
    expect(mocks.duplicatePlaylist).toHaveBeenCalledTimes(1);

    finishDuplicate?.();
    await waitFor(() => expect(mocks.duplicatePlaylist).toHaveBeenCalledWith('playlist-1'));
    expect(await screen.findByRole('status')).toHaveTextContent('Playlist duplicada.');
    expect(await screen.findByText('Repertório real (cópia)')).toBeInTheDocument();
  });

  it('shows a persistence error when duplicating a playlist fails', async () => {
    mocks.listPlaylists.mockResolvedValue([playlist]);
    mocks.duplicatePlaylist.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Duplicar Repertório real' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a operação. Verifique sua conexão e tente novamente.');
  });

  it('saves a personalized key and reloads it without changing the library key', async () => {
    const updatedDetail: PlaylistDetails = {
      ...detailWithSong,
      itens: [{ ...detailWithSong.itens[0], tomPersonalizado: 'D' }],
    };
    mocks.listPlaylists.mockResolvedValue([playlist]);
    mocks.listMusics.mockResolvedValue([song]);
    mocks.getPlaylistById.mockResolvedValueOnce(detailWithSong).mockResolvedValueOnce(updatedDetail);
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
    const dialog = await screen.findByRole('dialog', { name: 'Repertório real' });
    expect(within(dialog).getByText('Tom original: G')).toBeInTheDocument();
    expect(within(dialog).getByText('Tom personalizado: Não definido')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Editar tom personalizado de Canção salva' }));
    fireEvent.change(within(dialog).getByLabelText('Tom personalizado para Canção salva'), { target: { value: 'D' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar tom' }));

    await waitFor(() => expect(mocks.updatePlaylistItemKey).toHaveBeenCalledWith('playlist-1', 'song-1', 'D'));
    expect(await within(dialog).findByText('Tom personalizado salvo.')).toBeInTheDocument();
    expect(within(dialog).getByText('Tom original: G')).toBeInTheDocument();
    expect(within(dialog).getByText('Tom personalizado: D')).toBeInTheDocument();
    expect(mocks.listMusics).toHaveBeenCalledTimes(1);
    expect(song.tomOriginal).toBe('G');
  });

  it('clears a saved personalized key without altering the music record', async () => {
    const detailWithCustomKey: PlaylistDetails = {
      ...detailWithSong,
      itens: [{ ...detailWithSong.itens[0], tomPersonalizado: 'D' }],
    };
    const clearedDetail: PlaylistDetails = {
      ...detailWithSong,
      itens: [{ ...detailWithSong.itens[0], tomPersonalizado: null }],
    };
    mocks.listPlaylists.mockResolvedValue([playlist]);
    mocks.listMusics.mockResolvedValue([song]);
    mocks.getPlaylistById.mockResolvedValueOnce(detailWithCustomKey).mockResolvedValueOnce(clearedDetail);
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
    const dialog = await screen.findByRole('dialog', { name: 'Repertório real' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Editar tom personalizado de Canção salva' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Limpar tom' }));

    await waitFor(() => expect(mocks.updatePlaylistItemKey).toHaveBeenCalledWith('playlist-1', 'song-1', ''));
    expect(await within(dialog).findByText('Tom personalizado: Não definido')).toBeInTheDocument();
    expect(song.tomOriginal).toBe('G');
  });

  it('keeps the personalized key editor open and reports a persistence failure', async () => {
    mocks.listPlaylists.mockResolvedValue([playlist]);
    mocks.listMusics.mockResolvedValue([song]);
    mocks.getPlaylistById.mockResolvedValue(detailWithSong);
    mocks.updatePlaylistItemKey.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
    const dialog = await screen.findByRole('dialog', { name: 'Repertório real' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Editar tom personalizado de Canção salva' }));
    const input = within(dialog).getByLabelText('Tom personalizado para Canção salva');
    fireEvent.change(input, { target: { value: 'F#m' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar tom' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Não foi possível concluir a operação. Verifique sua conexão e tente novamente.');
    expect(within(dialog).getByLabelText('Tom personalizado para Canção salva')).toHaveValue('F#m');
  });

  it('edits the name and type of a saved playlist', async () => {
    mocks.listPlaylists
      .mockResolvedValueOnce([playlist])
      .mockResolvedValueOnce([{ ...playlist, nome: 'Novo nome', tipo: 'igreja' }]);
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Editar Repertório real' }));
    expect(await screen.findByRole('dialog', { name: 'Editar playlist' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: 'Novo nome' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'igreja' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mocks.updatePlaylist).toHaveBeenCalledWith('playlist-1', { nome: 'Novo nome', tipo: 'igreja' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Playlist atualizada.');
    expect(await screen.findByText('Novo nome')).toBeInTheDocument();
    expect(within(screen.getByRole('article')).getByText('Modo Igreja')).toBeInTheDocument();
  });

  it('cancels playlist editing without saving', async () => {
    mocks.listPlaylists.mockResolvedValue([playlist]);
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Editar Repertório real' }));
    fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: 'Alteração descartada' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'barzinho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mocks.updatePlaylist).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Editar playlist' })).not.toBeInTheDocument();
  });

  it('requires a playlist name and surfaces update failures', async () => {
    mocks.listPlaylists.mockResolvedValue([playlist]);
    mocks.updatePlaylist.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Editar Repertório real' }));
    fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: '' } });
    expect(screen.getByLabelText(/Nome/)).toBeRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(mocks.updatePlaylist).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: 'Nome atualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    const editDialog = screen.getByRole('dialog', { name: 'Editar playlist' });
    await waitFor(() => expect(within(editDialog).getByRole('alert')).toHaveTextContent('Não foi possível concluir a operação. Verifique sua conexão e tente novamente.'));
    expect(screen.getByLabelText(/Nome/)).toHaveValue('Nome atualizado');
    expect(mocks.updatePlaylist).toHaveBeenCalledWith('playlist-1', { nome: 'Nome atualizado', tipo: 'manual' });
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
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('As músicas permanecerão na Biblioteca.'));
  });

  it('shows removal persistence errors in the playlist dialog', async () => {
    mocks.listPlaylists.mockResolvedValue([playlist]);
    mocks.listMusics.mockResolvedValue([song]);
    mocks.getPlaylistById.mockResolvedValue(detailWithSong);
    mocks.removeMusicFromPlaylist.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    await screen.findByText('Repertório real');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Repertório real' }));
    const dialog = await screen.findByRole('dialog', { name: 'Repertório real' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remover Canção salva' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Não foi possível concluir a operação. Verifique sua conexão e tente novamente.');
  });
});
