import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChurchModePage } from '../features/church-mode/ChurchModePage';
import { MOMENTOS_IGREJA } from '../types/firestore';
import type { MomentoIgrejaV1, MomentoIgrejaV2 } from '../types/firestore';

const mocks = vi.hoisted(() => ({
  listMusics: vi.fn(),
  listPlaylists: vi.fn(),
  getChurchPlaylist: vi.fn(),
  createChurchPlaylistV2: vi.fn(),
  updateChurchMoment: vi.fn(),
  user: { uid: 'church-user' },
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock('../services/musicRepository', () => ({
  listMusics: mocks.listMusics,
  MusicRepositoryError: class MusicRepositoryError extends Error {},
}));
vi.mock('../services/playlistRepository', () => ({
  createChurchPlaylistV2: mocks.createChurchPlaylistV2,
  getChurchPlaylist: mocks.getChurchPlaylist,
  listPlaylists: mocks.listPlaylists,
  updateChurchMoment: mocks.updateChurchMoment,
  PlaylistRepositoryError: class PlaylistRepositoryError extends Error {},
}));

const catalogSong = {
  id: 'catalog-song',
  titulo: 'Canção catalogada',
  artista: null,
  tomOriginal: 'G',
  conteudoCifrado: 'G',
  categorias: [],
  tags: [],
  momentosLiturgicos: ['Entrada'],
  estilo: [],
  origemTipo: 'manual' as const,
  driveFileId: null,
  arquivoNome: null,
  licencaOuPermissao: null,
  createdAt: {} as never,
  updatedAt: {} as never,
};

function emptyMomentsV1(): MomentoIgrejaV1[] {
  return MOMENTOS_IGREJA.map(({ id }) => ({ momentoId: id, musicaId: null, tomPersonalizado: null }));
}

function emptyMomentsV2(): MomentoIgrejaV2[] {
  return MOMENTOS_IGREJA.map(({ id }) => ({ momentoId: id, referenciaMusical: null, tomPersonalizado: null }));
}

function openedPlaylist(version: 1 | 2, moments: MomentoIgrejaV1[] | MomentoIgrejaV2[]) {
  mocks.getChurchPlaylist.mockResolvedValue({
    kind: 'structured',
    playlist: {
      id: `playlist-v${version}`,
      nome: `Celebração v${version}`,
      tipo: 'igreja',
      versaoEstrutura: version,
      momentosIgreja: moments,
    },
  });
}

async function openSavedPlaylist() {
  render(<MemoryRouter><ChurchModePage /></MemoryRouter>);
  const picker = await screen.findByLabelText('Abrir playlist salva:');
  fireEvent.change(picker, { target: { value: 'playlist-to-open' } });
  await waitFor(() => expect(mocks.getChurchPlaylist).toHaveBeenCalledWith('playlist-to-open'));
  await screen.findByText('Playlist litúrgica aberta para edição.');
}

describe('ChurchModePage structured playlist editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMusics.mockResolvedValue([catalogSong]);
    mocks.listPlaylists.mockResolvedValue([{ id: 'playlist-to-open', nome: 'Celebração salva', tipo: 'igreja' }]);
    mocks.updateChurchMoment.mockResolvedValue(undefined);
    mocks.createChurchPlaylistV2.mockResolvedValue('new-playlist');
  });

  it('opens and edits a v1 playlist while preserving its version and untouched moments', async () => {
    const moments: MomentoIgrejaV1[] = emptyMomentsV1();
    moments[1] = { ...moments[1], musicaId: 'catalog-song', tomPersonalizado: 'D' };
    moments[9] = { ...moments[9], musicaId: 'legacy-orphan-id', tomPersonalizado: null };
    openedPlaylist(1, moments);
    await openSavedPlaylist();

    fireEvent.change(screen.getByLabelText('Música para Entrada'), { target: { value: 'catalog-song' } });
    fireEvent.click(screen.getByRole('button', { name: /Atualizar Playlist/ }));

    await waitFor(() => expect(mocks.updateChurchMoment).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('option', { name: /legacy-orphan-id/ })).toBeInTheDocument();
    expect(mocks.updateChurchMoment).toHaveBeenCalledWith('playlist-to-open', 'entrada', {
      versaoEstrutura: 1,
      musicaId: 'catalog-song',
      tomPersonalizado: 'G',
    });
  });

  it('keeps an orphan v2 reference when another moment is edited', async () => {
    const moments = emptyMomentsV2();
    moments[0] = { ...moments[0], referenciaMusical: { musicaId: 'orphan-song-id' } };
    openedPlaylist(2, moments);
    await openSavedPlaylist();

    expect(screen.getByRole('option', { name: /orphan-song-id/ })).toBeInTheDocument();
    expect(screen.getByText(/Referência histórica não encontrada/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Perdão|PerdÃ£o/), { target: { value: 'catalog-song' } });
    fireEvent.click(screen.getByRole('button', { name: /Atualizar Playlist/ }));

    await waitFor(() => expect(mocks.updateChurchMoment).toHaveBeenCalledTimes(1));
    expect(mocks.updateChurchMoment).toHaveBeenCalledWith('playlist-to-open', 'perdao', {
      versaoEstrutura: 2,
      referenciaMusical: { musicaId: 'catalog-song' },
      tomPersonalizado: 'G',
    });
    expect(mocks.updateChurchMoment).not.toHaveBeenCalledWith('playlist-to-open', 'entrada', expect.anything());
    expect(screen.getByRole('option', { name: /orphan-song-id/ })).toBeInTheDocument();
  });

  it('removes an orphan v2 reference only after the user explicitly removes it', async () => {
    const moments = emptyMomentsV2();
    moments[0] = { ...moments[0], referenciaMusical: { musicaId: 'orphan-song-id' } };
    openedPlaylist(2, moments);
    await openSavedPlaylist();

    fireEvent.click(screen.getByRole('button', { name: /Remover música de Entrada/ }));
    fireEvent.click(screen.getByRole('button', { name: /Atualizar Playlist/ }));

    await waitFor(() => expect(mocks.updateChurchMoment).toHaveBeenCalledWith('playlist-to-open', 'entrada', {
      versaoEstrutura: 2,
      referenciaMusical: null,
      tomPersonalizado: null,
    }));
  });

  it('replaces an orphan v2 reference with a catalog song', async () => {
    const moments = emptyMomentsV2();
    moments[0] = { ...moments[0], referenciaMusical: { musicaId: 'orphan-song-id' } };
    openedPlaylist(2, moments);
    await openSavedPlaylist();

    fireEvent.change(screen.getByLabelText('Música para Entrada'), { target: { value: 'catalog-song' } });
    fireEvent.click(screen.getByRole('button', { name: /Atualizar Playlist/ }));

    await waitFor(() => expect(mocks.updateChurchMoment).toHaveBeenCalledWith('playlist-to-open', 'entrada', {
      versaoEstrutura: 2,
      referenciaMusical: { musicaId: 'catalog-song' },
      tomPersonalizado: 'G',
    }));
  });
});
