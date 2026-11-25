type ExtractionRequest = { arrayBuffer: ArrayBuffer };
type ExtractionResponse = { xml: string } | { error: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ExtractionRequest>) => void) | null;
  postMessage: (message: ExtractionResponse) => void;
};

workerScope.onmessage = async ({ data }) => {
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(data.arrayBuffer);
    const xml = await zip.file('word/document.xml')?.async('text');
    if (typeof xml !== 'string') throw new Error('Missing main DOCX XML');
    workerScope.postMessage({ xml });
  } catch {
    workerScope.postMessage({ error: 'Não foi possível extrair o texto do documento DOCX.' });
  }
};
