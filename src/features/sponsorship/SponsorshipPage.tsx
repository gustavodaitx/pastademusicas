import React, { useState } from 'react';
import { Heart, Copy, Check, ShieldCheck, QrCode } from 'lucide-react';

export const SponsorshipPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(10);

  // Example static Pix code (payload BR Code)
  const PIX_CODE = '00020126360014br.gov.bcb.pix0114pastademusica@exemplo.com520400005303986540510.005802BR5925RESPONSAVEL PASTA MUSICA6013PORTO ALEGRE62070503***6304ABCD';

  const handleCopy = () => {
    navigator.clipboard?.writeText(PIX_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full space-y-8">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span>Contribuição 100% Voluntária</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Apoie o Projeto Pasta de Música
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Este sistema é e sempre será gratuito para todos os músicos, ministérios de música e comunidades. Se o aplicativo ajuda seu trabalho, considere uma contribuição voluntária para os custos de infraestrutura.
        </p>
      </div>

      {/* Suggested Values */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Sugestão de Apoio
          </h2>
          <span className="text-xs text-slate-400">Sem recorrência ou assinatura</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[5, 10, 25, 50].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setSelectedAmount(val)}
              className={`p-3 rounded-xl border text-center transition-all ${
                selectedAmount === val
                  ? 'border-brand-600 dark:border-brand-400 bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-bold shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="text-base font-extrabold">R$ {val}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Pontual</div>
            </button>
          ))}
        </div>

        {/* QR Code and Copy Button Box */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center space-y-4">
          <div className="w-48 h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex flex-col items-center justify-center text-center space-y-2">
            <QrCode className="w-24 h-24 text-slate-700 dark:text-slate-200" />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              QR Code Pix Estático
            </span>
          </div>

          <div className="w-full max-w-md space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Código Pix Copia e Cola:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={PIX_CODE}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-600 dark:text-slate-400 select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand-600 hover:bg-brand-700 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transparency and Free Tier Policy */}
      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
        <div className="flex items-center gap-2 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Política de Transparência e Gratuidade</span>
        </div>
        <p className="leading-relaxed">
          1. Todas as funcionalidades são 100% livres para usuários no plano FREE.<br />
          2. Não existe gateway pago intermediário nem cobrança automática.<br />
          3. Nenhuma confirmação automática é simulada; a doação é direta entre você e o projeto.
        </p>
      </div>

    </div>
  );
};
