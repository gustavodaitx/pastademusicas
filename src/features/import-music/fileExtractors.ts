import { FileExtractionError } from './fileExtractorTypes';

import type { TextItem } from 'pdfjs-dist/types/src/display/api';

const lineTolerance = 2;

type PositionedText = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function isTextItem(item: unknown): item is TextItem {
  return typeof item === 'object'
    && item !== null
    && 'str' in item
    && typeof item.str === 'string'
    && 'transform' in item
    && Array.isArray(item.transform);
}

function positionedText(item: TextItem): PositionedText {
  const [scaleX, , , scaleY, x, y] = item.transform;
  return {
    text: item.str,
    x: Number(x),
    y: Number(y),
    width: Number(item.width),
    height: Number(item.height) || Math.abs(Number(scaleY)) || Math.abs(Number(scaleX)),
  };
}

function reconstructPageText(items: unknown[]): string {
  const rows: { y: number; items: PositionedText[] }[] = [];

  for (const item of items) {
    if (!isTextItem(item) || item.str.length === 0) continue;

    const text = positionedText(item);
    const existingRow = rows.find((row) => Math.abs(row.y - text.y) <= lineTolerance);
    if (existingRow) {
      existingRow.items.push(text);
      existingRow.y = (existingRow.y + text.y) / 2;
    } else {
      rows.push({ y: text.y, items: [text] });
    }
  }

  return rows
    .sort((left, right) => right.y - left.y)
    .map(({ items: rowItems }) => {
      const sortedItems = rowItems.sort((left, right) => left.x - right.x);
      let line = '';
      let previous: PositionedText | undefined;

      for (const item of sortedItems) {
        if (previous && item.x > previous.x + previous.width && !/\s$/.test(line) && !/^\s/.test(item.text)) {
          const gap = item.x - previous.x - previous.width;
          const averageCharacterWidth = previous.width / Math.max(previous.text.length, 1)
            || previous.height * 0.5
            || 1;
          const spaces = Math.max(1, Math.round(gap / averageCharacterWidth));
          line += ' '.repeat(spaces);
        }

        line += item.text;
        previous = item;
      }

      return line;
    })
    .join('\n');
}

async function readFile(file: File): Promise<ArrayBuffer> {
  try {
    return await file.arrayBuffer();
  } catch (error) {
    throw new FileExtractionError('Não foi possível ler o arquivo.', 'read-failed', error);
  }
}

export async function extractTxtText(file: File): Promise<string> {
  const buffer = await readFile(file);

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return text.replace(/\r\n?/g, '\n');
  } catch (error) {
    throw new FileExtractionError('O arquivo TXT não contém texto UTF-8 válido.', 'invalid-encoding', error);
  }
}

export async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await readFile(file);

  try {
    const { default: mammoth } = await import('mammoth/mammoth.browser.js');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    throw new FileExtractionError('Não foi possível extrair texto do documento DOCX.', 'invalid-document', error);
  }
}

export async function extractPdfText(file: File): Promise<string> {
  const data = new Uint8Array(await readFile(file));
  let destroyLoadingTask: (() => Promise<void>) | undefined;

  try {
    const [{ getDocument, GlobalWorkerOptions }, { default: pdfWorkerUrl }] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const loadingTask = getDocument({ data });
    destroyLoadingTask = () => loadingTask.destroy();
    const document = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(reconstructPageText(content.items));
    }

    return pages.join('\n\n');
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new FileExtractionError('O PDF está protegido por senha.', 'password-protected', error);
    }
    if (error instanceof Error && error.name === 'InvalidPDFException') {
      throw new FileExtractionError('O arquivo não é um PDF válido ou está corrompido.', 'invalid-document', error);
    }
    throw new FileExtractionError('Não foi possível extrair texto do PDF.', 'extraction-failed', error);
  } finally {
    await destroyLoadingTask?.();
  }
}
