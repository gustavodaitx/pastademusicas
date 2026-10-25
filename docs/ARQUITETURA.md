# Arquitetura do Sistema — PDS Pasta de Música

Data: 2026-10-25  
Versão: 1.0  
Status: Documentado para implementação incremental

---

## 1. Visão Geral da Arquitetura

O **Pasta de Música** é projetado como uma **Single Page Application (SPA)** moderna e responsiva, com capacidades de **PWA (Progressive Web App)**, priorizando execução e processamento inteiramente no navegador do cliente (client-side processing).

Essa abordagem garante alta performance, privacidade, funcionamento offline e **custo de infraestrutura zero**, pois não depende de servidores de backend proprietários ou instâncias de computação pagas.

```text
+-----------------------------------------------------------------------------------+
|                                CLIENTE (Navegador)                                |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                           Camada de Apresentação                            |  |
|  |  React 18 + Tailwind CSS + React Router + Lucide Icons                       |  |
|  |  (Dashboard, Biblioteca, Editor, Modo Igreja, Modo Barzinho, Modo Palco)    |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|  +--------------------------------------+--------------------------------------+  |
|  |                         Camada de Domínio e Regras                          |  |
|  |  - Validador e formatador de cifras                                         |  |
|  |  - Algoritmo cromático de transposição de acordes                           |  |
|  |  - Motor litúrgico (10 momentos) e gerador de repertório barzinho           |  |
|  |  - Motor de autoscroll adaptativo (requestAnimationFrame)                   |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|  +--------------------------------------+--------------------------------------+  |
|  |                        Processamento Local (Open Source)                    |  |
|  |  - Mammoth.js (DOCX -> Texto)                                               |  |
|  |  - PDF.js (PDF Textual -> Strings)                                          |  |
|  |  - FileReader (TXT nativo)                                                  |  |
|  |  - jsPDF / docx / Blobs (Exportadores locais)                                |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|  +--------------------------------------+--------------------------------------+  |
|  |                        Serviços de Nuvem (Cota Gratuita)                    |  |
|  |  - Firebase Auth (Sessão de usuário)                                        |  |
|  |  - Cloud Firestore (Persistência Spark)                                     |  |
|  |  - Google Picker / GIS (Importação pontual via OAuth Drive)                 |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Estrutura de Pastas e Módulos

Seguindo os padrões definidos na especificação:

```text
src/
├── app/                  # Entrada da aplicação, Router e Provedores globais
│   ├── App.tsx
│   ├── router.tsx
│   └── providers/        # AuthProvider, ThemeProvider, ToastProvider
├── assets/               # Imagens, logotipos e ilustrações vetoriais
├── components/           # Componentes reutilizáveis
│   ├── common/           # Botões, modais, inputs, badges, spinners
│   ├── layout/           # Navbar, Sidebar, Footer, PageContainer
│   ├── music/            # Visualizador de acordes, editor, seletor de tom
│   └── playlist/         # Item de playlist, organizador drag-and-drop
├── features/             # Módulos por caso de uso de negócio
│   ├── auth/             # Login, cadastro, recuperação de senha
│   ├── dashboard/        # Tela inicial com atalhos e recentes
│   ├── library/          # Listagem, pesquisa multifiltro e filtros
│   ├── import-music/     # Upload e parse de DOCX/PDF/TXT com preview
│   ├── church-mode/      # Seletor dos 10 momentos litúrgicos
│   ├── bar-mode/         # Gerador de repertório por estilo/ritmo
│   ├── stage-mode/       # Modo palco, autoscroll e ajuste de fonte
│   ├── export/           # Exportadores PDF, TXT, HTML, DOCX
│   ├── google-drive/     # Seletor do Google Picker com escopo mínimo
│   ├── sponsorship/      # Exibição do QR Code e código Pix estático
│   ├── settings/         # Configurações de tema, tamanho de fonte e perfil
│   └── admin/            # Painel administrativo de catálogo público
├── hooks/                # Custom hooks (useAuth, useTheme, useAutoscroll, etc.)
├── lib/                  # Bibliotecas auxiliares e serviços
│   ├── firebase/         # Cliente e inicialização do Firebase
│   ├── document-parsers/ # Mammoth (DOCX), PDF.js e TXT parser
│   ├── chord-transposition/ # Lógica matemática de transposição cromática
│   └── export/           # Geradores de arquivos
├── services/             # Camada de comunicação com o Firestore
├── types/                # Definições de tipos TypeScript estritos
├── utils/                # Funções utilitárias puras
└── styles/               # CSS global e regras Tailwind
```

---

## 3. Fluxo de Dados e Estado

1. **Estado de Autenticação**: Mantido pelo `AuthContext` via `onAuthStateChanged`. Persiste no `IndexedDB` nativo do Firebase Auth.
2. **Estado de Preferências**: Tema (claro/escuro/sistema), fonte do modo palco e velocidade do autoscroll são salvos no `localStorage` e sincronizados no perfil do Firestore quando o usuário estiver autenticado.
3. **Músicas e Playlists**: Carregadas do Firestore sob demanda com filtros e limites para garantir economia estrita de cotas de leitura.
