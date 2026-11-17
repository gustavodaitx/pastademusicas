import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { Timestamp, collection, deleteDoc, deleteField, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMusicRepository, MusicRepositoryError } from '../services/musicRepository';
import type { MusicInput } from '../services/musicRepository';
import {
  createEmptyChurchMoments,
  createPlaylistRepository,
  PlaylistRepositoryError,
} from '../services/playlistRepository';
import type { PlaylistInput } from '../services/playlistRepository';
import { createRepertoireRepository, RepertoireRepositoryError } from '../services/repertoireRepository';
import type { RepertoireInput } from '../services/repertoireRepository';
import { createPreferencesRepository, PreferencesRepositoryError } from '../services/preferencesRepository';
import type { PreferencesInput } from '../services/preferencesRepository';
import type { Music } from '../types/firestore';

const projectId = 'demo-pasta-de-musica-t03';
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const [host, rawPort] = emulatorHost.split(':');
const timestamp = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));
let testEnvironment: RulesTestEnvironment;

const withCurrentTimestamps = <T extends object>(data: T) => ({
  ...data,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
const withCurrentUpdate = <T extends { updatedAt: unknown }>(data: T) => ({ ...data, updatedAt: serverTimestamp() });

const profile = {
  nome: 'Pessoa Teste',
  email: 'teste@example.com',
  perfil: 'FREE',
  createdAt: timestamp,
  updatedAt: timestamp,
};

const music: Music = {
  titulo: 'Música de teste',
  artista: null,
  tomOriginal: 'C',
  conteudoCifrado: 'Cifra de teste',
  categorias: [],
  tags: [],
  momentosLiturgicos: [],
  estilo: [],
  origemTipo: 'manual',
  driveFileId: null,
  arquivoNome: null,
  licencaOuPermissao: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const musicInput: MusicInput = {
  ...music,
};

const repositoryFor = (uid: string | null) => createMusicRepository(
  (uid ? testEnvironment.authenticatedContext(uid) : testEnvironment.unauthenticatedContext()).firestore() as unknown as Firestore,
  () => uid,
);

const playlistsFor = (uid: string | null) => createPlaylistRepository(
  (uid ? testEnvironment.authenticatedContext(uid) : testEnvironment.unauthenticatedContext()).firestore() as unknown as Firestore,
  () => uid,
);

const withRulesDisabledPlaylistRepository = (
  uid: string,
  operation: (repository: ReturnType<typeof createPlaylistRepository>, firestore: Firestore) => Promise<void>,
) => testEnvironment.withSecurityRulesDisabled(async (context) => {
  const firestore = context.firestore() as unknown as Firestore;
  return operation(createPlaylistRepository(firestore, () => uid), firestore);
});

const repertoiresFor = (uid: string | null) => createRepertoireRepository(
  (uid ? testEnvironment.authenticatedContext(uid) : testEnvironment.unauthenticatedContext()).firestore() as unknown as Firestore,
  () => uid,
);

const preferencesFor = (uid: string | null) => createPreferencesRepository(
  (uid ? testEnvironment.authenticatedContext(uid) : testEnvironment.unauthenticatedContext()).firestore() as unknown as Firestore,
  () => uid,
);

const playlistInput: PlaylistInput = { nome: 'Playlist privada', tipo: 'manual' };
const repertoireInput: RepertoireInput = { nome: 'Repertório privado', tipo: 'igreja', parametrosGeracao: null };

const playlist = {
  nome: 'Playlist de teste',
  tipo: 'manual',
  createdAt: timestamp,
  updatedAt: timestamp,
};

const playlistItem = {
  musicaId: 'musica-1',
  posicao: 1,
  momento: null,
  tomPersonalizado: null,
};

const repertoire = {
  nome: 'Repertório de teste',
  tipo: 'igreja',
  parametrosGeracao: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const preferences = {
  tema: 'sistema',
  tamanhoFonte: 18,
  velocidadeAutoscroll: 3,
  updatedAt: timestamp,
};

const preferencesInput: PreferencesInput = { tema: 'sistema', tamanhoFonte: 18, velocidadeAutoscroll: 3 };

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host,
      port: Number(rawPort),
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });
}, 30_000);

afterEach(async () => {
  await testEnvironment.clearFirestore();
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Firestore Security Rules (requires Emulator Suite)', () => {
  it('allows an authenticated owner to create and read their scoped documents', async () => {
    const db = testEnvironment.authenticatedContext('user-a').firestore();
    await assertSucceeds(setDoc(doc(db, 'usuarios/user-a'), withCurrentTimestamps(profile)));
    await assertSucceeds(setDoc(doc(db, 'usuarios/user-a/musicas/song-1'), withCurrentTimestamps(music)));
    await assertSucceeds(setDoc(doc(db, 'usuarios/user-a/playlists/list-1'), withCurrentTimestamps(playlist)));
    await assertSucceeds(setDoc(doc(db, 'usuarios/user-a/playlists/list-1/itens/song-1'), { ...playlistItem, musicaId: 'song-1' }));
    await assertSucceeds(setDoc(doc(db, 'usuarios/user-a/repertorios/set-1'), withCurrentTimestamps(repertoire)));
    await assertSucceeds(setDoc(doc(db, 'usuarios/user-a/repertorios/set-1/itens/song-1'), { ...playlistItem, musicaId: 'song-1' }));
    await assertSucceeds(setDoc(doc(db, 'usuarios/user-a/configuracoes/preferencias'), withCurrentUpdate(preferences)));
    await assertSucceeds(getDoc(doc(db, 'usuarios/user-a/musicas/song-1')));
    await assertSucceeds(getDocs(collection(db, 'usuarios/user-a/musicas')));
  });

  it('denies user A access to user B documents and rejects forged owner fields', async () => {
    const ownerDb = testEnvironment.authenticatedContext('user-b').firestore();
    await assertSucceeds(setDoc(doc(ownerDb, 'usuarios/user-b/musicas/song-1'), withCurrentTimestamps(music)));
    await assertSucceeds(setDoc(doc(ownerDb, 'usuarios/user-b/playlists/list-1'), withCurrentTimestamps(playlist)));
    await assertSucceeds(setDoc(doc(ownerDb, 'usuarios/user-b/repertorios/set-1'), withCurrentTimestamps(repertoire)));
    await assertSucceeds(setDoc(doc(ownerDb, 'usuarios/user-b/configuracoes/preferencias'), withCurrentUpdate(preferences)));

    const otherDb = testEnvironment.authenticatedContext('user-a').firestore();
    await assertFails(getDoc(doc(otherDb, 'usuarios/user-b/musicas/song-1')));
    await assertFails(getDoc(doc(otherDb, 'usuarios/user-b/playlists/list-1')));
    await assertFails(getDoc(doc(otherDb, 'usuarios/user-b/repertorios/set-1')));
    await assertFails(getDoc(doc(otherDb, 'usuarios/user-b/configuracoes/preferencias')));
    await assertFails(setDoc(doc(otherDb, 'usuarios/user-b/musicas/song-2'), music));
    await assertFails(setDoc(doc(otherDb, 'usuarios/user-b/playlists/list-2'), playlist));
    await assertFails(setDoc(doc(otherDb, 'usuarios/user-b/repertorios/set-2'), repertoire));
    await assertFails(setDoc(doc(otherDb, 'usuarios/user-b/configuracoes/preferencias'), preferences));
    await assertFails(setDoc(doc(otherDb, 'usuarios/user-a/musicas/song-2'), {
      ...music,
      proprietarioUid: 'user-b',
    }));
  });

  it('denies private data access to unauthenticated clients', async () => {
    const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymousDb, 'usuarios/user-a/musicas/song-1')));
    await assertFails(setDoc(doc(anonymousDb, 'usuarios/user-a/musicas/song-1'), music));
    await assertFails(getDoc(doc(anonymousDb, 'usuarios/user-a/configuracoes/preferencias')));
  });

  it('rejects missing required and unknown fields', async () => {
    const db = testEnvironment.authenticatedContext('user-a').firestore();
    const { conteudoCifrado: _omitted, ...missingContent } = music;
    expect(_omitted).toBe('Cifra de teste');
    await assertFails(setDoc(doc(db, 'usuarios/user-a/musicas/missing'), missingContent));
    await assertFails(setDoc(doc(db, 'usuarios/user-a/musicas/extra'), {
      ...music,
      proprietarioUid: 'user-a',
    }));
    await assertFails(setDoc(doc(db, 'usuarios/user-a/playlists/missing'), { nome: 'Sem tipo' }));
    await assertFails(setDoc(doc(db, 'usuarios/user-a/repertorios/invalid'), { ...repertoire, tipo: 'manual' }));
    await assertFails(setDoc(doc(db, 'usuarios/user-a/repertorios/extra'), { ...repertoire, unexpected: true }));
    await assertFails(setDoc(doc(db, 'usuarios/user-a/musicas/forged-time'), music));
  });

  it('accepts legacy and optional music fields while rejecting invalid optional values', async () => {
    const owner = testEnvironment.authenticatedContext('music-schema-owner').firestore();
    const legacyRef = doc(owner, 'usuarios/music-schema-owner/musicas/legacy');
    await assertSucceeds(setDoc(legacyRef, withCurrentTimestamps(music)));
    await assertSucceeds(getDoc(legacyRef));

    const optionalRef = doc(owner, 'usuarios/music-schema-owner/musicas/optional');
    await assertSucceeds(setDoc(optionalRef, withCurrentTimestamps({
      ...music,
      compositor: '  Compositora Áurea  ',
      observacoes: 'Introdução\nAndamento moderado',
    })));
    await assertSucceeds(setDoc(doc(owner, 'usuarios/music-schema-owner/musicas/null-fields'), withCurrentTimestamps({
      ...music,
      compositor: null,
      observacoes: null,
    })));
    await assertFails(setDoc(doc(owner, 'usuarios/music-schema-owner/musicas/wrong-type'), withCurrentTimestamps({ ...music, compositor: 42 })));
    await assertFails(setDoc(doc(owner, 'usuarios/music-schema-owner/musicas/long-composer'), withCurrentTimestamps({ ...music, compositor: 'c'.repeat(201) })));
    await assertFails(setDoc(doc(owner, 'usuarios/music-schema-owner/musicas/long-notes'), withCurrentTimestamps({ ...music, observacoes: 'o'.repeat(5001) })));
    await assertFails(setDoc(doc(owner, 'usuarios/music-schema-owner/musicas/extra'), withCurrentTimestamps({ ...music, unexpected: true })));

    const other = testEnvironment.authenticatedContext('music-schema-other').firestore();
    await assertFails(getDoc(doc(other, 'usuarios/music-schema-owner/musicas/optional')));
    await assertFails(updateDoc(doc(other, 'usuarios/music-schema-owner/musicas/optional'), { observacoes: 'alterada', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(other, 'usuarios/music-schema-owner/musicas/optional')));
  });

  it('denies access to unlisted top-level paths and cross-user list items by default', async () => {
    const owner = testEnvironment.authenticatedContext('default-deny-owner').firestore();
    const other = testEnvironment.authenticatedContext('default-deny-other').firestore();
    await assertFails(setDoc(doc(owner, 'catalogo-publico/song-1'), music));
    await assertFails(getDoc(doc(owner, 'catalogo-publico/song-1')));
    await assertFails(getDoc(doc(other, 'usuarios/default-deny-owner/playlists/list-1/itens/song-1')));
    await assertFails(setDoc(doc(other, 'usuarios/default-deny-owner/repertorios/set-1/itens/song-1'), { ...playlistItem, musicaId: 'song-1' }));
  });

  it('rejects changes to immutable creation fields and profile role', async () => {
    const db = testEnvironment.authenticatedContext('user-a').firestore();
    const profileRef = doc(db, 'usuarios/user-a');
    const musicRef = doc(db, 'usuarios/user-a/musicas/song-1');
    await assertSucceeds(setDoc(profileRef, withCurrentTimestamps(profile)));
    await assertSucceeds(setDoc(musicRef, withCurrentTimestamps(music)));

    await assertFails(updateDoc(profileRef, { perfil: 'ADMIN' }));
    await assertFails(updateDoc(musicRef, { createdAt: Timestamp.now() }));
    await assertFails(updateDoc(musicRef, { updatedAt: Timestamp.now() }));
    await assertSucceeds(updateDoc(musicRef, { titulo: 'Título atualizado', updatedAt: serverTimestamp() }));
  });

  it('validates music duplication lineage on creation and keeps it immutable afterwards', async () => {
    const owner = repositoryFor('music-lineage-owner');
    const otherOwner = repositoryFor('music-lineage-other');
    const sourceId = await owner.createMusic({ ...musicInput, titulo: 'Origem' });
    const duplicateId = await owner.duplicateMusic(sourceId);
    const duplicate = await owner.getMusicById(duplicateId);
    expect(duplicate).toMatchObject({ duplicadaDe: sourceId, titulo: 'Origem' });

    await owner.updateMusic(duplicateId, { ...musicInput, titulo: 'Cópia independente' });
    expect(await owner.getMusicById(duplicateId)).toMatchObject({
      duplicadaDe: sourceId,
      titulo: 'Cópia independente',
    });
    expect((await owner.getMusicById(sourceId))?.titulo).toBe('Origem');

    const foreignSourceId = await otherOwner.createMusic(musicInput);
    const ownerDb = testEnvironment.authenticatedContext('music-lineage-owner').firestore();
    const forgedMissingRef = doc(ownerDb, 'usuarios/music-lineage-owner/musicas/forged-missing');
    await assertFails(setDoc(forgedMissingRef, withCurrentTimestamps({
      ...music,
      duplicadaDe: 'missing-source',
    })));
    const forgedForeignRef = doc(ownerDb, 'usuarios/music-lineage-owner/musicas/forged-foreign');
    await assertFails(setDoc(forgedForeignRef, withCurrentTimestamps({
      ...music,
      duplicadaDe: foreignSourceId,
    })));
    const forgedContentRef = doc(ownerDb, 'usuarios/music-lineage-owner/musicas/forged-content');
    await assertFails(setDoc(forgedContentRef, withCurrentTimestamps({
      ...music,
      titulo: 'Conteúdo diferente',
      duplicadaDe: sourceId,
    })));

    const originalRef = doc(ownerDb, `usuarios/music-lineage-owner/musicas/${sourceId}`);
    await assertFails(updateDoc(originalRef, {
      duplicadaDe: sourceId,
      updatedAt: serverTimestamp(),
    }));
    const duplicateRef = doc(ownerDb, `usuarios/music-lineage-owner/musicas/${duplicateId}`);
    await assertFails(updateDoc(duplicateRef, {
      duplicadaDe: foreignSourceId,
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(duplicateRef, {
      duplicadaDe: deleteField(),
      updatedAt: serverTimestamp(),
    }));

    await owner.deleteMusic(sourceId);
    await owner.updateMusic(duplicateId, { ...musicInput, titulo: 'Ainda independente' });
    expect(await owner.getMusicById(duplicateId)).toMatchObject({
      duplicadaDe: sourceId,
      titulo: 'Ainda independente',
    });
  });

  it('playlist rules require an existing playlist and a same-user music reference keyed by music ID', async () => {
    const ownerDb = testEnvironment.authenticatedContext('playlist-owner').firestore();
    const otherDb = testEnvironment.authenticatedContext('different-owner').firestore();
    await assertSucceeds(setDoc(doc(otherDb, 'usuarios/different-owner/musicas/other-song'), withCurrentTimestamps(music)));
    await assertSucceeds(setDoc(doc(ownerDb, 'usuarios/playlist-owner/playlists/list-1'), withCurrentTimestamps(playlist)));
    await assertFails(updateDoc(doc(otherDb, 'usuarios/playlist-owner/playlists/list-1'), {
      nome: 'Alteração de outro usuário',
      tipo: 'igreja',
      updatedAt: serverTimestamp(),
    }));

    const orphanItem = doc(ownerDb, 'usuarios/playlist-owner/playlists/missing-list/itens/own-song');
    await assertFails(setDoc(orphanItem, { ...playlistItem, musicaId: 'own-song' }));

    const items = collection(ownerDb, 'usuarios/playlist-owner/playlists/list-1/itens');
    await assertFails(setDoc(doc(items, 'other-song'), { ...playlistItem, musicaId: 'other-song' }));
    await assertFails(setDoc(doc(items, 'missing-song'), { ...playlistItem, musicaId: 'missing-song' }));

    await assertSucceeds(setDoc(doc(ownerDb, 'usuarios/playlist-owner/musicas/own-song'), withCurrentTimestamps(music)));
    await assertSucceeds(setDoc(doc(items, 'own-song'), { ...playlistItem, musicaId: 'own-song' }));
    await assertFails(setDoc(doc(items, 'duplicate-entry'), { ...playlistItem, musicaId: 'own-song' }));
    await assertSucceeds(updateDoc(doc(items, 'own-song'), { posicao: 2 }));
    await assertFails(updateDoc(doc(otherDb, 'usuarios/playlist-owner/playlists/list-1/itens/own-song'), {
      tomPersonalizado: 'D',
    }));
    await assertFails(updateDoc(doc(items, 'own-song'), { musicaId: 'other-song' }));
  });

  it('repertoire rules require a parent and same-user song reference, and keep song IDs immutable', async () => {
    const ownerDb = testEnvironment.authenticatedContext('repertoire-owner').firestore();
    const otherDb = testEnvironment.authenticatedContext('other-repertoire-owner').firestore();
    await assertSucceeds(setDoc(doc(otherDb, 'usuarios/other-repertoire-owner/musicas/foreign-song'), withCurrentTimestamps(music)));
    await assertSucceeds(setDoc(doc(ownerDb, 'usuarios/repertoire-owner/repertorios/set-1'), withCurrentTimestamps(repertoire)));
    const collectionRef = collection(ownerDb, 'usuarios/repertoire-owner/repertorios/set-1/itens');
    await assertFails(setDoc(doc(ownerDb, 'usuarios/repertoire-owner/repertorios/missing/itens/song-1'), { ...playlistItem, musicaId: 'song-1' }));
    await assertFails(setDoc(doc(collectionRef, 'foreign-song'), { ...playlistItem, musicaId: 'foreign-song' }));
    await assertFails(setDoc(doc(collectionRef, 'missing-song'), { ...playlistItem, musicaId: 'missing-song' }));
    await assertSucceeds(setDoc(doc(ownerDb, 'usuarios/repertoire-owner/musicas/song-1'), withCurrentTimestamps(music)));
    await assertSucceeds(setDoc(doc(collectionRef, 'song-1'), { ...playlistItem, musicaId: 'song-1' }));
    await assertSucceeds(updateDoc(doc(collectionRef, 'song-1'), { posicao: 2 }));
    await assertFails(updateDoc(doc(collectionRef, 'song-1'), { musicaId: 'foreign-song' }));
    await assertFails(getDoc(doc(otherDb, 'usuarios/repertoire-owner/repertorios/set-1')));
  });

  it('preferences rules isolate user documents and reject invalid or unknown fields', async () => {
    const owner = testEnvironment.authenticatedContext('preferences-owner').firestore();
    const other = testEnvironment.authenticatedContext('preferences-other').firestore();
    const ownRef = doc(owner, 'usuarios/preferences-owner/configuracoes/preferencias');
    const otherRef = doc(other, 'usuarios/preferences-owner/configuracoes/preferencias');
    await assertSucceeds(setDoc(ownRef, withCurrentUpdate(preferences)));
    await assertSucceeds(getDoc(ownRef));
    await assertFails(getDoc(otherRef));
    await assertFails(setDoc(otherRef, preferences));
    await assertFails(setDoc(doc(owner, 'usuarios/preferences-owner/configuracoes/bad'), preferences));
    await assertFails(setDoc(ownRef, { ...preferences, tema: 'azul' }));
    await assertFails(setDoc(ownRef, { ...preferences, tamanhoFonte: 100 }));
    await assertFails(setDoc(ownRef, { ...preferences, velocidadeAutoscroll: 0 }));
    await assertFails(setDoc(ownRef, { ...preferences, extra: true }));
  });

  it('music repository creates, lists, reads, updates and deletes documents', async () => {
    const repository = repositoryFor('music-owner');
    const id = await repository.createMusic(musicInput);

    expect(id).toBeTruthy();
    expect((await repository.listMusics()).map(({ id: musicId }) => musicId)).toEqual([id]);
    const createdMusic = await repository.getMusicById(id);
    expect(createdMusic?.titulo).toBe('Música de teste');
    expect(createdMusic?.createdAt).toBeInstanceOf(Timestamp);
    expect(createdMusic?.updatedAt).toBeInstanceOf(Timestamp);

    await repository.updateMusic(id, { ...musicInput, titulo: 'Título alterado' });
    expect((await repository.getMusicById(id))?.titulo).toBe('Título alterado');

    const alignedContent = '  C\nletra alinhada  ';
    await repository.updateMusic(id, { ...musicInput, conteudoCifrado: alignedContent });
    expect((await repository.getMusicById(id))?.conteudoCifrado).toBe(alignedContent);

    await repository.deleteMusic(id);
    expect(await repository.getMusicById(id)).toBeNull();
    expect(await repository.listMusics()).toEqual([]);
  });

  it('music repository trims optional metadata, preserves line breaks and edits legacy documents', async () => {
    const repository = repositoryFor('music-compatibility-owner');
    const id = await repository.createMusic({
      ...musicInput,
      compositor: '  João Ávila  ',
      observacoes: '  Introdução\n  Andamento  ',
    });
    const saved = await repository.getMusicById(id);
    expect(saved?.compositor).toBe('João Ávila');
    expect(saved?.observacoes).toBe('Introdução\n  Andamento');

    const legacyId = 'legacy-song';
    await assertSucceeds(setDoc(
      doc(testEnvironment.authenticatedContext('music-compatibility-owner').firestore(), `usuarios/music-compatibility-owner/musicas/${legacyId}`),
      withCurrentTimestamps(music),
    ));
    const legacy = await repository.getMusicById(legacyId);
    expect(legacy).toMatchObject({ titulo: music.titulo, conteudoCifrado: music.conteudoCifrado });
    expect(legacy?.compositor).toBeUndefined();
    await repository.updateMusic(legacyId, { ...musicInput, titulo: 'Documento antigo revisado' });
    expect(await repository.getMusicById(legacyId)).toMatchObject({
      titulo: 'Documento antigo revisado',
      artista: music.artista,
      conteudoCifrado: music.conteudoCifrado,
      licencaOuPermissao: music.licencaOuPermissao,
      compositor: null,
      observacoes: null,
    });
  });

  it('music repository rejects unauthenticated access before contacting Firestore', async () => {
    const repository = repositoryFor(null);
    await expect(repository.listMusics()).rejects.toMatchObject({ code: 'auth/unauthenticated' });
    await expect(repository.createMusic(musicInput)).rejects.toMatchObject({ code: 'auth/unauthenticated' });
  });

  it('music repository isolates documents by the authenticated UID', async () => {
    const owner = repositoryFor('music-owner-a');
    const otherUser = repositoryFor('music-owner-b');
    const id = await owner.createMusic(musicInput);

    expect(await otherUser.listMusics()).toEqual([]);
    expect(await otherUser.getMusicById(id)).toBeNull();
    await expect(otherUser.updateMusic(id, { ...musicInput, titulo: 'Acesso indevido' }))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('music repository validates required fields, list bounds and document IDs', async () => {
    const repository = repositoryFor('music-owner');
    await expect(repository.createMusic({ ...musicInput, titulo: ' ' }))
      .rejects.toMatchObject({ code: 'validation/required' });
    await expect(repository.createMusic({ ...musicInput, tags: Array.from({ length: 51 }, (_, index) => `tag-${index}`) }))
      .rejects.toMatchObject({ code: 'validation/too-many-items' });
    await expect(repository.createMusic({ ...musicInput, compositor: 'c'.repeat(201) }))
      .rejects.toMatchObject({ code: 'validation/too-long' });
    await expect(repository.createMusic({ ...musicInput, observacoes: 'o'.repeat(5001) }))
      .rejects.toMatchObject({ code: 'validation/too-long' });
    await expect(repository.createMusic({ ...musicInput, conteudoCifrado: '🎵'.repeat(250_000) }))
      .rejects.toMatchObject({ code: 'validation/too-long' });
    await expect(repository.getMusicById('invalid/id'))
      .rejects.toBeInstanceOf(MusicRepositoryError);
  });

  it('music repository returns a clear persistence error when an update target is missing', async () => {
    const repository = repositoryFor('music-owner');
    await expect(repository.updateMusic('missing-song', musicInput))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'Não foi possível salvar ou carregar a música. Tente novamente.' });
  });

  it('playlist repository creates, lists, reads, edits and deletes playlists with their items', async () => {
    const playlists = playlistsFor('playlist-owner');
    const songs = repositoryFor('playlist-owner');
    const playlistId = await playlists.createPlaylist(playlistInput);
    expect((await playlists.listPlaylists()).map(({ id }) => id)).toContain(playlistId);

    const empty = await playlists.getPlaylistById(playlistId);
    expect(empty?.itens).toEqual([]);
    expect(empty?.createdAt).toBeInstanceOf(Timestamp);

    const songId = await songs.createMusic(musicInput);
    const secondSongId = await songs.createMusic({ ...musicInput, titulo: 'Segunda música' });
    await playlists.addMusicToPlaylist(playlistId, songId);
    await playlists.addMusicToPlaylist(playlistId, secondSongId);
    await playlists.reorderPlaylistItems(playlistId, [secondSongId, songId]);
    const ownerDb = testEnvironment.authenticatedContext('playlist-owner').firestore();
    await updateDoc(doc(ownerDb, `usuarios/playlist-owner/playlists/${playlistId}/itens/${secondSongId}`), {
      momento: 'Entrada',
      tomPersonalizado: 'D',
    });
    const updatedInput: PlaylistInput = { nome: 'Renomeada', tipo: 'igreja' };
    const beforeUpdate = await playlists.getPlaylistById(playlistId);
    expect(beforeUpdate?.itens.map(({ musicaId, posicao, momento, tomPersonalizado }) => [
      musicaId, posicao, momento, tomPersonalizado,
    ])).toEqual([
      [secondSongId, 1, 'Entrada', 'D'],
      [songId, 2, null, null],
    ]);
    await playlists.updatePlaylist(playlistId, updatedInput);
    const reloaded = await playlists.getPlaylistById(playlistId);
    expect(reloaded).toMatchObject(updatedInput);
    expect(reloaded?.itens).toEqual(beforeUpdate?.itens);
    expect(await songs.getMusicById(songId)).not.toBeNull();
    expect(await songs.getMusicById(secondSongId)).not.toBeNull();

    await playlists.deletePlaylist(playlistId);
    expect(await playlists.getPlaylistById(playlistId)).toBeNull();
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const remainingItems = await getDocs(collection(
        context.firestore(),
        `usuarios/playlist-owner/playlists/${playlistId}/itens`,
      ));
      expect(remainingItems.size).toBe(0);
    });
  });

  it('playlist repository duplicates an empty playlist with a new ID and leaves the original unchanged', async () => {
    const playlists = playlistsFor('playlist-owner');
    const sourceId = await playlists.createPlaylist({ nome: 'Lista vazia', tipo: 'barzinho' });

    const duplicateId = await playlists.duplicatePlaylist(sourceId);
    const source = await playlists.getPlaylistById(sourceId);
    const duplicate = await playlists.getPlaylistById(duplicateId);

    expect(duplicateId).not.toBe(sourceId);
    expect(source).toMatchObject({ nome: 'Lista vazia', tipo: 'barzinho', itens: [] });
    expect(duplicate).toMatchObject({ nome: 'Lista vazia (cópia)', tipo: 'barzinho', itens: [] });
    expect((await playlists.listPlaylists()).map(({ id }) => id)).toEqual(expect.arrayContaining([sourceId, duplicateId]));

    const unicodeSourceId = await playlists.createPlaylist({ nome: '🎵'.repeat(60), tipo: 'manual' });
    const unicodeCopyId = await playlists.duplicatePlaylist(unicodeSourceId);
    const unicodeCopy = await playlists.getPlaylistById(unicodeCopyId);
    expect(unicodeCopy?.nome).toBe(`${'🎵'.repeat(56)} (cópia)`);
    expect(unicodeCopy?.nome.length).toBeLessThanOrEqual(120);
  });

  it('playlist repository duplicates items in order without changing music documents or the source', async () => {
    const playlists = playlistsFor('playlist-owner');
    const songs = repositoryFor('playlist-owner');
    const sourceId = await playlists.createPlaylist({ nome: 'Lista completa', tipo: 'igreja' });
    const firstId = await songs.createMusic({ ...musicInput, titulo: 'Primeira música' });
    const secondId = await songs.createMusic({ ...musicInput, titulo: 'Segunda música' });
    const thirdId = await songs.createMusic({ ...musicInput, titulo: 'Terceira música' });

    await playlists.addMusicToPlaylist(sourceId, firstId);
    await playlists.addMusicToPlaylist(sourceId, secondId);
    await playlists.addMusicToPlaylist(sourceId, thirdId);
    await playlists.reorderPlaylistItems(sourceId, [thirdId, firstId, secondId]);
    const ownerDb = testEnvironment.authenticatedContext('playlist-owner').firestore();
    await updateDoc(doc(ownerDb, `usuarios/playlist-owner/playlists/${sourceId}/itens/${thirdId}`), {
      momento: 'Entrada',
      tomPersonalizado: 'D',
    });
    const originalBefore = await playlists.getPlaylistById(sourceId);
    const musicBefore = await songs.listMusics();

    const duplicateId = await playlists.duplicatePlaylist(sourceId);
    const originalAfter = await playlists.getPlaylistById(sourceId);
    const duplicate = await playlists.getPlaylistById(duplicateId);

    expect(duplicateId).not.toBe(sourceId);
    expect(duplicate).toMatchObject({ nome: 'Lista completa (cópia)', tipo: 'igreja' });
    expect(duplicate?.itens).toEqual(originalBefore?.itens);
    expect(originalAfter).toEqual(originalBefore);
    expect(await songs.listMusics()).toEqual(musicBefore);
    expect((await playlists.listPlaylists()).map(({ id }) => id)).toEqual(expect.arrayContaining([sourceId, duplicateId]));
  });

  it('playlist repository rejects invalid music references without leaving an incomplete duplicate', async () => {
    const playlists = playlistsFor('playlist-owner');
    const sourceId = await playlists.createPlaylist(playlistInput);
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `usuarios/playlist-owner/playlists/${sourceId}/itens/missing-song`), {
        musicaId: 'missing-song',
        posicao: 1,
        momento: null,
        tomPersonalizado: null,
      });
    });

    await expect(playlists.duplicatePlaylist(sourceId))
      .rejects.toMatchObject({ code: 'invalid-music-reference' });
    expect((await playlists.listPlaylists()).map(({ id }) => id)).toEqual([sourceId]);
  });

  it('playlist repository isolates duplication to the authenticated UID', async () => {
    const owner = playlistsFor('playlist-owner-a');
    const otherUser = playlistsFor('playlist-owner-b');
    const sourceId = await owner.createPlaylist(playlistInput);

    await expect(otherUser.duplicatePlaylist(sourceId)).rejects.toMatchObject({ code: 'not-found' });
    expect(await owner.getPlaylistById(sourceId)).toMatchObject(playlistInput);
    expect(await otherUser.listPlaylists()).toEqual([]);
  });

  it('playlist repository duplicates, reorders and deletes playlists with 400 items', async () => {
    const playlists = playlistsFor('playlist-owner');
    const sourceId = await playlists.createPlaylist(playlistInput);
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const musicBatch = writeBatch(db);
      for (let index = 0; index < 400; index += 1) {
        const musicId = `song-${index}`;
        musicBatch.set(doc(db, `usuarios/playlist-owner/musicas/${musicId}`), {
          ...music,
          titulo: `Música ${index}`,
        });
      }
      await musicBatch.commit();

      const itemBatch = writeBatch(db);
      for (let index = 0; index < 400; index += 1) {
        const musicId = `song-${index}`;
        itemBatch.set(doc(db, `usuarios/playlist-owner/playlists/${sourceId}/itens/${musicId}`), {
          musicaId: musicId,
          posicao: index + 1,
          momento: index === 0 ? 'Entrada' : null,
          tomPersonalizado: index === 0 ? 'D' : null,
        });
      }
      await itemBatch.commit();
    });

    const duplicateId = await playlists.duplicatePlaylist(sourceId);
    const duplicate = await playlists.getPlaylistById(duplicateId);
    expect(duplicate?.itens).toHaveLength(400);
    expect(duplicate?.itens[0]).toMatchObject({ musicaId: 'song-0', posicao: 1, momento: 'Entrada', tomPersonalizado: 'D' });
    expect(duplicate?.itens[399]).toMatchObject({ musicaId: 'song-399', posicao: 400, momento: null, tomPersonalizado: null });

    const reversedIds = Array.from({ length: 400 }, (_, index) => `song-${399 - index}`);
    await playlists.reorderPlaylistItems(duplicateId, reversedIds);
    const reorderedCopy = await playlists.getPlaylistById(duplicateId);
    expect(reorderedCopy?.itens[0]).toMatchObject({ musicaId: 'song-399', posicao: 1, momento: null, tomPersonalizado: null });
    expect(reorderedCopy?.itens[399]).toMatchObject({ musicaId: 'song-0', posicao: 400, momento: 'Entrada', tomPersonalizado: 'D' });

    await playlists.deletePlaylist(sourceId);
    expect(await playlists.getPlaylistById(sourceId)).toBeNull();
    expect(await repositoryFor('playlist-owner').listMusics()).toHaveLength(400);
  }, 60000);

  it('playlist item personalized keys persist, can be changed or cleared, and preserve other data', async () => {
    const playlists = playlistsFor('playlist-owner');
    const songs = repositoryFor('playlist-owner');
    const firstPlaylistId = await playlists.createPlaylist(playlistInput);
    const secondPlaylistId = await playlists.createPlaylist({ nome: 'Outra lista', tipo: 'manual' });
    const songId = await songs.createMusic({ ...musicInput, tomOriginal: 'G' });
    await playlists.addMusicToPlaylist(firstPlaylistId, songId);
    await playlists.addMusicToPlaylist(secondPlaylistId, songId);
    await playlists.reorderPlaylistItems(firstPlaylistId, [songId]);
    const ownerDb = testEnvironment.authenticatedContext('playlist-owner').firestore();
    await updateDoc(doc(ownerDb, `usuarios/playlist-owner/playlists/${firstPlaylistId}/itens/${songId}`), {
      posicao: 4,
      momento: 'Entrada',
    });

    await playlists.updatePlaylistItemKey(firstPlaylistId, songId, 'D');
    expect((await playlists.getPlaylistById(firstPlaylistId))?.itens[0]).toMatchObject({
      musicaId: songId,
      posicao: 4,
      momento: 'Entrada',
      tomPersonalizado: 'D',
    });
    await playlists.updatePlaylistItemKey(firstPlaylistId, songId, 'F#m');
    await playlists.updatePlaylistItemKey(firstPlaylistId, songId, '');

    expect((await playlists.getPlaylistById(firstPlaylistId))?.itens[0]).toMatchObject({
      musicaId: songId,
      posicao: 4,
      momento: 'Entrada',
      tomPersonalizado: null,
    });
    expect((await playlists.getPlaylistById(secondPlaylistId))?.itens[0].tomPersonalizado).toBeNull();
    expect((await songs.getMusicById(songId))?.tomOriginal).toBe('G');
  });

  it('playlist item personalized key updates are isolated by UID and validate their length', async () => {
    const owner = playlistsFor('playlist-owner-a');
    const otherUser = playlistsFor('playlist-owner-b');
    const songs = repositoryFor('playlist-owner-a');
    const playlistId = await owner.createPlaylist(playlistInput);
    const musicId = await songs.createMusic(musicInput);
    await owner.addMusicToPlaylist(playlistId, musicId);

    await expect(otherUser.updatePlaylistItemKey(playlistId, musicId, 'D'))
      .rejects.toMatchObject({ code: 'permission-denied' });
    await expect(owner.updatePlaylistItemKey(playlistId, musicId, 'D'.repeat(13)))
      .rejects.toMatchObject({ code: 'validation/too-long' });
    expect((await owner.getPlaylistById(playlistId))?.itens[0].tomPersonalizado).toBeNull();
  });

  it('playlist repository adds unique songs, reorders them and compacts positions after removal', async () => {
    const playlists = playlistsFor('playlist-owner');
    const songs = repositoryFor('playlist-owner');
    const playlistId = await playlists.createPlaylist(playlistInput);
    const firstId = await songs.createMusic({ ...musicInput, titulo: 'Primeira' });
    const secondId = await songs.createMusic({ ...musicInput, titulo: 'Segunda' });
    const thirdId = await songs.createMusic({ ...musicInput, titulo: 'Terceira' });

    await playlists.addMusicToPlaylist(playlistId, firstId);
    await playlists.addMusicToPlaylist(playlistId, secondId);
    await playlists.addMusicToPlaylist(playlistId, thirdId);
    await expect(playlists.addMusicToPlaylist(playlistId, secondId)).rejects.toMatchObject({ code: 'already-exists' });

    const ownerDb = testEnvironment.authenticatedContext('playlist-owner').firestore();
    await updateDoc(doc(ownerDb, `usuarios/playlist-owner/playlists/${playlistId}/itens/${firstId}`), {
      momento: 'Entrada',
      tomPersonalizado: 'D',
    });
    await updateDoc(doc(ownerDb, `usuarios/playlist-owner/playlists/${playlistId}/itens/${thirdId}`), {
      momento: 'Final',
      tomPersonalizado: 'F#m',
    });
    await playlists.reorderPlaylistItems(playlistId, [thirdId, firstId, secondId]);
    expect((await playlists.getPlaylistById(playlistId))?.itens.map(({ musicaId, posicao, momento, tomPersonalizado }) => [
      musicaId, posicao, momento, tomPersonalizado,
    ])).toEqual([
      [thirdId, 1, 'Final', 'F#m'],
      [firstId, 2, 'Entrada', 'D'],
      [secondId, 3, null, null],
    ]);
    expect((await songs.getMusicById(firstId))?.tomOriginal).toBe('C');
    expect((await songs.getMusicById(thirdId))?.tomOriginal).toBe('C');

    await playlists.removeMusicFromPlaylist(playlistId, firstId);
    expect((await playlists.getPlaylistById(playlistId))?.itens.map(({ musicaId, posicao }) => [musicaId, posicao]))
      .toEqual([[thirdId, 1], [secondId, 2]]);
  });

  it('playlist repository rejects unauthenticated access and cross-user or missing song references', async () => {
    const anonymous = playlistsFor(null);
    await expect(anonymous.listPlaylists()).rejects.toMatchObject({ code: 'auth/unauthenticated' });

    const owner = playlistsFor('playlist-owner-a');
    const otherUser = playlistsFor('playlist-owner-b');
    const otherSongs = repositoryFor('playlist-owner-b');
    const playlistId = await owner.createPlaylist(playlistInput);
    const otherSongId = await otherSongs.createMusic(musicInput);

    await expect(owner.addMusicToPlaylist(playlistId, otherSongId))
      .rejects.toMatchObject({ code: 'invalid-music-reference' });
    await expect(owner.addMusicToPlaylist(playlistId, 'missing-song'))
      .rejects.toMatchObject({ code: 'invalid-music-reference' });
    expect(await otherUser.getPlaylistById(playlistId)).toBeNull();
  });

  it('keeps playlist references when a library song is deleted and allows explicit removal later', async () => {
    const playlists = playlistsFor('playlist-owner');
    const songs = repositoryFor('playlist-owner');
    const playlistId = await playlists.createPlaylist(playlistInput);
    const musicId = await songs.createMusic(musicInput);
    await playlists.addMusicToPlaylist(playlistId, musicId);

    await songs.deleteMusic(musicId);
    expect(await songs.getMusicById(musicId)).toBeNull();
    expect((await playlists.getPlaylistById(playlistId))?.itens).toMatchObject([
      { musicaId: musicId, posicao: 1, momento: null, tomPersonalizado: null },
    ]);

    await playlists.removeMusicFromPlaylist(playlistId, musicId);
    expect((await playlists.getPlaylistById(playlistId))?.itens).toEqual([]);
  });

  it('playlist repository reports persistence errors for missing playlists', async () => {
    const repository = playlistsFor('playlist-owner');
    await expect(repository.updatePlaylist('missing-playlist', { nome: 'Nome novo', tipo: 'manual' }))
      .rejects.toMatchObject({ code: 'permission-denied' });
    await expect(repository.getPlaylistById('invalid/id')).rejects.toBeInstanceOf(PlaylistRepositoryError);
  });

  it('playlist repository validates required names before writing', async () => {
    const repository = playlistsFor('playlist-owner');
    const playlistId = await repository.createPlaylist(playlistInput);
    await expect(repository.updatePlaylist(playlistId, { nome: '   ', tipo: 'igreja' }))
      .rejects.toMatchObject({ code: 'validation/required' });
    expect((await repository.getPlaylistById(playlistId))?.nome).toBe(playlistInput.nome);
  });

  it('church playlist repository persists the fixed moments and updates only the selected slot', async () => {
    await withRulesDisabledPlaylistRepository('church-owner', async (playlists, firestore) => {
      const songs = createMusicRepository(firestore, () => 'church-owner');
      const songId = await songs.createMusic(musicInput);
      const moments = createEmptyChurchMoments();
      const missingSongMoments = createEmptyChurchMoments();
      missingSongMoments[0] = { ...missingSongMoments[0], referenciaMusical: { musicaId: 'missing-song' } };
      await expect(playlists.createChurchPlaylistV2({ nome: 'Inválida', momentosIgreja: missingSongMoments }))
        .rejects.toMatchObject({ code: 'invalid-music-reference' });

      const playlistId = await playlists.createChurchPlaylistV2({ nome: 'Celebração', momentosIgreja: moments });

      const initial = await playlists.getChurchPlaylist(playlistId);
      expect(initial?.kind).toBe('structured');
      if (initial?.kind !== 'structured') throw new Error('Expected a structured church playlist.');
      expect(initial.playlist.momentosIgreja).toEqual(moments);
      expect(initial.playlist.versaoEstrutura).toBe(2);

      const inputWithPaddedKey = createEmptyChurchMoments();
      inputWithPaddedKey[0] = { ...inputWithPaddedKey[0], tomPersonalizado: ' D ' };
      const normalizedId = await playlists.createChurchPlaylistV2({
        nome: 'Tom normalizado',
        momentosIgreja: inputWithPaddedKey,
      });
      const normalizedPlaylist = await playlists.getChurchPlaylist(normalizedId);
      if (normalizedPlaylist?.kind !== 'structured') throw new Error('Expected a structured church playlist.');
      expect(normalizedPlaylist.playlist.momentosIgreja[0].tomPersonalizado).toBe('D');

      const legacyInputMoments = createEmptyChurchMoments(1);
      legacyInputMoments[0] = { ...legacyInputMoments[0], musicaId: songId };
      const normalizedVersionId = await playlists.createChurchPlaylist({
        nome: 'Entrada legada convertida',
        momentosIgreja: legacyInputMoments,
      });
      const normalizedVersionPlaylist = await playlists.getChurchPlaylist(normalizedVersionId);
      if (normalizedVersionPlaylist?.kind !== 'structured') throw new Error('Expected a structured church playlist.');
      expect(normalizedVersionPlaylist.playlist.versaoEstrutura).toBe(2);
      expect(normalizedVersionPlaylist.playlist.momentosIgreja[0]).toMatchObject({
        referenciaMusical: { musicaId: songId },
      });

      await playlists.updateChurchMoment(playlistId, 'entrada', {
        versaoEstrutura: 2,
        referenciaMusical: { musicaId: songId },
        tomPersonalizado: 'D',
      });
      await playlists.updateChurchMoment(playlistId, 'perdao', { versaoEstrutura: 2, referenciaMusical: null });
      await expect(playlists.updateChurchMoment(playlistId, 'gloria', { versaoEstrutura: 2, referenciaMusical: { musicaId: 'missing-song' } }))
        .rejects.toMatchObject({ code: 'invalid-music-reference' });

      const updated = await playlists.getChurchPlaylist(playlistId);
      if (updated?.kind !== 'structured') throw new Error('Expected a structured church playlist.');
      expect(updated.playlist.momentosIgreja[0]).toMatchObject({ referenciaMusical: { musicaId: songId }, tomPersonalizado: 'D' });
      expect(updated.playlist.momentosIgreja[1]).toMatchObject({ referenciaMusical: null, tomPersonalizado: null });
      expect(updated.playlist.momentosIgreja.slice(2)).toEqual(moments.slice(2));
    });
  });

  it('church playlist repository preserves concurrent updates to different moments', async () => {
    await withRulesDisabledPlaylistRepository('church-owner', async (playlists) => {
      const playlistId = await playlists.createChurchPlaylist({
        nome: 'Celebração concorrente',
        momentosIgreja: createEmptyChurchMoments(1),
      });

      await Promise.all([
        playlists.updateChurchMoment(playlistId, 'entrada', { versaoEstrutura: 2, tomPersonalizado: 'D' }),
        playlists.updateChurchMoment(playlistId, 'perdao', { versaoEstrutura: 2, tomPersonalizado: 'G' }),
      ]);

      const result = await playlists.getChurchPlaylist(playlistId);
      if (result?.kind !== 'structured') throw new Error('Expected a structured church playlist.');
      expect(result.playlist.momentosIgreja[0].tomPersonalizado).toBe('D');
      expect(result.playlist.momentosIgreja[1].tomPersonalizado).toBe('G');
    });
  });

  it('v2 rules allow one changed moment, reject multiple changed moments and preserve unchanged orphan references', async () => {
    const uid = 'church-v2-single-moment-owner';
    const repository = playlistsFor(uid);
    const playlistId = await repository.createChurchPlaylistV2({
      nome: 'Igreja v2',
      momentosIgreja: createEmptyChurchMoments(),
    });
    const ownerDb = testEnvironment.authenticatedContext(uid).firestore();
    const playlistRef = doc(ownerDb, `usuarios/${uid}/playlists/${playlistId}`);
    const oneChanged = createEmptyChurchMoments();
    oneChanged[0] = { ...oneChanged[0], tomPersonalizado: 'D' };

    await assertSucceeds(updateDoc(playlistRef, {
      momentosIgreja: oneChanged,
      updatedAt: serverTimestamp(),
    }));

    const twoChanged = createEmptyChurchMoments();
    twoChanged[0] = { ...twoChanged[0], tomPersonalizado: 'E' };
    twoChanged[1] = { ...twoChanged[1], tomPersonalizado: 'G' };
    await assertFails(updateDoc(playlistRef, {
      momentosIgreja: twoChanged,
      updatedAt: serverTimestamp(),
    }));

    const threeChanged = createEmptyChurchMoments();
    threeChanged[0] = { ...threeChanged[0], tomPersonalizado: 'E' };
    threeChanged[1] = { ...threeChanged[1], tomPersonalizado: 'G' };
    threeChanged[2] = { ...threeChanged[2], tomPersonalizado: 'A' };
    await assertFails(updateDoc(playlistRef, {
      momentosIgreja: threeChanged,
      updatedAt: serverTimestamp(),
    }));

    await assertSucceeds(updateDoc(playlistRef, {
      nome: 'Nome v2 atualizado',
      updatedAt: serverTimestamp(),
    }));

    const orphanMoments = createEmptyChurchMoments();
    orphanMoments[0] = { ...orphanMoments[0], referenciaMusical: { musicaId: 'orphan-history-id' } };
    const orphanPlaylistId = 'orphan-reference-history';
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `usuarios/${uid}/playlists/${orphanPlaylistId}`), withCurrentTimestamps({
        nome: 'Igreja com referência histórica',
        tipo: 'igreja',
        versaoEstrutura: 2,
        momentosIgreja: orphanMoments,
      }));
    });
    const orphanRef = doc(ownerDb, `usuarios/${uid}/playlists/${orphanPlaylistId}`);
    const editOtherMoment = orphanMoments.map((moment, index) => index === 9
      ? { ...moment, tomPersonalizado: 'E' }
      : moment);
    await assertSucceeds(updateDoc(orphanRef, {
      momentosIgreja: editOtherMoment,
      updatedAt: serverTimestamp(),
    }));

    const changedOrphan = editOtherMoment.map((moment, index) => index === 0
      ? { ...moment, referenciaMusical: { musicaId: 'new-missing-song' } }
      : moment);
    await assertFails(updateDoc(orphanRef, {
      momentosIgreja: changedOrphan,
      updatedAt: serverTimestamp(),
    }));
  });

  it('church playlist reads reject partially structured documents without migrating them', async () => {
    await withRulesDisabledPlaylistRepository('church-owner', async (playlists, firestore) => {
      const timestamp = Timestamp.fromMillis(1);
      const documents = [
        {
          id: 'partial-church-playlist',
          data: {
            nome: 'Estrutura parcial',
            tipo: 'igreja',
            createdAt: timestamp,
            updatedAt: timestamp,
            versaoEstrutura: 1,
          },
        },
        {
          id: 'mismatched-church-playlist',
          data: {
            nome: 'Tipo incompatível',
            tipo: 'manual',
            createdAt: timestamp,
            updatedAt: timestamp,
            versaoEstrutura: 1,
            momentosIgreja: createEmptyChurchMoments(1),
          },
        },
      ];

      for (const { id, data } of documents) {
        const reference = doc(firestore, `usuarios/church-owner/playlists/${id}`);
        await setDoc(reference, data);
        await expect(playlists.getChurchPlaylist(id))
          .rejects.toMatchObject({ code: 'invalid-playlist-format' });
        expect((await getDoc(reference)).data()).toEqual(data);
      }
    });
  });

  it('church playlist duplication preserves orphan IDs and allows independent corrections', async () => {
    await withRulesDisabledPlaylistRepository('church-owner', async (playlists, firestore) => {
      const songs = createMusicRepository(firestore, () => 'church-owner');
      const songId = await songs.createMusic(musicInput);
      const moments = createEmptyChurchMoments();
      moments[0] = { ...moments[0], referenciaMusical: { musicaId: songId }, tomPersonalizado: 'G' };
      const sourceId = await playlists.createChurchPlaylistV2({ nome: 'Celebração', momentosIgreja: moments });

      await songs.deleteMusic(songId);
      const duplicateId = await playlists.duplicatePlaylist(sourceId);
      const source = await playlists.getChurchPlaylist(sourceId);
      const duplicate = await playlists.getChurchPlaylist(duplicateId);

      expect(duplicateId).not.toBe(sourceId);
      expect(source?.kind).toBe('structured');
      expect(duplicate?.kind).toBe('structured');
      if (source?.kind !== 'structured' || duplicate?.kind !== 'structured') {
        throw new Error('Expected structured church playlists.');
      }
      expect(duplicate.playlist).toMatchObject({
        nome: 'Celebração (cópia)',
        versaoEstrutura: 2,
        momentosIgreja: moments,
      });
      expect(duplicate.playlist.createdAt.isEqual(source.playlist.createdAt)).toBe(false);
      expect(duplicate.playlist.updatedAt.isEqual(source.playlist.updatedAt)).toBe(false);

      await playlists.updateChurchMoment(duplicateId, 'entrada', { versaoEstrutura: 2, referenciaMusical: null, tomPersonalizado: null });
      const correctedDuplicate = await playlists.getChurchPlaylist(duplicateId);
      const unchangedSource = await playlists.getChurchPlaylist(sourceId);
      if (correctedDuplicate?.kind !== 'structured' || unchangedSource?.kind !== 'structured') {
        throw new Error('Expected structured church playlists.');
      }
      expect(correctedDuplicate.playlist.momentosIgreja[0]).toMatchObject({ referenciaMusical: null, tomPersonalizado: null });
      expect(unchangedSource.playlist.momentosIgreja[0]).toMatchObject({ referenciaMusical: { musicaId: songId }, tomPersonalizado: 'G' });
    });
  });

  it('church-specific operations preserve legacy playlists and generic item operations reject structured playlists', async () => {
    await withRulesDisabledPlaylistRepository('church-owner', async (playlists, firestore) => {
      const songs = createMusicRepository(firestore, () => 'church-owner');
      const legacyId = await playlists.createPlaylist({ nome: 'Igreja legada', tipo: 'igreja' });
      const songId = await songs.createMusic(musicInput);
      await playlists.addMusicToPlaylist(legacyId, songId);

      const legacyDuplicateId = await playlists.duplicatePlaylist(legacyId);
      const legacyDuplicate = await playlists.getPlaylistById(legacyDuplicateId);
      expect(legacyDuplicate?.tipo).toBe('igreja');
      expect(legacyDuplicate?.itens).toMatchObject([{ musicaId: songId }]);
      expect(legacyDuplicate).not.toHaveProperty('versaoEstrutura');
      const legacyRead = await playlists.getChurchPlaylist(legacyId);
      expect(legacyRead?.kind).toBe('legacy');
      if (legacyRead?.kind !== 'legacy') throw new Error('Expected a legacy church playlist.');
      expect(legacyRead.playlist.itens).toMatchObject([{ musicaId: songId }]);

      const churchId = await playlists.createChurchPlaylistV2({
        nome: 'Igreja estruturada',
        momentosIgreja: createEmptyChurchMoments(),
      });
      await expect(playlists.getPlaylistById(churchId)).rejects.toMatchObject({ code: 'structured-playlist' });
      await expect(playlists.addMusicToPlaylist(churchId, songId)).rejects.toMatchObject({ code: 'structured-playlist' });
      await expect(playlists.removeMusicFromPlaylist(churchId, songId)).rejects.toMatchObject({ code: 'structured-playlist' });
      await expect(playlists.reorderPlaylistItems(churchId, [])).rejects.toMatchObject({ code: 'structured-playlist' });
      await expect(playlists.updatePlaylistItemKey(churchId, songId, 'D')).rejects.toMatchObject({ code: 'structured-playlist' });
      await expect(playlists.updatePlaylist(churchId, { nome: 'Outro nome', tipo: 'manual' }))
        .rejects.toMatchObject({ code: 'validation/structured-playlist-type' });

      await playlists.updatePlaylist(churchId, { nome: 'Nome atualizado', tipo: 'igreja' });
      const renamed = await playlists.getChurchPlaylist(churchId);
      expect(renamed).toMatchObject({
        kind: 'structured',
        playlist: { nome: 'Nome atualizado', momentosIgreja: createEmptyChurchMoments() },
      });
      await playlists.deleteChurchPlaylist(churchId);
      expect(await playlists.getChurchPlaylist(churchId)).toBeNull();
    });
  });

  it('deleting a structured church playlist also removes old playlist items', async () => {
    await withRulesDisabledPlaylistRepository('church-owner', async (playlists, firestore) => {
      const playlistId = await playlists.createChurchPlaylistV2({
        nome: 'Igreja com itens antigos',
        momentosIgreja: createEmptyChurchMoments(),
      });
      const oldItemRef = doc(firestore, `usuarios/church-owner/playlists/${playlistId}/itens/old-song`);
      await setDoc(oldItemRef, {
        musicaId: 'old-song',
        posicao: 1,
        momento: null,
        tomPersonalizado: null,
      });

      await playlists.deleteChurchPlaylist(playlistId);

      expect((await getDoc(oldItemRef)).exists()).toBe(false);
      expect(await playlists.getChurchPlaylist(playlistId)).toBeNull();
    });
  });

  it('limits generic deletion to flat playlists and keeps church deletion explicit', async () => {
    const uid = 'church-delete-owner';
    const playlists = playlistsFor(uid);
    const flatId = await playlists.createPlaylist({ nome: 'Playlist plana', tipo: 'manual' });
    await playlists.deletePlaylist(flatId);
    expect(await playlists.getPlaylistById(flatId)).toBeNull();

    const v1Id = 'structured-v1';
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `usuarios/${uid}/playlists/${v1Id}`), withCurrentTimestamps({
        nome: 'Igreja v1',
        tipo: 'igreja',
        versaoEstrutura: 1,
        momentosIgreja: createEmptyChurchMoments(1),
      }));
    });
    const v2Id = await playlists.createChurchPlaylistV2({
      nome: 'Igreja v2',
      momentosIgreja: createEmptyChurchMoments(),
    });

    await expect(playlists.deletePlaylist(v1Id)).rejects.toMatchObject({ code: 'structured-playlist' });
    await expect(playlists.deletePlaylist(v2Id)).rejects.toMatchObject({ code: 'structured-playlist' });
    expect((await playlists.getChurchPlaylist(v1Id))?.kind).toBe('structured');
    expect((await playlists.getChurchPlaylist(v2Id))?.kind).toBe('structured');

    await playlists.deleteChurchPlaylist(v2Id);
    expect(await playlists.getChurchPlaylist(v2Id)).toBeNull();
  });

  it('creates structured playlists as v2 and preserves v1 when reading, editing and copying', async () => {
    const secured = playlistsFor('church-version-owner');
    let legacySourceId = '';
    let orphanV2SourceId = '';
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const v1Moments = createEmptyChurchMoments(1);
      v1Moments[0] = { ...v1Moments[0], musicaId: 'legacy-orphan' };
      v1Moments[1] = { ...v1Moments[1], musicaId: 'legacy/orphan' };
      v1Moments[2] = { ...v1Moments[2], musicaId: `legacy-${'x'.repeat(1600)}` };
      legacySourceId = 'legacy-v1';
      await setDoc(doc(db, `usuarios/church-version-owner/playlists/${legacySourceId}`), withCurrentTimestamps({
        nome: 'Igreja v1 antiga',
        tipo: 'igreja',
        versaoEstrutura: 1,
        momentosIgreja: v1Moments,
      }));

      const v2Moments = createEmptyChurchMoments(2);
      v2Moments[0] = { ...v2Moments[0], referenciaMusical: { musicaId: 'orphan-v2' } };
      orphanV2SourceId = 'orphan-v2-source';
      await setDoc(doc(db, `usuarios/church-version-owner/playlists/${orphanV2SourceId}`), withCurrentTimestamps({
        nome: 'Igreja v2 com órfão',
        tipo: 'igreja',
        versaoEstrutura: 2,
        momentosIgreja: v2Moments,
      }));
    });

    const newPlaylistId = await secured.createChurchPlaylistV2({
      nome: 'Nova Igreja',
      momentosIgreja: createEmptyChurchMoments(),
    });
    const newPlaylist = await secured.getChurchPlaylist(newPlaylistId);
    expect(newPlaylist).toMatchObject({ kind: 'structured', playlist: { versaoEstrutura: 2 } });

    const ownerDb = testEnvironment.authenticatedContext('church-version-owner').firestore();
    await assertFails(setDoc(doc(ownerDb, 'usuarios/church-version-owner/playlists/new-v1'), withCurrentTimestamps({
      nome: 'Nova v1 proibida',
      tipo: 'igreja',
      versaoEstrutura: 1,
      momentosIgreja: createEmptyChurchMoments(1),
    })));

    const legacyRead = await secured.getChurchPlaylist(legacySourceId);
    expect(legacyRead?.kind).toBe('structured');
    if (legacyRead?.kind !== 'structured') throw new Error('Expected the existing v1 playlist to remain readable.');
    expect(legacyRead.playlist.versaoEstrutura).toBe(1);
    const legacyCopyId = await secured.duplicatePlaylist(legacySourceId);
    const legacyCopy = await secured.getChurchPlaylist(legacyCopyId);
    expect(legacyCopy).toMatchObject({
      kind: 'structured',
      playlist: {
        versaoEstrutura: 1,
        copiadaDePlaylist: legacySourceId,
        momentosIgreja: legacyRead.playlist.momentosIgreja,
      },
    });
    await secured.updateChurchMoment(legacySourceId, 'entrada', { versaoEstrutura: 1, tomPersonalizado: 'D' });
    const updatedLegacy = await secured.getChurchPlaylist(legacySourceId);
    expect(updatedLegacy?.kind).toBe('structured');
    if (updatedLegacy?.kind !== 'structured') throw new Error('Expected the edited v1 playlist to remain structured.');
    expect(updatedLegacy.playlist.versaoEstrutura).toBe(1);
    await assertFails(updateDoc(doc(ownerDb, `usuarios/church-version-owner/playlists/${legacySourceId}`), {
      versaoEstrutura: 2,
      updatedAt: serverTimestamp(),
    }));

    await secured.deleteChurchPlaylist(legacySourceId);
    expect(await secured.getChurchPlaylist(legacySourceId)).toBeNull();
    const survivingV1Copy = await secured.getChurchPlaylist(legacyCopyId);
    expect(survivingV1Copy?.kind).toBe('structured');
    if (survivingV1Copy?.kind !== 'structured') throw new Error('Expected the v1 copy to survive source deletion.');
    expect(survivingV1Copy.playlist.versaoEstrutura).toBe(1);
    expect(survivingV1Copy.playlist.momentosIgreja).toHaveLength(10);
    expect(survivingV1Copy.playlist.momentosIgreja).toEqual(legacyRead.playlist.momentosIgreja);
    expect(survivingV1Copy.playlist.momentosIgreja[1].musicaId).toBe('legacy/orphan');
    expect(survivingV1Copy.playlist.momentosIgreja[2].musicaId).toBe(`legacy-${'x'.repeat(1600)}`);
    expect(survivingV1Copy.playlist.momentosIgreja.slice(3).every((moment) => (
      moment.musicaId === null && moment.tomPersonalizado === null
    ))).toBe(true);
    await secured.updateChurchMoment(legacyCopyId, 'perdao', { versaoEstrutura: 1, tomPersonalizado: 'D' });
    const editedV1Copy = await secured.getChurchPlaylist(legacyCopyId);
    expect(editedV1Copy?.kind).toBe('structured');
    if (editedV1Copy?.kind !== 'structured') throw new Error('Expected the v1 copy to remain accessible.');
    expect(editedV1Copy.playlist.momentosIgreja[1]).toMatchObject({
      momentoId: 'perdao',
      musicaId: 'legacy/orphan',
      tomPersonalizado: 'D',
    });
    expect(editedV1Copy.playlist.momentosIgreja[0]).toMatchObject({ musicaId: 'legacy-orphan' });
    expect(editedV1Copy.playlist.momentosIgreja[1].musicaId).toBe('legacy/orphan');
    expect(editedV1Copy.playlist.momentosIgreja[2].musicaId).toBe(`legacy-${'x'.repeat(1600)}`);

    const v2CopyId = await secured.duplicatePlaylist(orphanV2SourceId);
    const v2Copy = await secured.getChurchPlaylist(v2CopyId);
    expect(v2Copy).toMatchObject({
      kind: 'structured',
      playlist: {
        versaoEstrutura: 2,
        copiadaDePlaylist: orphanV2SourceId,
      },
    });
    if (v2Copy?.kind !== 'structured') throw new Error('Expected a v2 copy.');
    expect(v2Copy.playlist.momentosIgreja[0]).toMatchObject({
      referenciaMusical: { musicaId: 'orphan-v2' },
    });
    await assertSucceeds(updateDoc(doc(ownerDb, `usuarios/church-version-owner/playlists/${v2CopyId}`), {
      nome: 'Cópia independente',
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(ownerDb, `usuarios/church-version-owner/playlists/${v2CopyId}`), {
      copiadaDePlaylist: 'another-source',
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(ownerDb, `usuarios/church-version-owner/playlists/${v2CopyId}`), {
      copiadaDePlaylist: deleteField(),
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(ownerDb, `usuarios/church-version-owner/playlists/${v2CopyId}`), {
      versaoEstrutura: 1,
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(ownerDb, `usuarios/church-version-owner/playlists/${newPlaylistId}`), {
      copiadaDePlaylist: orphanV2SourceId,
      updatedAt: serverTimestamp(),
    }));

    await assertSucceeds(deleteDoc(doc(ownerDb, `usuarios/church-version-owner/playlists/${orphanV2SourceId}`)));
    await secured.updateChurchMoment(v2CopyId, 'entrada', { versaoEstrutura: 2, referenciaMusical: null });
    const independentCopy = await secured.getChurchPlaylist(v2CopyId);
    expect(independentCopy).toMatchObject({
      kind: 'structured',
      playlist: { versaoEstrutura: 2, nome: 'Cópia independente' },
    });
  });

  it('rejects forged playlist copies, including any changed liturgical moment', async () => {
    const ownerDb = testEnvironment.authenticatedContext('church-copy-owner').firestore();
    const sourceV1Moments = createEmptyChurchMoments(1);
    sourceV1Moments[2] = { ...sourceV1Moments[2], musicaId: 'orphan-v1' };
    const sourceV2Moments = createEmptyChurchMoments(2);
    sourceV2Moments[7] = { ...sourceV2Moments[7], referenciaMusical: { musicaId: 'orphan-v2' } };
    const v1SourceId = 'v1-source';
    const v2SourceId = 'v2-source';
    const foreignSourceId = 'foreign-source';

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `usuarios/church-copy-owner/playlists/${v1SourceId}`), withCurrentTimestamps({
        nome: 'Origem v1',
        tipo: 'igreja',
        versaoEstrutura: 1,
        momentosIgreja: sourceV1Moments,
      }));
      await setDoc(doc(db, `usuarios/church-copy-owner/playlists/${v2SourceId}`), withCurrentTimestamps({
        nome: 'Origem v2',
        tipo: 'igreja',
        versaoEstrutura: 2,
        momentosIgreja: sourceV2Moments,
      }));
      await setDoc(doc(db, `usuarios/church-copy-other/playlists/${foreignSourceId}`), withCurrentTimestamps({
        nome: 'Origem estrangeira',
        tipo: 'igreja',
        versaoEstrutura: 2,
        momentosIgreja: createEmptyChurchMoments(2),
      }));
    });

    for (const [sourceId, version, originalMoments] of [
      [v1SourceId, 1, sourceV1Moments],
      [v2SourceId, 2, sourceV2Moments],
    ] as const) {
      for (let index = 0; index < 10; index += 1) {
        const forgedMoments = originalMoments.map((moment, momentIndex) => momentIndex === index
          ? { ...moment, tomPersonalizado: 'D' }
          : moment);
        await assertFails(setDoc(doc(ownerDb, `usuarios/church-copy-owner/playlists/forged-${version}-${index}`), withCurrentTimestamps({
          nome: 'Cópia forjada',
          tipo: 'igreja',
          versaoEstrutura: version,
          momentosIgreja: forgedMoments,
          copiadaDePlaylist: sourceId,
        })));
      }
    }

    await assertFails(setDoc(doc(ownerDb, 'usuarios/church-copy-owner/playlists/missing-source-copy'), withCurrentTimestamps({
      nome: 'Origem ausente',
      tipo: 'igreja',
      versaoEstrutura: 2,
      momentosIgreja: createEmptyChurchMoments(2),
      copiadaDePlaylist: 'does-not-exist',
    })));
    await assertFails(setDoc(doc(ownerDb, 'usuarios/church-copy-owner/playlists/foreign-source-copy'), withCurrentTimestamps({
      nome: 'Origem de outra conta',
      tipo: 'igreja',
      versaoEstrutura: 2,
      momentosIgreja: createEmptyChurchMoments(2),
      copiadaDePlaylist: foreignSourceId,
    })));

  });

  it('repertoire repository creates, lists, reads, renames and deletes repertories with their items', async () => {
    const repertories = repertoiresFor('repertoire-owner');
    const songs = repositoryFor('repertoire-owner');
    const id = await repertories.createRepertoire(repertoireInput);
    expect((await repertories.listRepertoires()).map((row) => row.id)).toContain(id);
    expect((await repertories.getRepertoireById(id))?.itens).toEqual([]);
    const songId = await songs.createMusic(musicInput);
    await repertories.addMusicToRepertoire(id, songId);
    await repertories.renameRepertoire(id, 'Renomeado');
    expect((await repertories.getRepertoireById(id))?.nome).toBe('Renomeado');
    await repertories.deleteRepertoire(id);
    expect(await repertories.getRepertoireById(id)).toBeNull();
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      expect((await getDocs(collection(context.firestore(), `usuarios/repertoire-owner/repertorios/${id}/itens`))).size).toBe(0);
    });
  });

  it('repertoire repository includes, reorders and removes songs, preserving an empty repertory', async () => {
    const repertories = repertoiresFor('repertoire-owner'); const songs = repositoryFor('repertoire-owner');
    const id = await repertories.createRepertoire(repertoireInput);
    const first = await songs.createMusic({ ...musicInput, titulo: 'Primeira' });
    const second = await songs.createMusic({ ...musicInput, titulo: 'Segunda' });
    await repertories.addMusicToRepertoire(id, first); await repertories.addMusicToRepertoire(id, second);
    await expect(repertories.addMusicToRepertoire(id, second)).rejects.toMatchObject({ code: 'already-exists' });
    await repertories.reorderRepertoireItems(id, [second, first]);
    expect((await repertories.getRepertoireById(id))?.itens.map(({ musicaId, posicao }) => [musicaId, posicao])).toEqual([[second, 1], [first, 2]]);
    await repertories.removeMusicFromRepertoire(id, second);
    await repertories.removeMusicFromRepertoire(id, first);
    expect((await repertories.getRepertoireById(id))?.itens).toEqual([]);
  });

  it('repertoire repository rejects anonymous, cross-user, missing and invalid persistence operations', async () => {
    await expect(repertoiresFor(null).listRepertoires()).rejects.toMatchObject({ code: 'auth/unauthenticated' });
    const owner = repertoiresFor('repertoire-owner-a'); const other = repertoiresFor('repertoire-owner-b');
    const foreignSong = await repositoryFor('repertoire-owner-b').createMusic(musicInput);
    const id = await owner.createRepertoire(repertoireInput);
    await expect(owner.addMusicToRepertoire(id, foreignSong)).rejects.toMatchObject({ code: 'invalid-music-reference' });
    await expect(owner.addMusicToRepertoire(id, 'missing-song')).rejects.toMatchObject({ code: 'invalid-music-reference' });
    expect(await other.getRepertoireById(id)).toBeNull();
    await expect(owner.renameRepertoire('missing', 'Nome')).rejects.toBeInstanceOf(RepertoireRepositoryError);
    await expect(owner.createRepertoire({ ...repertoireInput, nome: ' ' })).rejects.toMatchObject({ code: 'validation/required' });
  });

  it('preferences repository creates defaults, reads after reload and persists updates by UID', async () => {
    const first = preferencesFor('preferences-owner');
    const defaults = await first.getPreferences();
    expect({ tema: defaults.tema, tamanhoFonte: defaults.tamanhoFonte, velocidadeAutoscroll: defaults.velocidadeAutoscroll })
      .toEqual({ tema: 'sistema', tamanhoFonte: 18, velocidadeAutoscroll: 3 });
    expect(defaults.updatedAt).toBeInstanceOf(Timestamp);

    await first.savePreferences({ tema: 'escuro', tamanhoFonte: 32, velocidadeAutoscroll: 7 });
    const reloaded = await preferencesFor('preferences-owner').getPreferences();
    expect({ tema: reloaded.tema, tamanhoFonte: reloaded.tamanhoFonte, velocidadeAutoscroll: reloaded.velocidadeAutoscroll })
      .toEqual({ tema: 'escuro', tamanhoFonte: 32, velocidadeAutoscroll: 7 });
    expect((await preferencesFor('preferences-other').getPreferences()).tema).toBe('sistema');
  });

  it('preferences repository rejects unauthenticated access and invalid values', async () => {
    const anonymous = preferencesFor(null);
    await expect(anonymous.getPreferences()).rejects.toMatchObject({ code: 'auth/unauthenticated' });
    await expect(anonymous.savePreferences(preferencesInput)).rejects.toMatchObject({ code: 'auth/unauthenticated' });
    const owner = preferencesFor('preferences-owner');
    await expect(owner.savePreferences({ ...preferencesInput, tema: 'invalid' as PreferencesInput['tema'] }))
      .rejects.toMatchObject({ code: 'validation/theme' });
    await expect(owner.savePreferences({ ...preferencesInput, tamanhoFonte: 9 }))
      .rejects.toMatchObject({ code: 'validation/font-size' });
    await expect(owner.savePreferences({ ...preferencesInput, velocidadeAutoscroll: 11 }))
      .rejects.toBeInstanceOf(PreferencesRepositoryError);
  });
});
