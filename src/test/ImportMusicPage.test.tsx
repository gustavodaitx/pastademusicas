import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportMusicPage } from '../features/import-music/ImportMusicPage';
import { FileExtractionError } from '../features/import-music/fileExtractorTypes';

const mocks = vi.hoisted(() => ({
  extractAndValidateFile: vi.fn(),
  validateExtractedText: vi.fn(),
  validateImportFile: vi.fn(),
}));

vi.mock('../features/import-music/fileImportValidation', () => ({
  extractAndValidateFile: mocks.extractAndValidateFile,
  validateExtractedText: mocks.validateExtractedText,
  validateImportFile: mocks.validateImportFile,
  MAX_IMPORTED_TEXT_BYTES: 800_000,
}));

function createFile(name: string, text = 'conteúdo do arquivo'): File {
  const buffer = new TextEncoder().encode(text).buffer;
  const file = new File([buffer], name);
  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: async () => buffer.slice(0),
  });
  return file;
}

function renderPage() {
  return render(<MemoryRouter><ImportMusicPage /></MemoryRouter>);
}

describe('ImportMusicPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateImportFile.mockImplementation((file: File) => {
      const extension = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase();
      if (!['txt', 'docx', 'pdf'].includes(extension)) {
        throw new FileExtractionError('Formato não permitido.', 'unsupported-format');
      }
      return extension;
    });
    mocks.extractAndValidateFile.mockResolvedValue('  C\tG\nCanção  ');
    mocks.validateExtractedText.mockImplementation((text: string) => {
      if (!text.trim()) throw new FileExtractionError('O documento não contém texto.', 'empty-content');
      if (new TextEncoder().encode(text).byteLength > 800_000) {
        throw new FileExtractionError('O texto extraído excede o limite de 800.000 bytes UTF-8.', 'content-too-large');
      }
      return text;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in the initial state with the permitted formats and file-size limit', () => {
    renderPage();

    expect(screen.getByText('TXT, DOCX ou PDF textual — até 5 MiB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selecionar arquivo' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Texto extraído editável')).not.toBeInTheDocument();
  });

  it.each(['letra.txt', 'letra.docx', 'letra.pdf'])('selects and extracts supported file %s', async (name) => {
    renderPage();
    const file = createFile(name);

    fireEvent.change(screen.getByLabelText('Selecionar arquivo para importação'), {
      target: { files: [file] },
    });

    expect(await screen.findByLabelText('Texto extraído editável')).toHaveValue('  C\tG\nCanção  ');
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(mocks.extractAndValidateFile).toHaveBeenCalledWith(file);
    expect(screen.getByRole('status')).toHaveTextContent('Nenhuma música foi salva.');
  });

  it('shows a loading state while extracting', async () => {
    let resolveExtraction: (text: string) => void = () => undefined;
    mocks.extractAndValidateFile.mockReturnValue(new Promise<string>((resolve) => {
      resolveExtraction = resolve;
    }));
    renderPage();

    fireEvent.change(screen.getByLabelText('Selecionar arquivo para importação'), {
      target: { files: [createFile('letra.txt')] },
    });

    expect(screen.getByRole('status')).toHaveTextContent('Extraindo texto localmente');
    resolveExtraction('C\nletra');
    expect(await screen.findByLabelText('Texto extraído editável')).toHaveValue('C\nletra');
  });

  it('replaces a file while extraction is in progress and ignores the stale result', async () => {
    let resolveFirstExtraction: (text: string) => void = () => undefined;
    mocks.extractAndValidateFile
      .mockImplementationOnce(() => new Promise<string>((resolve) => {
        resolveFirstExtraction = resolve;
      }))
      .mockResolvedValueOnce('Texto do segundo arquivo');
    renderPage();
    const fileInput = screen.getByLabelText('Selecionar arquivo para importação');

    fireEvent.change(fileInput, { target: { files: [createFile('primeiro.txt')] } });
    expect(screen.getByRole('button', { name: 'Substituir arquivo' })).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [createFile('segundo.docx')] } });
    expect(await screen.findByLabelText('Texto extraído editável')).toHaveValue('Texto do segundo arquivo');
    expect(screen.getByText('segundo.docx')).toBeInTheDocument();

    resolveFirstExtraction('Texto obsoleto');
    await waitFor(() => expect(screen.getByLabelText('Texto extraído editável')).toHaveValue('Texto do segundo arquivo'));
  });

  it('does not restore content when the selection is cleared during extraction', async () => {
    let resolveExtraction: (text: string) => void = () => undefined;
    mocks.extractAndValidateFile.mockReturnValue(new Promise<string>((resolve) => {
      resolveExtraction = resolve;
    }));
    renderPage();
    fireEvent.change(screen.getByLabelText('Selecionar arquivo para importação'), {
      target: { files: [createFile('cancelado.txt')] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar arquivo e reiniciar' }));
    resolveExtraction('Texto que não deve reaparecer');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Selecionar arquivo' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Texto extraído editável')).not.toBeInTheDocument();
    });
  });

  it('shows a clear error for a file validation failure', async () => {
    mocks.validateImportFile.mockImplementation(() => {
      throw new FileExtractionError('O arquivo excede o limite de 5 MiB.', 'file-too-large');
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('Selecionar arquivo para importação'), {
      target: { files: [createFile('grande.txt')] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('O arquivo excede o limite de 5 MiB.');
    expect(mocks.extractAndValidateFile).not.toHaveBeenCalled();
  });

  it('shows a clear error when extraction fails', async () => {
    mocks.extractAndValidateFile.mockRejectedValueOnce(
      new FileExtractionError('O PDF está protegido por senha.', 'password-protected'),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('Selecionar arquivo para importação'), {
      target: { files: [createFile('protegido.pdf')] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('O PDF está protegido por senha.');
    expect(screen.queryByLabelText('Texto extraído editável')).not.toBeInTheDocument();
  });

  it('allows editing and reports the current character and UTF-8 byte counts', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Selecionar arquivo para importação'), {
      target: { files: [createFile('letra.txt')] },
    });
    const textarea = await screen.findByLabelText('Texto extraído editável');

    fireEvent.change(textarea, { target: { value: '  D\tA\nLíngua  ' } });

    expect(textarea).toHaveValue('  D\tA\nLíngua  ');
    expect(mocks.validateExtractedText).toHaveBeenLastCalledWith('  D\tA\nLíngua  ', 'txt');
    expect(screen.getByText(/caracteres · .*bytes UTF-8/)).toBeInTheDocument();
  });

  it('marks edited content above the byte limit invalid', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Selecionar arquivo para importação'), {
      target: { files: [createFile('letra.txt')] },
    });
    const textarea = await screen.findByLabelText('Texto extraído editável');

    fireEvent.change(textarea, { target: { value: 'a'.repeat(800_001) } });

    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('excede o limite de 800.000 bytes UTF-8');
    expect(screen.queryByText('Texto válido para revisão. Nenhuma música foi salva.')).not.toBeInTheDocument();
  });

  it('allows clearing the file and restarting the import process', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Selecionar arquivo para importação'), {
      target: { files: [createFile('letra.txt')] },
    });
    await screen.findByLabelText('Texto extraído editável');

    fireEvent.click(screen.getByRole('button', { name: 'Limpar arquivo e reiniciar' }));

    expect(screen.getByRole('button', { name: 'Selecionar arquivo' })).toBeInTheDocument();
    expect(screen.queryByText('letra.txt')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Texto extraído editável')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Selecionar arquivo para importação'), {
      target: { files: [createFile('nova.pdf')] },
    });
    expect(await screen.findByLabelText('Texto extraído editável')).toHaveValue('  C\tG\nCanção  ');
    await waitFor(() => expect(mocks.extractAndValidateFile).toHaveBeenCalledTimes(2));
  });
});
