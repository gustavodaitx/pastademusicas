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
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Firestore, QueryDocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { MOMENTOS_IGREJA } from '../types/firestore';
import type {
  MomentoIgreja,
  MomentoIgrejaId,
  MomentoIgrejaV1,
  MomentoIgrejaV2,
  Playlist,
  PlaylistIgrejaV1,
  PlaylistIgrejaV2,
  PlaylistItem,
  PlaylistType,
} from '../types/firestore';

export type PlaylistInput = Pick<Playlist, 'nome' | 'tipo'>;
export type PlaylistRecord = Playlist & { id: string };
export type PlaylistItemRecord = PlaylistItem & { id: string };
export type PlaylistDetails = PlaylistRecord & { itens: PlaylistItemRecord[] };
export type PlaylistIgrejaInput = { nome: string; momentosIgreja: MomentoIgreja[] };
export type PlaylistIgrejaV1Input = { nome: string; momentosIgreja: MomentoIgrejaV1[] };
export type PlaylistIgrejaV2Input = { nome: string; momentosIgreja: MomentoIgrejaV2[] };
export type PlaylistIgrejaRecord = (PlaylistIgrejaV1 | PlaylistIgrejaV2) & { id: string };
export type ChurchPlaylistReadResult =
  | { kind: 'structured'; playlist: PlaylistIgrejaRecord }
  | { kind: 'legacy'; playlist: PlaylistDetails };
export type PlaylistMomentUpdate = {
  versaoEstrutura: 1 | 2;
  musicaId?: string | null;
  referenciaMusical?: { musicaId: string } | null;
  tomPersonalizado?: string | null;
};
export type ChurchPlaylistFormat = 'structured' | 'legacy' | 'not-church' | 'invalid';
export type CreatePlaylistWithItemsInput = {
  nome: string;
  tipo?: PlaylistType;
  musicIds: string[];
};

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
const legacyPlaylistFields = ['nome', 'tipo', 'createdAt', 'updatedAt'];
const structuredChurchPlaylistFields = [
  ...legacyPlaylistFields,
  'versaoEstrutura',
  'momentosIgreja',
];

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

function isWellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (index + 1 >= value.length) return false;
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function validateV1MusicId(id: string): void {
  if (id.length === 0 || id.includes('/') || !isWellFormedUtf16(id)
    || new TextEncoder().encode(id).byteLength > 1500) {
    throw new PlaylistRepositoryError('O identificador da música é inválido.', 'validation/id');
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasValidPlaylistName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxPlaylistNameLength;
}

function hasValidPlaylistMetadata(
  data: Record<string, unknown>,
  requiredFields: string[],
  expectedType: PlaylistType,
  optionalFields: string[] = [],
): boolean {
  const allowedFields = new Set([...requiredFields, ...optionalFields]);
  if (Object.keys(data).some((field) => !allowedFields.has(field))) return false;
  if (!requiredFields.every((field) => Object.prototype.hasOwnProperty.call(data, field))) return false;
  if (typeof data.nome !== 'string' || !hasValidPlaylistName(data.nome)) return false;
  if (data.tipo !== expectedType) return false;
  if (!(data.createdAt instanceof Timestamp) || !(data.updatedAt instanceof Timestamp)) return false;
  if (Object.prototype.hasOwnProperty.call(data, 'copiadaDePlaylist') && (typeof data.copiadaDePlaylist !== 'string' || data.copiadaDePlaylist.trim().length === 0)) {
    return false;
  }
  return true;
}

function hasValidChurchMoments(value: unknown, version?: 1 | 2): boolean {
  try {
    if (version === 1) readStoredChurchMomentsV1(value);
    else validateChurchMoments(value, version);
    return true;
  } catch (error) {
    if (error instanceof PlaylistRepositoryError) return false;
    throw error;
  }
}

function ensureMomentVersion(value: unknown): 1 | 2 {
  if (!Array.isArray(value)) return 1;
  const sample = value.find((candidate) => isRecord(candidate));
  if (!sample || !Object.prototype.hasOwnProperty.call(sample, 'referenciaMusical')) return 1;
  return 2;
}

export function identifyChurchPlaylistFormat(value: unknown): ChurchPlaylistFormat {
  if (!isRecord(value)) return 'invalid';

  const hasVersion = Object.prototype.hasOwnProperty.call(value, 'versaoEstrutura');
  const hasMoments = Object.prototype.hasOwnProperty.call(value, 'momentosIgreja');
  const hasStructuralMarkers = hasVersion || hasMoments;

  if (!hasStructuralMarkers) {
    if (value.tipo !== 'igreja') return 'not-church';
    return hasValidPlaylistMetadata(value, legacyPlaylistFields, 'igreja') ? 'legacy' : 'invalid';
  }

  if (value.tipo !== 'igreja') return 'invalid';
  if (!Number.isInteger(value.versaoEstrutura)) return 'invalid';
  if (!Array.isArray(value.momentosIgreja)) return 'invalid';

  const version = Number(value.versaoEstrutura);
  if (version === 1) {
    if (!hasValidPlaylistMetadata(value, structuredChurchPlaylistFields, 'igreja', ['copiadaDePlaylist'])) return 'invalid';
    return hasValidChurchMoments(value.momentosIgreja, 1) ? 'structured' : 'invalid';
  }
  if (version === 2) {
    if (!hasValidPlaylistMetadata(value, structuredChurchPlaylistFields, 'igreja', ['copiadaDePlaylist'])) return 'invalid';
    return hasValidChurchMoments(value.momentosIgreja, 2) ? 'structured' : 'invalid';
  }
  return 'invalid';
}

export function createEmptyChurchMoments(version: 1): MomentoIgrejaV1[];
export function createEmptyChurchMoments(version: 2): MomentoIgrejaV2[];
export function createEmptyChurchMoments(): MomentoIgrejaV2[];
export function createEmptyChurchMoments(version?: 1 | 2): MomentoIgreja[];
export function createEmptyChurchMoments(version: 1 | 2 = 2): MomentoIgreja[] {
  if (version === 1) {
    return MOMENTOS_IGREJA.map(({ id }) => ({
      momentoId: id,
      musicaId: null,
      tomPersonalizado: null,
    }));
  }

  return MOMENTOS_IGREJA.map(({ id }) => ({
    momentoId: id,
    referenciaMusical: null,
    tomPersonalizado: null,
  }));
}

function validateChurchReference(value: unknown): { musicaId: string } | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || Object.keys(value).length !== 1 || !Object.prototype.hasOwnProperty.call(value, 'musicaId')) {
    throw new PlaylistRepositoryError('A referência musical deve ser um objeto com musicaId.', 'validation/church-reference');
  }
  if (typeof value.musicaId !== 'string' || value.musicaId.trim().length === 0) {
    throw new PlaylistRepositoryError('A música da referência deve ter um ID válido.', 'validation/church-reference');
  }
  validateId(value.musicaId, 'da música');
  return { musicaId: value.musicaId };
}

function validateChurchMomentV1(rawMoment: unknown, index: number): { momentoId: MomentoIgrejaId; musicaId: string | null; tomPersonalizado: string | null } {
  if (!isRecord(rawMoment)) {
    throw new PlaylistRepositoryError('A playlist contém um momento inválido.', 'validation/church-moment');
  }

  const allowedFields = ['momentoId', 'musicaId', 'tomPersonalizado'];
  if (Object.keys(rawMoment).length !== allowedFields.length
    || !allowedFields.every((field) => Object.prototype.hasOwnProperty.call(rawMoment, field))) {
    throw new PlaylistRepositoryError('A playlist contém campos inválidos em um momento.', 'validation/church-moment');
  }
  if (rawMoment.momentoId !== MOMENTOS_IGREJA[index].id) {
    throw new PlaylistRepositoryError('Os momentos da playlist estão fora da ordem obrigatória.', 'validation/church-order');
  }

  let musicaId: string | null;
  if (rawMoment.musicaId === null) {
    musicaId = null;
  } else if (typeof rawMoment.musicaId === 'string') {
    validateV1MusicId(rawMoment.musicaId);
    musicaId = rawMoment.musicaId;
  } else {
    throw new PlaylistRepositoryError('A referência da música deve ser um ID ou null.', 'validation/church-moment');
  }

  const tomPersonalizado = validatePersonalizedKey(rawMoment.tomPersonalizado);
  return {
    momentoId: MOMENTOS_IGREJA[index].id,
    musicaId,
    tomPersonalizado,
  };
}

function readStoredChurchMomentsV1(value: unknown): MomentoIgrejaV1[] {
  if (!Array.isArray(value) || value.length !== MOMENTOS_IGREJA.length) {
    throw new PlaylistRepositoryError('A playlist de Igreja deve conter exatamente 10 momentos.', 'validation/church-moments');
  }

  return value.map((rawMoment, index) => {
    if (!isRecord(rawMoment)) {
      throw new PlaylistRepositoryError('A playlist contém um momento inválido.', 'validation/church-moment');
    }

    const allowedFields = ['momentoId', 'musicaId', 'tomPersonalizado'];
    if (Object.keys(rawMoment).length !== allowedFields.length
      || !allowedFields.every((field) => Object.prototype.hasOwnProperty.call(rawMoment, field))) {
      throw new PlaylistRepositoryError('A playlist contém campos inválidos em um momento.', 'validation/church-moment');
    }
    if (rawMoment.momentoId !== MOMENTOS_IGREJA[index].id) {
      throw new PlaylistRepositoryError('Os momentos da playlist estão fora da ordem obrigatória.', 'validation/church-order');
    }

    const musicaId = rawMoment.musicaId;
    if (musicaId !== null && typeof musicaId !== 'string') {
      throw new PlaylistRepositoryError('A referência da música deve ser um ID ou null.', 'validation/church-moment');
    }
    const tomPersonalizado = rawMoment.tomPersonalizado;
    if (tomPersonalizado !== null && (typeof tomPersonalizado !== 'string' || tomPersonalizado.length > 12)) {
      throw new PlaylistRepositoryError('A playlist contém um tom personalizado inválido.', 'validation/church-moment');
    }

    return {
      momentoId: MOMENTOS_IGREJA[index].id,
      musicaId,
      tomPersonalizado,
    };
  });
}

function validateChurchMomentV2(rawMoment: unknown, index: number): { momentoId: MomentoIgrejaId; referenciaMusical: { musicaId: string } | null; tomPersonalizado: string | null } {
  if (!isRecord(rawMoment)) {
    throw new PlaylistRepositoryError('A playlist contém um momento inválido.', 'validation/church-moment');
  }

  const allowedFields = ['momentoId', 'referenciaMusical', 'tomPersonalizado'];
  if (Object.keys(rawMoment).length !== allowedFields.length
    || !allowedFields.every((field) => Object.prototype.hasOwnProperty.call(rawMoment, field))) {
    throw new PlaylistRepositoryError('A playlist contém campos inválidos em um momento.', 'validation/church-moment');
  }
  if (rawMoment.momentoId !== MOMENTOS_IGREJA[index].id) {
    throw new PlaylistRepositoryError('Os momentos da playlist estão fora da ordem obrigatória.', 'validation/church-order');
  }

  const referenciaMusical = validateChurchReference(rawMoment.referenciaMusical);
  const tomPersonalizado = validatePersonalizedKey(rawMoment.tomPersonalizado);
  return {
    momentoId: MOMENTOS_IGREJA[index].id,
    referenciaMusical,
    tomPersonalizado,
  };
}

export function validateChurchMoments(value: unknown, version?: 1 | 2): MomentoIgreja[] {
  if (!Array.isArray(value) || value.length !== MOMENTOS_IGREJA.length) {
    throw new PlaylistRepositoryError('A playlist de Igreja deve conter exatamente 10 momentos.', 'validation/church-moments');
  }

  const targetVersion = version ?? ensureMomentVersion(value);
  return value.map((rawMoment, index) => {
    if (targetVersion === 1) return validateChurchMomentV1(rawMoment, index);
    return validateChurchMomentV2(rawMoment, index);
  });
}

function assertLegacyItemsFormat(data: Record<string, unknown>): void {
  const format = identifyChurchPlaylistFormat(data);
  if (format === 'structured') {
    throw new PlaylistRepositoryError(
      'Use as operações específicas do Modo Igreja para alterar os momentos.',
      'structured-playlist',
    );
  }
  if (format === 'invalid') {
    throw new PlaylistRepositoryError('A estrutura da playlist de Igreja é inválida ou não suportada.', 'invalid-playlist-format');
  }
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
    assertLegacyItemsFormat(snapshot.data());
    const itens = await getItems(playlistId);
    return { id: snapshot.id, ...snapshot.data(), itens } as PlaylistDetails;
  }

  function normalizeChurchMomentForVersion(rawMoment: MomentoIgreja, version: 1 | 2): Record<string, unknown> {
    if (version === 1) {
      const moment = rawMoment as Record<string, unknown>;
      const musicaId = Object.prototype.hasOwnProperty.call(moment, 'musicaId') ? moment.musicaId : null;
      return {
        momentoId: moment.momentoId,
        musicaId,
        tomPersonalizado: validatePersonalizedKey(moment.tomPersonalizado),
      };
    }

    const moment = rawMoment as Record<string, unknown>;
    const referenciaMusical = Object.prototype.hasOwnProperty.call(moment, 'referenciaMusical')
      ? moment.referenciaMusical
      : (moment.musicaId === null ? null : { musicaId: String(moment.musicaId) });

    return {
      momentoId: moment.momentoId,
      referenciaMusical: referenciaMusical === null ? null : validateChurchReference(referenciaMusical),
      tomPersonalizado: validatePersonalizedKey(moment.tomPersonalizado),
    };
  }

  async function duplicateStructuredChurchPlaylist(playlistId: string): Promise<string> {
    const playlists = userPlaylistCollection();
    const sourceRef = doc(playlists, playlistId);
    const duplicateRef = doc(playlists);

    return runTransaction(firestore!, async (transaction) => {
      const sourceSnapshot = await transaction.get(sourceRef);
      if (!sourceSnapshot.exists()) {
        throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
      }

      const source = sourceSnapshot.data();
      const format = identifyChurchPlaylistFormat(source);
      if (format !== 'structured') {
        throw new PlaylistRepositoryError('A playlist não possui uma estrutura de Igreja válida.', 'invalid-playlist-format');
      }

      const version = Number(source.versaoEstrutura) as 1 | 2;
      const momentosIgreja = version === 1
        ? readStoredChurchMomentsV1(source.momentosIgreja)
        : validateChurchMoments(source.momentosIgreja, version)
          .map((moment) => normalizeChurchMomentForVersion(moment, version));
      transaction.set(duplicateRef, {
        nome: copyName(source.nome),
        tipo: 'igreja',
        versaoEstrutura: version,
        momentosIgreja,
        copiadaDePlaylist: playlistId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return duplicateRef.id;
    });
  }

  async function createStructuredChurchPlaylistV2(input: PlaylistIgrejaV2Input): Promise<string> {
    if (!input || typeof input !== 'object') {
      throw new PlaylistRepositoryError('Informe os dados da playlist de Igreja.', 'validation/type');
    }

    const nome = validateName(input.nome);
    const sourceMoments = validateChurchMoments(input.momentosIgreja, 2) as MomentoIgrejaV2[];
    const momentosIgreja = sourceMoments.map((moment) => normalizeChurchMomentForVersion(moment, 2));
    const uid = requireUid(getUid);
    const playlistRef = doc(userPlaylistCollection());
    const musicIds = [...new Set(momentosIgreja
      .map((moment) => {
        if (isRecord(moment) && 'referenciaMusical' in moment && isRecord(moment.referenciaMusical) && typeof moment.referenciaMusical.musicaId === 'string') {
          return moment.referenciaMusical.musicaId;
        }
        if (isRecord(moment) && 'musicaId' in moment && typeof moment.musicaId === 'string') {
          return moment.musicaId;
        }
        return null;
      })
      .filter((musicaId): musicaId is string => musicaId !== null))];
    const musicRefs = musicIds.map((musicId) => doc(firestore!, 'usuarios', uid, 'musicas', musicId));

    await runTransaction(firestore!, async (transaction) => {
      const musicSnapshots = await Promise.all(musicRefs.map((reference) => transaction.get(reference)));
      if (musicSnapshots.some((snapshot) => !snapshot.exists())) {
        throw new PlaylistRepositoryError('A playlist contém uma música que não existe na sua biblioteca.', 'invalid-music-reference');
      }

      transaction.set(playlistRef, {
        nome,
        tipo: 'igreja',
        versaoEstrutura: 2,
        momentosIgreja,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return playlistRef.id;
  }

  async function deletePlaylistRecord(playlistId: string, requireChurchStructure: boolean): Promise<void> {
    const reference = playlistDocument(playlistId);
    const observed = await getDoc(reference);
    if (!observed.exists()) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');

    const observedFormat = identifyChurchPlaylistFormat(observed.data());
    if (requireChurchStructure) {
      if (observedFormat !== 'structured') {
        throw new PlaylistRepositoryError('A playlist não possui uma estrutura de Igreja v1.', 'invalid-playlist-format');
      }
    } else {
      assertLegacyItemsFormat(observed.data());
    }

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

      const currentFormat = identifyChurchPlaylistFormat(current.data());
      if (requireChurchStructure) {
        if (currentFormat !== 'structured') {
          throw new PlaylistRepositoryError('A playlist não possui uma estrutura de Igreja v1.', 'invalid-playlist-format');
        }
      } else {
        assertLegacyItemsFormat(current.data());
      }

      const itemSnapshots = await Promise.all(items.map((item) => transaction.get(doc(playlistItemsCollection(playlistId), item.id))));
      itemSnapshots.forEach((item) => { if (item.exists()) transaction.delete(item.ref); });
      transaction.delete(reference);
    });
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

    async createChurchPlaylist(input: PlaylistIgrejaV1Input): Promise<string> {
      try {
        if (!input || typeof input !== 'object') {
          throw new PlaylistRepositoryError('Informe os dados da playlist de Igreja.', 'validation/type');
        }
        const legacyMoments = validateChurchMoments(input.momentosIgreja, 1) as MomentoIgrejaV1[];
        const momentsV2 = legacyMoments.map((moment) => ({
          momentoId: moment.momentoId,
          referenciaMusical: moment.musicaId === null ? null : { musicaId: moment.musicaId },
          tomPersonalizado: moment.tomPersonalizado,
        })) as MomentoIgrejaV2[];
        return await createStructuredChurchPlaylistV2({
          nome: input.nome,
          momentosIgreja: momentsV2,
        });
      } catch (error) {
        throw wrapError(error);
      }
    },

    async createChurchPlaylistV2(input: PlaylistIgrejaV2Input): Promise<string> {
      try {
        return await createStructuredChurchPlaylistV2(input);
      } catch (error) {
        throw wrapError(error);
      }
    },

    async getChurchPlaylist(playlistId: string): Promise<ChurchPlaylistReadResult | null> {
      try {
        const snapshot = await getDoc(playlistDocument(playlistId));
        if (!snapshot.exists()) return null;

        const data = snapshot.data();
        const format = identifyChurchPlaylistFormat(data);
        if (format === 'structured') {
          const version = Number(data.versaoEstrutura) as 1 | 2;
          const playlist = {
            id: snapshot.id,
            ...data,
            momentosIgreja: version === 1
              ? readStoredChurchMomentsV1(data.momentosIgreja)
              : validateChurchMoments(data.momentosIgreja, version),
          } as PlaylistIgrejaRecord;
          return { kind: 'structured', playlist };
        }
        if (format === 'legacy') {
          const itens = await getItems(playlistId);
          return { kind: 'legacy', playlist: { id: snapshot.id, ...data, itens } as PlaylistDetails };
        }
        throw new PlaylistRepositoryError(
          format === 'invalid'
            ? 'A estrutura da playlist de Igreja é inválida ou não suportada.'
            : 'A playlist não é do tipo Igreja.',
          'invalid-playlist-format',
        );
      } catch (error) {
        throw wrapError(error);
      }
    },

    async updateChurchMoment(
      playlistId: string,
      momentoId: MomentoIgrejaId,
      update: PlaylistMomentUpdate,
    ): Promise<void> {
      try {
        const momentIndex = MOMENTOS_IGREJA.findIndex((moment) => moment.id === momentoId);
        if (momentIndex < 0) {
          throw new PlaylistRepositoryError('O identificador do momento é inválido.', 'validation/church-moment');
        }
        if (!update || typeof update !== 'object'
          || !Object.prototype.hasOwnProperty.call(update, 'versaoEstrutura')
          || (update.versaoEstrutura !== 1 && update.versaoEstrutura !== 2)) {
          throw new PlaylistRepositoryError('Informe uma versão de estrutura válida.', 'validation/church-version');
        }
        const declaredVersion = update.versaoEstrutura;
        if (!Object.prototype.hasOwnProperty.call(update, 'musicaId')
          && !Object.prototype.hasOwnProperty.call(update, 'referenciaMusical')
          && !Object.prototype.hasOwnProperty.call(update, 'tomPersonalizado')) {
          throw new PlaylistRepositoryError('Informe ao menos um campo para atualizar.', 'validation/empty-update');
        }

        let musicaId: string | null | undefined;
        let referenciaMusical: { musicaId: string } | null | undefined;
        if (Object.prototype.hasOwnProperty.call(update, 'musicaId')) {
          if (update.musicaId !== null && typeof update.musicaId !== 'string') {
            throw new PlaylistRepositoryError('A referência da música deve ser um ID ou null.', 'validation/church-moment');
          }
          if (declaredVersion === 2 && typeof update.musicaId === 'string') {
            validateId(update.musicaId, 'da música');
          }
          musicaId = update.musicaId;
        }
        if (Object.prototype.hasOwnProperty.call(update, 'referenciaMusical')) {
          if (update.referenciaMusical === null) {
            referenciaMusical = null;
          } else if (update.referenciaMusical && typeof update.referenciaMusical === 'object' && typeof update.referenciaMusical.musicaId === 'string') {
            if (declaredVersion === 2) validateId(update.referenciaMusical.musicaId, 'da música');
            referenciaMusical = { musicaId: update.referenciaMusical.musicaId };
          } else {
            throw new PlaylistRepositoryError('A referência musical deve ter um musicaId válido.', 'validation/church-reference');
          }
        }
        const tomPersonalizado = Object.prototype.hasOwnProperty.call(update, 'tomPersonalizado')
          ? validatePersonalizedKey(update.tomPersonalizado)
          : undefined;

        const uid = requireUid(getUid);
        const playlistRef = playlistDocument(playlistId);
        await runTransaction(firestore!, async (transaction) => {
          const snapshot = await transaction.get(playlistRef);
          if (!snapshot.exists()) throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
          const data = snapshot.data();
          const format = identifyChurchPlaylistFormat(data);
          if (format !== 'structured') {
            throw new PlaylistRepositoryError('A playlist não possui uma estrutura de Igreja válida.', 'invalid-playlist-format');
          }

          const version = Number(data.versaoEstrutura) as 1 | 2;
          if (version !== declaredVersion) {
            throw new PlaylistRepositoryError('A versão da playlist não corresponde à versão solicitada.', 'invalid-playlist-format');
          }
          const momentosIgreja = version === 1
            ? readStoredChurchMomentsV1(data.momentosIgreja)
            : validateChurchMoments(data.momentosIgreja, version);

          const currentMoment = momentosIgreja[momentIndex] as Record<string, unknown>;
          const nextMusicaId = version === 1
            ? (musicaId !== undefined
              ? musicaId
              : (referenciaMusical !== undefined ? (referenciaMusical === null ? null : referenciaMusical.musicaId) : (
                typeof currentMoment.musicaId === 'string' ? currentMoment.musicaId : null
              )))
            : undefined;
          const musicIdForValidation = version === 1
            ? (nextMusicaId !== currentMoment.musicaId && typeof nextMusicaId === 'string' ? nextMusicaId : null)
            : (referenciaMusical !== undefined ? referenciaMusical?.musicaId ?? null : musicaId);
          if (version === 1 && typeof musicIdForValidation === 'string') {
            validateV1MusicId(musicIdForValidation);
          }
          if (typeof musicIdForValidation === 'string') {
            const musicSnapshot = await transaction.get(doc(firestore!, 'usuarios', uid, 'musicas', musicIdForValidation));
            if (!musicSnapshot.exists()) {
              throw new PlaylistRepositoryError('A música não existe na sua biblioteca.', 'invalid-music-reference');
            }
          }

          if (version === 1) {
            const nextMoment: Record<string, unknown> = { ...currentMoment, musicaId: nextMusicaId };
            if (Object.prototype.hasOwnProperty.call(update, 'tomPersonalizado')) {
              nextMoment.tomPersonalizado = tomPersonalizado;
            }
            const nextMoments = momentosIgreja.map((moment, index) => (
              index === momentIndex ? nextMoment : moment
            ));
            transaction.update(playlistRef, { momentosIgreja: nextMoments, updatedAt: serverTimestamp() });
            return;
          }

          const nextReferenciaMusical = referenciaMusical !== undefined
            ? referenciaMusical
            : (musicaId !== undefined ? (musicaId === null ? null : { musicaId }) : (currentMoment.referenciaMusical ?? null));
          currentMoment.referenciaMusical = nextReferenciaMusical;
          if (Object.prototype.hasOwnProperty.call(update, 'tomPersonalizado')) {
            currentMoment.tomPersonalizado = tomPersonalizado;
          } else {
            const existingTom = typeof currentMoment.tomPersonalizado === 'string' ? currentMoment.tomPersonalizado : null;
            currentMoment.tomPersonalizado = existingTom;
          }
          transaction.update(playlistRef, { momentosIgreja: momentosIgreja.map((moment) => ({
            momentoId: moment.momentoId,
            referenciaMusical: 'referenciaMusical' in moment ? moment.referenciaMusical : null,
            tomPersonalizado: moment.tomPersonalizado,
          })), updatedAt: serverTimestamp() });
        });
      } catch (error) {
        throw wrapError(error);
      }
    },

    async duplicateChurchPlaylist(playlistId: string): Promise<string> {
      try {
        validateId(playlistId, 'da playlist');
        return await duplicateStructuredChurchPlaylist(playlistId);
      } catch (error) {
        throw wrapError(error);
      }
    },

    async deleteChurchPlaylist(playlistId: string): Promise<void> {
      try {
        validateId(playlistId, 'da playlist');
        await deletePlaylistRecord(playlistId, true);
      } catch (error) {
        throw wrapError(error);
      }
    },

    async updatePlaylistItemKey(playlistId: string, musicId: string, personalizedKey: string | null): Promise<void> {
      try {
        validateId(musicId, 'da música');
        const parent = await getDoc(playlistDocument(playlistId));
        if (parent.exists()) assertLegacyItemsFormat(parent.data());
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
        const observedSource = await getDoc(doc(playlists, playlistId));
        if (!observedSource.exists()) {
          throw new PlaylistRepositoryError('A playlist não foi encontrada.', 'not-found');
        }
        const sourceFormat = identifyChurchPlaylistFormat(observedSource.data());
        if (sourceFormat === 'structured') {
          return await duplicateStructuredChurchPlaylist(playlistId);
        }
        if (sourceFormat === 'invalid') {
          throw new PlaylistRepositoryError('A estrutura da playlist de Igreja é inválida ou não suportada.', 'invalid-playlist-format');
        }

        const uid = requireUid(getUid);
        const sourceRef = doc(playlists, playlistId);
        const duplicateRef = doc(playlists);
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
        const reference = playlistDocument(playlistId);
        const current = await getDoc(reference);
        if (current.exists()) {
          const format = identifyChurchPlaylistFormat(current.data());
          if (format === 'structured' && input.tipo !== 'igreja') {
            throw new PlaylistRepositoryError(
              'Não é possível alterar o tipo de uma playlist de Igreja estruturada.',
              'validation/structured-playlist-type',
            );
          }
          if (format === 'invalid') {
            throw new PlaylistRepositoryError('A estrutura da playlist de Igreja é inválida ou não suportada.', 'invalid-playlist-format');
          }
        }
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
        await deletePlaylistRecord(playlistId, false);
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
        assertLegacyItemsFormat(observedPlaylist.data());
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
          assertLegacyItemsFormat(playlistSnapshot.data());
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

    async createPlaylistWithItems(input: CreatePlaylistWithItemsInput): Promise<string> {
      try {
        if (!input || typeof input !== 'object') {
          throw new PlaylistRepositoryError('Informe os dados da playlist.', 'validation/type');
        }
        const nome = validateName(input.nome);
        const tipo = validateType(input.tipo ?? 'barzinho');
        if (tipo === 'igreja') {
          throw new PlaylistRepositoryError(
            'Use as operações específicas do Modo Igreja para criar playlists estruturadas.',
            'validation/type',
          );
        }
        if (!Array.isArray(input.musicIds)) {
          throw new PlaylistRepositoryError('A lista de músicas deve ser uma lista de identificadores.', 'validation/type');
        }
        if (new Set(input.musicIds).size !== input.musicIds.length) {
          throw new PlaylistRepositoryError('A lista contém músicas duplicadas.', 'validation/duplicate');
        }
        if (input.musicIds.length > maxItemsPerPlaylist) {
          throw new PlaylistRepositoryError(`A playlist aceita até ${maxItemsPerPlaylist} músicas.`, 'validation/too-many-items');
        }
        input.musicIds.forEach((id) => validateId(id, 'da música'));

        const uid = requireUid(getUid);
        const playlists = userPlaylistCollection();
        const playlistRef = doc(playlists);
        const musicRefs = input.musicIds.map((id) => doc(firestore!, 'usuarios', uid, 'musicas', id));

        await runTransaction(firestore!, async (transaction) => {
          const musicSnapshots = await Promise.all(musicRefs.map((ref) => transaction.get(ref)));
          if (musicSnapshots.some((snapshot) => !snapshot.exists())) {
            throw new PlaylistRepositoryError('A playlist contém uma música que não existe na sua biblioteca.', 'invalid-music-reference');
          }
          transaction.set(playlistRef, {
            nome,
            tipo,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });

        const writtenMusicIds: string[] = [];
        try {
          for (let offset = 0; offset < input.musicIds.length; offset += maxItemsPerCopyBatch) {
            const batch = writeBatch(firestore!);
            const chunk = input.musicIds.slice(offset, offset + maxItemsPerCopyBatch);
            chunk.forEach((musicId, index) => {
              const position = offset + index + 1;
              batch.set(doc(playlistRef, 'itens', musicId), {
                musicaId: musicId,
                posicao: position,
                momento: null,
                tomPersonalizado: null,
              });
              writtenMusicIds.push(musicId);
            });
            await batch.commit();
          }
          return playlistRef.id;
        } catch (itemError) {
          try {
            const cleanup = writeBatch(firestore!);
            writtenMusicIds.forEach((musicId) => cleanup.delete(doc(playlistRef, 'itens', musicId)));
            cleanup.delete(playlistRef);
            await cleanup.commit();
          } catch (cleanupError) {
            const code = typeof cleanupError === 'object' && cleanupError !== null && 'code' in cleanupError
              ? String(cleanupError.code)
              : 'firestore/cleanup-failed';
            throw new PlaylistRepositoryError(
              'A criação da playlist falhou e não foi possível limpar os dados incompletos.',
              code,
            );
          }
          throw itemError;
        }
      } catch (error) {
        throw wrapError(error);
      }
    },
  };
}

const repository = createPlaylistRepository(db, () => auth?.currentUser?.uid ?? null);

export const createPlaylist = repository.createPlaylist;
export const createPlaylistWithItems = repository.createPlaylistWithItems;
export const listPlaylists = repository.listPlaylists;
export const getPlaylistById = repository.getPlaylistById;
export const createChurchPlaylist = repository.createChurchPlaylist;
export const createChurchPlaylistV2 = repository.createChurchPlaylistV2;
export const getChurchPlaylist = repository.getChurchPlaylist;
export const updateChurchMoment = repository.updateChurchMoment;
export const duplicateChurchPlaylist = repository.duplicateChurchPlaylist;
export const deleteChurchPlaylist = repository.deleteChurchPlaylist;
export const updatePlaylistItemKey = repository.updatePlaylistItemKey;
export const duplicatePlaylist = repository.duplicatePlaylist;
export const updatePlaylist = repository.updatePlaylist;
export const deletePlaylist = repository.deletePlaylist;
export const addMusicToPlaylist = repository.addMusicToPlaylist;
export const removeMusicFromPlaylist = repository.removeMusicFromPlaylist;
export const reorderPlaylistItems = repository.reorderPlaylistItems;
