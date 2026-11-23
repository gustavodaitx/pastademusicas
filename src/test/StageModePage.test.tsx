import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StageModePage } from '../features/stage-mode/StageModePage';
import { PlaylistRepositoryError } from '../services/playlistRepository';

const mocks = vi.hoisted(() => ({
  getMusicById: vi.fn(),
  listMusics: vi.fn(),
  getPlaylistById: vi.fn(),
  getChurchPlaylist: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'stage-user' }, loading: false }) }));
vi.mock('../services/musicRepository', () => ({
  getMusicById: mocks.getMusicById,
  listMusics: mocks.listMusics,
}));
vi.mock('../services/playlistRepository', () => ({
  getPlaylistById: mocks.getPlaylistById,
  getChurchPlaylist: mocks.getChurchPlaylist,
  PlaylistRepositoryError: class extends Error {
    constructor(message: string, readonly code: string) { super(message); }
  },
}));

const songs = [
  { id: 'song-1', titulo: 'Primeira', artista: 'Artista', tomOriginal: 'C', conteudoCifrado: 'C       G\nLetra  intacta' },
  { id: 'song-2', titulo: 'Segunda', artista: 'Artista', tomOriginal: 'D', conteudoCifrado: 'D       A\nOutra letra' },
];

function renderStage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/palco" element={<StageModePage />} /></Routes>
    </MemoryRouter>,
  );
}

describe('StageModePage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.getMusicById.mockImplementation(async (id: string) => songs.find((song) => song.id === id) ?? null);
    mocks.listMusics.mockResolvedValue(songs);
    mocks.getPlaylistById.mockResolvedValue(null);
    mocks.getChurchPlaylist.mockResolvedValue(null);
  });

  it('shows an empty state without fabricating a song', () => {
    renderStage('/palco');
    expect(screen.getByRole('heading', { name: 'Nenhuma música selecionada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir Biblioteca' })).toHaveAttribute('href', '/biblioteca');
  });

  it('loads an individual library song and preserves its displayed cipher', async () => {
    renderStage('/palco?musicaId=song-1');
    expect(await screen.findByRole('heading', { name: /Primeira/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Área da cifra').textContent).toBe('C       G\nLetra  intacta');
    expect(mocks.getMusicById).toHaveBeenCalledWith('song-1');
  });

  it('loads playlist songs in order and uses their custom execution key', async () => {
    mocks.getPlaylistById.mockResolvedValue({
      nome: 'Repertório',
      itens: [
        { musicaId: 'song-2', tomPersonalizado: 'E', momento: null },
        { musicaId: 'song-1', tomPersonalizado: null, momento: null },
      ],
    });
    renderStage('/palco?playlistId=list-1');

    expect(await screen.findByRole('heading', { name: 'Segunda' })).toBeInTheDocument();
    expect(screen.getByText(/Repertório \(1\/2\)/)).toBeInTheDocument();
    expect(screen.getByText('Tom: E')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Música anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima música' }));
    expect(await screen.findByRole('heading', { name: 'Primeira' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima música' })).toBeDisabled();
  });

  it('loads structured Church playlists through their dedicated repository contract', async () => {
    mocks.getPlaylistById.mockRejectedValue(new PlaylistRepositoryError('Structured playlist', 'structured-playlist'));
    mocks.getChurchPlaylist.mockResolvedValue({
      kind: 'structured',
      playlist: {
        nome: 'Celebração',
        momentosIgreja: [
          { momentoId: 'entrada', referenciaMusical: { musicaId: 'song-1' }, tomPersonalizado: 'D' },
          { momentoId: 'perdao', referenciaMusical: null, tomPersonalizado: null },
        ],
      },
    });

    renderStage('/palco?playlistId=church-1');
    expect(await screen.findByRole('heading', { name: /Primeira/ })).toBeInTheDocument();
    expect(screen.getByText('Tom: D')).toBeInTheDocument();
    expect(mocks.getChurchPlaylist).toHaveBeenCalledWith('church-1');
  });

  it('reports unavailable playlist references while preserving the playable order', async () => {
    mocks.getPlaylistById.mockResolvedValue({
      nome: 'Repertório',
      itens: [
        { musicaId: 'missing', tomPersonalizado: null, momento: null },
        { musicaId: 'song-1', tomPersonalizado: null, momento: null },
      ],
    });

    renderStage('/palco?playlistId=list-1');
    expect(await screen.findByRole('heading', { name: 'Primeira' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 música da playlist está indisponível');
    expect(screen.getByText(/Repertório \(1\/1\)/)).toBeInTheDocument();
  });

  it('resets the additional transposition and scroll position when changing songs', async () => {
    mocks.getPlaylistById.mockResolvedValue({
      nome: 'Repertório',
      itens: songs.map((song) => ({ musicaId: song.id, tomPersonalizado: null, momento: null })),
    });
    renderStage('/palco?playlistId=list-1');
    await screen.findByRole('heading', { name: 'Primeira' });

    fireEvent.click(screen.getByRole('button', { name: 'Subir meio tom' }));
    expect(screen.getByLabelText('Área da cifra').textContent).toContain('C#');
    const scrollArea = screen.getByLabelText('Área da cifra');
    Object.defineProperty(scrollArea, 'scrollTop', { configurable: true, writable: true, value: 240 });

    fireEvent.click(screen.getByRole('button', { name: 'Próxima música' }));
    await waitFor(() => expect(screen.getByLabelText('Área da cifra').textContent).toContain('D       A'));
    expect(screen.getByLabelText('Área da cifra').textContent).not.toContain('D#');
    expect(scrollArea.scrollTop).toBe(0);
  });

  it('cancels the active animation frame when moving to another playlist song', async () => {
    const requestFrame = vi.fn(() => 17);
    const cancelFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    mocks.getPlaylistById.mockResolvedValue({
      nome: 'Repertório',
      itens: songs.map((song) => ({ musicaId: song.id, tomPersonalizado: null, momento: null })),
    });
    renderStage('/palco?playlistId=list-1');
    await screen.findByRole('heading', { name: 'Primeira' });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar autoscroll' }));
    expect(await screen.findByRole('button', { name: 'Pausar autoscroll' })).toBeInTheDocument();
    expect(requestFrame).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima música' }));
    expect(await screen.findByRole('heading', { name: 'Segunda' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar autoscroll' })).toBeInTheDocument();
    expect(cancelFrame).toHaveBeenCalled();
    expect(requestFrame).toHaveBeenCalledOnce();
  });

  it('stores font and autoscroll preferences in a UID-scoped local cache', async () => {
    localStorage.setItem('pasta_de_musica_font_size:stage-user', '30');
    localStorage.setItem('pasta_de_musica_scroll_speed:stage-user', '6');
    renderStage('/palco?musicaId=song-1');
    await screen.findByRole('heading', { name: 'Primeira' });
    expect(screen.getByText('30px')).toBeInTheDocument();
    expect(screen.getByText('6', { selector: 'span' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar fonte' }));
    expect(localStorage.getItem('pasta_de_musica_font_size:stage-user')).toBe('32');
  });
});
