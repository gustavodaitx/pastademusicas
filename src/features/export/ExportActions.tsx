import { useState } from 'react';
import type { ExportMusic, ExportOptions, ExportPlaylist } from './exportFormatters';
import { downloadMusicPdf, downloadMusicTxt, downloadPlaylistPdf, downloadPlaylistTxt } from './exportDownloads';

type Props = {
  music?: ExportMusic;
  playlist?: ExportPlaylist;
  includeMetadata: boolean;
  onMetadataChange: (value: boolean) => void;
  compact?: boolean;
};

export function ExportActions({ music, playlist, includeMetadata, onMetadataChange, compact = false }: Props) {
  const [format, setFormat] = useState<'PDF' | 'TXT' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const options: ExportOptions = { includeMetadata };
  const run = async (kind: 'PDF' | 'TXT') => {
    if (format) return;
    setFormat(kind);
    setError(null);
    try {
      if (music) {
        if (kind === 'PDF') await downloadMusicPdf(music, options);
        else downloadMusicTxt(music, options);
      } else if (playlist) {
        if (kind === 'PDF') await downloadPlaylistPdf(playlist, options);
        else downloadPlaylistTxt(playlist, options);
      }
    } catch {
      setError('Não foi possível gerar o arquivo. Tente novamente.');
    } finally {
      setFormat(null);
    }
  };
  return <div className="flex flex-wrap items-center gap-1.5">
    {!compact && <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={includeMetadata} onChange={(event) => onMetadataChange(event.target.checked)} />Incluir metadados</label>}
    <button type="button" disabled={format !== null} onClick={() => void run('PDF')} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{format === 'PDF' ? 'Gerando…' : 'PDF'}</button>
    <button type="button" disabled={format !== null} onClick={() => void run('TXT')} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{format === 'TXT' ? 'Gerando…' : 'TXT'}</button>
    {error && <span role="alert" className="w-full text-xs text-rose-600">{error}</span>}
  </div>;
}
