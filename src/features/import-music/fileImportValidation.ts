import { FileExtractionError } from './fileExtractorTypes';

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORTED_TEXT_BYTES = 800_000;

export type ImportFileFormat = 'txt' | 'docx' | 'pdf';

const formatByExtension: Record<string, ImportFileFormat> = {
  '.txt': 'txt',
  '.docx': 'docx',
  '.pdf': 'pdf',
};

function getFileFormat(fileName: string): ImportFileFormat {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLocaleLowerCase('en-US');
  const format = formatByExtension[extension];
  if (!format) {
    throw new FileExtractionError(
      'Formato não permitido. Selecione um arquivo .txt, .docx ou .pdf.',
      'unsupported-format',
    );
  }
  return format;
}

export function validateImportFile(file: File): ImportFileFormat {
  const format = getFileFormat(file.name);
  if (file.size === 0) {
    throw new FileExtractionError('O arquivo está vazio.', 'empty-file');
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new FileExtractionError('O arquivo excede o limite de 5 MiB.', 'file-too-large');
  }
  return format;
}

export function validateExtractedText(text: string, format: ImportFileFormat): string {
  if (format === 'pdf' && text.trim().length === 0) {
    throw new FileExtractionError(
      'O PDF não contém texto extraível. PDFs digitalizados como imagem não são reconhecidos por OCR.',
      'pdf-no-text',
    );
  }
  if (text.trim().length === 0) {
    throw new FileExtractionError('O documento não contém texto para importar.', 'empty-content');
  }
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORTED_TEXT_BYTES) {
    throw new FileExtractionError(
      'O texto extraído excede o limite de 800.000 bytes UTF-8.',
      'content-too-large',
    );
  }
  return text;
}

export async function extractAndValidateFile(file: File): Promise<string> {
  const format = validateImportFile(file);
  let text: string;

  switch (format) {
    case 'txt': {
      const { extractTxtText } = await import('./fileExtractors');
      text = await extractTxtText(file);
      break;
    }
    case 'docx': {
      const { extractDocxText } = await import('./fileExtractors');
      text = await extractDocxText(file);
      break;
    }
    case 'pdf': {
      const { extractPdfText } = await import('./fileExtractors');
      text = await extractPdfText(file);
      break;
    }
  }

  return validateExtractedText(text, format);
}
