import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from '../features/settings/SettingsPage';

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(), getUserPreferences: vi.fn(), saveUserPreferences: vi.fn(), user: { uid: 'settings-user' },
}));
vi.mock('../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'system', resolvedTheme: 'light', setTheme: mocks.setTheme }) }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock('../services/preferencesRepository', () => ({
  DEFAULT_USER_PREFERENCES: { tema: 'sistema', tamanhoFonte: 18, velocidadeAutoscroll: 3 },
  getUserPreferences: mocks.getUserPreferences,
  saveUserPreferences: mocks.saveUserPreferences,
  PreferencesRepositoryError: class PreferencesRepositoryError extends Error {},
}));
const saved = { tema: 'claro' as const, tamanhoFonte: 18, velocidadeAutoscroll: 3, updatedAt: Timestamp.fromDate(new Date('2026-01-01')) };

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear();
    mocks.getUserPreferences.mockResolvedValue(saved);
    mocks.saveUserPreferences.mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('loads stored preferences, reflects theme locally and saves edited settings', async () => {
    render(<SettingsPage />);
    await screen.findByRole('button', { name: 'Salvar preferências' });
    expect(mocks.getUserPreferences).toHaveBeenCalledOnce();
    expect(mocks.setTheme).toHaveBeenCalledWith('light');
    fireEvent.change(screen.getByLabelText('Tamanho da fonte no Modo Palco'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Velocidade do autoscroll'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: /Tema Escuro/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }));
    await waitFor(() => expect(mocks.saveUserPreferences).toHaveBeenCalledWith({ tema: 'escuro', tamanhoFonte: 30, velocidadeAutoscroll: 6 }));
    expect(await screen.findByRole('status')).toHaveTextContent('Preferências salvas na sua conta.');
    expect(localStorage.getItem('pasta_de_musica_font_size:settings-user')).toBe('30');
  });

  it('shows a recoverable loading error', async () => {
    mocks.getUserPreferences.mockRejectedValueOnce(new Error('offline'));
    render(<SettingsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as preferências. Tente novamente.');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(mocks.getUserPreferences).toHaveBeenCalledTimes(2));
  });

  it('surfaces save errors while keeping the chosen theme active locally', async () => {
    mocks.saveUserPreferences.mockRejectedValueOnce(new Error('offline'));
    render(<SettingsPage />);
    await screen.findByRole('button', { name: 'Salvar preferências' });
    fireEvent.click(screen.getByRole('button', { name: /Tema Escuro/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar as preferências. Tente novamente.');
    expect(mocks.setTheme).toHaveBeenLastCalledWith('dark');
  });
});
