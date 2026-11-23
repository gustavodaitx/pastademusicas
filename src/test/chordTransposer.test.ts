import { describe, expect, it } from 'vitest';
import {
  calculateSemitoneDistance,
  isChordLine,
  isChordToken,
  transposeChordLine,
  transposeCipher,
  transposeNote,
  transposeSingleChord,
} from '../features/stage-mode/chordTransposer';

describe('chordTransposer', () => {
  describe('transposeNote', () => {
    it('transposes natural notes upwards and downwards', () => {
      expect(transposeNote('C', 2)).toBe('D');
      expect(transposeNote('D', -2)).toBe('C');
      expect(transposeNote('B', 1)).toBe('C');
      expect(transposeNote('C', -1)).toBe('B');
    });

    it('handles sharps and flats', () => {
      expect(transposeNote('F#', 2)).toBe('G#');
      expect(transposeNote('Bb', 2)).toBe('C');
      expect(transposeNote('Eb', 2)).toBe('F');
    });

    it('returns original note for invalid input', () => {
      expect(transposeNote('XYZ', 2)).toBe('XYZ');
    });
  });

  describe('transposeSingleChord', () => {
    it('transposes major and minor chords', () => {
      expect(transposeSingleChord('C', 1)).toBe('C#');
      expect(transposeSingleChord('Am', 2)).toBe('Bm');
      expect(transposeSingleChord('Em', -2)).toBe('Dm');
    });

    it('transposes inverted chords with slash bass', () => {
      expect(transposeSingleChord('D/F#', 2)).toBe('E/G#');
      expect(transposeSingleChord('G/B', -2)).toBe('F/A');
      expect(transposeSingleChord('C/E', 1)).toBe('C#/F');
    });

    it('preserves complex extensions and tensions', () => {
      expect(transposeSingleChord('G#m7(b5)', 1)).toBe('Am7(b5)');
      expect(transposeSingleChord('Bb7M', 2)).toBe('C7M');
      expect(transposeSingleChord('Asus4', 2)).toBe('Bsus4');
      expect(transposeSingleChord('C7(9)', 2)).toBe('D7(9)');
      expect(transposeSingleChord('Bdim', 1)).toBe('Cdim');
    });

    it('returns same chord when semitones is 0', () => {
      expect(transposeSingleChord('F#m7', 0)).toBe('F#m7');
    });
  });

  describe('isChordToken and isChordLine', () => {
    it('identifies valid chord tokens', () => {
      expect(isChordToken('C')).toBe(true);
      expect(isChordToken('C#m7')).toBe(true);
      expect(isChordToken('D/F#')).toBe(true);
      expect(isChordToken('Bb7M')).toBe(true);
      expect(isChordToken('Am7(b5)')).toBe(true);
    });

    it('rejects ordinary lyric words', () => {
      expect(isChordToken('amor')).toBe(false);
      expect(isChordToken('coração')).toBe(false);
      expect(isChordToken('vida')).toBe(false);
    });

    it('correctly classifies chord lines vs lyric lines', () => {
      expect(isChordLine('C       G/B      Am      F')).toBe(true);
      expect(isChordLine('| C | G | Am | F |')).toBe(true);
      expect(isChordLine('Era uma vez um lugar silencioso')).toBe(false);
      expect(isChordLine('A vida é bela e o amor não cansa')).toBe(false);
      expect(isChordLine('[Refrão]')).toBe(false);
    });
  });

  describe('transposeChordLine and space compensation', () => {
    it('transposes chords on a line and preserves subsequent columns', () => {
      // "C       G" -> C at index 0, G at index 8
      const originalLine = 'C       G';
      // Transpose +1 -> C becomes C# (1 char longer)
      // Spaces after C should reduce from 7 to 6 so G remains at index 8
      const transposed = transposeChordLine(originalLine, 1);
      expect(transposed).toBe('C#      G#');
      expect(transposed.indexOf('G#')).toBe(originalLine.indexOf('G'));
    });

    it('adds space when chord contracts to preserve column', () => {
      // "C#      G#" -> C# at 0, G# at 8
      const originalLine = 'C#      G#';
      // Transpose -1 -> C# becomes C (1 char shorter)
      // Spaces after C should expand from 6 to 7
      const transposed = transposeChordLine(originalLine, -1);
      expect(transposed).toBe('C       G');
      expect(transposed.indexOf('G')).toBe(originalLine.indexOf('G#'));
    });
  });

  describe('transposeCipher', () => {
    it('transposes full multi-line cipher without altering lyrics', () => {
      const input = [
        'C            G',
        'Hoje eu vou cantar',
        'Am           F',
        'Uma linda canção',
      ].join('\n');

      const expected = [
        'D            A',
        'Hoje eu vou cantar',
        'Bm           G',
        'Uma linda canção',
      ].join('\n');

      expect(transposeCipher(input, 2)).toBe(expected);
    });

    it('handles inline bracketed chords in lyrics', () => {
      const input = '[C]Hoje eu vou [G]cantar [Am]uma canção [F]linda';
      const expected = '[D]Hoje eu vou [A]cantar [Bm]uma canção [G]linda';
      expect(transposeCipher(input, 2)).toBe(expected);
    });

    it('returns original text if semitones is 0', () => {
      const input = 'C   G\nLetra da música';
      expect(transposeCipher(input, 0)).toBe(input);
    });
  });

  describe('calculateSemitoneDistance', () => {
    it('calculates shortest distance between keys', () => {
      expect(calculateSemitoneDistance('C', 'D')).toBe(2);
      expect(calculateSemitoneDistance('C', 'E')).toBe(4);
      expect(calculateSemitoneDistance('G', 'E')).toBe(-3);
      expect(calculateSemitoneDistance('Am', 'Cm')).toBe(3);
      expect(calculateSemitoneDistance('C', 'C')).toBe(0);
      expect(calculateSemitoneDistance(null, 'D')).toBe(0);
    });
  });
});
