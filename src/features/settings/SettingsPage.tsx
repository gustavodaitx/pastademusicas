import React, { useCallback, useEffect, useState } from 'react';
import { Settings, Sun, Moon, Monitor, HardDrive, Shield, Sparkles } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_USER_PREFERENCES, getUserPreferences, PreferencesRepositoryError, saveUserPreferences } from '../../services/preferencesRepository';
import type { PreferencesInput } from '../../services/preferencesRepository';
import type { UserPreferences } from '../../types/firestore';
import type { Theme } from '../../types/theme';

const FONT_SIZE_STORAGE_KEY = 'pasta_de_musica_font_size';
const AUTOSCROLL_STORAGE_KEY = 'pasta_de_musica_scroll_speed';

function themeFromFirestore(theme: UserPreferences['tema']): Theme {
  if (theme === 'claro') return 'light';
  if (theme === 'escuro') return 'dark';
  return 'system';
}

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<PreferencesInput>(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const cacheLocally = useCallback((next: PreferencesInput) => {
    setTheme(themeFromFirestore(next.tema));
    if (!user) return;
    try {
      localStorage.setItem(`${FONT_SIZE_STORAGE_KEY}:${user.uid}`, String(next.tamanhoFonte));
      localStorage.setItem(`${AUTOSCROLL_STORAGE_KEY}:${user.uid}`, String(next.velocidadeAutoscroll));
    } catch { /* Local storage is an offline cache only. */ }
  }, [setTheme, user]);

  const loadPreferences = useCallback(async () => {
    if (authLoading) return;
    if (!user) { setLoading(false); setError('Entre na sua conta para carregar suas preferências.'); return; }
    setLoading(true); setError(null);
    try {
      const saved = await getUserPreferences();
      const next = { tema: saved.tema, tamanhoFonte: saved.tamanhoFonte, velocidadeAutoscroll: saved.velocidadeAutoscroll };
      setPreferences(next); cacheLocally(next);
    } catch (loadError) {
      setError(loadError instanceof PreferencesRepositoryError ? loadError.message : 'Não foi possível carregar as preferências. Tente novamente.');
    } finally { setLoading(false); }
  }, [authLoading, user, cacheLocally]);

  useEffect(() => { void loadPreferences(); }, [loadPreferences]);

  const savePreferences = async () => {
    setSaving(true); setError(null); setNotice(null); cacheLocally(preferences);
    try {
      await saveUserPreferences(preferences);
      setNotice('Preferências salvas na sua conta.');
    } catch (saveError) {
      setError(saveError instanceof PreferencesRepositoryError ? saveError.message : 'Não foi possível salvar as preferências. Tente novamente.');
    } finally { setSaving(false); }
  };

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

      {error && <div role="alert" className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 text-sm">{error}<button type="button" onClick={() => void loadPreferences()} className="ml-2 font-semibold underline">Tentar novamente</button></div>}
      {notice && <div role="status" className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 text-sm">{notice}</div>}
      {loading && <p role="status" aria-busy="true" className="py-5 text-center text-sm text-slate-500">Carregando preferências…</p>}

      {/* Theme Card */}
      <div aria-busy={loading} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
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
            onClick={() => { setTheme('light'); setPreferences((current) => ({ ...current, tema: 'claro' })); }}
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
            onClick={() => { setTheme('dark'); setPreferences((current) => ({ ...current, tema: 'escuro' })); }}
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
            onClick={() => { setTheme('system'); setPreferences((current) => ({ ...current, tema: 'sistema' })); }}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-slate-100 dark:border-slate-800 pt-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tamanho da fonte no Modo Palco: <span className="font-bold">{preferences.tamanhoFonte}px</span><input aria-label="Tamanho da fonte no Modo Palco" type="range" min="10" max="72" value={preferences.tamanhoFonte} disabled={loading || saving} onChange={(event) => setPreferences((current) => ({ ...current, tamanhoFonte: Number(event.target.value) }))} className="mt-2 w-full accent-brand-600" /></label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Velocidade do autoscroll: <span className="font-bold">{preferences.velocidadeAutoscroll}/10</span><input aria-label="Velocidade do autoscroll" type="range" min="1" max="10" value={preferences.velocidadeAutoscroll} disabled={loading || saving} onChange={(event) => setPreferences((current) => ({ ...current, velocidadeAutoscroll: Number(event.target.value) }))} className="mt-2 w-full accent-brand-600" /></label>
        </div>
        <div className="flex justify-end"><button type="button" disabled={loading || saving || !user} onClick={() => void savePreferences()} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar preferências'}</button></div>
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
