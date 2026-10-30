import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Music, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const firebaseMessages: Record<string, string> = {
  'auth/invalid-email': 'Informe um endereço de e-mail válido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'Não encontramos uma conta com este e-mail.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.',
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && !('code' in error)) return error.message;
  const code = (error as { code?: string })?.code;
  return (code && firebaseMessages[code]) || 'Não foi possível concluir a solicitação. Tente novamente.';
};

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, register, resetPassword, user, loading, configurationMissing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    if (!loading && user) navigate(returnTo, { replace: true });
  }, [loading, user, navigate, returnTo]);

  const setMode = (mode: 'login' | 'register' | 'reset') => {
    setIsRegister(mode === 'register');
    setIsReset(mode === 'reset');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Informe um endereço de e-mail válido.');
    if (isReset) {
      setBusy(true);
      try {
        await resetPassword(email);
        setSuccess('Se houver uma conta para este e-mail, você receberá instruções para redefinir sua senha.');
      } catch (requestError) { setError(getErrorMessage(requestError)); }
      finally { setBusy(false); }
      return;
    }
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (isRegister && !name.trim()) return setError('Informe seu nome.');
    if (isRegister && password !== confirmation) return setError('As senhas não conferem.');
    setBusy(true);
    try {
      if (isRegister) await register(name.trim(), email, password);
      else await login(email, password);
      navigate(returnTo, { replace: true });
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  };

  const title = isReset ? 'Recuperar senha' : isRegister ? 'Criar Nova Conta' : 'Entrar na Pasta de Música';

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 items-center justify-center text-white shadow-lg shadow-brand-500/25"><Music className="w-6 h-6" /></div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{isReset ? 'Enviaremos instruções para redefinir sua senha.' : isRegister ? 'Cadastre-se para acessar suas músicas.' : 'Acesse suas playlists e cifras personalizadas.'}</p>
        </div>

        {!isReset && <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1" role="tablist" aria-label="Tipo de acesso">
          <button type="button" role="tab" aria-selected={!isRegister} onClick={() => setMode('login')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${!isRegister ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`}>Entrar</button>
          <button type="button" role="tab" aria-selected={isRegister} onClick={() => setMode('register')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${isRegister ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`}>Cadastrar</button>
        </div>}

        {configurationMissing && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Firebase não configurado. Crie o arquivo <code>.env.local</code> com as variáveis <code>VITE_FIREBASE_*</code> e reinicie o servidor.</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
        {success && <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isRegister && <div className="space-y-1"><label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nome</label><div className="relative"><User aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm" /></div></div>}
          <div className="space-y-1"><label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">E-mail</label><div className="relative"><Mail aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@exemplo.com" aria-invalid={Boolean(error)} className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /></div></div>
          {!isReset && <>
            <div className="space-y-1"><label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Senha</label><div className="relative"><Lock aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(error)} className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            {isRegister && <div className="space-y-1"><label htmlFor="confirmation" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirme a senha</label><input id="confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} aria-invalid={Boolean(error)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm" /></div>}
          </>}
          <button type="submit" disabled={busy || loading} className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md transition-all">{busy ? 'Aguarde…' : isReset ? 'Enviar instruções' : isRegister ? 'Finalizar Cadastro' : 'Entrar'}</button>
        </form>

        {isReset ? <button type="button" onClick={() => setMode('login')} className="w-full text-xs font-semibold text-brand-600 hover:underline">Voltar ao login</button> : !isRegister && <button type="button" onClick={() => setMode('reset')} className="w-full text-xs font-semibold text-brand-600 hover:underline">Esqueci minha senha</button>}
        <Link to="/" className="flex justify-center items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"><User className="w-3.5 h-3.5" /><span>Voltar ao início</span><ArrowRight className="w-3.5 h-3.5" /></Link>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" /><span>Autenticação por Firebase Authentication (plano Spark).</span></div>
      </div>
    </div>
  );
};
