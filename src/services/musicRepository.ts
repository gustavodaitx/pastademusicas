import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { Music } from '../types/firestore';

export type MusicInput = Omit<Music, 'createdAt' | 'updatedAt'>;
export type MusicRecord = Music & { id: string };

export class MusicRepositoryError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'MusicRepositoryError';
  }
}

const limits = {
  titulo: 200,
  artista: 200,
  compositor: 200,
  tomOriginal: 12,
  conteudoCifrado: 800_000,
  observacoes: 5_000,
  categorias: 30,
  tags: 50,
  momentosLiturgicos: 20,
  estilo: 30,
  driveFileId: 500,
  arquivoNome: 255,
  licencaOuPermissao: 2_000,
} as const;

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new MusicRepositoryError(`${field} é obrigatório.`, 'validation/required');
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new MusicRepositoryError(`${field} deve ter no máximo ${maxLength} caracteres.`, 'validation/too-long');
  }
  return normalized;
}

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new MusicRepositoryError(`${field} deve ser texto.`, 'validation/type');
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new MusicRepositoryError(`${field} deve ter no máximo ${maxLength} caracteres.`, 'validation/too-long');
  }
  return normalized || null;
}

function chordContent(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new MusicRepositoryError('O conteúdo/cifra é obrigatório.', 'validation/required');
  }
  if (value.length > limits.conteudoCifrado || new TextEncoder().encode(value).length > limits.conteudoCifrado) {
    throw new MusicRepositoryError(`O conteúdo/cifra deve ocupar no máximo ${limits.conteudoCifrado} bytes.`, 'validation/too-long');
  }
  // Preserve indentation and trailing spaces because they may align chords with lyrics.
  return value;
}

function stringList(value: unknown, field: string, maxItems: number): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new MusicRepositoryError(`${field} deve ser uma lista de textos.`, 'validation/type');
  }
  if (value.length > maxItems) {
    throw new MusicRepositoryError(`${field} aceita no máximo ${maxItems} itens.`, 'validation/too-many-items');
  }
  return value.map((item: string) => item.trim()).filter(Boolean);
}

export function validateMusicInput(input: MusicInput): MusicInput {
  if (!input || typeof input !== 'object') {
    throw new MusicRepositoryError('Informe os dados da música.', 'validation/type');
  }

  if (!['catalogo', 'upload_local', 'google_drive', 'manual'].includes(input.origemTipo)) {
    throw new MusicRepositoryError('A origem da música é inválida.', 'validation/origin');
  }

  return {
    titulo: requiredText(input.titulo, 'O título', limits.titulo),
    artista: optionalText(input.artista, 'O artista', limits.artista),
    compositor: optionalText(input.compositor, 'O compositor', limits.compositor),
    tomOriginal: optionalText(input.tomOriginal, 'O tom', limits.tomOriginal),
    conteudoCifrado: chordContent(input.conteudoCifrado),
    observacoes: optionalText(input.observacoes, 'As observações', limits.observacoes),
    categorias: stringList(input.categorias, 'Categorias', limits.categorias),
    tags: stringList(input.tags, 'Tags', limits.tags),
    momentosLiturgicos: stringList(input.momentosLiturgicos, 'Momentos litúrgicos', limits.momentosLiturgicos),
    estilo: stringList(input.estilo, 'Estilos', limits.estilo),
    origemTipo: input.origemTipo,
    driveFileId: optionalText(input.driveFileId, 'O identificador do Drive', limits.driveFileId),
    arquivoNome: optionalText(input.arquivoNome, 'O nome do arquivo', limits.arquivoNome),
    licencaOuPermissao: optionalText(input.licencaOuPermissao, 'A licença/permissão', limits.licencaOuPermissao),
  };
}

function requireUid(getUid: () => string | null): string {
  const uid = getUid();
  if (!uid) {
    throw new MusicRepositoryError('Entre na sua conta para acessar suas músicas.', 'auth/unauthenticated');
  }
  return uid;
}

function validateDocumentId(id: string): void {
  if (!id || id.includes('/')) {
    throw new MusicRepositoryError('O identificador da música é inválido.', 'validation/id');
  }
}

function wrapPersistenceError(error: unknown): MusicRepositoryError {
  if (error instanceof MusicRepositoryError) return error;
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : 'firestore/unknown';
  return new MusicRepositoryError('Não foi possível salvar ou carregar a música. Tente novamente.', code);
}

export function createMusicRepository(
  firestore: Firestore | null,
  getUid: () => string | null,
) {
  function userMusicCollection() {
    if (!firestore) {
      throw new MusicRepositoryError('O Firebase não está configurado.', 'configuration/missing');
    }
    const uid = requireUid(getUid);
    return collection(firestore, 'usuarios', uid, 'musicas');
  }

  function musicDocument(id: string) {
    validateDocumentId(id);
    return doc(userMusicCollection(), id);
  }

  return {
    async createMusic(input: MusicInput): Promise<string> {
      try {
        const data = validateMusicInput(input);
        const reference = await addDoc(userMusicCollection(), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return reference.id;
      } catch (error) {
        throw wrapPersistenceError(error);
      }
    },

    async listMusics(): Promise<MusicRecord[]> {
      try {
        const result = await getDocs(query(userMusicCollection(), orderBy('titulo')));
        return result.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as MusicRecord);
      } catch (error) {
        throw wrapPersistenceError(error);
      }
    },

    async getMusicById(id: string): Promise<MusicRecord | null> {
      try {
        const snapshot = await getDoc(musicDocument(id));
        return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as MusicRecord) : null;
      } catch (error) {
        throw wrapPersistenceError(error);
      }
    },

    async updateMusic(id: string, input: MusicInput): Promise<void> {
      try {
        const data = validateMusicInput(input);
        await updateDoc(musicDocument(id), { ...data, updatedAt: serverTimestamp() });
      } catch (error) {
        throw wrapPersistenceError(error);
      }
    },

    async deleteMusic(id: string): Promise<void> {
      try {
        await deleteDoc(musicDocument(id));
      } catch (error) {
        throw wrapPersistenceError(error);
      }
    },
  };
}

const repository = createMusicRepository(db, () => auth?.currentUser?.uid ?? null);

export const createMusic = repository.createMusic;
export const listMusics = repository.listMusics;
export const getMusicById = repository.getMusicById;
export const updateMusic = repository.updateMusic;
export const deleteMusic = repository.deleteMusic;
