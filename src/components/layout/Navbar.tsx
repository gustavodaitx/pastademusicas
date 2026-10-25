import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Music, 
  Library, 
  ListMusic, 
  Upload, 
  Mic2, 
  Church, 
  Beer, 
  Heart, 
  Settings, 
  Sun, 
  Moon, 
  Monitor, 
  Menu, 
  X,
  User
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const navLinks = [
    { to: '/', label: 'Início', icon: Music },
    { to: '/biblioteca', label: 'Biblioteca', icon: Library },
    { to: '/playlists', label: 'Playlists', icon: ListMusic },
    { to: '/importar', label: 'Importar', icon: Upload },
    { to: '/palco', label: 'Modo Palco', icon: Mic2, highlight: true },
    { to: '/modo-igreja', label: 'Igreja', icon: Church },
    { to: '/modo-barzinho', label: 'Barzinho', icon: Beer },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className="w-4 h-4 text-slate-500" />;
    if (resolvedTheme === 'dark') return <Moon className="w-4 h-4 text-amber-400" />;
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg p-1"
            id="brand-logo"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Music className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-300 bg-clip-text text-transparent">
                Pasta de Música
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 -mt-1 font-medium hidden sm:inline">
                Cifras & Repertório
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Navegação Principal">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  id={`nav-${link.to.replace('/', '') || 'home'}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 shadow-sm border border-brand-200/50 dark:border-brand-800/50'
                      : link.highlight
                      ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-brand-600 dark:text-brand-400' : ''}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Pix Voluntary Sponsorship button */}
            <Link
              to="/patrocinio"
              id="nav-patrocinio"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition-colors"
              title="Apoio voluntário via Pix"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
              <span>Apoiar</span>
            </Link>

            {/* Theme switcher */}
            <button
              onClick={cycleTheme}
              id="btn-toggle-theme"
              type="button"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
              title={`Tema atual: ${theme} (clique para alternar)`}
              aria-label="Alternar tema"
            >
              {getThemeIcon()}
            </button>

            {/* Settings button */}
            <Link
              to="/configuracoes"
              id="nav-settings"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 hidden sm:inline-flex"
              title="Configurações"
              aria-label="Configurações"
            >
              <Settings className="w-4 h-4" />
            </Link>

            {/* Auth Login */}
            <Link
              to="/login"
              id="nav-login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Entrar</span>
            </Link>

            {/* Mobile menu hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              id="btn-mobile-menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-slate-700 dark:text-slate-200" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2 duration-150 shadow-xl">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-3">
            <Link
              to="/patrocinio"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 py-1.5"
            >
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>Apoiar voluntariamente com Pix</span>
            </Link>
            <Link
              to="/configuracoes"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900"
              title="Configurações"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
