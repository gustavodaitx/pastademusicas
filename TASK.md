# Controle de Tarefas — PDS Pasta de Música (TASK.md)

Data de Início: 2026-10-25  
Status Geral: **Em Andamento (Fase T00 concluída com sucesso)**  
Política de Qualidade: Nenhuma tarefa é marcada como `CONCLUÍDA` sem testes aplicáveis executados e registrados. Proibida ativação de cobranças ou custos obrigatórios.

---

## Sumário das Etapas

- [x] **T00 — Diagnóstico do repositório, documentação técnica e decisões de arquitetura** `[CONCLUÍDA]`
- [x] **T01 — Base da aplicação, layout responsivo, rotas e tema** `[CONCLUÍDA]`
- [ ] **T02 — Autenticação Firebase e proteção de rotas** `[PENDENTE]`
- [ ] **T03 — Modelo de dados Firestore e regras de segurança** `[PENDENTE]`
- [ ] **T04 — Biblioteca de músicas, cadastro, pesquisa e visualização** `[PENDENTE]`
- [ ] **T05 — Importação local de documentos (DOCX, PDF textual, TXT)** `[PENDENTE]`
- [ ] **T06 — Playlists manuais (CRUD, ordenação e persistência)** `[PENDENTE]`
- [ ] **T07 — Modo Igreja (10 momentos fixos e sugestões do catálogo)** `[PENDENTE]`
- [ ] **T08 — Modo Barzinho (geração assistida com filtros e alternância)** `[PENDENTE]`
- [ ] **T09 — Modo Palco e rolagem automática (autoscroll)** `[PENDENTE]`
- [ ] **T10 — Exportação PDF e TXT** `[PENDENTE]`
- [ ] **T11 — Exportação DOCX e HTML** `[PENDENTE]`
- [ ] **T12 — Integração Google Drive (OAuth Picker e escopos mínimos)** `[PENDENTE]`
- [ ] **T13 — Patrocínio via Pix estático** `[PENDENTE]`
- [ ] **T14 — PWA, acessibilidade (WCAG) e responsividade móvel** `[PENDENTE]`
- [ ] **T15 — Testes finais automatizados, auditoria e documentação de entrega** `[PENDENTE]`

---

## Detalhamento das Tarefas

### [x] T00 — Diagnóstico do Repositório e Documentação Técnica
- **Estado**: `CONCLUÍDA`
- **Objetivo**: Inspecionar a estrutura do repositório, ferramentas disponíveis, dependências, scripts, branch e estado do Git; isolar o repositório local; estabelecer as diretrizes de custo zero, decisões técnicas e plano incremental.
- **Dependências**: Nenhuma.
- **Subtarefas**:
  - [x] Inspecionar diretório e dependências instaladas.
  - [x] Analisar configuração do Git e isolar o repositório em relação ao diretório pai do usuário.
  - [x] Criar branch de trabalho `task/t00-diagnostico-docs`.
  - [x] Redigir inventário de ferramentas e cotas gratuitas em `docs/LIMITES_E_CUSTOS.md`.
  - [x] Redigir diagnóstico e decisões técnicas em `docs/DECISOES_TECNICAS.md`.
  - [x] Criar `TASK.md` com detalhamento das etapas T00–T15.
  - [x] Criar `.gitignore` e `.env.example` protegendo credenciais e arquivos temporários.
- **Testes Obrigatórios**:
  - [x] Validação da versão do Node.js (`v22.19.0`), npm (`10.9.3`) e Git (`2.45.1`).
  - [x] Verificação do isolamento do Git (`git status` limpo no escopo de `pastademusicas`).
  - [x] Verificação de integridade dos arquivos de documentação criados.
- **Critérios de Aceite**:
  - Diagnóstico completo sem alterar/excluir arquivos pré-existentes.
  - Documentos `docs/DECISOES_TECNICAS.md`, `docs/LIMITES_E_CUSTOS.md` e `TASK.md` criados e aprovados.
  - Repositório operando em branch de tarefa sem alterações em `main`.
- **Resultados dos Testes e Observações**:
  - Sucesso: `git init -b main` e checkout para `task/t00-diagnostico-docs`.
  - Nenhuma dependência externa paga foi adicionada. Custo: R$ 0,00.

---

### [x] T01 — Base da Aplicação, Layout Responsivo, Rotas e Tema
- **Estado**: `CONCLUÍDA`
- **Objetivo**: Inicializar projeto React + TypeScript + Vite + Tailwind CSS com arquitetura modular, sistema de rotas (React Router), layout responsivo (Desktop/Tablet/Mobile), tema claro/escuro e navegação principal.
- **Dependências**: T00.
- **Subtarefas**:
  - [x] Inicializar projeto Vite com template React-TS.
  - [x] Configurar Tailwind CSS, PostCSS e estilos globais com tipografia moderna.
  - [x] Instalar e configurar `lucide-react` para ícones de interface.
  - [x] Configurar estrutura de pastas (`src/components`, `src/features`, `src/lib`, `src/types`, `src/hooks`, `src/contexts`).
  - [x] Implementar `ThemeContext` e hook `useTheme` (claro, escuro, sistema).
  - [x] Configurar React Router com rotas-base: Home/Dashboard, Biblioteca, Playlists, Importar, Modo Palco, Modo Igreja, Modo Barzinho, Patrocínio, Configurações e Login.
  - [x] Implementar Navbar responsiva com menu hambúrguer para dispositivos móveis e rodapé com garantia de custo zero.
  - [x] Criar scripts `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
- **Testes Obrigatórios**:
  - [x] `npm run typecheck` sem erros de TypeScript (Executado: 0 erros).
  - [x] `npm run lint` sem erros (Executado: 0 erros, 0 avisos).
  - [x] `npm run test` com Vitest cobrindo temas, navegação e ordem litúrgica (Executado: 3 arquivos, 5 testes 100% aprovados).
  - [x] `npm run build` gerando bundle estático com sucesso (Executado: 303.80 kB JS, 39.36 kB CSS gerados em 2.15s).
  - [x] Inspeção visual via Browser Subagent testando Dashboard, alternância de temas, Biblioteca, Modo Palco com autoscroll e viewport móvel (375x667).
- **Critérios de Aceite**:
  - Telas-base navegáveis sem erros de console.
  - Layout fluido e responsivo em viewports móveis (375px) e desktop (1280px+).
  - Tema escuro de alto contraste operacional.
- **Resultados dos Testes e Observações**:
  - Testes automatizados: 100% aprovados.
  - Gravação de verificação visual salva em `t01_interface_verification_1792900250799.webp`.
  - Custo financeiro: R$ 0,00 (Nenhum serviço pago ativado).

---

### [ ] T02 — Autenticação Firebase e Proteção de Rotas
- **Estado**: `PENDENTE`
- **Objetivo**: Configurar o Firebase Authentication (E-mail/Senha e Google OAuth) no plano Spark gratuito, com controle de estado de autenticação, telas de Login/Cadastro/Recuperação de Senha e guarda de rotas privadas.
- **Dependências**: T01.
- **Subtarefas**:
  - [ ] Configurar cliente Firebase (`src/lib/firebase/config.ts`) usando variáveis de ambiente.
  - [ ] Implementar `AuthContext` com listener `onAuthStateChanged`.
  - [ ] Criar componente `ProtectedRoute` para redirecionamento seguro de usuários deslogados.
  - [ ] Desenvolver telas de Login, Cadastro e Recuperação de Senha com validação de formulários.
  - [ ] Tratar mensagens de erro do Firebase (senha fraca, e-mail já em uso, credenciais inválidas).
  - [ ] Suporte a modo convidado/demonstração para visualização do catálogo público sem login obrigatório.
- **Testes Obrigatórios**:
  - [ ] Teste de renderização das telas de autenticação.
  - [ ] Teste unitário/integração do fluxo de proteção de rotas (bloqueio de rotas privadas sem usuário autenticado).
  - [ ] `npm run typecheck` e `npm run test`.
- **Critérios de Aceite**:
  - Login e logout funcionais; sessão preservada ao recarregar a página.
  - Nenhuma chave privada ou segredo administrativo exposto no frontend.

---

### [ ] T03 — Modelo de Dados Firestore e Regras de Segurança
- **Estado**: `PENDENTE`
- **Objetivo**: Definir tipagens estritas em TypeScript para as entidades (`Usuario`, `Musica`, `Playlist`, `Categoria`, `Patrocinio`), implementar serviço do Firestore e redigir regras de segurança rigorosas (`firestore.rules`).
- **Dependências**: T02.
- **Subtarefas**:
  - [ ] Criar definições de tipos em `src/types/`.
  - [ ] Escrever arquivo `firestore.rules` com permissões por perfil (`ADMIN` vs `FREE`) e isolamento estrito de dados privados.
  - [ ] Garantir que o perfil `ADMIN` seja verificado por meio seguro (Custom Claims ou verificação restrita), nunca por campo editável pelo usuário.
  - [ ] Criar índices necessários em `firestore.indexes.json`.
  - [ ] Criar serviços do Firestore com validação de payload antes do envio.
- **Testes Obrigatórios**:
  - [ ] Testes de regras de segurança cobrindo acessos autorizados e negados.
  - [ ] Validação de tipos com `npm run typecheck`.
- **Critérios de Aceite**:
  - Usuários normais não conseguem ler nem gravar dados privados de terceiros.
  - Somente administradores autorizados conseguem alterar o catálogo público.

---

### [ ] T04 — Biblioteca de Músicas, Cadastro, Pesquisa e Visualização
- **Estado**: `PENDENTE`
- **Objetivo**: Desenvolver a interface da Biblioteca, cadastro manual de músicas cifradas com metadados (tom, categoria, tags, estilo, momento litúrgico), pesquisa multifiltro e tela de visualização formatada com cifras alinhadas.
- **Dependências**: T03.
- **Subtarefas**:
  - [ ] Listagem de músicas com visualização em grade ou tabela responsiva.
  - [ ] Formulário de cadastro/edição manual de música com preservação de espaçamento monoespaçado.
  - [ ] Sistema de pesquisa em tempo real por título, artista, trecho, tom, categoria e tags.
  - [ ] Tela de visualização detalhada com exibição nítida de acordes e letra.
  - [ ] Mecanismo de favoritar músicas com persistência no Firestore/LocalStorage.
  - [ ] Módulo básico de transposição de acordes (semitons para cima e para baixo).
- **Testes Obrigatórios**:
  - [ ] Testes unitários do algoritmo de transposição de acordes (maiores, menores, sustenidos, bemóis e inversões).
  - [ ] Testes de filtros e pesquisa na biblioteca.
- **Critérios de Aceite**:
  - Pesquisa ágil e precisa; alinhamento de acordes preservado sem quebras incorretas.

---

### [ ] T05 — Importação Local de Documentos (DOCX, PDF textual, TXT)
- **Estado**: `PENDENTE`
- **Objetivo**: Implementar processamento 100% no navegador para arquivos `.docx`, `.pdf` e `.txt`, com extração de texto, pré-visualização interativa, formulário de revisão de metadados e salvamento confirmado.
- **Dependências**: T04.
- **Subtarefas**:
  - [ ] Criar parser de TXT com preservação de quebras de linha (`\n`) e espaçamento.
  - [ ] Integrar `mammoth.js` para extração de parágrafos de arquivos DOCX.
  - [ ] Integrar `pdfjs-dist` para extração de texto de PDFs com camada vetorial.
  - [ ] Implementar detecção de arquivos vazios, inválidos, excedendo limite de tamanho ou PDFs escaneados sem texto.
  - [ ] Modal de pré-visualização do texto extraído com opções de edição de título, tom e artista antes do salvamento.
- **Testes Obrigatórios**:
  - [ ] Testes unitários com arquivos simulados de TXT, DOCX e PDF textual.
  - [ ] Teste de rejeição amigável para PDFs escaneados ou arquivos corrompidos.
- **Critérios de Aceite**:
  - Nenhum documento é enviado para APIs externas pagas; confirmação obrigatória antes de persistir.

---

### [ ] T06 — Playlists Manuais (CRUD, Ordenação e Persistência)
- **Estado**: `PENDENTE`
- **Objetivo**: Permitir ao usuário criar, editar, duplicar, renomear e excluir playlists pessoais, adicionando/removendo músicas e reordenando itens com preservação exata da ordem no banco.
- **Dependências**: T04.
- **Subtarefas**:
  - [ ] Criar tela de gerenciamento de playlists.
  - [ ] Implementar reordenação acessível (botões Subir/Descer) e suporte a arrastar e soltar (drag-and-drop).
  - [ ] Permitir definir tom personalizado por música na playlist.
  - [ ] Persistência da ordem das músicas no Firestore (`itens: [{ musicaId, posicao, ... }]`).
- **Testes Obrigatórios**:
  - [ ] Teste de reordenação e persistência (garantir que a ordem se mantenha ao recarregar a playlist).
  - [ ] Testes unitários de manipulação da lista de itens.
- **Critérios de Aceite**:
  - Playlist mantém exatamente a sequência configurada pelo usuário após salvar e reabrir.

---

### [ ] T07 — Modo Igreja (10 Momentos Fixos e Sugestões do Catálogo)
- **Estado**: `PENDENTE`
- **Objetivo**: Implementar o assistente litúrgico para celebrações com os dez momentos fixos em sequência obrigatória, selecionando ou sugerindo apenas músicas reais do catálogo autorizado.
- **Dependências**: T06.
- **Subtarefas**:
  - [ ] Criar fluxo do Modo Igreja com as 10 posições estritas:
    1. Entrada, 2. Perdão, 3. Glória, 4. Salmo, 5. Aclamação,
    6. Ofertório, 7. Santo, 8. Comunhão, 9. Pós-comunhão, 10. Final.
  - [ ] Algoritmo de sugestão baseado no metadado `momentosLiturgicos` do catálogo do usuário.
  - [ ] Posição sem correspondência permanece vazia com aviso para seleção manual (sem alucinação).
  - [ ] Botão de salvar diretamente como nova playlist litúrgica.
- **Testes Obrigatórios**:
  - [ ] Teste unitário validando que os 10 momentos seguem rigorosamente a ordem da especificação.
  - [ ] Teste validando que nenhuma música inexistente é gerada ou inventada.
- **Critérios de Aceite**:
  - Estrutura litúrgica impecável; transparência quando não houver músicas catalogadas para um momento específico.

---

### [ ] T08 — Modo Barzinho (Geração Assistida com Filtros e Alternância)
- **Estado**: `PENDENTE`
- **Objetivo**: Gerador inteligente de repertório para apresentações e shows em barzinhos com base em filtros de estilo, quantidade de músicas (5 a 40), preferências de tom e alternância de ritmos/andamento.
- **Dependências**: T06.
- **Subtarefas**:
  - [ ] Interface de parâmetros do Modo Barzinho (estilo, quantidade, preferência de tom, ritmo).
  - [ ] Algoritmo de seleção sobre o repertório do usuário evitando duplicatas.
  - [ ] Lógica de intercalação de ritmos para dinamismo do repertório.
  - [ ] Aviso explícito caso o número de músicas compatíveis seja menor que o solicitado.
  - [ ] Conversão direta do resultado em playlist manual editável.
- **Testes Obrigatórios**:
  - [ ] Teste unitário do algoritmo de seleção e alternância.
  - [ ] Teste de comportamento quando a biblioteca possui menos músicas do que a quantidade solicitada.
- **Critérios de Aceite**:
  - Repertório montado sem repetições indevidas e sem criar dados fictícios.

---

### [ ] T09 — Modo Palco e Rolagem Automática (Autoscroll)
- **Estado**: `PENDENTE`
- **Objetivo**: Construir a visualização de palco com tema escuro de alto contraste, tipografia monoespaçada ajustável, controle fino de rolagem automática contínua (iniciar, pausar, acelerar, desacelerar, reiniciar) e navegação entre músicas.
- **Dependências**: T04, T06.
- **Subtarefas**:
  - [ ] Layout em tela cheia (Full Screen) otimizado para celulares, tablets e notebooks.
  - [ ] Motor de autoscroll suave com `requestAnimationFrame`.
  - [ ] Controles flutuantes ou em barra fixa: Iniciar, Pausar, Reiniciar, Slider de Velocidade (1 a 10).
  - [ ] Controle de tamanho de fonte (+ / - / reset) com ajuste de entrelinha para não perder o alinhamento das cifras.
  - [ ] Transposição em tempo real durante a execução.
  - [ ] Navegação Próxima / Anterior para músicas de uma playlist ativa.
- **Testes Obrigatórios**:
  - [ ] Teste de comportamento dos controles de autoscroll (iniciar, pausar, reiniciar, alterar velocidade).
  - [ ] Teste de usabilidade e visualização em telas pequenas (mobile portrait e landscape).
- **Critérios de Aceite**:
  - Rolagem fluida sem travamentos; interface utilizável com toques simples em tela sensível ao toque.

---

### [ ] T10 — Exportação PDF e TXT
- **Estado**: `PENDENTE`
- **Objetivo**: Implementar geração e download de arquivos em formato PDF (com jsPDF) e TXT puro para músicas individuais e playlists completas, mantendo rigorosamente títulos, acordes e ordem.
- **Dependências**: T04, T06.
- **Subtarefas**:
  - [ ] Módulo gerador de PDF formatado para folha A4 com quebra de página inteligente.
  - [ ] Exportação de playlist completa em PDF (com índice ou cabeçalhos ordenados).
  - [ ] Módulo gerador de TXT puro com download imediato via Blob.
  - [ ] Opção de incluir ou não metadados (tom, momento litúrgico, artista) no cabeçalho.
- **Testes Obrigatórios**:
  - [ ] Teste de geração dos blobs de PDF e TXT sem exceções.
  - [ ] Validação da preservação de caracteres acentuados (UTF-8) e alinhamento de acordes.
- **Critérios de Aceite**:
  - Arquivos baixados são legíveis e respeitam a ordem da playlist.

---

### [ ] T11 — Exportação DOCX e HTML
- **Estado**: `PENDENTE`
- **Objetivo**: Adicionar exportação para documentos Microsoft Word (`.docx`) usando biblioteca open-source client-side e arquivos HTML avulsos com estilização CSS embutida.
- **Dependências**: T10.
- **Subtarefas**:
  - [ ] Integrar biblioteca `docx` para gerar arquivos `.docx` estruturados com fontes monoespaçadas (ex: Courier New / Consolas).
  - [ ] Gerar arquivo `.html` autônomo com estilos CSS inline prontos para impressão ou visualização offline.
  - [ ] Tratar erros de formatação e limites do navegador.
- **Testes Obrigatórios**:
  - [ ] Teste de integridade dos arquivos `.docx` e `.html` gerados.
- **Critérios de Aceite**:
  - Arquivos abrem corretamente em editores compatíveis (Microsoft Word, LibreOffice Writer, navegadores web).

---

### [ ] T12 — Integração Google Drive (OAuth Picker e Escopos Mínimos)
- **Estado**: `PENDENTE`
- **Objetivo**: Integrar com a Google Drive API e Google Picker permitindo ao usuário selecionar e importar arquivos autorizados de sua própria conta, sem solicitar permissões desnecessárias e sem armazenar tokens.
- **Dependências**: T05.
- **Subtarefas**:
  - [ ] Configurar Google Identity Services (GIS) com escopo restrito `https://www.googleapis.com/auth/drive.file`.
  - [ ] Implementar Google Picker para seleção de arquivos `.docx`, `.pdf` e `.txt`.
  - [ ] Baixar conteúdo do arquivo selecionado e encaminhar para os parsers locais já testados na T05.
  - [ ] Tratar cancelamento de autorização, revogação e erros de rede com mensagens claras.
- **Testes Obrigatórios**:
  - [ ] Teste de fluxo de tratamento de erros e cancelamento de login/Picker do Google.
  - [ ] Verificação de que nenhum token é salvo no Firestore ou LocalStorage de forma persistente.
- **Critérios de Aceite**:
  - Importação de arquivo selecionado pelo usuário funciona; escopo mínimo respeitado.

---

### [ ] T13 — Patrocínio via Pix Estático
- **Estado**: `PENDENTE`
- **Objetivo**: Disponibilizar tela e modais de apoio voluntário com QR Code Pix estático (BR Code) e chave copia-e-cola oficial, informando claramente a natureza voluntária sem gateways de pagamento pagos.
- **Dependências**: T01.
- **Subtarefas**:
  - [ ] Gerador estático de payload Pix padrão Banco Central (EMV).
  - [ ] Renderizador de QR Code dinâmico em SVG/Canvas (`qrcode.react`).
  - [ ] Botão "Copiar Código Pix" com feedback tátil/visual (toast notification).
  - [ ] Sugestões informativas de valores (R$ 5, R$ 10, R$ 25 ou livre) sem bloqueio ou cobrança.
  - [ ] Painel administrativo simples para o ADMIN configurar a chave Pix pública.
- **Testes Obrigatórios**:
  - [ ] Teste unitário de montagem do payload Pix EMV.
  - [ ] Teste de cópia para área de transferência (`navigator.clipboard`).
- **Critérios de Aceite**:
  - 100% gratuito; nenhuma cobrança forçada; nenhuma confirmação automática simulada.

---

### [ ] T14 — PWA, Acessibilidade (WCAG) e Responsividade Móvel
- **Estado**: `PENDENTE`
- **Objetivo**: Configurar a aplicação como Progressive Web App (PWA) instalável, com funcionamento offline para cifras já visualizadas, auditoria de acessibilidade (WCAG AA), foco visível por teclado e refinamento responsivo.
- **Dependências**: T01 a T13.
- **Subtarefas**:
  - [ ] Configurar `manifest.webmanifest`, ícones SVG/PNG e meta tags PWA.
  - [ ] Configurar Service Worker com cache de recursos estáticos e fontes.
  - [ ] Garantir navegação integral por teclado (`Tab`, `Enter`, `Escape`, setas de navegação).
  - [ ] Revisão de contrastes de cor para conformidade WCAG 2.1 AA.
  - [ ] Adicionar atributos ARIA em botões de ação e diálogos modais.
- **Testes Obrigatórios**:
  - [ ] Validação do manifesto PWA.
  - [ ] Testes de navegação por teclado e foco em todas as telas principais.
- **Critérios de Aceite**:
  - App instalável em dispositivos móveis e desktop; acessível e fluido.

---

### [ ] T15 — Testes Finais Automatizados, Auditoria e Documentação de Entrega
- **Estado**: `PENDENTE`
- **Objetivo**: Executar toda a esteira de testes automatizados (`lint`, `typecheck`, `test`, `build`), auditar o cumprimento da regra inegociável de custo zero e consolidar a documentação completa de implantação.
- **Dependências**: T00 a T14.
- **Subtarefas**:
  - [ ] Executar bateria completa de testes unitários e de integração.
  - [ ] Verificar ausência de vulnerabilidades em dependências (`npm audit`).
  - [ ] Validar `npm run build` gerando bundle limpo e sem avisos de tipos.
  - [ ] Atualizar todos os arquivos de `docs/` (`README.md`, `CONFIGURACAO_LOCAL.md`, `DEPLOY_GRATUITO.md`, `SEGURANCA.md`, `ARQUITETURA.md`, `MODELO_DE_DADOS.md`).
  - [ ] Conferência final da regra de custo zero: confirmação de billing desativado e 0 dependências pagas.
- **Testes Obrigatórios**:
  - [ ] `npm run lint` -> 0 erros.
  - [ ] `npm run typecheck` -> 0 erros.
  - [ ] `npm run test` -> 100% aprovados.
  - [ ] `npm run build` -> Sucesso.
- **Critérios de Aceite**:
  - Todos os scripts passam com sucesso; aplicação pronta para publicação gratuita (Cloudflare Pages / Firebase Hosting Spark).
