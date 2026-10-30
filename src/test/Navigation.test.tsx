import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthContext } from '../contexts/auth-context';
import { describe, it, expect } from 'vitest';

describe('Navbar Component', () => {
  it('renderiza o título da aplicação e links essenciais de navegação', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthContext.Provider value={{
            user: null,
            loading: false,
            isAuthenticated: false,
            configurationMissing: false,
            login: async () => undefined,
            register: async () => undefined,
            logout: async () => undefined,
            resetPassword: async () => undefined,
          }}>
            <Navbar />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );

    // Brand logo
    expect(screen.getByText('Pasta de Música')).toBeInTheDocument();

    // Core navigation links
    expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /biblioteca/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /playlists/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /importar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /modo palco/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /igreja/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /barzinho/i })).toBeInTheDocument();

    // Theme toggle button
    expect(screen.getByRole('button', { name: /alternar tema/i })).toBeInTheDocument();
  });
});
