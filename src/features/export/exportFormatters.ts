import { MOMENTOS_IGREJA } from '../../types/firestore';
import type { MomentoIgreja } from '../../types/firestore';

export type ExportMusic = {
  titulo?: string | null;
  artista?: string | null;
  tomOriginal?: string | null;
  conteudoCifrado?: string | null;
  momentosLiturgicos?: readonly string[];
};

export type ExportPlaylistItem = {
  music?: ExportMusic | null;
  momento?: string | null;
  tomPersonalizado?: string | null;
};

export type ExportPlaylist = {
  nome?: string | null;
  itens: readonly ExportPlaylistItem[];
};

export type ExportOptions = { includeMetadata: boolean };

const emptySong = 'Sem música selecionada';

function metadataLines(music: ExportMusic, moment?: string | null, customKey?: string | null): string[] {
  const lines = [`Título: ${music.titulo?.trim() || 'Sem título'}`];
  if (music.artista?.trim()) lines.push(`Artista: ${music.artista}`);
  if (music.tomOriginal?.trim()) lines.push(`Tom original: ${music.tomOriginal}`);
  if (moment?.trim()) lines.push(`Momento: ${moment}`);
  if (customKey?.trim()) lines.push(`Tom personalizado: ${customKey}`);
  if (music.momentosLiturgicos?.length) lines.push(`Momentos litúrgicos: ${music.momentosLiturgicos.join(', ')}`);
  return lines;
}

export function formatMusicText(music: ExportMusic, { includeMetadata }: ExportOptions): string {
  const content = (music.conteudoCifrado ?? '').replace(/\r\n?/g, '\n');
  if (!includeMetadata) return content;
  return [...metadataLines(music), '-'.repeat(40), content].join('\n');
}

export function formatPlaylistText(playlist: ExportPlaylist, { includeMetadata }: ExportOptions): string {
  const lines: string[] = [];
  if (includeMetadata) lines.push(`Playlist: ${playlist.nome?.trim() || 'Playlist sem nome'}`, '');
  playlist.itens.forEach((item, index) => {
    if (index) lines.push('', '', '='.repeat(48), '');
    if (item.momento?.trim()) lines.push(`Momento: ${item.momento}`);
    if (!item.music) {
      lines.push(emptySong);
      return;
    }
    if (includeMetadata) lines.push(...metadataLines(item.music, null, item.tomPersonalizado), '-'.repeat(40));
    lines.push((item.music.conteudoCifrado ?? '').replace(/\r\n?/g, '\n'));
  });
  return lines.join('\n');
}

export function formatChurchPlaylist(name: string, moments: readonly MomentoIgreja[], byId: ReadonlyMap<string, ExportMusic>): ExportPlaylist {
  const items = MOMENTOS_IGREJA.map(({ id, nome }) => {
    const moment = moments.find((entry) => entry.momentoId === id);
    const musicId = moment ? ('referenciaMusical' in moment ? moment.referenciaMusical?.musicaId : moment.musicaId) : null;
    return { momentName: nome, musicId, moment };
  });
  return {
    nome: name,
    itens: items.map(({ momentName, musicId, moment }) => ({
      music: musicId ? byId.get(musicId) ?? null : null,
      momento: momentName,
      tomPersonalizado: moment?.tomPersonalizado ?? null,
    })),
  };
}

export function sanitizeExportFilename(name: string | null | undefined, extension: 'txt' | 'pdf'): string {
  const safe = Array.from((name ?? '').normalize('NFC'))
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return !'<>:"/\\|?*'.includes(character) && code >= 0x20 && code !== 0x7f
        && (code < 0xd800 || code > 0xdfff);
    })
    .join('')
    .replace(/[. ]+$/g, '')
    .trim();
  return `${safe || 'exportacao'}.${extension}`;
}
