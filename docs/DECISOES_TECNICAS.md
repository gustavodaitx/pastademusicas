# Decisões Técnicas e Diagnóstico Inicial — PDS Pasta de Música

Data: 2026-10-25  
Status: **Aprovado para Execução Incremental**  
Etapa: **T00 — Diagnóstico do repositório**

---

## 1. Diagnóstico do Repositório

### 1.1 Estado Pré-Existente
- **Estrutura de Pastas**: Inicialmente continha apenas o diretório `docs/` com o arquivo `docs/ESPECIFICACAO_TECNICA.md`.
- **Ambiente de Desenvolvimento**:
  - Sistema Operacional: Windows 11 / Windows NT
  - Node.js: `v22.19.0`
  - npm: `10.9.3`
  - Git: `2.45.1.windows.1`
- **Diagnóstico do Git**:
  - Constatou-se que o diretório do projeto não possuía repositório Git isolado inicialmente, herdando o repositório existente na pasta de usuário (`C:\Users\Gustavo Daitx\.git`), o que gerava avisos de permissão em diretórios do sistema Windows.
  - **Ação corretiva aplicada**: Foi inicializado o Git isolado na raiz do projeto (`git init -b main`) e criada a branch de trabalho `task/t00-diagnostico-docs`, garantindo isolamento total, integridade dos arquivos e preservação de mudanças sem tocar em `main`/`master` de forma descuidada.

---

## 2. Decisões de Arquitetura e Stack Tecnológica

Seguindo as diretrizes da especificação técnica e a premissa inegociável de **Custo Zero**, foram adotadas as seguintes decisões:

### 2.1 Frontend e Build
- **React 18 + TypeScript + Vite**:
  - *Motivo*: Vite oferece compilação rápida, servidor de desenvolvimento eficiente, suporte a SPA e tipagem estrita com TypeScript.
  - *Padrão*: Configuração estrita de TypeScript (`tsconfig.json`), ESLint com regras para React Hooks e acessibilidade, e Vitest para testes unitários rápidos sem necessidade de emuladores pesados.

### 2.2 Estilização e Design System
- **Tailwind CSS + Lucide Icons**:
  - *Motivo*: Alta produtividade, baixo custo de bundle (com purificação de CSS não utilizado), suporte nativo a modo escuro (Dark Mode) indispensável para o **Modo Palco** de alto contraste, e facilidade para garantir responsividade mobile-first.

### 2.3 Roteamento e Gerenciamento de Estado
- **React Router v6**:
  - Rotas declarativas, suporte a proteção de rotas (`ProtectedRoute`), layout compartilhado com barra de navegação responsiva e persistência de navegação.
- **React Context API + Custom Hooks**:
  - Gerenciamento de estado de autenticação (`AuthContext`), tema (`ThemeContext`), reprodutor/modo palco (`StageContext`) e dados locais de playlist sem sobrecarga de bibliotecas pesadas de terceiros (ex: Redux não é necessário para a escala do MVP).

### 2.4 Autenticação e Persistência em Nuvem (Firebase Spark)
- **Firebase Authentication**:
  - Provedores: E-mail/Senha e Google Sign-In.
  - Configuração via variáveis de ambiente seguras (`VITE_FIREBASE_*`).
- **Cloud Firestore**:
  - Plano Spark (gratuito).
  - Regras de segurança em `firestore.rules`:
    - Princípio do menor privilégio.
    - Coleção pública `musicas` (somente ADMIN pode alterar/remover; usuários autenticados e anônimos autorizados podem ler).
    - Músicas privadas e playlists pertencentes a `proprietarioUid`: somente o respectivo usuário lê e escreve (`request.auth.uid == resource.data.proprietarioUid`).
    - ADMIN validado por `request.auth.token.admin == true` (Firebase Custom Claims) ou verificação administrativa em coleção protegida, jamais por campo do perfil livremente gravável pelo usuário no cliente.

### 2.5 Processamento Local de Documentos (Sem Backend Pago)
- **DOCX**: Utilização da biblioteca open-source `mammoth` para converter arquivos `.docx` em texto estruturado diretamente no navegador.
- **PDF Textual**: Utilização de `pdfjs-dist` para extração de strings da camada de texto.
- **TXT**: Leitura nativa via `FileReader` / `File.text()` com preservação estrita de quebras de linha (`\n`), espaços em branco monoespaçados e alinhamento de cifras.
- **PDF Escaneado (Sem Camada Textual)**: Detectado pelo tamanho do texto extraído. Em conformidade com a especificação técnica, OCR em nuvem pago está **estritamente fora de escopo**. O sistema alertará com elegância que o documento necessita de camada de texto.

### 2.6 Algoritmo de Transposição de Acordes
- **Implementação Própria Baseada em Escala Cromática**:
  - Não utilizar substituição textual cega (`replace("A", "B")`), que corrompe palavras comuns da letra da música.
  - Reconhecimento estruturado de acordes através de regex determinística de acordes cifrados (ex: `([A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|[0-9]{1,2})*(?:\/[A-G][b#]?)?)`).
  - Mapeamento cromático com suporte a sustenidos (`#`) e bemóis (`b`), preservando intervalos e baixos invertidos (ex: `G/B` transposto 1 semitom para cima vira `Ab/C` ou `G#/B#`).

### 2.7 Exportação
- **PDF**: `jsPDF` para renderização vetorial formatada em folhas A4, preservando blocos de acordes sem quebras de linha quebradas no meio de uma estrofe.
- **TXT / HTML**: Geração local via `Blob` e URL de objeto no navegador (`URL.createObjectURL`), rápida, leve e com 0 dependências externas.
- **DOCX**: `docx` (npm) client-side gerando parágrafos formatados com fonte monoespaçada.

### 2.8 Integração Google Drive
- **Abordagem**: Google Identity Services (GIS) + Google Picker API.
- **Escopos Mínimos**: `https://www.googleapis.com/auth/drive.file` (acesso apenas aos arquivos explicitamente abertos pelo usuário na aplicação).
- **Sem Sincronização Complexa**: Conexão stateless — o token de acesso temporário reside apenas em memória na sessão do usuário e nunca é gravado no banco Firestore ou no Git.

### 2.9 Patrocínio Pix
- Geração estática do payload EMV do Pix (BR Code) e exibição do QR Code via biblioteca leve SVG/Canvas (`qrcode.react`), associado a uma chave Pix informada pelo responsável nas configurações do sistema. Sem intermediação de gateways pagos ou promessas de liquidação automática.

---

## 3. Matriz de Riscos e Mitigações

| Risco Identificado | Impacto | Mitigação Arquitetural |
| :--- | :--- | :--- |
| **Estouro de Cotas do Firestore Spark** (50k leituras/dia) | Médio | Implementar cache local via `IndexedDB` e/ou React Query / cache em memória. Não fazer queries repetitivas a cada re-render. Evitar `onSnapshot` em coleções inteiras; preferir paginação com `limit(20)`. |
| **Armazenamento de Binários no Banco** | Alto | **Proibido** salvar PDFs ou DOCXs brutos no Firestore. Somente a cifra extraída em texto puro é persistida (consumo desprezível de bytes). |
| **PDF sem camada de texto (imagens digitalizadas)** | Médio | Tratamento no parser: se o texto extraído tiver menos de 10 caracteres alfanuméricos, exibir modal explicativo orientando o usuário a colar o texto ou usar documento digital com camada de texto. |
| **Falhas de Transposição em Acordes Complexos** | Baixo | Criação de bateria de testes unitários com acordes comuns, alterados, com nonas, inversões (`C/E`, `F#/A#`) e bemóis. |
| **Credenciais de API Vazadas no Repositório** | Crítico | Criação de `.gitignore` rigoroso (ignorando `.env`, `.env.local`, `.env.*.local`, `dist`, `node_modules`). Disponibilização apenas de `.env.example` com placeholders. |

---

## 4. Plano de Execução Incremental (T00–T15)

O desenvolvimento obedecerá rigorosamente à ordem especificada:
- **T00**: Diagnóstico, Decisões Técnicas, Inventário de Custos e `TASK.md`. (Em finalização)
- **T01**: Base da aplicação (React + Vite + TypeScript + Tailwind), layout responsivo, rotas e tema.
- **T02**: Firebase Authentication, fluxos de login/cadastro/recuperação e rotas protegidas.
- **T03**: Modelo Firestore, regras de segurança (`firestore.rules`) e testes de autorização.
- **T04**: Biblioteca de músicas, cadastro manual, visualização e pesquisa multifiltro.
- **T05**: Importação local (DOCX, PDF textual, TXT) com pré-visualização e confirmação.
- **T06**: Playlists manuais (CRUD, ordenação drag-and-drop e acessível por botões, persistência da ordem).
- **T07**: Modo Igreja (10 momentos fixos, sugestão inteligente a partir do catálogo, sem alucinação).
- **T08**: Modo Barzinho (gerador por estilo, quantidade, alternância de ritmo e tom).
- **T09**: Modo Palco (tema escuro de alto contraste, autoscroll ajustável, atalhos e responsividade).
- **T10**: Exportação PDF e TXT.
- **T11**: Exportação DOCX e HTML.
- **T12**: Google Drive (OAuth Picker com escopo mínimo).
- **T13**: Patrocínio Pix estático com cópia de código e QR Code.
- **T14**: PWA, acessibilidade (WCAG AA), navegação por teclado e otimizações.
- **T15**: Testes finais automatizados, auditoria de segurança/custo e documentação de entrega.
