type ExtractionRequest = { arrayBuffer: ArrayBuffer };
type ExtractionResponse = { text: string } | { error: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ExtractionRequest>) => void) | null;
  postMessage: (message: ExtractionResponse) => void;
};

workerScope.onmessage = async ({ data }) => {
  try {
    const { default: mammoth } = await import('mammoth/mammoth.browser.js');
    const result = await mammoth.extractRawText({ arrayBuffer: data.arrayBuffer });
    workerScope.postMessage({ text: result.value });
  } catch {
    workerScope.postMessage({ error: 'Não foi possível extrair o texto do documento DOCX.' });
  }
};
