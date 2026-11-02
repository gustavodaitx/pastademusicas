import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { Timestamp, collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createMusicRepository, MusicRepositoryError } from '../services/musicRepository';
import type { MusicInput } from '../services/musicRepository';
import { createPlaylistRepository, PlaylistRepositoryError } from '../services/playlistRepository';
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

const withCurrentTimestamps = <T extends { createdAt: unknown; updatedAt: unknown }>(data: T) => ({
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
});

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

  it('playlist rules require an existing playlist and a same-user music reference keyed by music ID', async () => {
    const ownerDb = testEnvironment.authenticatedContext('playlist-owner').firestore();
    const otherDb = testEnvironment.authenticatedContext('different-owner').firestore();
    await assertSucceeds(setDoc(doc(otherDb, 'usuarios/different-owner/musicas/other-song'), withCurrentTimestamps(music)));
    await assertSucceeds(setDoc(doc(ownerDb, 'usuarios/playlist-owner/playlists/list-1'), withCurrentTimestamps(playlist)));

    const orphanItem = doc(ownerDb, 'usuarios/playlist-owner/playlists/missing-list/itens/own-song');
    await assertFails(setDoc(orphanItem, { ...playlistItem, musicaId: 'own-song' }));

    const items = collection(ownerDb, 'usuarios/playlist-owner/playlists/list-1/itens');
    await assertFails(setDoc(doc(items, 'other-song'), { ...playlistItem, musicaId: 'other-song' }));
    await assertFails(setDoc(doc(items, 'missing-song'), { ...playlistItem, musicaId: 'missing-song' }));

    await assertSucceeds(setDoc(doc(ownerDb, 'usuarios/playlist-owner/musicas/own-song'), withCurrentTimestamps(music)));
    await assertSucceeds(setDoc(doc(items, 'own-song'), { ...playlistItem, musicaId: 'own-song' }));
    await assertFails(setDoc(doc(items, 'duplicate-entry'), { ...playlistItem, musicaId: 'own-song' }));
    await assertSucceeds(updateDoc(doc(items, 'own-song'), { posicao: 2 }));
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

  it('playlist repository creates, lists, reads, renames and deletes playlists with their items', async () => {
    const playlists = playlistsFor('playlist-owner');
    const songs = repositoryFor('playlist-owner');
    const playlistId = await playlists.createPlaylist(playlistInput);
    expect((await playlists.listPlaylists()).map(({ id }) => id)).toContain(playlistId);

    const empty = await playlists.getPlaylistById(playlistId);
    expect(empty?.itens).toEqual([]);
    expect(empty?.createdAt).toBeInstanceOf(Timestamp);

    const songId = await songs.createMusic(musicInput);
    await playlists.addMusicToPlaylist(playlistId, songId);
    await playlists.renamePlaylist(playlistId, 'Renomeada');
    expect((await playlists.getPlaylistById(playlistId))?.nome).toBe('Renomeada');

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

    await playlists.reorderPlaylistItems(playlistId, [thirdId, firstId, secondId]);
    expect((await playlists.getPlaylistById(playlistId))?.itens.map(({ musicaId, posicao }) => [musicaId, posicao]))
      .toEqual([[thirdId, 1], [firstId, 2], [secondId, 3]]);

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

  it('playlist repository reports persistence errors for missing playlists', async () => {
    const repository = playlistsFor('playlist-owner');
    await expect(repository.renamePlaylist('missing-playlist', 'Nome novo'))
      .rejects.toMatchObject({ code: 'permission-denied' });
    await expect(repository.getPlaylistById('invalid/id')).rejects.toBeInstanceOf(PlaylistRepositoryError);
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
