import type { ExportMusic, ExportOptions, ExportPlaylist } from './exportFormatters';
import { formatMusicText, formatPlaylistText, sanitizeExportFilename } from './exportFormatters';
import type { jsPDF } from 'jspdf';

export const MIN_PDF_FONT_SIZE = 12;
export const PREFERRED_PDF_FONT_SIZE = 14;
const tabStopColumns = 8;
const pageMargin = 15;
const contentTop = 22;
const footerOffset = 8;
const rightEdgeSafety = 0.5;

type ColumnRange = { start: number; end: number };
export type GridPanel = ColumnRange & { lines: string[] };

const chordTokenPattern = /^([A-G](?:#|b)?)(?:(?:m|M|maj|min|dim|aug|sus[24]?|add\d+|\d+|[+°ºø])|\([^)]+\))*(?:\/[A-G](?:#|b)?)?$/;

function normalizeChordCell(cell: string): string {
  let token = cell.replace(/^\|+|\|+$/g, '');
  if ((token.startsWith('[') && token.endsWith(']')) || (token.startsWith('(') && token.endsWith(')'))) {
    token = token.slice(1, -1);
  }
  return token;
}

/** Conservatively recognizes a row made only of chord tokens, not lyric text containing chord-like words. */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const cells = trimmed.split(/\s+/).map(normalizeChordCell).filter(Boolean);
  if (!cells.length || !cells.every((cell) => chordTokenPattern.test(cell))) return false;

  const hasExplicitChord = cells.some((cell) => /[#b/0-9mM]|maj|min|dim|aug|sus|add|[+°ºø]|\(/.test(cell));
  if (hasExplicitChord) return true;
  // Bare A and E are common Portuguese words; without chord syntax, don't bold those ambiguous rows.
  if (cells.some((cell) => cell === 'A' || cell === 'E')) return false;
  return cells.length > 1 || /^[BCDFG]$/.test(cells[0]) || /^\s+/.test(line);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadMusicTxt(music: ExportMusic, options: ExportOptions): void {
  downloadBlob(new Blob([formatMusicText(music, options)], { type: 'text/plain;charset=utf-8' }), sanitizeExportFilename(music.titulo, 'txt'));
}

export function downloadPlaylistTxt(playlist: ExportPlaylist, options: ExportOptions): void {
  downloadBlob(new Blob([formatPlaylistText(playlist, options)], { type: 'text/plain;charset=utf-8' }), sanitizeExportFilename(playlist.nome, 'txt'));
}

function graphemes(value: string): string[] {
  const result: string[] = [];
  for (const codePoint of Array.from(value)) {
    const previous = result[result.length - 1] ?? '';
    const isCombiningMark = /\p{M}/u.test(codePoint);
    const isVariationSelector = /[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/u.test(codePoint);
    const isEmojiModifier = /[\u{1F3FB}-\u{1F3FF}]/u.test(codePoint);
    if (result.length && (isCombiningMark || isVariationSelector || isEmojiModifier || previous.endsWith('\u200D'))) {
      result[result.length - 1] += codePoint;
    } else {
      result.push(codePoint);
    }
  }
  return result;
}

/** Tabs advance to the next 8-column stop, matching the Library's preformatted display. */
export function expandTabs(line: string, tabSize = tabStopColumns): string {
  const output: string[] = [];
  let column = 0;
  for (const character of graphemes(line)) {
    if (character.charCodeAt(0) === 9) {
      const spaces = tabSize - (column % tabSize);
      output.push(' '.repeat(spaces));
      column += spaces;
    } else {
      output.push(character);
      column += 1;
    }
  }
  return output.join('');
}

function isSpace(value: string | undefined): boolean {
  return value === undefined || value === ' ';
}

function chooseSharedBoundary(rows: readonly string[][], start: number, target: number): number {
  const searchStart = Math.max(start + 1, target - 16);
  let best = target;
  let fewestSplitTokens = Number.POSITIVE_INFINITY;
  for (let boundary = target; boundary >= searchStart; boundary -= 1) {
    let splitTokens = 0;
    for (const row of rows) {
      if (!isSpace(row[boundary - 1]) && !isSpace(row[boundary])) splitTokens += 1;
    }
    if (splitTokens < fewestSplitTokens) {
      best = boundary;
      fewestSplitTokens = splitTokens;
    }
    if (splitTokens === 0) return boundary;
  }
  return best;
}

/** Slices every source row at shared column boundaries; it never inserts or removes source characters. */
export function sliceTextIntoGridPanels(lines: readonly string[], maxColumns: number): GridPanel[] {
  if (!Number.isInteger(maxColumns) || maxColumns < 1) throw new Error('A largura da grade precisa conter ao menos uma coluna.');
  const rows = lines.map(graphemes);
  const longest = Math.max(0, ...rows.map((row) => row.length));
  if (longest <= maxColumns) return [{ start: 0, end: longest, lines: rows.map((row) => row.join('')) }];

  const panels: GridPanel[] = [];
  let start = 0;
  while (start < longest) {
    const target = Math.min(start + maxColumns, longest);
    const end = target === longest ? target : chooseSharedBoundary(rows, start, target);
    panels.push({ start, end, lines: rows.map((row) => row.slice(start, end).join('')) });
    start = end;
  }
  return panels;
}

function splitIntoBlocks(lines: readonly string[]): string[][] {
  const blocks: string[][] = [];
  let block: string[] = [];
  for (const line of lines) {
    block.push(line);
    if (line.length === 0) {
      blocks.push(block);
      block = [];
    }
  }
  if (block.length || blocks.length === 0) blocks.push(block);
  return blocks;
}

function setCipherFont(doc: jsPDF, chord: boolean, size: number): void {
  doc.setFont('courier', chord ? 'bold' : 'normal');
  doc.setFontSize(size);
}

function getFontSizeForLines(doc: jsPDF, lines: readonly string[], chordLines: readonly boolean[], maxWidth: number): number {
  for (let size = PREFERRED_PDF_FONT_SIZE; size >= MIN_PDF_FONT_SIZE; size -= 1) {
    doc.setFontSize(size);
    if (lines.every((line, index) => {
      setCipherFont(doc, chordLines[index], size);
      return doc.getTextWidth(line) <= maxWidth - rightEdgeSafety;
    })) return size;
  }
  doc.setFontSize(MIN_PDF_FONT_SIZE);
  return MIN_PDF_FONT_SIZE;
}

function getSafeColumnCount(doc: jsPDF, lines: readonly string[], chordLines: readonly boolean[], maxWidth: number): number {
  setCipherFont(doc, false, MIN_PDF_FONT_SIZE);
  const normalCellWidth = doc.getTextWidth(' ');
  setCipherFont(doc, true, MIN_PDF_FONT_SIZE);
  const chordCellWidth = doc.getTextWidth(' ');
  const cellWidth = Math.max(normalCellWidth, chordCellWidth);
  let columns = Math.max(1, Math.floor((maxWidth - rightEdgeSafety) / cellWidth));
  while (columns > 1) {
    const panels = sliceTextIntoGridPanels(lines, columns);
    if (panels.every((panel) => panel.lines.every((line, index) => {
      setCipherFont(doc, chordLines[index], MIN_PDF_FONT_SIZE);
      return doc.getTextWidth(line) <= maxWidth - rightEdgeSafety;
    }))) break;
    columns -= 1;
  }
  return columns;
}

export async function createPdfDocument(text: string, title: string): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - pageMargin * 2;
  const originalLines = text.split('\n').map((line) => expandTabs(line));
  const chordLines = originalLines.map(isChordLine);
  doc.setFont('courier', 'normal');
  const fontSize = getFontSizeForLines(doc, originalLines, chordLines, maxWidth);
  doc.setFontSize(fontSize);
  const allLinesFit = originalLines.every((line, index) => {
    setCipherFont(doc, chordLines[index], fontSize);
    return doc.getTextWidth(line) <= maxWidth - rightEdgeSafety;
  });
  const maxColumns = allLinesFit
    ? Math.max(1, ...originalLines.map((line) => graphemes(line).length))
    : getSafeColumnCount(doc, originalLines, chordLines, maxWidth);
  const panels = sliceTextIntoGridPanels(originalLines, maxColumns);
  const lineHeight = fontSize * 0.42;
  const bottom = pageHeight - pageMargin;
  const maxRowsPerPage = Math.max(1, Math.floor((bottom - contentTop) / lineHeight));
  const blocks = splitIntoBlocks(originalLines);
  let y = contentTop;
  let isFirstPage = true;
  const beginPage = (panelIndex: number) => {
    if (!isFirstPage) doc.addPage('a4', 'portrait');
    isFirstPage = false;
    y = contentTop;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const panelLabel = panels.length > 1 ? ` — trecho ${panelIndex + 1}/${panels.length}` : '';
    const header = `${title}${panelLabel}`;
    const headerText = doc.splitTextToSize(header, maxWidth)[0] ?? '';
    doc.text(headerText, pageMargin, 9);
    doc.setFont('courier', 'normal');
    doc.setFontSize(fontSize);
  };

  const writeLine = (line: string, chord: boolean) => {
    // Content is measured and sliced before this point; omitting maxWidth prevents jsPDF reflow.
    setCipherFont(doc, chord, fontSize);
    if (chord) doc.setTextColor(23, 54, 93);
    else doc.setTextColor(0, 0, 0);
    doc.text(line, pageMargin, y);
    y += lineHeight;
  };

  const advancePage = (panelIndex: number) => {
    beginPage(panelIndex);
  };

  beginPage(0);
  for (let panelIndex = 0; panelIndex < panels.length; panelIndex += 1) {
    if (panelIndex > 0) advancePage(panelIndex);
    const panel = panels[panelIndex];
    let sourceLineIndex = 0;
    for (const block of blocks) {
      if (block.length <= maxRowsPerPage && y + block.length * lineHeight > bottom) advancePage(panelIndex);
      for (let blockLineIndex = 0; blockLineIndex < block.length; blockLineIndex += 1) {
        const originalLine = block[blockLineIndex];
        if (y + lineHeight > bottom) advancePage(panelIndex);
        const nextLine = block[blockLineIndex + 1];
        const nextLineRelated = Boolean(nextLine) && chordLines[sourceLineIndex] !== chordLines[sourceLineIndex + 1];
        const availableRows = Math.floor((bottom - y) / lineHeight + 1e-6);
        if (nextLineRelated && availableRows < 2) advancePage(panelIndex);
        const row = graphemes(originalLine).slice(panel.start, panel.end).join('');
        // Shared column slices preserve chord/lyric alignment; empty lines still consume a row.
        writeLine(row, chordLines[sourceLineIndex]);
        sourceLineIndex += 1;
      }
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`${page} / ${pageCount}`, pageWidth - pageMargin, pageHeight - footerOffset, { align: 'right' });
  }
  return doc;
}

async function downloadPdf(text: string, title: string, filename: string): Promise<void> {
  const doc = await createPdfDocument(text, title);
  doc.save(filename);
}

export function downloadMusicPdf(music: ExportMusic, options: ExportOptions): Promise<void> {
  return downloadPdf(formatMusicText(music, options), music.titulo?.trim() || 'Cifra', sanitizeExportFilename(music.titulo, 'pdf'));
}

export function downloadPlaylistPdf(playlist: ExportPlaylist, options: ExportOptions): Promise<void> {
  return downloadPdf(formatPlaylistText(playlist, options), playlist.nome?.trim() || 'Playlist', sanitizeExportFilename(playlist.nome, 'pdf'));
}
