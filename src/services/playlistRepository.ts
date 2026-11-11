import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Firestore, QueryDocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { Playlist, PlaylistItem, PlaylistType } from '../types/firestore';

export type PlaylistInput = Pick<Playlist, 'nome' | 'tipo'>;
export type PlaylistRecord = Playlist & { id: string };
export type PlaylistItemRecord = PlaylistItem & { id: string };
export type PlaylistDetails = PlaylistRecord & { itens: PlaylistItemRecord[] };

export class PlaylistRepositoryError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'PlaylistRepositoryError';
  }
}

const maxItemsPerPlaylist = 400;
const maxPlaylistNameLength = 120;
const playlistCopySuffix = ' (cópia)';
const maxItemsPerCopyBatch = 10;

function validateName(name: string): string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new PlaylistRepositoryError('Informe o nome da playlist.', 'validation/required');
  }
  const normalized = name.trim();
  if (normalized.length > maxPlaylistNameLength) {
    throw new PlaylistRepositoryError('O nome da playlist aceita até 120 caracteres.', 'validation/too-long');
  }
  return normalized;
}

function copyName(name: string): string {
  const normalized = validateName(name);
  const maxBaseLength = maxPlaylistNameLength - playlistCopySuffix.length;
  let baseName = '';
  for (const character of normalized) {
    if (baseName.length + character.length > maxBaseLength) break;
    baseName += character;
  }
  baseName = baseName.trimEnd();
  return validateName(`${baseName}${playlistCopySuffix}`);
}

function validateType(type: PlaylistType): PlaylistType {
  if (!['manual', 'igreja', 'barzinho'].includes(type)) {
    throw new PlaylistRepositoryError('O tipo de playlist é inválido.', 'validation/type');
  }
  return type;
}

function validateId(id: string, kind: string): void {
  if (!id || id.includes('/')) {
    throw new PlaylistRepositoryError(`O identificador ${kind} é inválido.`, 'validation/id');
  }
}

function requireUid(getUid: () => string | null): string {
  const uid = getUid();
  if (!uid) {
    throw new PlaylistRepositoryError('Entre na sua conta para acessar suas playlists.', 'auth/unauthenticated');
  }
  return uid;
}

function wrapError(error: unknown): PlaylistRepositoryError {
  if (error instanceof PlaylistRepositoryError) return error;
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : 'firestore/unknown';
  return new PlaylistRepositoryError('Não foi possível salvar ou carregar a playlist. Tente novamente.', code);
}

function asItem(snapshot: QueryDocumentSnapshot): PlaylistItemRecord {
  return { id: snapshot.id, ...snapshot.data() } as PlaylistItemRecord;
}

function validatePlaylistItem(item: PlaylistItemRecord): PlaylistItemRecord {
  if (item.musicaId !== item.id) {
    throw new PlaylistRepositoryError('A playlist contém uma referência de música inválida.', 'invalid-music-reference');
  }
  validateId(item.musicaId, 'da música');
  if (!Number.isInteger(item.posicao) || item.posicao < 1) {
    throw new PlaylistRepositoryError('A playlist contém uma posição inválida.', 'validation/item');
  }
  if (item.momento !== null && (typeof item.momento !== 'string' || item.momento.length > 100)) {
    throw new PlaylistRepositoryError('A playlist contém um momento inválido.', 'validation/item');
  }
  if (item.tomPersonalizado !== null && (typeof item.tomPersonalizado !== 'string' || item.tomPersonalizado.length > 12)) {
    throw new PlaylistRepositoryError('A playlist contém um tom personalizado inválido.', 'validation/item');
  }
  return item;
}

function validatePersonalizedKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new PlaylistRepositoryError('O tom personalizado deve ser texto.', 'validation/type');
  }
  const normalized = value.trim();
  if (normalized.length > 12) {
    throw new PlaylistRepositoryError('O tom personalizado aceita até 12 caracteres.', 'validation/too-long');
  }
  return normalized || null;
}

export function createPlaylistRepository(firestore: Firestore | null, getUid: () => string | null) {
  function userPlaylistCollection() {
    if (!firestore) {
      throw new PlaylistRepositoryError('O Firebase não está configurado.', 'configuration/missing');
    }
    return collection(firestore, 'usuarios', requireUid(getUid), 'playlists');
  }

  function playlistDocument(playlistId: string) {
    validateId(playlistId, 'da playlist');
    return doc(userPlaylistCollection(), playlistId);
  }

  function playlistItemsCollection(playlistId: string) {
    return collection(playlistDocument(playlistId), 'itens');
  }

  async function getItems(playlistId: string): Promise<PlaylistItemRecord[]> {
    const result = await getDocs(query(playlistItemsCollection(playlistId), orderBy('posicao')));
    return result.docs.map(asItem);
  }

  async function readPlaylistDetails(playlistId: string): Promise<PlaylistDetails | null> {
    const reference = playlistDocument(playlistId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) return null;
    const itens = await getItems(playlistId);
    return { id: snapshot.id, ...snapshot.data(), itens } as PlaylistDetails;
  }

  return {
    async createPlaylist(input: PlaylistInput): Promise<string> {
      try {
        const nome = validateName(input.nome);
        const tipo = validateType(input.tipo);
        const reference = await addDoc(userPlaylistCollection(), {
          nome,
          tipo,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return reference.id;
      } catch (error) {
        throw wrapError(error);
      }
    },

    async listPlaylists(): Promise<PlaylistRecord[]> {
      try {
        const result = await getDocs(query(userPlaylistCollection(), orderBy('createdAt', 'desc')));
        return result.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as PlaylistRecord);
      } catch (error) {
        throw wrapError(error);
      }
    },

    async getPlaylistById(playlistId: string): Promise<PlaylistDetails | null> {
      try {
        return await readPlaylistDetails(playlistId);
      } catch (error) {
        throw wrapError(error);
      }
    },

    async updatePlaylistItemKey(playlistId: string, musicId: string, personalizedKey: string | null): Promise<void> {
      try {
        validateId(musicId, 'da música');
        await updateDoc(doc(playlistItemsCollection(playlistId), musicId), {
          tomPersonalizado: validatePersonalizedKey(personalizedKey),
        });
      } catch (error) {
        throw wrapError(error);
      }
    },

    async duplicatePlaylist(playlistId: string): Promise<string> {
      try {
        const playlists = userPlaylistCollection();
        validateId(playlistId, 'da playlist');
        const uid = requireUid(getUid);
        const sourceRef = doc(playlists, playlistId);
        const duplicateRef = doc(playlists);
        const observedSource = await getDoc(sourceRef);
        if (!observedSource.exists()) {
          throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
        }
        const observedItems = await getItems(playlistId);
        if (observedItems.length > maxItemsPerPlaylist) {
          throw new PlaylistRepositoryError(`Não é possível duplicar mais de ${maxItemsPerPlaylist} músicas em uma operação.`, 'validation/too-many-items');
        }

        let itemsToCopy: PlaylistItemRecord[] = [];

        try {
          await runTransaction(firestore!, async (transaction) => {
            const [sourceSnapshot, itemSnapshots] = await Promise.all([
              transaction.get(sourceRef),
              Promise.all(observedItems.map((item) => transaction.get(doc(sourceRef, 'itens', item.id)))),
            ]);
            if (!sourceSnapshot.exists()) {
              throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
            }
            if (!sourceSnapshot.data().updatedAt.isEqual(observedSource.data().updatedAt)) {
              throw new PlaylistRepositoryError('A playlist mudou. Atualize e tente duplicar novamente.', 'validation/stale-playlist');
            }

            const sourceData = sourceSnapshot.data();
            const name = copyName(sourceData.nome);
            const type = validateType(sourceData.tipo);
            if (itemSnapshots.some((snapshot) => !snapshot.exists())) {
              throw new PlaylistRepositoryError('A lista de músicas mudou. Atualize a playlist e tente duplicar novamente.', 'validation/stale-playlist');
            }
            const items = itemSnapshots.map((snapshot, index) => {
              const item = validatePlaylistItem({ id: snapshot.id, ...snapshot.data() } as PlaylistItemRecord);
              const observed = observedItems[index];
              if (item.musicaId !== observed.musicaId
                || item.posicao !== observed.posicao
                || item.momento !== observed.momento
                || item.tomPersonalizado !== observed.tomPersonalizado) {
                throw new PlaylistRepositoryError('A lista de músicas mudou. Atualize a playlist e tente duplicar novamente.', 'validation/stale-playlist');
              }
              return item;
            });
            const musicSnapshots = await Promise.all(
              items.map((item) => transaction.get(doc(firestore!, 'usuarios', uid, 'musicas', item.musicaId))),
            );
            if (musicSnapshots.some((snapshot) => !snapshot.exists())) {
              throw new PlaylistRepositoryError('A playlist contém uma música que não existe na sua biblioteca.', 'invalid-music-reference');
            }

            itemsToCopy = items;
            transaction.set(duplicateRef, {
              nome: name,
              tipo: type,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });

          for (let offset = 0; offset < itemsToCopy.length; offset += maxItemsPerCopyBatch) {
            const batch = writeBatch(firestore!);
            itemsToCopy
              .slice(offset, offset + maxItemsPerCopyBatch)
              .forEach((item) => {
                batch.set(doc(duplicateRef, 'itens', item.musicaId), {
                  musicaId: item.musicaId,
                  posicao: item.posicao,
                  momento: item.momento,
                  tomPersonalizado: item.tomPersonalizado,
                });
              });
            await batch.commit();
          }

          return duplicateRef.id;
        } catch (error) {
          try {
            const cleanup = writeBatch(firestore!);
            itemsToCopy.forEach((item) => cleanup.delete(doc(duplicateRef, 'itens', item.musicaId)));
            cleanup.delete(duplicateRef);
            await cleanup.commit();
          } catch (cleanupError) {
            const code = typeof cleanupError === 'object' && cleanupError !== null && 'code' in cleanupError
              ? String(cleanupError.code)
              : 'firestore/cleanup-failed';
            throw new PlaylistRepositoryError(
              'A duplicação falhou e não foi possível limpar a cópia incompleta. Atualize suas playlists e tente novamente.',
              code,
            );
          }
          throw error;
        }
      } catch (error) {
        throw wrapError(error);
      }
    },

    async updatePlaylist(playlistId: string, input: PlaylistInput): Promise<void> {
      try {
        await updateDoc(playlistDocument(playlistId), {
          nome: validateName(input.nome),
          tipo: validateType(input.tipo),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        throw wrapError(error);
      }
    },

    async deletePlaylist(playlistId: string): Promise<void> {
      try {
        const reference = playlistDocument(playlistId);
        const observed = await getDoc(reference);
        if (!observed.exists()) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
        const items = await getItems(playlistId);
        if (items.length > maxItemsPerPlaylist) {
          throw new PlaylistRepositoryError(`Não é possível excluir mais de ${maxItemsPerPlaylist} músicas em uma operação.`, 'validation/too-many-items');
        }

        await runTransaction(firestore!, async (transaction) => {
          const current = await transaction.get(reference);
          if (!current.exists()) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
          if (!current.data().updatedAt.isEqual(observed.data().updatedAt)) {
            throw new PlaylistRepositoryError('A playlist mudou. Atualize e tente excluir novamente.', 'validation/stale-playlist');
          }
          const itemSnapshots = await Promise.all(items.map((item) => transaction.get(doc(playlistItemsCollection(playlistId), item.id))));
          itemSnapshots.forEach((item) => { if (item.exists()) transaction.delete(item.ref); });
          transaction.delete(reference);
        });
      } catch (error) {
        throw wrapError(error);
      }
    },

    async addMusicToPlaylist(playlistId: string, musicId: string): Promise<void> {
      try {
        validateId(musicId, 'da música');
        const playlistRef = playlistDocument(playlistId);
        const musicRef = doc(firestore!, 'usuarios', requireUid(getUid), 'musicas', musicId);
        const itemsRef = playlistItemsCollection(playlistId);
        const itemRef = doc(itemsRef, musicId);
        const observedPlaylist = await getDoc(playlistRef);
        if (!observedPlaylist.exists()) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
        const existingItems = await getItems(playlistId);
        if (existingItems.length >= maxItemsPerPlaylist) {
          throw new PlaylistRepositoryError(`A playlist aceita até ${maxItemsPerPlaylist} músicas.`, 'validation/too-many-items');
        }

        await runTransaction(firestore!, async (transaction) => {
          const [playlistSnapshot, musicSnapshot, itemSnapshot] = await Promise.all([
            transaction.get(playlistRef),
            transaction.get(musicRef),
            transaction.get(itemRef),
          ]);
          if (!playlistSnapshot.exists()) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
          if (!playlistSnapshot.data().updatedAt.isEqual(observedPlaylist.data().updatedAt)) {
            throw new PlaylistRepositoryError('A playlist mudou. Atualize antes de adicionar músicas.', 'validation/stale-playlist');
          }
          if (!musicSnapshot.exists()) throw new PlaylistRepositoryError('A música não existe na sua biblioteca.', 'invalid-music-reference');
          if (itemSnapshot.exists()) throw new PlaylistRepositoryError('Essa música já está na playlist.', 'already-exists');

          transaction.set(itemRef, {
            musicaId: musicId,
            posicao: existingItems.length + 1,
            momento: null,
            tomPersonalizado: null,
          });
          transaction.update(playlistRef, { updatedAt: serverTimestamp() });
        });
      } catch (error) {
        throw wrapError(error);
      }
    },

    async removeMusicFromPlaylist(playlistId: string, musicId: string): Promise<void> {
      try {
        validateId(musicId, 'da música');
        const playlistRef = playlistDocument(playlistId);
        const itemsRef = playlistItemsCollection(playlistId);
        const itemRef = doc(itemsRef, musicId);
        const observed = await readPlaylistDetails(playlistId);
        if (!observed) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
        if (!observed.itens.some((item) => item.musicaId === musicId)) {
          throw new PlaylistRepositoryError('A música não está na playlist.', 'not-found');
        }
        if (observed.itens.length > maxItemsPerPlaylist) {
          throw new PlaylistRepositoryError(`Não é possível reordenar mais de ${maxItemsPerPlaylist} músicas.`, 'validation/too-many-items');
        }

        await runTransaction(firestore!, async (transaction) => {
          const [playlistSnapshot, itemSnapshots] = await Promise.all([
            transaction.get(playlistRef),
            Promise.all(observed.itens.map((item) => transaction.get(doc(itemsRef, item.id)))),
          ]);
          if (!playlistSnapshot.exists()) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
          if (!playlistSnapshot.data().updatedAt.isEqual(observed.updatedAt)) {
            throw new PlaylistRepositoryError('A playlist mudou. Atualize antes de remover músicas.', 'validation/stale-playlist');
          }
          if (itemSnapshots.some((item) => !item.exists())) throw new PlaylistRepositoryError('A lista de músicas mudou. Atualize a playlist.', 'validation/stale-playlist');

          transaction.delete(itemRef);
          itemSnapshots
            .filter((item) => item.id !== musicId)
            .forEach((item, index) => transaction.update(item.ref, { posicao: index + 1 }));
          transaction.update(playlistRef, { updatedAt: serverTimestamp() });
        });
      } catch (error) {
        throw wrapError(error);
      }
    },

    async reorderPlaylistItems(playlistId: string, orderedMusicIds: string[]): Promise<void> {
      try {
        const playlistRef = playlistDocument(playlistId);
        const itemsRef = playlistItemsCollection(playlistId);
        if (new Set(orderedMusicIds).size !== orderedMusicIds.length) {
          throw new PlaylistRepositoryError('A ordem contém músicas duplicadas.', 'validation/duplicate');
        }
        if (orderedMusicIds.length > maxItemsPerPlaylist) {
          throw new PlaylistRepositoryError(`A playlist aceita até ${maxItemsPerPlaylist} músicas.`, 'validation/too-many-items');
        }
        orderedMusicIds.forEach((id) => validateId(id, 'da música'));
        const observed = await readPlaylistDetails(playlistId);
        if (!observed) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
        const observedIds = new Set(observed.itens.map((item) => item.musicaId));
        if (observedIds.size !== orderedMusicIds.length || orderedMusicIds.some((id) => !observedIds.has(id))) {
          throw new PlaylistRepositoryError('A lista de músicas mudou. Atualize a playlist antes de reordenar.', 'validation/stale-order');
        }

        await runTransaction(firestore!, async (transaction) => {
          const [playlistSnapshot, itemSnapshots] = await Promise.all([
            transaction.get(playlistRef),
            Promise.all(orderedMusicIds.map((id) => transaction.get(doc(itemsRef, id)))),
          ]);
          if (!playlistSnapshot.exists()) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
          if (!playlistSnapshot.data().updatedAt.isEqual(observed.updatedAt)) {
            throw new PlaylistRepositoryError('A playlist mudou. Atualize antes de reordenar.', 'validation/stale-order');
          }
          if (itemSnapshots.some((item) => !item.exists())) throw new PlaylistRepositoryError('A lista de músicas mudou. Atualize a playlist.', 'validation/stale-order');
          orderedMusicIds.forEach((_, index) => transaction.update(itemSnapshots[index].ref, { posicao: index + 1 }));
          transaction.update(playlistRef, { updatedAt: serverTimestamp() });
        });
      } catch (error) {
        throw wrapError(error);
      }
    },
  };
}

const repository = createPlaylistRepository(db, () => auth?.currentUser?.uid ?? null);

export const createPlaylist = repository.createPlaylist;
export const listPlaylists = repository.listPlaylists;
export const getPlaylistById = repository.getPlaylistById;
export const updatePlaylistItemKey = repository.updatePlaylistItemKey;
export const duplicatePlaylist = repository.duplicatePlaylist;
export const updatePlaylist = repository.updatePlaylist;
export const deletePlaylist = repository.deletePlaylist;
export const addMusicToPlaylist = repository.addMusicToPlaylist;
export const removeMusicFromPlaylist = repository.removeMusicFromPlaylist;
export const reorderPlaylistItems = repository.reorderPlaylistItems;
