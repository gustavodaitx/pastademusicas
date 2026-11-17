import { Timestamp } from 'firebase/firestore';
import { describe, it, expect } from 'vitest';
import { getChurchMusicSuggestions, LITURGICAL_MOMENTS } from '../features/church-mode/ChurchModePage';
import type { MusicRecord } from '../services/musicRepository';

function music(id: string, moment: string | null): MusicRecord {
  const timestamp = Timestamp.fromMillis(1);
  return {
    id,
    titulo: `Música ${id}`,
    artista: null,
    tomOriginal: null,
    conteudoCifrado: 'C',
    categorias: [],
    tags: [],
    momentosLiturgicos: moment ? [moment] : [],
    estilo: [],
    origemTipo: 'manual',
    driveFileId: null,
    arquivoNome: null,
    licencaOuPermissao: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('Modo Igreja — Momentos Litúrgicos', () => {
  it('contém exatamente 10 momentos litúrgicos fixos na ordem obrigatória', () => {
    expect(LITURGICAL_MOMENTS).toHaveLength(10);

    const expectedOrder = [
      'Entrada',
      'Perdão',
      'Glória',
      'Salmo',
      'Aclamação',
      'Ofertório',
      'Santo',
      'Comunhão',
      'Pós-comunhão',
      'Final',
    ];

    const actualOrder = LITURGICAL_MOMENTS.map((m) => m.nome);
    expect(actualOrder).toEqual(expectedOrder);
    expect(LITURGICAL_MOMENTS.map((m) => m.momentoId)).toEqual([
      'entrada',
      'perdao',
      'gloria',
      'salmo',
      'aclamacao',
      'ofertorio',
      'santo',
      'comunhao',
      'pos-comunhao',
      'final',
    ]);

    // Verify IDs are 1 to 10 sequentially
    LITURGICAL_MOMENTS.forEach((m, idx) => {
      expect(m.id).toBe(idx + 1);
    });
  });

  it('sugere somente músicas reais do catálogo associadas ao momento', () => {
    const catalog = [music('entrada-real', 'Entrada'), music('outra', 'Comunhão'), music('sem-momento', null)];
    expect(getChurchMusicSuggestions(catalog, 'entrada').map(({ id }) => id)).toEqual(['entrada-real']);
    expect(getChurchMusicSuggestions(catalog, 'gloria')).toEqual([]);
  });

  it('não inventa sugestão para metadado inexistente ou catálogo vazio', () => {
    expect(getChurchMusicSuggestions([], 'comunhao')).toEqual([]);
    expect(getChurchMusicSuggestions([music('outra', 'Final')], 'comunhao')).toEqual([]);
  });
});
