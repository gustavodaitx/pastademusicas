import { describe, it, expect } from 'vitest';
import { LITURGICAL_MOMENTS } from '../features/church-mode/ChurchModePage';

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

    // Verify IDs are 1 to 10 sequentially
    LITURGICAL_MOMENTS.forEach((m, idx) => {
      expect(m.id).toBe(idx + 1);
    });
  });
});
