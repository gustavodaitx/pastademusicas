import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import {
  classifyTempo,
  extractUniqueStyles,
  generateBarRepertoire,
  matchesKeyPreference,
  matchesStyle,
} from '../features/bar-mode/barModeGenerator';
import type { MusicRecord } from '../services/musicRepository';

function mockSong(
  id: string,
  titulo: string,
  estilo: string[] = [],
  categorias: string[] = [],
  tags: string[] = [],
  tomOriginal: string | null = 'C',
): MusicRecord {
  const timestamp = Timestamp.fromMillis(1000);
  return {
    id,
    titulo,
    artista: `Artista ${id}`,
    compositor: null,
    tomOriginal,
    conteudoCifrado: 'C G Am F',
    observacoes: null,
    categorias,
    tags,
    momentosLiturgicos: [],
    estilo,
    origemTipo: 'manual',
    driveFileId: null,
    arquivoNome: null,
    licencaOuPermissao: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('barModeGenerator', () => {
  describe('classifyTempo', () => {
    it('identifica ritmo animado por tags ou categorias', () => {
      expect(classifyTempo(mockSong('1', 'Rock', ['Rock'], [], ['animada']))).toBe('animada');
      expect(classifyTempo(mockSong('2', 'Forró', [], ['Forró'], ['festa', 'rapida']))).toBe('animada');
      expect(classifyTempo(mockSong('3', 'Axé', ['Axé'], [], []))).toBe('animada');
    });

    it('identifica ritmo lento por tags ou categorias', () => {
      expect(classifyTempo(mockSong('4', 'Balada', ['Rock'], [], ['lenta', 'balada']))).toBe('lenta');
      expect(classifyTempo(mockSong('5', 'Acústico', [], ['Acústico'], ['calma', 'suave']))).toBe('lenta');
      expect(classifyTempo(mockSong('6', 'Bossa', ['Bossa Nova'], [], []))).toBe('lenta');
    });

    it('retorna neutra quando não há termos definidos', () => {
      expect(classifyTempo(mockSong('7', 'Comum', ['Pop'], ['Geral'], ['letra']))).toBe('neutra');
    });
  });

  describe('matchesKeyPreference', () => {
    it('aceita qualquer tom quando preferencia for Qualquer', () => {
      expect(matchesKeyPreference('C', 'Qualquer')).toBe(true);
      expect(matchesKeyPreference(null, 'Qualquer')).toBe(true);
    });

    it('filtra corretamente tons graves (C, D)', () => {
      expect(matchesKeyPreference('C', 'graves')).toBe(true);
      expect(matchesKeyPreference('D', 'graves')).toBe(true);
      expect(matchesKeyPreference('Dm', 'graves')).toBe(true);
      expect(matchesKeyPreference('G', 'graves')).toBe(false);
      expect(matchesKeyPreference('A', 'graves')).toBe(false);
    });

    it('filtra corretamente tons médios (E, F, G)', () => {
      expect(matchesKeyPreference('E', 'medios')).toBe(true);
      expect(matchesKeyPreference('G', 'medios')).toBe(true);
      expect(matchesKeyPreference('Em', 'medios')).toBe(true);
      expect(matchesKeyPreference('C', 'medios')).toBe(false);
    });

    it('filtra corretamente tons altos (A, B)', () => {
      expect(matchesKeyPreference('A', 'altos')).toBe(true);
      expect(matchesKeyPreference('Bm', 'altos')).toBe(true);
      expect(matchesKeyPreference('C', 'altos')).toBe(false);
    });

    it('filtra por tom exato', () => {
      expect(matchesKeyPreference('F#m', 'F#m')).toBe(true);
      expect(matchesKeyPreference('G', 'F#m')).toBe(false);
    });
  });

  describe('matchesStyle', () => {
    it('aceita qualquer música quando estilo for Todos', () => {
      const song = mockSong('1', 'Canção', ['Sertanejo']);
      expect(matchesStyle(song, 'Todos')).toBe(true);
      expect(matchesStyle(song, 'Misto / Variado')).toBe(true);
      expect(matchesStyle(song, '')).toBe(true);
    });

    it('combina por estilo, categorias ou tags', () => {
      expect(matchesStyle(mockSong('1', 'A', ['Pop/Rock']), 'Pop/Rock')).toBe(true);
      expect(matchesStyle(mockSong('2', 'B', [], ['MPB']), 'MPB')).toBe(true);
      expect(matchesStyle(mockSong('3', 'C', [], [], ['Sertanejo']), 'Sertanejo')).toBe(true);
      expect(matchesStyle(mockSong('4', 'D', ['Reggae']), 'Samba')).toBe(false);
    });
  });

  describe('extractUniqueStyles', () => {
    it('extrai e ordena lista única de estilos do catálogo', () => {
      const catalog = [
        mockSong('1', 'A', ['Pop/Rock'], ['Nacional']),
        mockSong('2', 'B', ['MPB'], ['Nacional']),
        mockSong('3', 'C', ['Pop/Rock'], ['Acústico']),
      ];
      expect(extractUniqueStyles(catalog)).toEqual(['Acústico', 'MPB', 'Nacional', 'Pop/Rock']);
    });
  });

  describe('generateBarRepertoire', () => {
    it('retorna lista vazia e aviso claro quando o catálogo estiver vazio', () => {
      const result = generateBarRepertoire([], {
        estilo: 'Todos',
        quantidade: 15,
        preferenciaTom: 'Qualquer',
        alternarRitmo: true,
      });

      expect(result.musicas).toEqual([]);
      expect(result.totalSolicitado).toBe(15);
      expect(result.totalEncontrado).toBe(0);
      expect(result.houveCorte).toBe(true);
      expect(result.aviso).toContain('biblioteca está vazia');
    });

    it('seleciona sem duplicatas e respeita a quantidade quando há músicas suficientes', () => {
      const catalog = Array.from({ length: 25 }, (_, i) =>
        mockSong(`s-${i}`, `Música ${i}`, ['Pop/Rock'], [], ['animada'], i % 2 === 0 ? 'C' : 'G'),
      );

      const result = generateBarRepertoire(catalog, {
        estilo: 'Pop/Rock',
        quantidade: 10,
        preferenciaTom: 'Qualquer',
        alternarRitmo: false,
      });

      expect(result.musicas).toHaveLength(10);
      expect(result.totalSolicitado).toBe(10);
      expect(result.totalEncontrado).toBe(10);
      expect(result.houveCorte).toBe(false);
      expect(result.aviso).toBeUndefined();

      // Sem duplicatas
      const uniqueIds = new Set(result.musicas.map((m) => m.id));
      expect(uniqueIds.size).toBe(10);
    });

    it('informa corte e usa todas as músicas disponíveis quando há menos que o solicitado', () => {
      const catalog = [
        mockSong('s-1', 'Música 1', ['MPB']),
        mockSong('s-2', 'Música 2', ['MPB']),
        mockSong('s-3', 'Música 3', ['MPB']),
      ];

      const result = generateBarRepertoire(catalog, {
        estilo: 'MPB',
        quantidade: 15,
        preferenciaTom: 'Qualquer',
        alternarRitmo: false,
      });

      expect(result.musicas).toHaveLength(3);
      expect(result.totalSolicitado).toBe(15);
      expect(result.totalEncontrado).toBe(3);
      expect(result.houveCorte).toBe(true);
      expect(result.aviso).toBe(
        'Foram encontradas apenas 3 músicas compatíveis com os filtros selecionados (solicitadas: 15).',
      );
    });

    it('avisa quando nenhuma música coincide com o estilo filtrado', () => {
      const catalog = [
        mockSong('s-1', 'Música 1', ['MPB']),
        mockSong('s-2', 'Música 2', ['Samba']),
      ];

      const result = generateBarRepertoire(catalog, {
        estilo: 'Sertanejo',
        quantidade: 10,
        preferenciaTom: 'Qualquer',
        alternarRitmo: false,
      });

      expect(result.musicas).toHaveLength(0);
      expect(result.houveCorte).toBe(true);
      expect(result.aviso).toContain('Nenhuma música encontrada para o estilo "Sertanejo"');
    });

    it('intercala ritmos animados e lentos quando alternarRitmo for true', () => {
      const fastSongs = [
        mockSong('f-1', 'Rápida 1', ['Rock'], [], ['animada']),
        mockSong('f-2', 'Rápida 2', ['Rock'], [], ['rapida']),
        mockSong('f-3', 'Rápida 3', ['Rock'], [], ['agitada']),
      ];
      const slowSongs = [
        mockSong('s-1', 'Lenta 1', ['Rock'], [], ['balada']),
        mockSong('s-2', 'Lenta 2', ['Rock'], [], ['lenta']),
        mockSong('s-3', 'Lenta 3', ['Rock'], [], ['suave']),
      ];

      const catalog = [...fastSongs, ...slowSongs];

      const result = generateBarRepertoire(catalog, {
        estilo: 'Rock',
        quantidade: 6,
        preferenciaTom: 'Qualquer',
        alternarRitmo: true,
      });

      expect(result.musicas).toHaveLength(6);
      const tempos = result.musicas.map(classifyTempo);
      // Deve alternar entre animada e lenta
      expect(tempos).toEqual(['animada', 'lenta', 'animada', 'lenta', 'animada', 'lenta']);
    });

    it('prioriza músicas que atendem à preferência de tom', () => {
      const lowKeySongs = [
        mockSong('low-1', 'Grave 1', ['MPB'], [], [], 'C'),
        mockSong('low-2', 'Grave 2', ['MPB'], [], [], 'D'),
      ];
      const otherKeySongs = [
        mockSong('oth-1', 'Outra 1', ['MPB'], [], [], 'A'),
        mockSong('oth-2', 'Outra 2', ['MPB'], [], [], 'B'),
        mockSong('oth-3', 'Outra 3', ['MPB'], [], [], 'E'),
        mockSong('oth-4', 'Outra 4', ['MPB'], [], [], 'G'),
      ];

      const catalog = [...otherKeySongs, ...lowKeySongs];

      const result = generateBarRepertoire(catalog, {
        estilo: 'MPB',
        quantidade: 5,
        preferenciaTom: 'graves',
        alternarRitmo: false,
      });

      expect(result.musicas).toHaveLength(5);
      // As duas músicas com tom grave devem vir primeiro
      expect(result.musicas[0].id).toBe('low-1');
      expect(result.musicas[1].id).toBe('low-2');
    });

    it('ajusta e limita a quantidade entre 5 e 40', () => {
      const catalog = Array.from({ length: 50 }, (_, i) => mockSong(`s-${i}`, `Canção ${i}`));

      const resultMin = generateBarRepertoire(catalog, {
        estilo: 'Todos',
        quantidade: 2, // menor que 5
        preferenciaTom: 'Qualquer',
        alternarRitmo: false,
      });
      expect(resultMin.totalSolicitado).toBe(5);
      expect(resultMin.musicas).toHaveLength(5);

      const resultMax = generateBarRepertoire(catalog, {
        estilo: 'Todos',
        quantidade: 99, // maior que 40
        preferenciaTom: 'Qualquer',
        alternarRitmo: false,
      });
      expect(resultMax.totalSolicitado).toBe(40);
      expect(resultMax.musicas).toHaveLength(40);
    });
  });
});
