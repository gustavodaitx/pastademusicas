import type { MusicRecord } from '../../services/musicRepository';

export function normalizeMusicSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchesMusicSearch(music: MusicRecord, searchTerm: string): boolean {
  const term = normalizeMusicSearchText(searchTerm);
  if (!term) return true;

  return createMusicSearchIndex([music])[0].normalizedFields.some((field) => field.includes(term));
}

export function createMusicSearchIndex(musics: MusicRecord[]) {
  return musics.map((music) => ({
    music,
    normalizedFields: [
      music.titulo,
      music.artista ?? '',
      music.compositor ?? '',
      music.conteudoCifrado,
      ...music.tags,
    ].map(normalizeMusicSearchText),
  }));
}
