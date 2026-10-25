# Guia de Publicação e Deploy Gratuito — PDS Pasta de Música

Data: 2026-10-25  
Versão: 1.0  
Política: **100% Gratuito — Custo Zero**

---

## 1. Visão Geral
Como o projeto foi projetado como uma Single Page Application (SPA) estática com processamento local no navegador, o deploy pode ser feito em qualquer provedor de hospedagem estática gratuita de alta disponibilidade.

Dois provedores são oficialmente recomendados:
1. **Cloudflare Pages** (Recomendado por ter largura de banda ilimitada no plano gratuito).
2. **Firebase Hosting** (Plano Spark - gratuito até 10 GB de armazenamento e 360 MB/dia de transferência).

---

## 2. Opção A: Cloudflare Pages (Recomendado)

### 2.1 Vantagens
- 500 builds mensais gratuitos.
- Largura de banda ilimitada.
- Suporte a domínio personalizado gratuito com SSL automático.
- Proteção contra ataques DDoS incluída.

### 2.2 Passo a Passo
1. Acesse o [Painel da Cloudflare](https://dash.cloudflare.com/) e vá em **Workers & Pages > Create application > Pages > Connect to Git**.
2. Conecte o repositório do GitHub/GitLab.
3. Configure as opções de compilação:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Na aba **Environment variables**, cadastre as mesmas variáveis definidas em `.env.example`.
5. Clique em **Save and Deploy**.

---

## 3. Opção B: Firebase Hosting (Plano Spark)

### 3.1 Vantagens
- Integração direta no mesmo console do Authentication e Firestore.
- Configuração simples via CLI.

### 3.2 Passo a Passo
1. Instale a ferramenta CLI do Firebase globalmente ou use via `npx`:
   ```bash
   npx firebase-tools login
   ```
2. Inicialize o hosting no projeto:
   ```bash
   npx firebase-tools init hosting
   ```
   - Selecione o projeto Firebase existente criado no plano Spark.
   - Public directory: `dist`
   - Configure as single-page app: `Yes`
   - Set up automatic builds and deploys with GitHub: Opcional
3. Gere o build de produção:
   ```bash
   npm run build
   ```
4. Realize o deploy:
   ```bash
   npx firebase-tools deploy --only hosting
   ```
*Nota importante: Certifique-se de que o plano permanece em Spark (gratuito) no console do Firebase.*
