import type { ImportFileFormat } from './fileImportValidation';

export type ImportMusicDraft = {
  content: string;
  fileName: string;
  format: ImportFileFormat;
};

export function isImportMusicDraft(value: unknown): value is ImportMusicDraft {
  if (typeof value !== 'object' || value === null || !('content' in value) || !('fileName' in value) || !('format' in value)) {
    return false;
  }

  return typeof value.content === 'string'
    && typeof value.fileName === 'string'
    && (value.format === 'txt' || value.format === 'docx' || value.format === 'pdf');
}
