import React from 'react';
import { Settings, Sun, Moon, Monitor, HardDrive, Shield, Sparkles } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <span>Configurações</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Personalize temas visuais, preferências de palco e integrações.
        </p>
      </div>

      {/* Theme Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Aparência e Tema
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Selecione o esquema de cores preferido para navegação.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
              theme === 'light'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Sun className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Tema Claro</p>
              <p className="text-[11px] text-slate-400">Ambientes iluminados</p>
            </div>
          </button>

          {/* Dark */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
              theme === 'dark'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="p-2 rounded-lg bg-indigo-900 text-indigo-300">
              <Moon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Tema Escuro</p>
              <p className="text-[11px] text-slate-400">Alto contraste</p>
            </div>
          </button>

          {/* System */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
              theme === 'system'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              <Monitor className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Automático</p>
              <p className="text-[11px] text-slate-400">Segue o sistema operacional</p>
            </div>
          </button>
        </div>
      </div>

      {/* Google Drive Status (T12 Preparation) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Integração Google Drive
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escopo mínimo seguro (<code className="text-[11px]">drive.file</code>) para seleção pontual via Google Picker.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Fase T12
          </span>
        </div>
      </div>

      {/* Zero Cost Info */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>Pasta de Música — Versão 1.0 (Plano Gratuito)</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Build Local</span>
        </div>
      </div>

    </div>
  );
};
