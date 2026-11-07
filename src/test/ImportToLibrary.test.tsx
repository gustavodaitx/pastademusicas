import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportMusicPage } from '../features/import-music/ImportMusicPage';
import { LibraryPage } from '../features/library/LibraryPage';
import { FileExtractionError } from '../features/import-music/fileExtractorTypes';

const mocks = vi.hoisted(() => ({
  user: { uid: 'import-user' },
  createMusic: vi.fn(),
  deleteMusic: vi.fn(),
  getMusicById: vi.fn(),
  listMusics: vi.fn(),
  updateMusic: vi.fn(),
  extractAndValidateFile: vi.fn(),
  validateExtractedText: vi.fn(),
  validateImportFile: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, loading: false }),
}));

vi.mock('../services/musicRepository', () => ({
  createMusic: mocks.createMusic,
  deleteMusic: mocks.deleteMusic,
  getMusicById: mocks.getMusicById,
  listMusics: mocks.listMusics,
  updateMusic: mocks.updateMusic,
  MusicRepositoryError: class MusicRepositoryError extends Error {},
}));

vi.mock('../features/import-music/fileImportValidation', () => ({
  extractAndValidateFile: mocks.extractAndValidateFile,
  validateExtractedText: mocks.validateExtractedText,
  validateImportFile: mocks.validateImportFile,
  MAX_IMPORTED_TEXT_BYTES: 800_000,
}));

function createFile(name: string, text = 'texto extraído'): File {
  const buffer = new TextEncoder().encode(text).buffer;
  const file = new File([buffer], name);
  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: async () => buffer.slice(0),
  });
  return file;
}

function renderImportFlow() {
  return render(
    <MemoryRouter initialEntries={['/importar']}>
      <Routes>
        <Route path="/importar" element={<ImportMusicPage />} />
        <Route path="/biblioteca" element={<LibraryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function prepareImportedDraft(content = '  C\tG\nCanção alinhada  ') {
  mocks.extractAndValidateFile.mockResolvedValue(content);
  renderImportFlow();
  fireEvent.change(screen.getByLabelText('Selecionar arquivo para importação'), {
    target: { files: [createFile('Canção.docx')] },
  });
  const preview = await screen.findByLabelText('Texto extraído editável');
  fireEvent.change(preview, { target: { value: content } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para o cadastro' }));
  await screen.findByRole('dialog', { name: 'Nova música' });
}

describe('integração da importação com o cadastro da Biblioteca', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMusics.mockResolvedValue([]);
    mocks.createMusic.mockResolvedValue('imported-song');
    mocks.updateMusic.mockResolvedValue(undefined);
    mocks.deleteMusic.mockResolvedValue(undefined);
    mocks.getMusicById.mockResolvedValue(null);
    mocks.validateImportFile.mockReturnValue('docx');
    mocks.extractAndValidateFile.mockResolvedValue('texto extraído');
    mocks.validateExtractedText.mockImplementation((text: string) => {
      if (!text.trim()) throw new FileExtractionError('O documento não contém texto.', 'empty-content');
      if (new TextEncoder().encode(text).byteLength > 800_000) {
        throw new FileExtractionError('O texto excede o limite.', 'content-too-large');
      }
      return text;
    });
  });

  it('passes edited content to the existing form and waits for explicit save confirmation', async () => {
    const content = '  C\tG\nCanção alinhada  ';
    await prepareImportedDraft(content);

    expect(screen.getByLabelText(/Conteúdo\/cifra/)).toHaveValue(content);
    expect(screen.getByText('Conteúdo importado de Canção.docx; revise os dados antes de salvar.')).toBeInTheDocument();
    expect(mocks.createMusic).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Canção importada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    await waitFor(() => expect(mocks.createMusic).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'Canção importada',
      conteudoCifrado: content,
      origemTipo: 'upload_local',
      arquivoNome: 'Canção.docx',
      driveFileId: null,
    })));
    expect(await screen.findByRole('status')).toHaveTextContent('Música importada e salva na sua biblioteca.');
    expect(screen.getByText('Biblioteca de Músicas')).toBeInTheDocument();
  });

  it('returns to the preview without losing edited text or the original file name', async () => {
    const content = '  D\tA\nTexto corrigido';
    await prepareImportedDraft(content);

    fireEvent.click(screen.getAllByRole('button', { name: 'Voltar à prévia' })[1]);

    expect(await screen.findByLabelText('Texto extraído editável')).toHaveValue(content);
    expect(screen.getByText('Canção.docx')).toBeInTheDocument();
    expect(mocks.createMusic).not.toHaveBeenCalled();
  });

  it('keeps the imported content in the form and shows a persistence error', async () => {
    const content = 'C\nConteúdo mantido após erro';
    mocks.createMusic.mockRejectedValueOnce(new Error('offline'));
    await prepareImportedDraft(content);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Importação com erro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar música' }));

    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent(
      'Não foi possível concluir a operação. Verifique sua conexão e tente novamente.',
    );
    expect(screen.getByLabelText(/Conteúdo\/cifra/)).toHaveValue(content);
    expect(screen.getByLabelText(/Título/)).toHaveValue('Importação com erro');
  });
});
