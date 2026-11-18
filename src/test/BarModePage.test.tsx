import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarModePage } from '../features/bar-mode/BarModePage';
import type { MusicRecord } from '../services/musicRepository';

const mocks = vi.hoisted(() => ({
  listMusics: vi.fn(),
  createPlaylistWithItems: vi.fn(),
  user: { uid: 'bar-user' } as { uid: string } | null,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, loading: false }),
}));

vi.mock('../services/musicRepository', () => ({
  listMusics: mocks.listMusics,
  MusicRepositoryError: class MusicRepositoryError extends Error {},
}));

vi.mock('../services/playlistRepository', () => ({
  createPlaylistWithItems: mocks.createPlaylistWithItems,
  PlaylistRepositoryError: class PlaylistRepositoryError extends Error {},
}));

function createFakeSong(overrides: Partial<MusicRecord>): MusicRecord {
  return {
    id: overrides.id || 'song-id',
    titulo: overrides.titulo || 'Música Teste',
    artista: overrides.artista !== undefined ? overrides.artista : 'Artista Teste',
    tomOriginal: overrides.tomOriginal || 'G',
    conteudoCifrado: overrides.conteudoCifrado || 'G C D',
    categorias: overrides.categorias || [],
    tags: overrides.tags || [],
    momentosLiturgicos: overrides.momentosLiturgicos || [],
    estilo: overrides.estilo || ['Pop/Rock'],
    origemTipo: 'manual',
    driveFileId: null,
    arquivoNome: null,
    licencaOuPermissao: null,
    createdAt: {} as never,
    updatedAt: {} as never,
  };
}

describe('BarModePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { uid: 'bar-user' };
  });

  it('renders initial elements, control parameters and anti-hallucination note', async () => {
    mocks.listMusics.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <BarModePage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Modo Barzinho — Gerador de Repertório/i)).toBeInTheDocument();
    expect(screen.getByText(/Parâmetros de Geração/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estilo Musical:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Músicas no Show:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferência de Tom:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Alternar ritmos/i)).toBeInTheDocument();
    expect(
      screen.getByText(/O gerador seleciona apenas músicas reais disponíveis em seu catálogo pessoal/i),
    ).toBeInTheDocument();
  });

  it('informs unauthenticated users to log in', async () => {
    mocks.user = null;

    render(
      <MemoryRouter>
        <BarModePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Entre na sua conta para acessar o Modo Barzinho.'),
    ).toBeInTheDocument();
  });

  it('displays empty library warning when user has no songs', async () => {
    mocks.listMusics.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <BarModePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Sua biblioteca está vazia. Cadastre músicas antes de gerar o repertório./i),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Nenhuma música encontrada com os filtros atuais./i),
    ).toBeInTheDocument();
  });

  it('generates setlist from user catalog and shows warning when fewer songs than requested', async () => {
    const songs = [
      createFakeSong({ id: 's1', titulo: 'Balada Romântica', tags: ['lenta'], tomOriginal: 'C' }),
      createFakeSong({ id: 's2', titulo: 'Rock Enérgico', tags: ['animada'], tomOriginal: 'D' }),
      createFakeSong({ id: 's3', titulo: 'MPB Suave', tags: ['lenta'], tomOriginal: 'G' }),
    ];
    mocks.listMusics.mockResolvedValue(songs);

    render(
      <MemoryRouter>
        <BarModePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Balada Romântica')).toBeInTheDocument();
    });

    expect(screen.getByText('Rock Enérgico')).toBeInTheDocument();
    expect(screen.getByText('MPB Suave')).toBeInTheDocument();

    // Check warning because default requested quantity is 15 but only 3 exist
    expect(
      screen.getByText(/Foram encontradas apenas 3 músicas compatíveis com os filtros selecionados/i),
    ).toBeInTheDocument();

    // Check tempo badges
    expect(screen.getAllByText('Lenta').length).toBe(2);
    expect(screen.getAllByText('Animada').length).toBe(1);
  });

  it('allows removing an individual song from the generated preview', async () => {
    const songs = [
      createFakeSong({ id: 's1', titulo: 'Canção A', tags: ['animada'] }),
      createFakeSong({ id: 's2', titulo: 'Canção B', tags: ['lenta'] }),
    ];
    mocks.listMusics.mockResolvedValue(songs);

    render(
      <MemoryRouter>
        <BarModePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Canção A')).toBeInTheDocument();
      expect(screen.getByText('Canção B')).toBeInTheDocument();
    });

    const removeBtnA = screen.getByRole('button', { name: /Remover Canção A/i });
    fireEvent.click(removeBtnA);

    expect(screen.queryByText('Canção A')).not.toBeInTheDocument();
    expect(screen.getByText('Canção B')).toBeInTheDocument();
    expect(screen.getByText(/1 música selecionada/i)).toBeInTheDocument();
  });

  it('updates generation when parameters (style, tone, quantity, rhythm) change', async () => {
    const songs = [
      createFakeSong({ id: 's1', titulo: 'Sertanejo 1', estilo: ['Sertanejo'], tomOriginal: 'C' }),
      createFakeSong({ id: 's2', titulo: 'Rock 1', estilo: ['Rock'], tomOriginal: 'A' }),
      createFakeSong({ id: 's3', titulo: 'Sertanejo 2', estilo: ['Sertanejo'], tomOriginal: 'D' }),
    ];
    mocks.listMusics.mockResolvedValue(songs);

    render(
      <MemoryRouter>
        <BarModePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sertanejo 1')).toBeInTheDocument();
      expect(screen.getByText('Rock 1')).toBeInTheDocument();
    });

    // Change style filter to Sertanejo
    const styleSelect = screen.getByLabelText(/Estilo Musical:/i);
    fireEvent.change(styleSelect, { target: { value: 'Sertanejo' } });

    expect(screen.getByText('Sertanejo 1')).toBeInTheDocument();
    expect(screen.getByText('Sertanejo 2')).toBeInTheDocument();
    expect(screen.queryByText('Rock 1')).not.toBeInTheDocument();

    // Toggle rhythm alternation
    const rhythmCheckbox = screen.getByLabelText(/Alternar ritmos/i);
    fireEvent.click(rhythmCheckbox);

    // Change key preference
    const keySelect = screen.getByLabelText(/Preferência de Tom:/i);
    fireEvent.change(keySelect, { target: { value: 'graves' } });

    // Click Regenerar
    const regenBtn = screen.getByRole('button', { name: /Regenerar/i });
    fireEvent.click(regenBtn);

    expect(screen.getByText('Sertanejo 1')).toBeInTheDocument();
  });

  it('saves generated setlist as a playlist successfully', async () => {
    const songs = [
      createFakeSong({ id: 's1', titulo: 'Música 1' }),
      createFakeSong({ id: 's2', titulo: 'Música 2' }),
    ];
    mocks.listMusics.mockResolvedValue(songs);
    mocks.createPlaylistWithItems.mockResolvedValue('new-playlist-123');

    render(
      <MemoryRouter>
        <BarModePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Música 1')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Nome da playlist/i);
    fireEvent.change(nameInput, { target: { value: 'Especial Acústico' } });

    const saveBtn = screen.getByRole('button', { name: /Salvar como Playlist/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mocks.createPlaylistWithItems).toHaveBeenCalledWith({
        nome: 'Especial Acústico',
        tipo: 'barzinho',
        musicIds: ['s1', 's2'],
      });
    });

    expect(
      await screen.findByText(/Playlist "Especial Acústico" salva com sucesso com 2 músicas!/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir para Playlists/i })).toBeInTheDocument();
  });

  it('validates empty playlist name before saving', async () => {
    const songs = [createFakeSong({ id: 's1', titulo: 'Música 1' })];
    mocks.listMusics.mockResolvedValue(songs);

    render(
      <MemoryRouter>
        <BarModePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Música 1')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Nome da playlist/i);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    const saveBtn = screen.getByRole('button', { name: /Salvar como Playlist/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText('Informe o nome da playlist.')).toBeInTheDocument();
    expect(mocks.createPlaylistWithItems).not.toHaveBeenCalled();
  });

  it('shows error banner when save operation fails', async () => {
    const songs = [createFakeSong({ id: 's1', titulo: 'Música 1' })];
    mocks.listMusics.mockResolvedValue(songs);
    mocks.createPlaylistWithItems.mockRejectedValue(new Error('Erro de conexão com o banco'));

    render(
      <MemoryRouter>
        <BarModePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Música 1')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /Salvar como Playlist/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Não foi possível concluir a operação/i),
      ).toBeInTheDocument();
    });
  });
});
