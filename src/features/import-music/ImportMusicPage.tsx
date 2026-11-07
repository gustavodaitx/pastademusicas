import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, FileCheck, FileText, LoaderCircle, ShieldCheck, Upload, X } from 'lucide-react';
import {
  extractAndValidateFile,
  MAX_IMPORTED_TEXT_BYTES,
  validateExtractedText,
  validateImportFile,
} from './fileImportValidation';
import type { ImportFileFormat } from './fileImportValidation';
import { FileExtractionError } from './fileExtractorTypes';
import { isImportMusicDraft } from './importMusicDraft';

type ExtractionState = 'idle' | 'processing' | 'success' | 'error';

function extractionErrorMessage(error: unknown): string {
  if (error instanceof FileExtractionError) return error.message;
  return 'Não foi possível processar o arquivo. Tente novamente ou selecione outro documento.';
}

function editedTextError(text: string, format: ImportFileFormat): string | null {
  try {
    validateExtractedText(text, format);
    return null;
  } catch (error) {
    return extractionErrorMessage(error);
  }
}

export const ImportMusicPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractionId = useRef(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ImportFileFormat | null>(null);
  const [extractionState, setExtractionState] = useState<ExtractionState>('idle');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    const state = location.state;
    const draft = typeof state === 'object' && state !== null && 'importDraft' in state
      ? state.importDraft
      : null;
    if (!isImportMusicDraft(draft)) return;

    try {
      validateExtractedText(draft.content, draft.format);
      setSourceFileName(draft.fileName);
      setSelectedFormat(draft.format);
      setContent(draft.content);
      setExtractionError(null);
      setExtractionState('success');
    } catch (error) {
      setSourceFileName(draft.fileName);
      setSelectedFormat(draft.format);
      setContent(draft.content);
      setExtractionError(extractionErrorMessage(error));
      setExtractionState('success');
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.key, location.pathname, location.state, navigate]);

  const clearSelection = () => {
    extractionId.current += 1;
    setSelectedFile(null);
    setSourceFileName(null);
    setSelectedFormat(null);
    setExtractionState('idle');
    setExtractionError(null);
    setContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const currentExtractionId = ++extractionId.current;
    setSelectedFile(file);
    setSourceFileName(file.name);
    setSelectedFormat(null);
    setExtractionState('processing');
    setExtractionError(null);
    setContent('');

    try {
      const format = validateImportFile(file);
      setSelectedFormat(format);
      const extractedText = await extractAndValidateFile(file);
      if (currentExtractionId !== extractionId.current) return;
      setContent(extractedText);
      setExtractionState('success');
    } catch (error) {
      if (currentExtractionId !== extractionId.current) return;
      setExtractionError(extractionErrorMessage(error));
      setExtractionState('error');
    }
  };

  const contentError = selectedFormat && extractionState === 'success'
    ? editedTextError(content, selectedFormat)
    : null;
  const contentBytes = new TextEncoder().encode(content).byteLength;

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Upload className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <span>Importar Músicas e Cifras</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Selecione um documento para extrair e revisar o texto localmente no seu navegador.
        </p>
      </header>

      <section
        aria-label="Privacidade e formatos suportados"
        className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3"
      >
        <ShieldCheck aria-hidden="true" className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
          <p className="font-semibold">Processamento local e privado</p>
          <p>
            Formatos suportados: <strong>.TXT</strong>, <strong>.DOCX</strong> e <strong>.PDF</strong> com camada de texto.
            Arquivos digitalizados como imagem não têm OCR. O tamanho máximo do arquivo é 5 MiB.
          </p>
        </div>
      </section>

      <input
        ref={fileInputRef}
        id="import-file"
        type="file"
        aria-label="Selecionar arquivo para importação"
        accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => void handleFileChange(event)}
        className="sr-only"
      />

      {!selectedFile && (
        <section className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 sm:p-12 text-center bg-white dark:bg-slate-900 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <FileText aria-hidden="true" className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Escolha um arquivo para extrair o conteúdo
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              TXT, DOCX ou PDF textual — até 5 MiB
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <Upload aria-hidden="true" className="w-4 h-4" />
            Selecionar arquivo
          </button>
        </section>
      )}

      {sourceFileName && (
        <section aria-label="Arquivo selecionado" className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileCheck aria-hidden="true" className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{sourceFileName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MiB de 5 MiB`
                    : 'Prévia restaurada — o arquivo original não é armazenado'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Substituir arquivo"
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                Substituir
              </button>
              <button
                type="button"
                onClick={clearSelection}
                aria-label="Limpar arquivo e reiniciar"
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <X aria-hidden="true" className="w-4 h-4" />
                Limpar
              </button>
            </div>
          </div>

          {extractionState === 'processing' && (
            <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              Extraindo texto localmente…
            </div>
          )}

          {extractionState === 'error' && extractionError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{extractionError}</span>
            </div>
          )}

          {extractionState === 'success' && selectedFormat && (
            <section aria-labelledby="extracted-content-title" className="space-y-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="extracted-content-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Revise o texto extraído
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Você pode editar o conteúdo. Espaços e quebras de linha serão mantidos.
                  </p>
                </div>
                <p aria-live="polite" className="text-xs text-slate-500 dark:text-slate-400">
                  {content.length.toLocaleString('pt-BR')} caracteres · {contentBytes.toLocaleString('pt-BR')} / {MAX_IMPORTED_TEXT_BYTES.toLocaleString('pt-BR')} bytes UTF-8
                </p>
              </div>
              <label className="sr-only" htmlFor="extracted-content">Texto extraído editável</label>
              <textarea
                id="extracted-content"
                aria-invalid={Boolean(contentError)}
                aria-describedby={contentError ? 'extracted-content-error' : 'extracted-content-count'}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={18}
                spellCheck={false}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 font-mono text-sm leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <span id="extracted-content-count" className="sr-only">
                {contentBytes} bytes UTF-8; limite de {MAX_IMPORTED_TEXT_BYTES} bytes.
              </span>
              {contentError && (
                <p id="extracted-content-error" role="alert" className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  {contentError}
                </p>
              )}
              {!contentError && (
                <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">
                  Texto válido para revisão. Nenhuma música foi salva.
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={Boolean(contentError)}
                  onClick={() => navigate('/biblioteca', {
                    state: { importDraft: { content, fileName: sourceFileName, format: selectedFormat } },
                  })}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  Continuar para o cadastro
                </button>
              </div>
            </section>
          )}
        </section>
      )}
    </div>
  );
};
