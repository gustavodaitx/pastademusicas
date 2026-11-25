import { FileExtractionError } from './fileExtractorTypes';

import type { TextItem } from 'pdfjs-dist/types/src/display/api';

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

function isChordRow(items: readonly PositionedText[]): boolean {
  const chords = items.flatMap(({ text }) => text.trim().split(/\s+/)).filter(Boolean);
  const pattern = /^[A-G](?:#|b)?(?:(?:m|M|maj|min|dim|aug|sus[24]?|add\d+|\d+)|[+°º])*(?:\/[A-G](?:#|b)?)?$/;
  return chords.length > 0 && chords.every((chord) => pattern.test(chord));
}

function median(values: number[]): number {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 1;
}

function findColumnBoundary(items: readonly PositionedText[], pageWidth: number): number | null {
  if (!Number.isFinite(pageWidth) || pageWidth <= 0) return null;
  const intervals = items.map((item) => ({ start: item.x, end: item.x + Math.max(item.width, 0), item }))
    .sort((left, right) => left.start - right.start);
  const merged: { start: number; end: number }[] = [];
  for (const interval of intervals) {
    const current = merged[merged.length - 1];
    if (current && interval.start <= current.end) current.end = Math.max(current.end, interval.end);
    else merged.push({ start: interval.start, end: interval.end });
  }

  const candidates = merged.slice(1).map((right, index) => ({
    left: merged[index].end,
    right: right.start,
    width: right.start - merged[index].end,
  })).filter(({ left, right, width }) => {
    const middle = (left + right) / 2;
    return width >= pageWidth * 0.035 && middle >= pageWidth * 0.35 && middle <= pageWidth * 0.65;
  }).sort((left, right) => right.width - left.width);

  for (const candidate of candidates) {
    const boundary = (candidate.left + candidate.right) / 2;
    const leftItems = items.filter((item) => item.x + item.width <= boundary);
    const rightItems = items.filter((item) => item.x >= boundary);
    const crossingItems = items.some((item) => item.x < boundary && item.x + item.width > boundary);
    const leftRows = new Set(leftItems.map((item) => Math.round(item.y)));
    const rightRows = new Set(rightItems.map((item) => Math.round(item.y)));
    if (!crossingItems && leftRows.size >= 2 && rightRows.size >= 2) return boundary;
  }
  return null;
}

function reconstructTextBlock(items: PositionedText[]): string {
  const rows: { y: number; items: PositionedText[] }[] = [];

  for (const text of items) {
    const existingRow = rows.find((row) => Math.abs(row.y - text.y) <= Math.max(1.5, Math.min(3, text.height * 0.2)));
    if (existingRow) {
      existingRow.items.push(text);
      existingRow.y = (existingRow.y + text.y) / 2;
    } else {
      rows.push({ y: text.y, items: [text] });
    }
  }

  const orderedRows = rows.sort((left, right) => right.y - left.y);
  if (orderedRows.length === 0) return '';

  const allItems = orderedRows.flatMap((row) => row.items);
  const originX = allItems.reduce((minimum, item) => Math.min(minimum, item.x), Number.POSITIVE_INFINITY);
  const lyricAdvances = orderedRows.flatMap((row) => {
    const rowLength = row.items.reduce((length, item) => length + Array.from(item.text).length, 0);
    return rowLength >= 12 && !isChordRow(row.items)
      ? row.items.map((item) => item.width / Math.max(Array.from(item.text).length, 1))
      : [];
  });
  const fallbackAdvances = allItems.map((item) => item.width / Math.max(Array.from(item.text).length, 1));
  const charWidth = median(lyricAdvances.length > 0 ? lyricAdvances : fallbackAdvances);

  const reconstructedRows = orderedRows.map(({ y, items: rowItems }) => {
    const sortedItems = rowItems.sort((left, right) => left.x - right.x);
    let line = '';
    let columns = 0;

    for (const item of sortedItems) {
      const targetColumn = Math.max(0, Math.round((item.x - originX) / charWidth));
      const padding = Math.max(0, targetColumn - columns);
      line += ' '.repeat(padding) + item.text;
      columns += padding + Array.from(item.text).length;
    }

    return { y, line };
  });

  const rowDistances = reconstructedRows.slice(1)
    .map((row, index) => reconstructedRows[index].y - row.y)
    .filter((distance) => distance > 0);
  const sortedDistances = rowDistances.sort((left, right) => left - right);
  const lineHeight = median(sortedDistances);
  const output: string[] = [];
  reconstructedRows.forEach((row, index) => {
    if (index > 0) {
      const distance = reconstructedRows[index - 1].y - row.y;
      const emptyRows = distance > lineHeight * 1.45
        ? Math.max(0, Math.round(distance / lineHeight) - 1)
        : 0;
      output.push(...Array.from({ length: emptyRows }, () => ''));
    }
    output.push(row.line);
  });
  return output.join('\n');
}

function reconstructPageText(items: unknown[], pageWidth = 0): string {
  const positioned = items.filter(isTextItem).filter((item) => item.str.length > 0).map(positionedText);
  if (positioned.length === 0) return '';
  const boundary = findColumnBoundary(positioned, pageWidth);
  if (boundary === null) return reconstructTextBlock(positioned);

  const firstColumn = positioned.filter((item) => item.x + item.width <= boundary);
  const secondColumn = positioned.filter((item) => item.x >= boundary);
  // The source coordinates, not text-item ordering, determine the column order.
  return [reconstructTextBlock(firstColumn), reconstructTextBlock(secondColumn)].filter(Boolean).join('\n\n');
}

async function readFile(file: File): Promise<ArrayBuffer> {
  try {
    return await file.arrayBuffer();
  } catch (error) {
    throw new FileExtractionError('Não foi possível ler o arquivo.', 'read-failed', error);
  }
}

function isDocxChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  const chordPattern = /^[A-G](?:#|b)?(?:(?:m|M|maj|min|dim|aug|sus[24]?|add\d+|\d+)|[+°º])*(?:\/[A-G](?:#|b)?)?$/;
  return tokens.length > 0 && tokens.every((token) => chordPattern.test(token))
    && (tokens.length > 1 || /\t| {2,}/.test(line));
}

function estimateProportionalColumn(lyric: string, column: number): number {
  return Array.from(lyric.slice(0, column)).reduce((width, character) => {
    if (/[iltfjrseI ]/.test(character)) return width + 0.85;
    if (/[mwMW]/.test(character)) return width + 1.15;
    return width + 1;
  }, 0);
}

function scaleDocxChordPositions(line: string, lyricLine: string): string {
  const tokens = Array.from(line.matchAll(/\S+/g), (match) => ({ text: match[0], start: match.index ?? 0 }));
  if (tokens.length < 2 || !isDocxChordLine(line)) return line;

  const lyricWidth = Math.round(estimateProportionalColumn(lyricLine, lyricLine.length));
  let output = '';
  let end = 0;
  tokens.forEach(({ text, start }, index) => {
    const lastStartWithinLyric = Math.max(0, lyricWidth - text.length);
    const estimatedStart = Math.min(Math.round(estimateProportionalColumn(lyricLine, start)), lastStartWithinLyric);
    const target = Math.max(index === 0 ? 0 : end + 1, estimatedStart);
    output += ' '.repeat(target - end) + text;
    end = target + text.length;
  });
  return output;
}

function normalizeDocxText(text: string, tabSize = 4): string {
  const expandedLines = text.split('\n').map((sourceLine) => {
    const line = isDocxChordLine(sourceLine)
      ? sourceLine.replace(/(?<=\S) {2,}(?=\S)/g, (spaces) => ' '.repeat(Math.max(1, Math.round(spaces.length * 0.65))))
      : sourceLine;
    let column = 0;
    let output = '';
    for (const character of line) {
      if (character === '\t') {
        const count = tabSize - column % tabSize;
        output += ' '.repeat(count);
        column += count;
      } else {
        output += character;
        column += Array.from(character).length;
      }
    }
    return output;
  });

  const collapsedLines = expandedLines.filter((line, index) => !(line === ''
    && index > 0
    && index + 1 < expandedLines.length
    && isDocxChordLine(expandedLines[index - 1])
    && expandedLines[index + 1].trim() !== ''
    && !isDocxChordLine(expandedLines[index + 1])));

  return collapsedLines.map((line, index) => isDocxChordLine(line)
    && index + 1 < collapsedLines.length
    && collapsedLines[index + 1].trim() !== ''
    && !isDocxChordLine(collapsedLines[index + 1])
    ? scaleDocxChordPositions(line, collapsedLines[index + 1])
    : line).join('\n');
}

function elementChildren(element: Element): Element[] {
  return Array.from(element.children);
}

function xmlLocalName(element: Element): string {
  return element.localName;
}

function extractParagraphXml(paragraph: Element): string {
  const visit = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const element = node as Element;
    switch (xmlLocalName(element)) {
      case 't': return element.textContent ?? '';
      case 'tab': return '\t';
      case 'br':
      case 'cr': return '\n';
      case 'pPr':
      case 'rPr':
      case 'sectPr': return '';
      default: return elementChildren(element).map(visit).join('');
    }
  };
  return elementChildren(paragraph).map(visit).join('');
}

function extractTableXml(table: Element): string {
  const rows = elementChildren(table).filter((element) => xmlLocalName(element) === 'tr');
  const cells = rows.map((row) => elementChildren(row).filter((element) => xmlLocalName(element) === 'tc'));
  const columnCount = Math.max(0, ...cells.map((rowCells) => rowCells.length));
  const columns = Array.from({ length: columnCount }, (_, columnIndex) => cells.map((rowCells) => {
    const cell = rowCells[columnIndex];
    if (!cell) return '';
    return elementChildren(cell)
      .filter((element) => xmlLocalName(element) === 'p')
      .map(extractParagraphXml)
      .join('\n');
  }).join('\n'));
  return columns.join('\n\n');
}

function docxXmlToText(xml: string): string {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('O XML principal do DOCX é inválido.');
  }
  const body = Array.from(document.getElementsByTagNameNS('*', 'body'))[0];
  if (!body) throw new Error('O DOCX não contém o corpo principal do documento.');

  const blocks = elementChildren(body).flatMap((element) => {
    switch (xmlLocalName(element)) {
      case 'p': return [`${extractParagraphXml(element)}\n`];
      case 'tbl': return [`${extractTableXml(element)}\n`];
      default: return [];
    }
  });
  return normalizeDocxText(blocks.join(''));
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
    if (typeof Worker === 'undefined') {
      const { default: JSZip } = await import('jszip');
      const zip = await JSZip.loadAsync(arrayBuffer);
      const documentXml = await zip.file('word/document.xml')?.async('text');
      if (typeof documentXml !== 'string') throw new Error('O DOCX não contém word/document.xml.');
      return docxXmlToText(documentXml);
    }

    return await new Promise<string>((resolve, reject) => {
      const worker = new Worker(new URL('./docxExtraction.worker.ts', import.meta.url), { type: 'module' });
      const finish = (callback: () => void) => {
        worker.terminate();
        callback();
      };

      worker.onmessage = (event: MessageEvent<{ xml?: string; error?: string }>) => {
        const { xml, error } = event.data;
        if (typeof xml === 'string') {
          finish(() => resolve(docxXmlToText(xml)));
        } else {
          finish(() => reject(new Error(error ?? 'Falha ao extrair o documento DOCX.')));
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        finish(() => reject(new Error('Falha no processamento do documento DOCX.')));
      };
      worker.onmessageerror = () => finish(() => reject(new Error('Resposta inválida do processamento DOCX.')));
      worker.postMessage({ arrayBuffer }, [arrayBuffer]);
    });
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
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      pages.push(reconstructPageText(content.items, viewport.width));
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
