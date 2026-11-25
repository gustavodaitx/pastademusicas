import { describe, expect, it } from 'vitest';
import { formatChurchPlaylist, formatMusicText, formatPlaylistText, sanitizeExportFilename } from '../features/export/exportFormatters';
import { MOMENTOS_IGREJA } from '../types/firestore';

describe('export formatters', () => {
  it('preserves the source chord text, spacing, tabs, blank lines and Portuguese characters', () => {
    const original = 'C       G\r\nCanção, ação!\n\t Am\n';
    const music = { titulo: 'Canção', artista: 'João', tomOriginal: 'C', conteudoCifrado: original };
    expect(formatMusicText(music, { includeMetadata: false })).toBe('C       G\nCanção, ação!\n\t Am\n');
    expect(music.conteudoCifrado).toBe(original);
  });

  it('retains playlist order, missing items and optional moment and song metadata', () => {
    const text = formatPlaylistText({ nome: 'Celebração', itens: [
      { music: { titulo: 'Segunda', artista: 'B', tomOriginal: 'D', conteudoCifrado: 'D\nlinha' }, momento: 'Entrada' },
      { music: null, momento: 'Perdão' },
      { music: { titulo: 'Terceira', conteudoCifrado: 'G' }, momento: 'Glória' },
    ] }, { includeMetadata: true });
    expect(text.indexOf('Título: Segunda')).toBeLessThan(text.indexOf('Momento: Perdão'));
    expect(text.indexOf('Momento: Perdão')).toBeLessThan(text.indexOf('Sem música selecionada'));
    expect(text.indexOf('Sem música selecionada')).toBeLessThan(text.indexOf('Título: Terceira'));
    expect(text).toContain('Playlist: Celebração');
    expect(text).toContain('Tom original: D');
  });

  it('preserves all ten empty liturgical slots', () => {
    const moments = MOMENTOS_IGREJA.map(({ id }) => ({ momentoId: id, referenciaMusical: null, tomPersonalizado: null }));
    const playlist = formatChurchPlaylist('Missa', moments, new Map());
    expect(playlist.itens).toHaveLength(10);
    const text = formatPlaylistText(playlist, { includeMetadata: true });
    expect(text.match(/Sem música selecionada/g)).toHaveLength(10);
  });

  it('always identifies all ten liturgical moments with metadata disabled', () => {
    const moments = MOMENTOS_IGREJA.map(({ id }, index) => ({
      momentoId: id,
      referenciaMusical: index === 0 || index === 7 ? { musicaId: `song-${index}` } : null,
      tomPersonalizado: null,
    }));
    const songs = new Map([
      ['song-0', { titulo: 'Canto de entrada', artista: 'Artista A', tomOriginal: 'C', conteudoCifrado: 'Cifra A' }],
      ['song-7', { titulo: 'Canto de comunhão', artista: 'Artista B', tomOriginal: 'G', conteudoCifrado: 'Cifra B' }],
    ]);
    const playlist = formatChurchPlaylist('Missa', moments, songs);
    const text = formatPlaylistText(playlist, { includeMetadata: false });

    for (const { nome } of MOMENTOS_IGREJA) expect(text).toContain(`Momento: ${nome}`);
    expect(text).toContain('Cifra A');
    expect(text).toContain('Cifra B');
    expect(text.match(/Sem música selecionada/g)).toHaveLength(8);
    expect(text).not.toContain('Artista:');
    expect(text).not.toContain('Tom original:');
    expect(text).not.toContain('Playlist:');
  });

  it('sanitizes unsafe names and falls back for empty names', () => {
    expect(sanitizeExportFilename(' Música: /final. ', 'pdf')).toBe('Música final.pdf');
    expect(sanitizeExportFilename('... ', 'txt')).toBe('exportacao.txt');
  });
});
