import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractDocxText, extractPdfText, extractTxtText } from '../features/import-music/fileExtractors';
import { FileExtractionError } from '../features/import-music/fileExtractorTypes';

const pdfMocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
}));

vi.mock('pdfjs-dist', () => ({
  getDocument: pdfMocks.getDocument,
  GlobalWorkerOptions: { workerSrc: '' },
}));

type MockPdfItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

function fileWithBytes(name: string, bytes: Uint8Array): File {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const file = new File([copy], name);
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => copy.slice(0),
  });
  return file;
}

function fileWithText(name: string, text: string): File {
  return fileWithBytes(name, new TextEncoder().encode(text));
}

function mockPdfPages(pageItems: MockPdfItem[][]): void {
  pdfMocks.getDocument.mockReturnValue({
    promise: Promise.resolve({
      numPages: pageItems.length,
      getPage: vi.fn(async (pageNumber: number) => ({
        getTextContent: async () => ({ items: pageItems[pageNumber - 1] }),
      })),
    }),
    destroy: vi.fn(async () => undefined),
  });
}

const textItem = (str: string, x: number, y: number, width: number): MockPdfItem => ({
  str,
  transform: [12, 0, 0, 12, x, y],
  width,
  height: 12,
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('extractTxtText', () => {
  it('preserves accents, special characters, spaces, tabs, and line breaks', async () => {
    const source = '  C\tG\nCanção & coração\n  F#m  ';

    await expect(extractTxtText(fileWithText('cifra.txt', source))).resolves.toBe(source);
  });

  it('removes a UTF-8 BOM and normalizes CRLF and CR to LF', async () => {
    const bytes = new TextEncoder().encode('\uFEFFC\r\nCanção\rFim');

    await expect(extractTxtText(fileWithBytes('cifra.txt', bytes))).resolves.toBe('C\nCanção\nFim');
  });

  it('returns an empty string for an empty file', async () => {
    await expect(extractTxtText(fileWithBytes('vazio.txt', new Uint8Array()))).resolves.toBe('');
  });

  it('reports invalid UTF-8 rather than silently replacing bytes', async () => {
    const file = fileWithBytes('invalido.txt', new Uint8Array([0xc3, 0x28]));

    await expect(extractTxtText(file)).rejects.toMatchObject({
      name: 'FileExtractionError',
      code: 'invalid-encoding',
    });
  });
});

describe('extractDocxText', () => {
  it('extracts text, accents, and paragraph breaks from a small DOCX file', async () => {
    const bytes = new Uint8Array(readFileSync(resolve(process.cwd(), 'src', 'test', 'fixtures', 'song.docx')));

    await expect(extractDocxText(fileWithBytes('cifra.docx', bytes)))
      .resolves.toBe('  C  \n\nCanção & coração\n\n');
  });

  it('returns an empty string for a DOCX file without text', async () => {
    const bytes = new Uint8Array(readFileSync(resolve(process.cwd(), 'src', 'test', 'fixtures', 'empty.docx')));

    await expect(extractDocxText(fileWithBytes('vazio.docx', bytes))).resolves.toBe('');
  });

  it('reports invalid DOCX documents', async () => {
    await expect(extractDocxText(fileWithText('invalido.docx', 'not a docx'))).rejects.toMatchObject({
      name: 'FileExtractionError',
      code: 'invalid-document',
    });
  });
});

describe('extractPdfText', () => {
  it('extracts text, preserves positional spacing, and separates lines and pages', async () => {
    mockPdfPages([
      [textItem('C', 72, 720, 6), textItem('G', 102, 720, 6), textItem('Canção', 72, 700, 36)],
      [textItem('Am', 72, 720, 12), textItem('Refrão', 72, 700, 36)],
    ]);

    await expect(extractPdfText(fileWithText('cifra.pdf', 'local PDF bytes')))
      .resolves.toBe('C    G\nCanção\n\nAm\nRefrão');
    expect(pdfMocks.getDocument.mock.results[0].value.destroy).toHaveBeenCalledOnce();
  });

  it('returns an empty string for a valid PDF without text', async () => {
    mockPdfPages([[]]);

    await expect(extractPdfText(fileWithText('vazio.pdf', 'local PDF bytes'))).resolves.toBe('');
  });

  it('reports invalid and password-protected PDFs distinctly', async () => {
    const destroy = vi.fn(async () => undefined);
    pdfMocks.getDocument.mockReturnValue({
      promise: Promise.reject(Object.assign(new Error('Invalid PDF'), { name: 'InvalidPDFException' })),
      destroy,
    });
    await expect(extractPdfText(fileWithText('invalido.pdf', 'bad'))).rejects.toMatchObject({
      name: 'FileExtractionError',
      code: 'invalid-document',
    });
    expect(destroy).toHaveBeenCalledOnce();

    pdfMocks.getDocument.mockReturnValue({
      promise: Promise.reject(Object.assign(new Error('Password required'), { name: 'PasswordException' })),
      destroy: vi.fn(async () => undefined),
    });
    await expect(extractPdfText(fileWithText('protegido.pdf', 'encrypted'))).rejects.toMatchObject({
      name: 'FileExtractionError',
      code: 'password-protected',
    });
  });
});

it('uses a typed error for file read failures', async () => {
  const file = new File([], 'sem-leitura.txt');
  Object.defineProperty(file, 'arrayBuffer', {
    value: () => Promise.reject(new Error('read error')),
  });

  await expect(extractTxtText(file)).rejects.toBeInstanceOf(FileExtractionError);
});
