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
  fontName?: string;
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

function mockPdfPages(pageItems: MockPdfItem[][], fonts: Record<string, { fontFamily: string }> = {}): void {
  pdfMocks.getDocument.mockReturnValue({
    promise: Promise.resolve({
      numPages: pageItems.length,
      getPage: vi.fn(async (pageNumber: number) => ({
        getViewport: () => ({ width: 612, height: 792 }),
        getTextContent: async () => ({ items: pageItems[pageNumber - 1], styles: fonts }),
      })),
    }),
    destroy: vi.fn(async () => undefined),
  });
}

const textItem = (str: string, x: number, y: number, width: number, fontName?: string): MockPdfItem => ({
  str,
  transform: [12, 0, 0, 12, x, y],
  width,
  height: 12,
  fontName,
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
  it('extracts document XML in a worker and transfers file bytes without copying', async () => {
    const workerInstances: {
      onmessage: ((event: MessageEvent<{ xml?: string; error?: string }>) => void) | null;
      onerror: ((event: ErrorEvent) => void) | null;
      onmessageerror: (() => void) | null;
      postMessage: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
    }[] = [];
    class MockWorker {
      onmessage: ((event: MessageEvent<{ xml?: string; error?: string }>) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      onmessageerror: (() => void) | null = null;
      postMessage = vi.fn((message: { arrayBuffer: ArrayBuffer }, transfer: Transferable[]) => {
        const xml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t xml:space="preserve">  C  </w:t></w:r></w:p><w:p><w:r><w:t>Canção  </w:t></w:r></w:p></w:body></w:document>';
        queueMicrotask(() => this.onmessage?.({ data: { xml } } as MessageEvent<{ xml: string }>));
        expect(transfer).toEqual([message.arrayBuffer]);
      });
      terminate = vi.fn();

      constructor() {
        workerInstances.push(this);
      }
    }
    vi.stubGlobal('Worker', MockWorker);

    try {
      const result = await extractDocxText(fileWithText('cifra.docx', 'bytes'));

      expect(result).toBe('  C  \nCanção  \n');
      expect(workerInstances).toHaveLength(1);
      expect(workerInstances[0].postMessage).toHaveBeenCalledOnce();
      expect(workerInstances[0].terminate).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('extracts text, accents, and paragraph breaks from a small DOCX file', async () => {
    const bytes = new Uint8Array(readFileSync(resolve(process.cwd(), 'src', 'test', 'fixtures', 'song.docx')));

    await expect(extractDocxText(fileWithBytes('cifra.docx', bytes)))
      .resolves.toBe('  C  \nCanção & coração\n');
  });

  it('keeps long-tab DOCX chords aligned to the lyric as in EU VIM', async () => {
    const bytes = new Uint8Array(readFileSync(resolve(process.cwd(), 'src', 'test', 'fixtures', 'aligned-cipher.docx')));
    const expected = [
      'Quando a noite tenta me parar',
      'Em  C9',
      'Eu encontro paz no teu olhar',
      '',
      'G    D',
      'Mais uma linha de letra',
      '',
      'Refrão: ação, música, C° e Bb',
      `Em${' '.repeat(39)}A${' '.repeat(11)}A7`,
      'O que eu estou vivendo é Deus acontecendo, é gesto de amor.',
      'Am',
      '',
      'Final',
      '',
    ].join('\n');

    await expect(extractDocxText(fileWithBytes('aligned-cipher.docx', bytes))).resolves.toBe(expected);
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

  it('reconstructs leading horizontal offsets and blank rows from page coordinates', async () => {
    mockPdfPages([[
      textItem('Quando a noite', 72, 720, 78),
      textItem('C', 84, 700, 6),
      textItem('G', 108, 700, 6),
      textItem('Eu encontro paz', 72, 680, 90),
      textItem('Refrão', 72, 640, 36),
    ]]);

    await expect(extractPdfText(fileWithText('cifra.pdf', 'synthetic PDF bytes')))
      .resolves.toBe('Quando a noite\n  C   G\nEu encontro paz\n\nRefrão');
  });

  it('extracts a complete first PDF column before the second column', async () => {
    mockPdfPages([[
      textItem('Quando a noite tenta me parar', 40, 720, 168),
      textItem('Em', 40, 700, 12), textItem('C9', 120, 700, 12),
      textItem('Eu encontro paz no teu olhar', 40, 680, 168),
      textItem('When the night tries to stop me', 360, 720, 160),
      textItem('F#m', 360, 700, 18), textItem('A9', 440, 700, 12),
      textItem('I find peace in your eyes tonight', 360, 680, 170),
    ]]);

    await expect(extractPdfText(fileWithText('duas-colunas.pdf', 'synthetic two-column PDF')))
      .resolves.toBe('Quando a noite tenta me parar\nEm            C9\nEu encontro paz no teu olhar\n\nWhen the night tries to stop me\nF#m             A9\nI find peace in your eyes tonight');
  });

  it('calibrates proportional-font chord columns from lyric rows', async () => {
    mockPdfPages([[
      textItem('When words align', 72, 720, 80, 'Times'),
      textItem('C', 87, 700, 4, 'Times'),
      textItem('Long phrase below', 72, 680, 85, 'Times'),
      textItem('Words fit well', 72, 660, 70, 'Times'),
    ]], { Times: { fontFamily: 'Times New Roman' } });

    await expect(extractPdfText(fileWithText('proportional.pdf', 'synthetic proportional PDF')))
      .resolves.toBe('When words align\n   C\nLong phrase below\nWords fit well');
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
