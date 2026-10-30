import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { LoginPage } from '../features/auth/LoginPage';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Navbar } from '../components/layout/Navbar';

type AuthTestUser = { uid: string; email: string; displayName: string | null };
const firebase = vi.hoisted(() => ({
  user: null as AuthTestUser | null,
  listener: undefined as undefined | ((user: AuthTestUser | null) => void),
  emitInitial: true,
  onAuthStateChanged: vi.fn(),
  signIn: vi.fn(),
  createUser: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({ auth: {}, isFirebaseConfigured: true }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth: unknown, listener: (user: AuthTestUser | null) => void) => {
    firebase.onAuthStateChanged(auth, listener);
    firebase.listener = listener;
    if (firebase.emitInitial) listener(firebase.user);
    return () => undefined;
  },
  signInWithEmailAndPassword: (...args: unknown[]) => firebase.signIn(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => firebase.createUser(...args),
  updateProfile: (...args: unknown[]) => firebase.updateProfile(...args),
  signOut: (...args: unknown[]) => firebase.signOut(...args),
  sendPasswordResetEmail: (...args: unknown[]) => firebase.resetPassword(...args),
}));

const account = { uid: 'u-1', email: 'music@example.com', displayName: 'Pessoa Música' };

const renderLogin = (initialEntry: string | { pathname: string; state?: unknown } = '/login') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/biblioteca" element={<div>Biblioteca protegida</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </AuthProvider>
  </MemoryRouter>,
);

describe('Autenticação', () => {
  beforeEach(() => {
    firebase.user = null;
    firebase.listener = undefined;
    firebase.emitInitial = true;
    firebase.signIn.mockReset().mockImplementation(async () => {
      firebase.user = account;
      firebase.listener?.(account);
    });
    firebase.createUser.mockReset().mockResolvedValue({ user: account });
    firebase.updateProfile.mockReset().mockImplementation(async () => {
      firebase.user = account;
      firebase.listener?.(account);
    });
    firebase.signOut.mockReset().mockImplementation(async () => {
      firebase.user = null;
      firebase.listener?.(null);
    });
    firebase.resetPassword.mockReset().mockResolvedValue(undefined);
  });

  it('exibe a tela de login', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Entrar na Pasta de Música' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it('rejeita formato de e-mail inválido', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'invalido' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByRole('button', { name: /^Entrar$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um endereço de e-mail válido.');
    expect(firebase.signIn).not.toHaveBeenCalled();
  });

  it('valida senha curta e confirmação no cadastro', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('tab', { name: 'Cadastrar' }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Confirme a senha'), { target: { value: '456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Cadastro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('pelo menos 6 caracteres');
    expect(firebase.createUser).not.toHaveBeenCalled();
  });

  it('cadastra a conta e atualiza o nome de exibição', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('tab', { name: 'Cadastrar' }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Pessoa Música' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'music@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirme a senha'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Cadastro' }));
    await waitFor(() => expect(firebase.createUser).toHaveBeenCalled());
    expect(firebase.updateProfile).toHaveBeenCalledWith(account, { displayName: 'Pessoa Música' });
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('faz login e retorna à rota solicitada', async () => {
    renderLogin({ pathname: '/login', state: { from: { pathname: '/biblioteca' } } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'music@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.click(screen.getByRole('button', { name: /^Entrar$/i }));
    await waitFor(() => expect(firebase.signIn).toHaveBeenCalled());
    expect(await screen.findByText('Biblioteca protegida')).toBeInTheDocument();
  });

  it('envia solicitação de recuperação de senha', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'music@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar instruções' }));
    expect(await screen.findByRole('status')).toHaveTextContent('receberá instruções');
    expect(firebase.resetPassword).toHaveBeenCalled();
  });

  it('aguarda Firebase antes de renderizar a rota protegida', async () => {
    firebase.emitInitial = false;
    render(<MemoryRouter initialEntries={['/biblioteca']}><AuthProvider><Routes><Route path="/login" element={<div>Login público</div>} /><Route path="/biblioteca" element={<ProtectedRoute><div>Biblioteca secreta</div></ProtectedRoute>} /></Routes></AuthProvider></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('Verificando autenticação');
    await act(async () => firebase.listener?.(account));
    expect(await screen.findByText('Biblioteca secreta')).toBeInTheDocument();
  });

  it('redireciona usuário anônimo ao login e mantém o destino solicitado', async () => {
    render(<MemoryRouter initialEntries={['/biblioteca']}><AuthProvider><Routes><Route path="/login" element={<div>Login público</div>} /><Route path="/biblioteca" element={<ProtectedRoute><div>Biblioteca secreta</div></ProtectedRoute>} /></Routes></AuthProvider></MemoryRouter>);
    expect(await screen.findByText('Login público')).toBeInTheDocument();
  });

  it('permite sair e limpa a sessão de autenticação', async () => {
    firebase.user = account;
    render(<MemoryRouter><ThemeProvider><AuthProvider><Navbar /></AuthProvider></ThemeProvider></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(firebase.signOut).toHaveBeenCalled());
    expect(await screen.findByRole('link', { name: /entrar/i })).toBeInTheDocument();
  });
});
