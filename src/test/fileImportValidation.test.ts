import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileExtractionError } from '../features/import-music/fileExtractorTypes';
import {
  extractAndValidateFile,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORTED_TEXT_BYTES,
  validateExtractedText,
  validateImportFile,
} from '../features/import-music/fileImportValidation';

const pdfMocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
}));

vi.mock('pdfjs-dist', () => ({
  getDocument: pdfMocks.getDocument,
  GlobalWorkerOptions: { workerSrc: '' },
}));

function fileWithBytes(name: string, bytes: Uint8Array): File {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const file = new File([buffer], name);
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => buffer.slice(0),
    configurable: true,
  });
  return file;
}

function fileWithText(name: string, text: string): File {
  return fileWithBytes(name, new TextEncoder().encode(text));
}

function setPdfText(text: string): void {
  pdfMocks.getDocument.mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({
          items: text ? [{
            str: text,
            transform: [12, 0, 0, 12, 72, 720],
            width: text.length * 6,
            height: 12,
          }] : [],
        }),
      }),
    }),
    destroy: vi.fn(async () => undefined),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('validateImportFile', () => {
  it('accepts TXT, DOCX, and PDF extensions without case sensitivity', () => {
    expect(validateImportFile(fileWithText('letra.TXT', 'texto'))).toBe('txt');
    expect(validateImportFile(fileWithText('letra.docx', 'docx'))).toBe('docx');
    expect(validateImportFile(fileWithText('letra.PdF', 'pdf'))).toBe('pdf');
  });

  it.each(['', 'letra.doc', 'letra.docm', 'letra.rtf', 'letra.pdf.exe'])(
    'rejects unsupported file name %j',
    (name) => {
      expect(() => validateImportFile(fileWithText(name, 'conteúdo'))).toThrowError(
        expect.objectContaining({ code: 'unsupported-format' }),
      );
    },
  );

  it('accepts a file exactly at the 5 MiB limit', () => {
    const file = fileWithBytes('limite.txt', new Uint8Array(MAX_IMPORT_FILE_BYTES));

    expect(validateImportFile(file)).toBe('txt');
  });

  it('rejects files larger than 5 MiB and zero-byte files', () => {
    const largeFile = fileWithBytes('grande.txt', new Uint8Array(MAX_IMPORT_FILE_BYTES + 1));
    const emptyFile = fileWithBytes('vazio.txt', new Uint8Array());

    expect(() => validateImportFile(largeFile)).toThrowError(
      expect.objectContaining({ code: 'file-too-large' }),
    );
    expect(() => validateImportFile(emptyFile)).toThrowError(
      expect.objectContaining({ code: 'empty-file' }),
    );
  });
});

describe('validateExtractedText', () => {
  it('preserves valid whitespace and accepts exactly 800,000 UTF-8 bytes', () => {
    const exactLimit = '🎵'.repeat(MAX_IMPORTED_TEXT_BYTES / 4);
    const alignedContent = '  C\tG\n  Canção  \n';

    expect(validateExtractedText(exactLimit, 'txt')).toBe(exactLimit);
    expect(validateExtractedText(alignedContent, 'txt')).toBe(alignedContent);
  });

  it('rejects extracted content above 800,000 UTF-8 bytes', () => {
    const overLimit = '🎵'.repeat(MAX_IMPORTED_TEXT_BYTES / 4 + 1);

    expect(() => validateExtractedText(overLimit, 'txt')).toThrowError(
      expect.objectContaining({ code: 'content-too-large' }),
    );
  });

  it('rejects empty or whitespace-only extracted text', () => {
    expect(() => validateExtractedText('', 'txt')).toThrowError(
      expect.objectContaining({ code: 'empty-content' }),
    );
    expect(() => validateExtractedText(' \t\n ', 'docx')).toThrowError(
      expect.objectContaining({ code: 'empty-content' }),
    );
    expect(() => validateExtractedText(' \t\n ', 'pdf')).toThrowError(
      expect.objectContaining({ code: 'pdf-no-text' }),
    );
  });
});

describe('extractAndValidateFile', () => {
  it('extracts and validates valid TXT content without changing alignment', async () => {
    const content = '  C\tG\n  Canção  ';

    await expect(extractAndValidateFile(fileWithText('letra.txt', content))).resolves.toBe(content);
  });

  it('extracts and validates a real DOCX fixture', async () => {
    const bytes = new Uint8Array(readFileSync(resolve(process.cwd(), 'src', 'test', 'fixtures', 'song.docx')));

    await expect(extractAndValidateFile(fileWithBytes('letra.docx', bytes)))
      .resolves.toBe('  C  \n\nCanção & coração\n\n');
  });

  it('extracts and validates PDF text', async () => {
    setPdfText('  C   Canção');

    await expect(extractAndValidateFile(fileWithText('letra.pdf', 'pdf bytes')))
      .resolves.toBe('  C   Canção');
  });

  it('reports PDFs without extractable text distinctly', async () => {
    setPdfText('');

    await expect(extractAndValidateFile(fileWithText('sem-texto.pdf', 'pdf bytes')))
      .rejects.toMatchObject({ name: 'FileExtractionError', code: 'pdf-no-text' });
  });

  it('preserves the PDF password error from the extractor', async () => {
    pdfMocks.getDocument.mockReturnValue({
      promise: Promise.reject(Object.assign(new Error('Password required'), { name: 'PasswordException' })),
      destroy: vi.fn(async () => undefined),
    });

    await expect(extractAndValidateFile(fileWithText('protegido.pdf', 'pdf bytes')))
      .rejects.toMatchObject({ name: 'FileExtractionError', code: 'password-protected' });
  });

  it('rejects corrupt DOCX files instead of returning extracted content', async () => {
    await expect(extractAndValidateFile(fileWithText('corrompido.docx', 'not a DOCX')))
      .rejects.toMatchObject({ name: 'FileExtractionError', code: 'invalid-document' });
  });

  it('rejects unsupported formats before attempting file reads', async () => {
    const file = fileWithText('letra.rtf', 'texto');
    const read = vi.spyOn(file, 'arrayBuffer');

    await expect(extractAndValidateFile(file)).rejects.toMatchObject({
      name: 'FileExtractionError',
      code: 'unsupported-format',
    });
    expect(read).not.toHaveBeenCalled();
  });

  it('uses the shared typed validation error', async () => {
    const error = await extractAndValidateFile(fileWithBytes('vazio.txt', new Uint8Array())).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(FileExtractionError);
  });
});
