import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Firestore, QueryDocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { Repertoire, RepertoireItem, RepertoireType } from '../types/firestore';

export type RepertoireInput = Pick<Repertoire, 'nome' | 'tipo' | 'parametrosGeracao'>;
export type RepertoireRecord = Repertoire & { id: string };
export type RepertoireItemRecord = RepertoireItem & { id: string };
export type RepertoireDetails = RepertoireRecord & { itens: RepertoireItemRecord[] };

export class RepertoireRepositoryError extends Error {
  constructor(message: string, readonly code: string) { super(message); this.name = 'RepertoireRepositoryError'; }
}

const maxItems = 400;
function validateName(name: string): string {
  const value = typeof name === 'string' ? name.trim() : '';
  if (!value) throw new RepertoireRepositoryError('Informe o nome do repertório.', 'validation/required');
  if (value.length > 120) throw new RepertoireRepositoryError('O nome aceita até 120 caracteres.', 'validation/too-long');
  return value;
}
function validateType(type: RepertoireType): RepertoireType {
  if (type !== 'igreja' && type !== 'barzinho') throw new RepertoireRepositoryError('O tipo de repertório é inválido.', 'validation/type');
  return type;
}
function validateId(id: string): void {
  if (!id || id.includes('/')) throw new RepertoireRepositoryError('Identificador inválido.', 'validation/id');
}
function wrap(error: unknown): RepertoireRepositoryError {
  if (error instanceof RepertoireRepositoryError) return error;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'firestore/unknown';
  return new RepertoireRepositoryError('Não foi possível salvar ou carregar o repertório. Tente novamente.', code);
}

export function createRepertoireRepository(firestore: Firestore | null, getUid: () => string | null) {
  function root() {
    if (!firestore) throw new RepertoireRepositoryError('O Firebase não está configurado.', 'configuration/missing');
    const uid = getUid();
    if (!uid) throw new RepertoireRepositoryError('Entre na sua conta para acessar seus repertórios.', 'auth/unauthenticated');
    return collection(firestore, 'usuarios', uid, 'repertorios');
  }
  function reference(id: string) { validateId(id); return doc(root(), id); }
  function items(id: string) { return collection(reference(id), 'itens'); }
  async function readItems(id: string): Promise<RepertoireItemRecord[]> {
    const result = await getDocs(query(items(id), orderBy('posicao')));
    return result.docs.map((snapshot: QueryDocumentSnapshot) => ({ id: snapshot.id, ...snapshot.data() }) as RepertoireItemRecord);
  }
  async function readDetails(id: string): Promise<RepertoireDetails | null> {
    const snapshot = await getDoc(reference(id));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data(), itens: await readItems(id) } as RepertoireDetails : null;
  }
  return {
    async createRepertoire(input: RepertoireInput) {
      try {
        const result = await addDoc(root(), { nome: validateName(input.nome), tipo: validateType(input.tipo), parametrosGeracao: input.parametrosGeracao ?? null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        return result.id;
      } catch (error) { throw wrap(error); }
    },
    async listRepertoires(): Promise<RepertoireRecord[]> {
      try { const result = await getDocs(query(root(), orderBy('createdAt', 'desc'))); return result.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as RepertoireRecord); }
      catch (error) { throw wrap(error); }
    },
    async getRepertoireById(id: string) { try { return await readDetails(id); } catch (error) { throw wrap(error); } },
    async renameRepertoire(id: string, name: string) {
      try { await updateDoc(reference(id), { nome: validateName(name), updatedAt: serverTimestamp() }); } catch (error) { throw wrap(error); }
    },
    async deleteRepertoire(id: string) {
      try {
        const parent = reference(id); const observed = await getDoc(parent);
        if (!observed.exists()) throw new RepertoireRepositoryError('Repertório não encontrado.', 'not-found');
        const children = await readItems(id);
        if (children.length > maxItems) throw new RepertoireRepositoryError(`O limite para excluir em uma operação é ${maxItems} músicas.`, 'validation/too-many-items');
        await runTransaction(firestore!, async (transaction) => {
          const current = await transaction.get(parent);
          if (!current.exists()) throw new RepertoireRepositoryError('Repertório não encontrado.', 'not-found');
          if (!current.data().updatedAt.isEqual(observed.data().updatedAt)) throw new RepertoireRepositoryError('O repertório mudou. Atualize e tente novamente.', 'validation/stale');
          const snapshots = await Promise.all(children.map((item) => transaction.get(doc(items(id), item.id))));
          snapshots.forEach((snapshot) => { if (snapshot.exists()) transaction.delete(snapshot.ref); });
          transaction.delete(parent);
        });
      } catch (error) { throw wrap(error); }
    },
    async addMusicToRepertoire(id: string, musicId: string) {
      try {
        validateId(musicId);
        const parent = reference(id); const music = doc(firestore!, 'usuarios', getUid()!, 'musicas', musicId); const item = doc(items(id), musicId);
        const [observed, existing] = await Promise.all([getDoc(parent), readItems(id)]);
        if (!observed.exists()) throw new RepertoireRepositoryError('Repertório não encontrado.', 'not-found');
        if (existing.some((entry) => entry.musicaId === musicId)) throw new RepertoireRepositoryError('Essa música já está no repertório.', 'already-exists');
        if (existing.length >= maxItems) throw new RepertoireRepositoryError(`O repertório aceita até ${maxItems} músicas.`, 'validation/too-many-items');
        await runTransaction(firestore!, async (transaction) => {
          const [current, song, duplicate] = await Promise.all([transaction.get(parent), transaction.get(music), transaction.get(item)]);
          if (!current.exists()) throw new RepertoireRepositoryError('Repertório não encontrado.', 'not-found');
          if (!current.data().updatedAt.isEqual(observed.data().updatedAt)) throw new RepertoireRepositoryError('O repertório mudou. Atualize antes de adicionar músicas.', 'validation/stale');
          if (!song.exists()) throw new RepertoireRepositoryError('A música não existe na sua biblioteca.', 'invalid-music-reference');
          if (duplicate.exists()) throw new RepertoireRepositoryError('Essa música já está no repertório.', 'already-exists');
          transaction.set(item, { musicaId: musicId, posicao: existing.length + 1, momento: null, tomPersonalizado: null });
          transaction.update(parent, { updatedAt: serverTimestamp() });
        });
      } catch (error) { throw wrap(error); }
    },
    async removeMusicFromRepertoire(id: string, musicId: string) {
      try {
        const parent = reference(id); const children = await readItems(id); const observed = await getDoc(parent);
        if (!observed.exists()) throw new RepertoireRepositoryError('Repertório não encontrado.', 'not-found');
        if (children.length > maxItems) throw new RepertoireRepositoryError(`O limite para remover em uma operação é ${maxItems} músicas.`, 'validation/too-many-items');
        if (!children.some((item) => item.musicaId === musicId)) throw new RepertoireRepositoryError('Música não encontrada no repertório.', 'not-found');
        await runTransaction(firestore!, async (transaction) => {
          const current = await transaction.get(parent); const snapshots = await Promise.all(children.map((entry) => transaction.get(doc(items(id), entry.id))));
          if (!current.exists()) throw new RepertoireRepositoryError('Repertório não encontrado.', 'not-found');
          if (!current.data().updatedAt.isEqual(observed.data().updatedAt) || snapshots.some((snapshot) => !snapshot.exists())) throw new RepertoireRepositoryError('O repertório mudou. Atualize e tente novamente.', 'validation/stale');
          const target = snapshots.find((snapshot) => snapshot.id === musicId);
          if (!target) throw new RepertoireRepositoryError('Música não encontrada no repertório.', 'not-found');
          transaction.delete(target.ref);
          snapshots.filter((snapshot) => snapshot.id !== musicId).forEach((snapshot, index) => transaction.update(snapshot.ref, { posicao: index + 1 }));
          transaction.update(parent, { updatedAt: serverTimestamp() });
        });
      } catch (error) { throw wrap(error); }
    },
    async reorderRepertoireItems(id: string, orderedIds: string[]) {
      try {
        if (new Set(orderedIds).size !== orderedIds.length) throw new RepertoireRepositoryError('A ordem contém músicas duplicadas.', 'validation/duplicate');
        const parent = reference(id); const currentItems = await readItems(id); const observed = await getDoc(parent);
        if (!observed.exists()) throw new RepertoireRepositoryError('Repertório não encontrado.', 'not-found');
        if (orderedIds.length > maxItems) throw new RepertoireRepositoryError(`O limite para reordenar em uma operação é ${maxItems} músicas.`, 'validation/too-many-items');
        if (orderedIds.length !== currentItems.length || orderedIds.some((musicId) => !currentItems.some((item) => item.musicaId === musicId))) throw new RepertoireRepositoryError('A ordem não corresponde às músicas do repertório.', 'validation/stale-order');
        await runTransaction(firestore!, async (transaction) => {
          const current = await transaction.get(parent); const snapshots = await Promise.all(orderedIds.map((musicId) => transaction.get(doc(items(id), musicId))));
          if (!current.exists()) throw new RepertoireRepositoryError('Repertório não encontrado.', 'not-found');
          if (!current.data().updatedAt.isEqual(observed.data().updatedAt) || snapshots.some((snapshot) => !snapshot.exists())) throw new RepertoireRepositoryError('O repertório mudou. Atualize e tente novamente.', 'validation/stale');
          snapshots.forEach((snapshot, index) => transaction.update(snapshot.ref, { posicao: index + 1 }));
          transaction.update(parent, { updatedAt: serverTimestamp() });
        });
      } catch (error) { throw wrap(error); }
    },
  };
}

const repository = createRepertoireRepository(db, () => auth?.currentUser?.uid ?? null);
export const { createRepertoire, listRepertoires, getRepertoireById, renameRepertoire, deleteRepertoire, addMusicToRepertoire, removeMusicFromRepertoire, reorderRepertoireItems } = repository;
