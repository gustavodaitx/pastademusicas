import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import {
  createEmptyChurchMoments,
  identifyChurchPlaylistFormat,
  validateChurchMoments,
} from '../services/playlistRepository';
import { MOMENTOS_IGREJA } from '../types/firestore';

function structuredChurchPlaylist(): Record<string, unknown> {
  const timestamp = Timestamp.fromMillis(1);
  return {
    nome: 'Celebração',
    tipo: 'igreja',
    createdAt: timestamp,
    updatedAt: timestamp,
    versaoEstrutura: 1,
    momentosIgreja: createEmptyChurchMoments(1),
  };
}

function legacyChurchPlaylist(): Record<string, unknown> {
  const timestamp = Timestamp.fromMillis(1);
  return {
    nome: 'Celebração legada',
    tipo: 'igreja',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('Church playlist contracts', () => {
  it('creates exactly ten empty slots in the canonical order', () => {
    const moments = createEmptyChurchMoments(1);

    expect(moments).toHaveLength(10);
    expect(moments.map(({ momentoId }) => momentoId)).toEqual(MOMENTOS_IGREJA.map(({ id }) => id));
    expect(moments.every(({ musicaId, tomPersonalizado }) => musicaId === null && tomPersonalizado === null)).toBe(true);
  });

  it('validates canonical slots and preserves assigned music and custom keys', () => {
    const moments = createEmptyChurchMoments(1);
    moments[0] = { ...moments[0], musicaId: 'song-1', tomPersonalizado: ' D ' };

    expect(validateChurchMoments(moments)).toEqual([
      { ...moments[0], tomPersonalizado: 'D' },
      ...moments.slice(1),
    ]);
  });

  it.each([
    ['missing a slot', (moments: ReturnType<typeof createEmptyChurchMoments>) => moments.slice(1)],
    ['in the wrong order', (moments: ReturnType<typeof createEmptyChurchMoments>) => [moments[1], moments[0], ...moments.slice(2)]],
    ['with a duplicate slot', (moments: ReturnType<typeof createEmptyChurchMoments>) => [moments[0], ...moments.slice(1, 9), moments[8]]],
    ['with an invalid song ID', (moments: ReturnType<typeof createEmptyChurchMoments>) => [{ ...moments[0], musicaId: 'bad/song' }, ...moments.slice(1)]],
    ['with an oversized custom key', (moments: ReturnType<typeof createEmptyChurchMoments>) => [{ ...moments[0], tomPersonalizado: 'D'.repeat(13) }, ...moments.slice(1)]],
  ])('rejects a church playlist %s', (_description, makeInvalid) => {
    expect(() => validateChurchMoments(makeInvalid(createEmptyChurchMoments(1)))).toThrow();
  });

  it.each([
    ['an extra field', (moments: ReturnType<typeof createEmptyChurchMoments>) => [{ ...moments[0], extra: true }, ...moments.slice(1)]],
    ['a missing field', (moments: ReturnType<typeof createEmptyChurchMoments>) => {
      const momentWithoutKey: Record<string, unknown> = { ...moments[0] };
      delete momentWithoutKey.tomPersonalizado;
      return [momentWithoutKey, ...moments.slice(1)];
    }],
    ['a non-string music ID', (moments: ReturnType<typeof createEmptyChurchMoments>) => [{ ...moments[0], musicaId: 42 }, ...moments.slice(1)]],
    ['a non-string custom key', (moments: ReturnType<typeof createEmptyChurchMoments>) => [{ ...moments[0], tomPersonalizado: 42 }, ...moments.slice(1)]],
  ])('rejects a moment with %s', (_description, makeInvalid) => {
    expect(() => validateChurchMoments(makeInvalid(createEmptyChurchMoments(1)))).toThrow();
  });

  it('creates v2 empty moments by default for new structured playlists', () => {
    const moments = createEmptyChurchMoments();

    expect(moments).toHaveLength(10);
    expect(moments.every((moment) => 'referenciaMusical' in moment && moment.referenciaMusical === null)).toBe(true);
    expect(validateChurchMoments(moments, 2)).toEqual(moments);
  });

  it('distinguishes structured, legacy, non-church and malformed playlist data', () => {
    expect(identifyChurchPlaylistFormat(structuredChurchPlaylist())).toBe('structured');
    expect(identifyChurchPlaylistFormat(legacyChurchPlaylist())).toBe('legacy');
    expect(identifyChurchPlaylistFormat({
      nome: 'Manual',
      tipo: 'manual',
      createdAt: Timestamp.fromMillis(1),
      updatedAt: Timestamp.fromMillis(1),
    })).toBe('not-church');
  });

  it.each([
    ['without a name', (playlist: Record<string, unknown>) => { delete playlist.nome; }],
    ['with a non-string name', (playlist: Record<string, unknown>) => { playlist.nome = 42; }],
    ['without a timestamp', (playlist: Record<string, unknown>) => { delete playlist.createdAt; }],
    ['with an invalid timestamp', (playlist: Record<string, unknown>) => { playlist.updatedAt = new Date(); }],
    ['with a non-numeric structure version', (playlist: Record<string, unknown>) => { playlist.versaoEstrutura = '1'; }],
    ['with non-array moments', (playlist: Record<string, unknown>) => { playlist.momentosIgreja = {}; }],
    ['with structural markers and a non-church type', (playlist: Record<string, unknown>) => { playlist.tipo = 'manual'; }],
    ['with only a structure version', (playlist: Record<string, unknown>) => { delete playlist.momentosIgreja; }],
    ['with only moments', (playlist: Record<string, unknown>) => { delete playlist.versaoEstrutura; }],
  ])('classifies a structured playlist %s as invalid', (_description, corrupt) => {
    const playlist = structuredChurchPlaylist();
    corrupt(playlist);
    expect(identifyChurchPlaylistFormat(playlist)).toBe('invalid');
  });

  it.each([
    ['without a name', (playlist: Record<string, unknown>) => { delete playlist.nome; }],
    ['with a non-string name', (playlist: Record<string, unknown>) => { playlist.nome = 42; }],
    ['without a timestamp', (playlist: Record<string, unknown>) => { delete playlist.updatedAt; }],
    ['with an invalid timestamp', (playlist: Record<string, unknown>) => { playlist.createdAt = 'timestamp'; }],
    ['with a structural marker', (playlist: Record<string, unknown>) => { playlist.versaoEstrutura = 1; }],
  ])('classifies a legacy playlist %s as invalid', (_description, corrupt) => {
    const playlist = legacyChurchPlaylist();
    corrupt(playlist);
    expect(identifyChurchPlaylistFormat(playlist)).toBe('invalid');
  });
});
