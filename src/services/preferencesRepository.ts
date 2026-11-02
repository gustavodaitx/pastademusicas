import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserPreferences } from '../types/firestore';

export type PreferencesInput = Omit<UserPreferences, 'updatedAt'>;
export type PreferencesRecord = PreferencesInput & Pick<UserPreferences, 'updatedAt'>;

export const DEFAULT_USER_PREFERENCES: PreferencesInput = {
  tema: 'sistema',
  tamanhoFonte: 18,
  velocidadeAutoscroll: 3,
};

export class PreferencesRepositoryError extends Error {
  constructor(message: string, readonly code: string) { super(message); this.name = 'PreferencesRepositoryError'; }
}

function validate(input: PreferencesInput): PreferencesInput {
  if (!input || !['claro', 'escuro', 'sistema'].includes(input.tema)) {
    throw new PreferencesRepositoryError('O tema selecionado é inválido.', 'validation/theme');
  }
  if (!Number.isFinite(input.tamanhoFonte) || input.tamanhoFonte < 10 || input.tamanhoFonte > 72) {
    throw new PreferencesRepositoryError('O tamanho da fonte deve estar entre 10 e 72 px.', 'validation/font-size');
  }
  if (!Number.isFinite(input.velocidadeAutoscroll) || input.velocidadeAutoscroll < 1 || input.velocidadeAutoscroll > 10) {
    throw new PreferencesRepositoryError('A velocidade de rolagem deve estar entre 1 e 10.', 'validation/scroll-speed');
  }
  return input;
}

function wrap(error: unknown): PreferencesRepositoryError {
  if (error instanceof PreferencesRepositoryError) return error;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'firestore/unknown';
  return new PreferencesRepositoryError('Não foi possível carregar ou salvar suas preferências. Verifique sua conexão e tente novamente.', code);
}

function readRecord(data: Record<string, unknown>): PreferencesRecord {
  const value = {
    tema: data.tema,
    tamanhoFonte: data.tamanhoFonte,
    velocidadeAutoscroll: data.velocidadeAutoscroll,
  } as PreferencesInput;
  validate(value);
  if (!(data.updatedAt instanceof Timestamp)) {
    throw new PreferencesRepositoryError('As preferências salvas possuem um formato inválido.', 'validation/persisted-data');
  }
  return { ...value, updatedAt: data.updatedAt };
}

export function createPreferencesRepository(firestore: Firestore | null, getUid: () => string | null) {
  function reference() {
    if (!firestore) throw new PreferencesRepositoryError('O Firebase não está configurado.', 'configuration/missing');
    const uid = getUid();
    if (!uid) throw new PreferencesRepositoryError('Entre na sua conta para acessar suas preferências.', 'auth/unauthenticated');
    return doc(firestore, 'usuarios', uid, 'configuracoes', 'preferencias');
  }

  return {
    async getPreferences(): Promise<PreferencesRecord> {
      try {
        const target = reference();
        const snapshot = await getDoc(target);
        if (snapshot.exists()) return readRecord(snapshot.data());
        await setDoc(target, { ...DEFAULT_USER_PREFERENCES, updatedAt: serverTimestamp() });
        const created = await getDoc(target);
        if (!created.exists()) throw new PreferencesRepositoryError('Não foi possível criar as preferências padrão.', 'persistence/not-created');
        return readRecord(created.data());
      } catch (error) { throw wrap(error); }
    },
    async savePreferences(input: PreferencesInput): Promise<void> {
      try {
        const safe = validate(input);
        await setDoc(reference(), { ...safe, updatedAt: serverTimestamp() });
      } catch (error) { throw wrap(error); }
    },
  };
}

const repository = createPreferencesRepository(db, () => auth?.currentUser?.uid ?? null);
export const getUserPreferences = repository.getPreferences;
export const saveUserPreferences = repository.savePreferences;
