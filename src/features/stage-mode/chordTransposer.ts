const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const NOTE_TO_INDEX: Record<string, number> = {
  c: 0,
  'b#': 0,
  'c#': 1,
  db: 1,
  d: 2,
  'd#': 3,
  eb: 3,
  e: 4,
  fb: 4,
  f: 5,
  'e#': 5,
  'f#': 6,
  gb: 6,
  g: 7,
  'g#': 8,
  ab: 8,
  a: 9,
  'a#': 10,
  bb: 10,
  b: 11,
  cb: 11,
};

// Regex para acordes individuais: Root + Acidente + Extensão/Qualidade + Baixo invertido
// Ex: C, C#m7, D/F#, G#m7(b5), Bb7M, Asus4, Cdim, B7(9)/D#
const CHORD_TOKEN_REGEX = /^([A-G][#b]?)((?:m|M|maj|min|dim|aug|sus[24]?|[0-9]+|\+|º|°|-|\([^)]+\))*)(?:\/([A-G][#b]?))?$/;

// Palavras comuns em português com 1 ou 2 letras que poderiam ser confundidas com acordes em linhas de letra
const COMMON_PORTUGUESE_WORDS = new Set([
  'a',
  'e',
  'o',
  'as',
  'os',
  'de',
  'da',
  'do',
  'em',
  'no',
  'na',
  'um',
  'se',
  'me',
  'te',
  'eu',
  'tu',
  'ele',
  'ela',
  'nos',
  'que',
  'por',
  'com',
  'sem',
  'mas',
  'ou',
  'ja',
  'já',
  'so',
  'só',
  'pra',
  'pro',
  'vai',
  'vou',
  'foi',
  'bem',
  'bom',
  'sim',
  'nao',
  'não',
]);

/**
 * Normaliza e transpõe uma única nota musical por N semitons.
 */
export function transposeNote(note: string, semitones: number, preferFlat?: boolean): string {
  const normalized = note.trim().toLowerCase();
  const index = NOTE_TO_INDEX[normalized];
  if (index === undefined) return note;

  const targetIndex = (index + (semitones % 12) + 12) % 12;

  // Decide entre sustenido ou bemol
  const useFlat = preferFlat !== undefined
    ? preferFlat
    : normalized.includes('b') || (semitones < 0 && targetIndex !== 6);

  const targetScale = useFlat ? FLAT_SCALE : SHARP_SCALE;
  return targetScale[targetIndex];
}

/**
 * Transpõe um acorde isolado (ex: "C#m7/G#" com semitones=2 -> "D#m7/A#" ou "Ebm7/Bb").
 */
export function transposeSingleChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;
  const match = chord.match(CHORD_TOKEN_REGEX);
  if (!match) return chord;

  const [, root, extension = '', bass] = match;
  const preferFlat = root.includes('b') || (bass ? bass.includes('b') : false);

  const transposedRoot = transposeNote(root, semitones, preferFlat);
  const transposedBass = bass ? transposeNote(bass, semitones, preferFlat) : null;

  return `${transposedRoot}${extension}${transposedBass ? `/${transposedBass}` : ''}`;
}

/**
 * Verifica se um token de texto é um acorde válido.
 */
export function isChordToken(token: string): boolean {
  let clean = token.trim();
  // Se estiver envolvido por parênteses externos ou colchetes: (Am7) ou [Am7]
  if ((clean.startsWith('(') && clean.endsWith(')')) || (clean.startsWith('[') && clean.endsWith(']'))) {
    clean = clean.slice(1, -1).trim();
  }
  // Remove pontuação terminal solta como vírgula, dois-pontos ou barra de compasso
  clean = clean.replace(/^[|]+|[|:,]+$/g, '').trim();
  if (!clean) return false;
  return CHORD_TOKEN_REGEX.test(clean);
}

/**
 * Analisa se uma linha de texto é predominantemente uma linha de acordes.
 */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Se for linha de comentário ou cabeçalho puro tipo "[Refrão]" ou "[Intro]"
  if (/^\[[^\]]+\]$/.test(trimmed) && !trimmed.includes(':')) {
    // Ex: "[Intro]" sem acordes
    return false;
  }

  // Remove marcas de compasso e colchetes externos comuns
  const cleanLine = trimmed
    .replace(/^\[(intro|refrão|verso|ponte|solo|final)[^\]]*\]/i, '')
    .trim();

  if (!cleanLine) return false;

  const tokens = cleanLine.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  let chordCount = 0;
  let lyricCount = 0;

  for (const token of tokens) {
    // Ignorar símbolos comuns de tablatura/compasso
    if (/^[|/%()\-+.:]+$/.test(token)) continue;

    const lower = token.toLowerCase();
    if (COMMON_PORTUGUESE_WORDS.has(lower)) {
      lyricCount += 2; // Forte indício de letra
      continue;
    }

    if (isChordToken(token)) {
      chordCount++;
    } else {
      lyricCount++;
    }
  }

  if (chordCount === 0) return false;
  return chordCount >= lyricCount;
}

/**
 * Transpõe uma linha de acordes mantendo a compensação de espaços monoespaçados.
 */
export function transposeChordLine(line: string, semitones: number): string {
  if (semitones === 0) return line;

  // Regex para capturar acordes e os espaços que os seguem
  // Ex: "C       G/B      Am"
  const tokenRegex = /([^\s]+)(\s*)/g;
  let result = '';
  let pendingSpaceCompensation = 0;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(line)) !== null) {
    const originalToken = match[1];
    let trailingSpaces = match[2];

    if (isChordToken(originalToken)) {
      const transposedChord = transposeSingleChord(originalToken, semitones);
      const lengthDelta = transposedChord.length - originalToken.length;

      // Compensação de espaçamento:
      // Se o acorde cresceu (delta > 0), precisamos encurtar os espaços seguintes
      // Se encolheu (delta < 0), precisamos aumentar os espaços seguintes (apenas se já havia espaços após o acorde)
      let adjustedSpacesCount = trailingSpaces.length;
      if (trailingSpaces.length > 0) {
        adjustedSpacesCount = trailingSpaces.length - lengthDelta - pendingSpaceCompensation;
        if (adjustedSpacesCount < 1) {
          // Garante ao menos 1 espaço de separação se havia espaço originalmente
          pendingSpaceCompensation = 1 - adjustedSpacesCount;
          adjustedSpacesCount = 1;
        } else {
          pendingSpaceCompensation = 0;
        }
      }

      trailingSpaces = ' '.repeat(Math.max(0, adjustedSpacesCount));
      result += transposedChord + trailingSpaces;
    } else {
      // Token não acorde (ex: barra de compasso '|' ou texto de introdução)
      result += originalToken + trailingSpaces;
    }
  }

  return result;
}

/**
 * Transpõe acordes embutidos em colchetes em linhas de letra: "[C]Era uma [G]vez..."
 */
function transposeInlineBrackets(line: string, semitones: number): string {
  return line.replace(/\[([^\]]+)\]/g, (_match, innerContent) => {
    // Se o conteúdo dentro dos colchetes for acordes separados por espaços
    const parts = innerContent.split(/(\s+)/);
    const transposedParts = parts.map((part: string) => {
      if (isChordToken(part)) {
        return transposeSingleChord(part, semitones);
      }
      return part;
    });
    return `[${transposedParts.join('')}]`;
  });
}

/**
 * Transpõe uma cifra completa preservando quebras de linha e alinhamento monoespaçado.
 */
export function transposeCipher(cipherContent: string, semitones: number): string {
  if (!cipherContent || semitones === 0) return cipherContent;

  const lines = cipherContent.split('\n');
  const transposedLines = lines.map((line) => {
    // 1. Se a linha tem acordes entre colchetes embutidos na letra
    if (line.includes('[') && line.includes(']')) {
      return transposeInlineBrackets(line, semitones);
    }

    // 2. Se a linha for uma linha de acordes dedicada
    if (isChordLine(line)) {
      return transposeChordLine(line, semitones);
    }

    // 3. Linha comum de letra ou instrução
    return line;
  });

  return transposedLines.join('\n');
}

/**
 * Calcula a distância em semitons de uma tonalidade para outra.
 * Ex: fromKey="C", toKey="D" -> +2
 * Ex: fromKey="G", toKey="E" -> -3 (ou +9)
 */
export function calculateSemitoneDistance(fromKey: string | null, toKey: string | null): number {
  if (!fromKey || !toKey) return 0;

  const cleanFrom = fromKey.trim().replace(/m$/i, '').toLowerCase();
  const cleanTo = toKey.trim().replace(/m$/i, '').toLowerCase();

  const fromIndex = NOTE_TO_INDEX[cleanFrom];
  const toIndex = NOTE_TO_INDEX[cleanTo];

  if (fromIndex === undefined || toIndex === undefined) return 0;

  let delta = (toIndex - fromIndex) % 12;
  // Normaliza para o caminho mais curto (-5..+6)
  if (delta > 6) delta -= 12;
  if (delta < -6) delta += 12;

  return delta;
}
