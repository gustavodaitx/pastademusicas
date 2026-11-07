export type FileExtractionErrorCode =
  | 'unsupported-format'
  | 'file-too-large'
  | 'empty-file'
  | 'empty-content'
  | 'content-too-large'
  | 'pdf-no-text'
  | 'read-failed'
  | 'invalid-encoding'
  | 'invalid-document'
  | 'password-protected'
  | 'extraction-failed';

export class FileExtractionError extends Error {
  constructor(
    message: string,
    readonly code: FileExtractionErrorCode,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'FileExtractionError';
  }
}
