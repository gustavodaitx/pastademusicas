import { describe, expect, it } from 'vitest';
import { matchesMusicSearch, normalizeMusicSearchText } from '../features/library/musicSearch';
import type { MusicRecord } from '../services/musicRepository';

const music: MusicRecord = {
  id: 'search-song',
  titulo: 'Canção da Manhã',
  artista: 'Intérprete Áureo',
  compositor: null,
  tomOriginal: 'G',
  conteudoCifrado: 'G/B      C\nLuz sobre o mar',
  observacoes: null,
  categorias: ['MPB'],
  tags: ['Ao Vivo'],
  momentosLiturgicos: [],
  estilo: [],
  origemTipo: 'manual',
  driveFileId: null,
  arquivoNome: null,
  licencaOuPermissao: null,
  createdAt: {} as MusicRecord['createdAt'],
  updatedAt: {} as MusicRecord['updatedAt'],
};

describe('music search', () => {
  it.each(['CANÇÃO DA MANHÃ', 'interprete aureo', 'ao vivo', 'luz sobre o mar', 'G/B'])('finds title, artist, tag, lyric or chord: %s', (term) => {
    expect(matchesMusicSearch(music, term)).toBe(true);
  });

  it('normalizes accents, case and repeated whitespace', () => {
    expect(normalizeMusicSearchText('  LÉTRA   da  Manhã ')).toBe('letra da manha');
    expect(matchesMusicSearch(music, '  LUZ   SOBRE   O   MAR ')).toBe(true);
  });

  it('searches by composer with and without accents', () => {
    const composedMusic = { ...music, compositor: 'Compositora Áurea' };
    expect(matchesMusicSearch(composedMusic, 'Compositora Áurea')).toBe(true);
    expect(matchesMusicSearch(composedMusic, 'compositora aurea')).toBe(true);
  });

  it('supports legacy songs without a composer', () => {
    const legacyMusic: MusicRecord = { ...music };
    delete legacyMusic.compositor;

    expect(matchesMusicSearch(legacyMusic, 'Canção da Manhã')).toBe(true);
    expect(matchesMusicSearch(legacyMusic, 'compositora aurea')).toBe(false);
  });

  it('does not match a phrase created by joining separate fields', () => {
    const splitFieldsMusic = { ...music, titulo: 'Brisa', artista: 'Norte' };
    expect(matchesMusicSearch(splitFieldsMusic, 'brisa norte')).toBe(false);
  });

  it('returns all songs for an empty query and no match for an absent phrase', () => {
    expect(matchesMusicSearch(music, '   ')).toBe(true);
    expect(matchesMusicSearch(music, 'trecho inexistente')).toBe(false);
  });
});
