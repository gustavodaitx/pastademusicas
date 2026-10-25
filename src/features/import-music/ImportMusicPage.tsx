import React, { useState } from 'react';
import { Upload, FileText, FileCheck, AlertCircle, ShieldCheck } from 'lucide-react';

export const ImportMusicPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Upload className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <span>Importar Músicas e Cifras</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Carregue arquivos do seu computador. O processamento é realizado localmente no seu navegador, sem envio a servidores externos ou custos.
        </p>
      </div>

      {/* Zero Cost Banner */}
      <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
          <p className="font-semibold">Privacidade e Custo Zero Garantidos</p>
          <p>
            Formatos suportados: <strong>.docx</strong> (Microsoft Word), <strong>.pdf</strong> (com camada de texto) e <strong>.txt</strong> (texto puro monoespaçado).
            Documentos digitalizados em imagem (sem camada vetorial) não possuem OCR nesta versão para manter o sistema 100% gratuito.
          </p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-2xl p-8 sm:p-12 text-center bg-white dark:bg-slate-900 transition-colors flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-inner">
          <FileText className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Arraste e solte o arquivo aqui ou clique para selecionar
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Arquivos suportados: .DOCX, .PDF textual, .TXT (Tamanho máximo recomendado: 5 MB)
          </p>
        </div>

        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors">
            <Upload className="w-4 h-4" />
            <span>Selecionar do Computador</span>
          </span>
          <input
            type="file"
            accept=".docx,.pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Selected File Feedback */}
      {selectedFile && (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{selectedFile.name}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {(selectedFile.size / 1024).toFixed(1)} KB — Pronto para análise na etapa T05
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Remover
          </button>
        </div>
      )}

      {/* Notice */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Na etapa T05, será ativada a extração completa de acordes e letras com pré-visualização editável antes da confirmação e salvamento definitivo.
        </p>
      </div>

    </div>
  );
};
