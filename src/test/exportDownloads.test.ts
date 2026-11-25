import { describe, expect, it } from 'vitest';
import { createPdfDocument, expandTabs, isChordLine, MIN_PDF_FONT_SIZE, PREFERRED_PDF_FONT_SIZE, sliceTextIntoGridPanels } from '../features/export/exportDownloads';

type PdfTextItem = { str: string; transform: number[]; width: number; height: number; fontName: string };
type PdfPage = { width: number; height: number; items: PdfTextItem[] };

async function readPdf(doc: Awaited<ReturnType<typeof createPdfDocument>>) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const fontDataUrl = new URL('../../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href;
  const loadingTask = getDocument({
    data: new Uint8Array(doc.output('arraybuffer')),
    standardFontDataUrl: fontDataUrl.endsWith('/') ? fontDataUrl : fontDataUrl.concat('/'),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const pages: PdfPage[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.filter((item) => 'str' in item) as unknown as PdfTextItem[];
    pages.push({ width: viewport.width, height: viewport.height, items });
  }
  await loadingTask.destroy();
  return pages;
}

function findItem(items: PdfTextItem[], value: string): PdfTextItem {
  const item = items.find(({ str }) => str === value);
  if (!item) throw new Error(`PDF text item not found: ${value}`);
  return item;
}

function findItemContaining(items: PdfTextItem[], value: string): PdfTextItem {
  const item = items.find(({ str }) => str.includes(value));
  if (!item) throw new Error(`PDF text item not found containing: ${value}`);
  return item;
}

function findTokenItem(items: PdfTextItem[], token: string, y?: number): PdfTextItem {
  const item = items.find(({ str, transform }) => str === token && (y === undefined || Math.abs(transform[5] - y) < 0.1));
  if (!item) throw new Error(`PDF text item not found: ${token}`);
  return item;
}

function bodyItems(items: PdfTextItem[], pageHeight: number): PdfTextItem[] {
  return items.filter(({ transform }) => transform[5] < pageHeight - 50 && transform[5] > 35);
}

describe('PDF export layout', () => {
  it('classifies chord rows conservatively without bolding lyric text', () => {
    expect(isChordLine('Em              C9')).toBe(true);
    expect(isChordLine('C       G/B      Am      F')).toBe(true);
    expect(isChordLine('C')).toBe(true);
    expect(isChordLine('[C]')).toBe(true);
    expect(isChordLine('A')).toBe(false);
    expect(isChordLine('  C#')).toBe(true);
    expect(isChordLine('A B C')).toBe(false);
    expect(isChordLine('Quando a noite tenta me parar')).toBe(false);
    expect(isChordLine('Em uma noite de paz')).toBe(false);
    expect(isChordLine('A vida é bela e o amor não cansa')).toBe(false);
    expect(isChordLine('Canto C')).toBe(false);
    expect(isChordLine('[Refrão]')).toBe(false);
  });

  it('prefers 14 pt, highlights chord rows in bold navy, and keeps lyrics regular black', async () => {
    const doc = await createPdfDocument('Em              C9\nEu encontro paz no teu olhar', 'Destaque');
    const pages = await readPdf(doc);
    const items = bodyItems(pages[0].items, pages[0].height);
    const chord = findItemContaining(items, 'Em');
    const lyric = findItemContaining(items, 'Eu encontro');
    const getFont = (doc.internal as typeof doc.internal & { getFont: (family: string, style: string) => { id: string; postScriptName: string } }).getFont.bind(doc.internal);
    const chordCommand = doc.output().match(/BT[\s\S]*?\(Em[\s\S]*?ET/)?.[0] ?? '';
    const lyricCommand = doc.output().match(/BT[\s\S]*?\(Eu encontro[\s\S]*?ET/)?.[0] ?? '';

    expect(PREFERRED_PDF_FONT_SIZE).toBe(14);
    expect(chord.height).toBeCloseTo(PREFERRED_PDF_FONT_SIZE, 0);
    expect(lyric.height).toBeCloseTo(PREFERRED_PDF_FONT_SIZE, 0);
    expect(chord.fontName).not.toBe(lyric.fontName);
    expect(getFont('courier', 'bold').postScriptName).toBe('Courier-Bold');
    expect(getFont('courier', 'normal').postScriptName).toBe('Courier');
    expect(chordCommand).toContain(`/${getFont('courier', 'bold').id} 14 Tf`);
    expect(lyricCommand).toContain(`/${getFont('courier', 'normal').id} 14 Tf`);
    expect(chordCommand).toContain('0.09 0.212 0.365 rg');
    expect(lyricCommand).toContain('0. g');
  });

  it('uses next-column tab stops and retains all horizontal whitespace in the grid', () => {
    expect(expandTabs('A\tB')).toBe('A       B');
    expect(expandTabs('12345678\tX')).toBe('12345678        X');

    const sourceLines = [
      '        C       G     Am/F#      ',
      '        palavra G     refrão      ',
      '',
      '   F#  Bb  C°',
    ];
    const panels = sliceTextIntoGridPanels(sourceLines, 12);
    expect(panels.length).toBeGreaterThan(1);
    for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex += 1) {
      expect(panels.map((panel) => panel.lines[lineIndex]).join('')).toBe(sourceLines[lineIndex]);
    }
    expect(panels.slice(0, -1).every((panel, index) => panel.end === panels[index + 1].start)).toBe(true);
    expect(panels[0].lines[0].length).toBe(panels[0].lines[1].length);
  });

  it('expands imported tabs without emitting Tab characters or shifting the aligned chord', async () => {
    const doc = await createPdfDocument('C\tG\nC       G', 'Tabulação');
    const pages = await readPdf(doc);
    const items = bodyItems(pages[0].items, pages[0].height);
    const cRows = items.filter(({ str }) => str === 'C');
    expect(cRows).toHaveLength(2);
    const gRows = cRows.map((c) => findTokenItem(items, 'G', c.transform[5]));

    expect(gRows[0].transform[4]).toBeCloseTo(gRows[1].transform[4], 2);
    expect(doc.output()).not.toContain('\t');
    expect(doc.output()).toContain('(C       G) Tj');
  });

  it('keeps chord and lyric tokens at the same horizontal coordinates in one grid panel', async () => {
    const chordLine = `Em${' '.repeat(21)}C9`;
    const firstLyric = 'Quando a noite tenta me parar';
    const secondLyric = 'Eu encontro paz no teu olhar';
    const doc = await createPdfDocument(`${firstLyric}\n${chordLine}\n${secondLyric}`, 'Alinhamento');
    const pages = await readPdf(doc);
    const items = bodyItems(pages[0].items, pages[0].height);
    const firstLyricItem = findItemContaining(items, 'Quando');
    const secondLyricItem = findItemContaining(items, 'Eu encontro');
    const chordEm = findTokenItem(items, 'Em');
    const chordC9 = findTokenItem(items, 'C9', chordEm.transform[5]);
    doc.setFont('courier', 'bold');
    doc.setFontSize(PREFERRED_PDF_FONT_SIZE);
    const chordOffsetMm = doc.getTextWidth(chordLine.slice(0, 23));
    doc.setFont('courier', 'normal');
    const lyricWordOffsetMm = doc.getTextWidth('Eu encontro paz no teu ');

    expect(chordEm.transform[4]).toBeCloseTo(firstLyricItem.transform[4], 2);
    expect(chordEm.transform[4]).toBeCloseTo(secondLyricItem.transform[4], 2);
    expect(chordC9.transform[4]).toBeCloseTo(secondLyricItem.transform[4] + lyricWordOffsetMm * 72 / 25.4, 2);
    expect(chordC9.transform[4]).toBeCloseTo(chordEm.transform[4] + chordOffsetMm * 72 / 25.4, 2);
  });

  it('preserves indentation, repeated and trailing spaces, blank rows, accents and chord symbols in emitted PDF text', async () => {
    const lines = ['  C   G   Am/F#  ', '', '  ação    e música   ', 'A#  Bb / C° +'];
    const source = lines.join('\n');
    const doc = await createPdfDocument(source, 'Cifra teste');
    const pdfStream = doc.output();
    const pages = await readPdf(doc);
    const contentItems = bodyItems(pages[0].items, pages[0].height);

    expect(pdfStream).toContain('(  C   G   Am/F#  ) Tj');
    expect(pdfStream).toContain('(  ação    e música   ) Tj');
    expect(contentItems.map(({ str }) => str).join(' ')).toContain('ação');
    expect(contentItems.map(({ str }) => str).join(' ')).toContain('C°');

    const firstRow = findItemContaining(contentItems, 'C');
    const nextNonemptyRow = findItem(contentItems, 'ação');
    const expectedLineHeightPt = PREFERRED_PDF_FONT_SIZE * 0.42 * 72 / 25.4;
    expect(Math.abs(firstRow.transform[5] - nextNonemptyRow.transform[5])).toBeCloseTo(expectedLineHeightPt * 2, 1);
  });

  it('tiles oversized lyrics and chords at common columns, preserves chord order, and keeps every page A4 portrait', async () => {
    const chordLine = `${' '.repeat(130)}C${' '.repeat(8)}G${' '.repeat(8)}Am/F#${'x'.repeat(160)}`;
    const lyricLine = `${' '.repeat(130)}Palavra${' '.repeat(2)}G${' '.repeat(4)}refrão${'y'.repeat(160)}`;
    const doc = await createPdfDocument(`${chordLine}\n${lyricLine}`, 'Cifra extensa');
    const pages = await readPdf(doc);

    expect(pages.length).toBeGreaterThan(1);
    expect(MIN_PDF_FONT_SIZE).toBe(12);
    for (const page of pages) {
      expect(page.width).toBeCloseTo(595.28, 0);
      expect(page.height).toBeCloseTo(841.89, 0);
      expect(page.items.some(({ str }) => str.includes('trecho '))).toBe(true);
      const bodyItems = page.items.filter(({ transform }) => transform[5] < page.height - 50 && transform[5] > 35);
      for (const item of bodyItems) {
        expect(item.transform[4]).toBeGreaterThanOrEqual(42.5 - 0.5);
        expect(item.transform[4] + item.width).toBeLessThanOrEqual(page.width - 42.5 + 1);
      }
    }

    const panelWithWords = pages.find(({ items }) => items.some(({ str }) => str.includes('Palavra')));
    expect(panelWithWords).toBeDefined();
    const panelItems = bodyItems(panelWithWords!.items, panelWithWords!.height);
    const lyricLineItem = findItemContaining(panelItems, 'Palavra');
    const chordC = findTokenItem(panelItems, 'C');
    const chordG = findTokenItem(panelItems, 'G', chordC.transform[5]);
    const lyricG = findTokenItem(panelItems, 'G', lyricLineItem.transform[5]);
    expect(chordC.transform[4]).toBeCloseTo(lyricLineItem.transform[4], 1);
    expect(chordG.transform[4]).toBeCloseTo(lyricG.transform[4], 1);
    expect(lyricLineItem.height).toBeCloseTo(MIN_PDF_FONT_SIZE, 0);
    expect(pages.some(({ items }) => items.some(({ str }) => str.includes('Am/F#')))).toBe(true);
  });

  it('paginates long blocks without losing their order or page margins', async () => {
    const source = Array.from({ length: 180 }, (_, index) => index % 18 === 0 ? '' : `linha ${index} ação C G`).join('\n');
    const doc = await createPdfDocument(source, 'Paginacao');
    const pages = await readPdf(doc);

    expect(pages.length).toBeGreaterThan(1);
    const output = doc.output();
    const sourceLines = Array.from({ length: 180 }, (_, index) => index % 18 === 0 ? null : `linha ${index} ação C G`).filter((line): line is string => line !== null);
    let lastIndex = -1;
    for (const line of sourceLines) {
      const index = output.indexOf(`(${line}) Tj`);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
    for (const [pageIndex, page] of pages.entries()) {
      expect(page.width).toBeCloseTo(595.28, 0);
      expect(page.height).toBeCloseTo(841.89, 0);
      expect(page.items.some(({ str }) => str === 'Paginacao')).toBe(true);
      expect(page.items.some(({ str }) => str === `${pageIndex + 1} / ${pages.length}`)).toBe(true);
      const marginPt = 15 * 72 / 25.4;
      const bodyItems = page.items.filter(({ transform }) => transform[5] < page.height - 50 && transform[5] > 35);
      for (const item of bodyItems) {
        if (item.str.trim().length > 0) expect(item.height).toBeGreaterThanOrEqual(MIN_PDF_FONT_SIZE - 0.1);
        expect(item.transform[4]).toBeGreaterThanOrEqual(42.5 - 0.5);
        expect(item.transform[4] + item.width).toBeLessThanOrEqual(page.width - marginPt + 1);
      }
    }
  });

  it('keeps a chord row and its adjacent lyric together at a page boundary', async () => {
    const source = [...Array.from({ length: 43 }, (_, index) => `linha ${index}`), 'Em       C9', 'Eu encontro paz'].join('\n');
    const doc = await createPdfDocument(source, 'Par de linhas');
    const pages = await readPdf(doc);
    const chordPage = pages.findIndex(({ items, height }) => bodyItems(items, height).some(({ str }) => str.includes('Em')));
    const lyricPage = pages.findIndex(({ items, height }) => bodyItems(items, height).some(({ str }) => str.includes('Eu encontro')));

    expect(chordPage).toBeGreaterThanOrEqual(0);
    expect(lyricPage).toBe(chordPage);
  });
});
