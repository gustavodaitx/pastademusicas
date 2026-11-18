import type { MusicRecord } from '../../services/musicRepository';
import { normalizeMusicSearchText } from '../library/musicSearch';

export type KeyPreference = 'Qualquer' | 'graves' | 'medios' | 'altos' | string;

export type BarModeParams = {
  estilo: string;
  quantidade: number;
  preferenciaTom: KeyPreference;
  alternarRitmo: boolean;
};

export type TempoClassification = 'animada' | 'lenta' | 'neutra';

export type BarModeGenerationResult = {
  musicas: MusicRecord[];
  totalSolicitado: number;
  totalEncontrado: number;
  houveCorte: boolean;
  aviso?: string;
};

const FAST_TEMPO_KEYWORDS = new Set([
  'animada',
  'animado',
  'animadas',
  'animados',
  'agitada',
  'agitado',
  'agitadas',
  'agitados',
  'rapida',
  'rapido',
  'rapidas',
  'rapidos',
  'festa',
  'danca',
  'dancante',
  'frevo',
  'axe',
  'carnaval',
  'forro',
  'up-tempo',
  'uptempo',
  'alegre',
  'eletrica',
  'agitacao',
]);

const SLOW_TEMPO_KEYWORDS = new Set([
  'lenta',
  'lento',
  'lentas',
  'lentos',
  'calma',
  'calmo',
  'calmas',
  'calmos',
  'balada',
  'baladas',
  'acustico',
  'acustica',
  'suave',
  'suaves',
  'romantica',
  'romantico',
  'romanticas',
  'romanticos',
  'tranquila',
  'tranquilo',
  'slow',
  'intima',
  'intimo',
  'bossa',
  'valsa',
]);

const LOW_KEYS = new Set(['c', 'c#', 'db', 'd', 'd#', 'eb', 'cm', 'c#m', 'dbm', 'dm', 'd#m', 'ebm']);
const MID_KEYS = new Set(['e', 'f', 'f#', 'gb', 'g', 'g#', 'ab', 'em', 'fm', 'f#m', 'gbm', 'gm', 'g#m', 'abm']);
const HIGH_KEYS = new Set(['a', 'a#', 'bb', 'b', 'am', 'a#m', 'bbm', 'bm']);

export function classifyTempo(music: MusicRecord): TempoClassification {
  // 1. Verificar primeiro nas tags e observações (onde o usuário costuma classificar andamento)
  const tagTokens = [
    ...music.tags,
    music.observacoes ?? '',
  ]
    .flatMap((value) => normalizeMusicSearchText(value).split(/[\s,/-]+/))
    .filter(Boolean);

  let tagFast = false;
  let tagSlow = false;
  for (const token of tagTokens) {
    if (FAST_TEMPO_KEYWORDS.has(token)) tagFast = true;
    if (SLOW_TEMPO_KEYWORDS.has(token)) tagSlow = true;
  }

  if (tagFast && !tagSlow) return 'animada';
  if (tagSlow && !tagFast) return 'lenta';

  // 2. Se tags não definiram, verificar em categorias e estilo
  const categoryTokens = [
    ...music.categorias,
    ...music.estilo,
  ]
    .flatMap((value) => normalizeMusicSearchText(value).split(/[\s,/-]+/))
    .filter(Boolean);

  let catFast = false;
  let catSlow = false;
  for (const token of categoryTokens) {
    if (FAST_TEMPO_KEYWORDS.has(token)) catFast = true;
    if (SLOW_TEMPO_KEYWORDS.has(token)) catSlow = true;
  }

  if (catFast && !catSlow) return 'animada';
  if (catSlow && !catFast) return 'lenta';

  return 'neutra';
}

function normalizeKey(key: string | null): string {
  if (!key) return '';
  return key.trim().toLowerCase();
}

export function matchesKeyPreference(key: string | null, preference: KeyPreference): boolean {
  if (!preference || preference === 'Qualquer') return true;
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return false;

  const normalizedPref = preference.trim().toLowerCase();

  if (normalizedPref === 'graves' || normalizedPref === 'c') {
    return LOW_KEYS.has(normalizedKey);
  }
  if (normalizedPref === 'medios' || normalizedPref === 'g') {
    return MID_KEYS.has(normalizedKey);
  }
  if (normalizedPref === 'altos' || normalizedPref === 'a') {
    return HIGH_KEYS.has(normalizedKey);
  }

  return normalizedKey === normalizedPref;
}

export function matchesStyle(music: MusicRecord, targetStyle: string): boolean {
  if (!targetStyle || targetStyle === 'Todos' || targetStyle === 'Misto / Variado' || targetStyle === 'Qualquer') {
    return true;
  }

  const normalizedTarget = normalizeMusicSearchText(targetStyle);
  const targetSubtokens = normalizedTarget.split(/[\s,/-]+/).filter(Boolean);

  const musicTokens = [
    ...music.estilo,
    ...music.categorias,
    ...music.tags,
  ].map(normalizeMusicSearchText);

  return musicTokens.some((token) => {
    if (token === normalizedTarget || token.includes(normalizedTarget) || normalizedTarget.includes(token)) {
      return true;
    }
    return targetSubtokens.some((subtoken) => subtoken.length > 2 && token.includes(subtoken));
  });
}

export function extractUniqueStyles(musics: readonly MusicRecord[]): string[] {
  const stylesSet = new Set<string>();
  for (const music of musics) {
    for (const style of music.estilo) {
      const trimmed = style.trim();
      if (trimmed) stylesSet.add(trimmed);
    }
    for (const category of music.categorias) {
      const trimmed = category.trim();
      if (trimmed) stylesSet.add(trimmed);
    }
  }
  return Array.from(stylesSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function generateBarRepertoire(
  catalog: readonly MusicRecord[],
  params: BarModeParams,
): BarModeGenerationResult {
  const requestedQuantity = Math.max(5, Math.min(40, Math.floor(params.quantidade || 15)));

  if (catalog.length === 0) {
    return {
      musicas: [],
      totalSolicitado: requestedQuantity,
      totalEncontrado: 0,
      houveCorte: true,
      aviso: 'Sua biblioteca está vazia. Cadastre músicas antes de gerar o repertório.',
    };
  }

  // 1. Filtrar pelo estilo selecionado
  const styleMatchingMusics = catalog.filter((music) => matchesStyle(music, params.estilo));

  // Se o filtro de estilo específico não encontrou nada, reporta zero músicas compatíveis
  if (styleMatchingMusics.length === 0) {
    return {
      musicas: [],
      totalSolicitado: requestedQuantity,
      totalEncontrado: 0,
      houveCorte: true,
      aviso: `Nenhuma música encontrada para o estilo "${params.estilo}". Selecione outro estilo ou adicione novas músicas.`,
    };
  }

  // 2. Pontuar e ordenar por preferência de tom
  // Músicas que atendem à preferência de tom vêm primeiro, seguidas pelas demais compatíveis
  const matchingKeyMusics: MusicRecord[] = [];
  const otherKeyMusics: MusicRecord[] = [];

  for (const music of styleMatchingMusics) {
    if (matchesKeyPreference(music.tomOriginal, params.preferenciaTom)) {
      matchingKeyMusics.push(music);
    } else {
      otherKeyMusics.push(music);
    }
  }

  // Conjunto de candidatos ordenados com preferência de tom
  const candidatePool = [...matchingKeyMusics, ...otherKeyMusics];

  // 3. Alternância de ritmo ou seleção direta
  let selectedMusics: MusicRecord[] = [];

  if (params.alternarRitmo) {
    const fastPool: MusicRecord[] = [];
    const slowPool: MusicRecord[] = [];
    const neutralPool: MusicRecord[] = [];

    for (const music of candidatePool) {
      const tempo = classifyTempo(music);
      if (tempo === 'animada') fastPool.push(music);
      else if (tempo === 'lenta') slowPool.push(music);
      else neutralPool.push(music);
    }

    // Intercalação: animada, lenta, animada, lenta... com neutras preenchendo
    let fastIndex = 0;
    let slowIndex = 0;
    let neutralIndex = 0;
    let pickFastNext = fastPool.length >= slowPool.length;

    while (
      selectedMusics.length < requestedQuantity &&
      selectedMusics.length < candidatePool.length
    ) {
      let chosen: MusicRecord | null = null;

      if (pickFastNext) {
        if (fastIndex < fastPool.length) {
          chosen = fastPool[fastIndex++];
        } else if (slowIndex < slowPool.length) {
          chosen = slowPool[slowIndex++];
        } else if (neutralIndex < neutralPool.length) {
          chosen = neutralPool[neutralIndex++];
        }
      } else {
        if (slowIndex < slowPool.length) {
          chosen = slowPool[slowIndex++];
        } else if (fastIndex < fastPool.length) {
          chosen = fastPool[fastIndex++];
        } else if (neutralIndex < neutralPool.length) {
          chosen = neutralPool[neutralIndex++];
        }
      }

      if (chosen) {
        selectedMusics.push(chosen);
        pickFastNext = !pickFastNext;
      } else {
        break;
      }
    }
  } else {
    selectedMusics = candidatePool.slice(0, requestedQuantity);
  }

  // Deduplicação de segurança por ID
  const seenIds = new Set<string>();
  const uniqueMusics: MusicRecord[] = [];
  for (const music of selectedMusics) {
    if (!seenIds.has(music.id)) {
      seenIds.add(music.id);
      uniqueMusics.push(music);
    }
  }

  const totalEncontrado = uniqueMusics.length;
  const houveCorte = totalEncontrado < requestedQuantity;

  let aviso: string | undefined;
  if (houveCorte) {
    aviso = `Foram encontradas apenas ${totalEncontrado} ${totalEncontrado === 1 ? 'música compatível' : 'músicas compatíveis'} com os filtros selecionados (solicitadas: ${requestedQuantity}).`;
  }

  return {
    musicas: uniqueMusics,
    totalSolicitado: requestedQuantity,
    totalEncontrado,
    houveCorte,
    aviso,
  };
}
