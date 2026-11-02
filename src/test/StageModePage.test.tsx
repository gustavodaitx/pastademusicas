import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StageModePage } from '../features/stage-mode/StageModePage';

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'stage-user' }, loading: false }) }));

describe('StageModePage', () => {
  beforeEach(() => localStorage.clear());

  it('does not present a hard-coded song and points to the real library', () => {
    render(<MemoryRouter><StageModePage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Nenhuma música selecionada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir Biblioteca' })).toHaveAttribute('href', '/biblioteca');
    expect(screen.queryByText('Como Zaqueu (Entra na Minha Casa)')).not.toBeInTheDocument();
  });

  it('loads and stores stage preferences in a UID-scoped local cache', () => {
    localStorage.setItem('pasta_de_musica_font_size:stage-user', '30');
    localStorage.setItem('pasta_de_musica_scroll_speed:stage-user', '6');
    render(<MemoryRouter><StageModePage /></MemoryRouter>);
    expect(screen.getByText('30px')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar fonte' }));
    expect(localStorage.getItem('pasta_de_musica_font_size:stage-user')).toBe('32');
  });
});
