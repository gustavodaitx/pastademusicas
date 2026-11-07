declare module 'mammoth/mammoth.browser.js' {
  type ExtractionResult = {
    value: string;
    messages: { type: string; message: string }[];
  };

  const mammoth: {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ExtractionResult>;
  };

  export default mammoth;
}
