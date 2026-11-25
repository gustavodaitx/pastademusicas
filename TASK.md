# Controle de Tarefas — PDS Pasta de Música (TASK.md)

Data de Início: 2026-10-25  
Status Geral: **Em Andamento (Fase T00 concluída com sucesso)**  
Política de Qualidade: Nenhuma tarefa é marcada como `CONCLUÍDA` sem testes aplicáveis executados e registrados. Proibida ativação de cobranças ou custos obrigatórios.

---

## Sumário das Etapas

- [x] **T00 — Diagnóstico do repositório, documentação técnica e decisões de arquitetura** `[CONCLUÍDA]`
- [x] **T01 — Base da aplicação, layout responsivo, rotas e tema** `[CONCLUÍDA]`
- [x] **T02 — Autenticação Firebase e proteção de rotas** `[CONCLUÍDA]`
- [ ] **T03 — Modelo de dados Firestore e regras de segurança** `[CONCLUÍDA]`
- [x] **T04 — Biblioteca de músicas, cadastro, pesquisa e visualização** `[CONCLUÍDA]`
- [ ] **T05 — Importação local de documentos (DOCX, PDF textual, TXT)** `[IMPLEMENTAÇÃO CONCLUÍDA; auditoria de fidelidade parcial]`
- [x] **T06 — Playlists manuais (CRUD, ordenação e persistência)** `[CONCLUÍDA]`
- [x] **T07 — Modo Igreja (10 momentos fixos e sugestões do catálogo)** `[CONCLUÍDA]`
- [x] **T08 — Modo Barzinho (geração assistida com filtros e alternância)** `[CONCLUÍDA]`
- [x] **T09 — Modo Palco e rolagem automática (autoscroll)** `[CONCLUÍDA]`
- [ ] T10 — Exportação PDF e TXT `[EM VALIDAÇÃO; inspeção visual pendente]`
- [ ] **T11 — Motor Musical e Capotraste Inteligente** `[PENDENTE]`
- [ ] **T12 — Exportação DOCX e HTML** `[PENDENTE]`
- [ ] **T13 — Integração Google Drive (OAuth Picker e escopos mínimos)** `[PENDENTE]`
- [ ] **T14 — Patrocínio via Pix estático** `[PENDENTE]`
- [ ] **T15 — PWA, acessibilidade (WCAG) e responsividade móvel** `[PENDENTE]`
- [ ] **T16 — Testes finais automatizados, auditoria e documentação de entrega** `[PENDENTE]`

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
  - [x] Criar `TASK.md` com detalhamento das etapas T00–T16.
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

### [x] T02 — Autenticação Firebase e Proteção de Rotas
- **Estado**: `CONCLUÍDA; validação real reportada pelo usuário`
- **Objetivo**: Configurar Firebase Authentication com e-mail e senha no plano Spark, controle de estado da autenticação, telas de Login/Cadastro/Recuperação de Senha e guarda de rotas privadas.
- **Dependências**: T01.
- **Subtarefas**:
  - [x] Configurar cliente Firebase (`src/lib/firebase.ts`) usando variáveis de ambiente.
  - [x] Implementar `AuthContext` com listener `onAuthStateChanged`.
  - [x] Criar componente `ProtectedRoute` para redirecionamento seguro e retorno ao destino solicitado.
  - [x] Desenvolver telas de Login, Cadastro e Recuperação de Senha com validação de formulários.
  - [x] Tratar mensagens de erro do Firebase (senha fraca, e-mail já em uso, credenciais inválidas).
  - [x] Proteger as rotas funcionais e manter o dashboard público; não há autenticação simulada.
- **Testes Obrigatórios**:
  - [x] Testes de interface e validação dos formulários de autenticação.
  - [x] Testes de cadastro, login, logout, recuperação, loading e proteção/redirecionamento de rotas com mocks.
  - [x] `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build`.
- **Critérios de Aceite**:
  - Login e logout conectados ao Firebase; persistência de sessão fornecida pelo SDK no navegador.
  - Nenhuma configuração local Firebase versionada; os testes usam mocks e não simulam autenticação real.
  - [x] Validação manual real reportada: cadastro, login, persistência após atualizar, recuperação por e-mail, proteção e retorno à rota solicitada.

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

### [x] T04 — Biblioteca de Músicas, Cadastro, Pesquisa e Visualização
- **Estado**: `CONCLUÍDA`
- **Objetivo**: Disponibilizar a Biblioteca privada integrada ao Firestore, com cadastro e edição de músicas, compositor e observações opcionais, pesquisa por metadados e conteúdo, filtros e visualização formatada de cifras.
- **Dependências**: T03.
- **Subtarefas**:
  - [x] Listagem responsiva de músicas persistidas no Firestore, sem dados de exemplo.
  - [x] Formulário de cadastro/edição com validação e preservação do espaçamento da cifra.
  - [x] Campos opcionais de compositor e observações, com limites e compatibilidade com documentos antigos.
  - [x] Pesquisa em tempo real por título, artista, compositor, tags e trechos da letra/cifra, sem cruzar campos.
  - [x] Filtros por tom e categoria combináveis com a pesquisa.
  - [x] Visualização detalhada com metadados disponíveis e cifra alinhada em fonte monoespaçada.
- **Testes Obrigatórios**:
  - [x] Testes de pesquisa, normalização, filtros e visualização da Biblioteca.
  - [x] Testes de persistência, validação, compatibilidade e isolamento com Firebase Emulator Suite.
- **Critérios de Aceite**:
  - [x] Pesquisa normalizada e precisa, com consulta por campo independente.
  - [x] Documentos antigos permanecem compatíveis e as regras mantêm isolamento por UID.
  - [x] Formatação e alinhamento das cifras preservados na visualização.

Favoritos não fazem parte do escopo aprovado da T04. A transposição básica em tempo real foi implementada na T09; o motor musical reutilizável, a identificação de tonalidades e o capotraste inteligente estão planejados para a T11.

---

### [ ] T05 — Importação Local de Documentos (DOCX, PDF textual, TXT)
- **Estado**: `implementação concluída; fidelidade visual da origem não validada integralmente`
- **Objetivo**: Processar localmente arquivos `.docx`, `.pdf` textual e `.txt`, permitindo extrair e editar o texto antes de encaminhá-lo ao formulário existente da Biblioteca e salvar somente após confirmação explícita.
- **Dependências**: T04.
- **Auditoria do salvamento (2026-11-24)**: revisão do fluxo encontrou `savingRef` como trava síncrona contra submissões concorrentes, estado de loading no botão, `try/catch/finally`, gravação via `await createMusic` e atualização da lista sem bloquear o fechamento do formulário. A extração não é repetida no cadastro. O congelamento relatado não foi reproduzido nem teve uma causa de bloqueio síncrono confirmada; os testes de regressão verificam resposta durante uma gravação pendente, submissão repetida, sucesso e retenção dos dados em erro. O carregamento de bibliotecas muito grandes continua sem paginação e pode custar tempo de renderização após uma atualização completa.
- **Subtarefas**:
  - [x] **T05.1 — Extratores**: TXT, DOCX (OOXML/JSZip em Worker) e PDF textual (PDF.js), com processamento local e carregamento sob demanda.
  - [x] **T05.2 — Validações e limites**: formatos permitidos, arquivo até 5 MiB, conteúdo até 800.000 bytes UTF-8 e erros tipados para arquivos/conteúdo inválidos.
  - [x] **T05.3 — Interface e pré-visualização**: seleção, estados de extração, edição da prévia, revalidação após edição, limpeza e substituição de arquivo.
  - [x] **T05.4 — Integração com a Biblioteca**: encaminhar texto e nome do arquivo ao formulário existente; persistir pela T04 com `origemTipo: upload_local`, sem guardar o binário e mediante confirmação explícita.
  - [x] **T05.5 — Estabilização**: testes de extratores, validação, interface, integração, preservação do conteúdo em erros e regressão do cadastro manual/edição.
  - [x] **T05.6 — Documentação da auditoria**: atualizar roadmap, arquitetura e limites/custos; validação visual de documentos reais continua pendente.
- **Auditoria de fidelidade (2026-11-24)**: extração DOCX usa OOXML para manter parágrafos vazios, tabs e células de tabela, emitindo tabelas por coluna; tabs são expandidas em paradas fixas de quatro colunas, espaços repetidos em linhas de acordes são comprimidos pelo fator 0,65 e um parágrafo vazio entre acorde e letra é removido; as posições dos acordes são recalibradas pela largura proporcional estimada da letra seguinte (letras estreitas/espaços 0,85; letras largas 1,15), mantendo espaço entre acordes. PDF separa duas colunas quando encontra vale central sem texto atravessando, calibra a grade pela mediana de linhas textuais longas e infere estrofes por delta Y. Fixtures sintéticas cobrem DOCX com tabela/tabs, PDF em duas colunas e PDF com medidas proporcionais. Layouts DOCX com tab stops personalizados/células mescladas e PDFs com títulos cruzando colunas ou mais de duas colunas seguem como limitações; a inspeção real de Missa de Emaús identificou os problemas corrigidos nesta revisão; o arquivo original não está disponível no repositório para uma conferência visual pós-correção, então a fidelidade visual final permanece pendente.
- **Testes Obrigatórios**:
  - [x] Testes de extratores, validações e estados da interface para TXT, DOCX e PDF, incluindo arquivos inválidos, vazios, protegidos por senha e limites.
  - [x] Testes de integração do rascunho editado com o cadastro existente, confirmação explícita, retorno à prévia, erro de persistência e regressão do cadastro manual/edição.
  - [x] Suíte geral desta auditoria: 237 testes aprovados; 46 testes de regras Firestore ignorados porque o emulador não estava configurado.
  - [x] `npm run typecheck`, `npm test`, `npm run build`, `npm run lint` e `git diff --check`.
- **Critérios de Aceite**:
  - [x] Extração feita localmente, sem envio do documento a serviços externos; confirmação obrigatória antes de persistir pela T04.
  - [x] A origem `upload_local` e o nome original são registrados sem persistir o arquivo binário.
  - [x] Limitações de OCR, fidelidade de formatação, cobertura dos testes PDF e tamanho de bundle documentadas em `docs/LIMITES_E_CUSTOS.md`.

---

### [x] T06 — Playlists Manuais (CRUD, Ordenação e Persistência)
- **Estado**: `CONCLUÍDA` — etapas T06.1 a T06.5 revisadas e validadas.
- **Objetivo**: Permitir ao usuário criar, listar, editar nome e tipo, duplicar e excluir playlists pessoais, adicionar/remover referências a músicas, editar tons personalizados e reordenar itens sem alterar as músicas da Biblioteca.
- **Dependências**: T04.
- **Subtarefas**:
  - [x] Criar tela de gerenciamento e manter CRUD/listagem privados por UID.
  - [x] Editar nome e tipo sem alterar os itens existentes.
  - [x] Duplicar com novo ID, itens independentes e preservação de ordem/metadados; compensar falhas de persistência.
  - [x] Adicionar e remover referências sem criar/apagar documentos da Biblioteca; apresentar referências indisponíveis.
  - [x] Editar e limpar `tomPersonalizado` por item, sem alterar `tomOriginal`.
  - [x] Persistir reordenação por botões, teclado e drag-and-drop nativo, preservando IDs e metadados.
  - [x] Limitar operações de lista a 400 itens e testar duplicação, reordenação e exclusão nesse limite.
- **Testes Obrigatórios**:
  - [x] Regressão de CRUD, duplicação, inclusão/remoção, referências indisponíveis, tons, acessibilidade, persistência, falhas e isolamento.
  - [x] `npm test`: 105 passaram; 34 testes Firestore ignorados sem emulador (não contabilizados como aprovados).
  - [x] `firebase emulators:exec --only firestore --project demo-pasta-de-musica-t03 "npx vitest run --minWorkers=1 --maxWorkers=1"`: 139 passaram, nenhum ignorado.
  - [x] `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check`.
- **Critérios de Aceite**:
  - [x] Playlist mantém sequência e metadados após salvar e reabrir.
  - [x] Operações permanecem isoladas por UID; excluir playlists/itens não apaga músicas.
  - [x] Implementação usa Firestore já existente e permanece compatível com Firebase Spark, sem infraestrutura paga adicional.

---

### [x] T07 — Modo Igreja (10 Momentos Fixos e Sugestões do Catálogo)
- **Estado**: `CONCLUÍDA`
- **Objetivo**: Implementar o assistente litúrgico para celebrações com os dez momentos fixos em sequência obrigatória, selecionando ou sugerindo apenas músicas reais do catálogo autorizado.
- **Dependências**: T06.
- **Subetapas**:
  - [x] T07.2 — Contratos de dados e operações do repository para playlists estruturadas de Igreja.
  - [x] T07.3 — Proteger linhagem de músicas e cópias estruturadas, preservar compatibilidade v1 e exigir v2 nas novas playlists estruturadas.
  - [x] T07.4 — Editar playlists v1 sem migração, preservar referências órfãs v2 na interface e limitar atualizações das Rules a um momento por gravação.
- **Garantias implementadas na T07.3**:
  - [x] As Rules validam o UID do caminho, timestamps e estruturas v1/v2 com dez momentos canônicos.
  - [x] Ao criar música duplicada, as Rules consultam a origem no mesmo UID e exigem igualdade dos campos musicais, exceto `duplicadaDe`, `createdAt` e `updatedAt`. A linhagem é imutável depois da criação; o conteúdo da cópia pode ser editado e a origem pode ser excluída.
  - [x] Cópias estruturadas v1/v2 são aceitas somente quando a origem existe no mesmo UID e tipo, versão, chaves e conteúdo dos dez momentos coincidem na criação. Momentos vazios e referências órfãs são preservados; depois da criação, a cópia é independente.
  - [x] Novas playlists estruturadas são persistidas em v2; a criação direta de estrutura v1 é rejeitada. Documentos v1 existentes continuam legíveis/editáveis e suas cópias permanecem v1, sem migração automática.
  - [x] A suíte `src/test/firestore-rules.test.ts` e a suíte unitária de contratos foram executadas, incluindo casos positivos e negativos para as garantias acima.
  - [x] Nas atualizações, as Rules exigem música existente para referências novas/substituídas, mas preservam referências órfãs não modificadas e cópias históricas.
  - [x] Edição v1 pela interface preserva versão, dez momentos e referências não alteradas; referências órfãs v2 têm indicação visual e só são removidas/substituídas explicitamente.
  - [x] Rules permitem mudança de um momento por gravação e rejeitam mudanças simultâneas de dois ou mais, sem bloquear atualizações válidas de metadados.
- **Subtarefas**:
  - [x] Criar fluxo do Modo Igreja com as 10 posições estritas:
    1. Entrada, 2. Perdão, 3. Glória, 4. Salmo, 5. Aclamação,
    6. Ofertório, 7. Santo, 8. Comunhão, 9. Pós-comunhão, 10. Final.
  - [x] Algoritmo de sugestão baseado no metadado `momentosLiturgicos` do catálogo do usuário.
  - [x] Posição sem correspondência permanece vazia com aviso para seleção manual (sem alucinação).
  - [x] Botão de salvar diretamente como nova playlist litúrgica.
- **Testes Obrigatórios**:
  - [x] Teste unitário validando que os 10 momentos seguem rigorosamente a ordem da especificação.
  - [x] Teste validando que nenhuma música inexistente é gerada ou inventada.
- **Critérios de Aceite**:
  - Estrutura litúrgica impecável; transparência quando não houver músicas catalogadas para um momento específico.

---

### [x] T08 — Modo Barzinho (Geração Assistida com Filtros e Alternância)
- **Estado**: `CONCLUÍDA`
- **Objetivo**: Gerador inteligente de repertório para apresentações e shows em barzinhos com base em filtros de estilo, quantidade de músicas (5 a 40), preferências de tom e alternância de ritmos/andamento.
- **Dependências**: T06.
- **Subtarefas**:
  - [x] Interface de parâmetros do Modo Barzinho (estilo, quantidade, preferência de tom, ritmo).
  - [x] Algoritmo de seleção sobre o repertório do usuário evitando duplicatas.
  - [x] Lógica de intercalação de ritmos para dinamismo do repertório.
  - [x] Aviso explícito caso o número de músicas compatíveis seja menor que o solicitado.
  - [x] Conversão direta do resultado em playlist manual editável.
- **Testes Obrigatórios**:
  - [x] Teste unitário do algoritmo de seleção e alternância (`src/test/barModeGenerator.test.ts` — 18 testes aprovados).
  - [x] Teste de comportamento quando a biblioteca possui menos músicas do que a quantidade solicitada (`src/test/barModeGenerator.test.ts` e `src/test/BarModePage.test.tsx`).
  - [x] Testes de persistência de playlist com itens e rollback compensatório (`src/test/barPlaylistRepository.test.ts` — 6 testes aprovados).
  - [x] Teste de interface do Modo Barzinho (`src/test/BarModePage.test.tsx` — 9 testes aprovados).
- **Critérios de Aceite**:
  - [x] Repertório montado sem repetições indevidas e sem criar dados fictícios.

---

### [x] T09 — Modo Palco e Rolagem Automática (Autoscroll)
- **Estado**: `CONCLUÍDA`
- **Objetivo**: Construir a visualização de palco com tema escuro de alto contraste, tipografia monoespaçada ajustável, controle fino de rolagem automática contínua (iniciar, pausar, acelerar, desacelerar, reiniciar) e navegação entre músicas.
- **Dependências**: T04, T06.
- **Subtarefas**:
  - [x] Layout em tela cheia (Full Screen) otimizado para celulares, tablets e notebooks.
  - [x] Motor de autoscroll suave com `requestAnimationFrame`.
  - [x] Controles flutuantes ou em barra fixa: Iniciar, Pausar, Reiniciar, Slider de Velocidade (1 a 10).
  - [x] Controle de tamanho de fonte (+ / - / reset) com ajuste de entrelinha para não perder o alinhamento das cifras.
  - [x] Transposição em tempo real durante a execução.
  - [x] Navegação Próxima / Anterior para músicas de uma playlist ativa.
- **Testes Obrigatórios**:
  - [x] Teste de comportamento dos controles de autoscroll (iniciar, pausar, reiniciar, alterar velocidade).
  - [x] Teste de usabilidade e visualização em telas pequenas (mobile portrait e landscape), tablet e notebook.
- **Critérios de Aceite**:
  - Rolagem fluida sem travamentos; interface utilizável com toques simples em tela sensível ao toque.
- **Validação manual (2026-11-23)**: o usuário confirmou a inspeção visual e prática do Modo Palco nos quatro viewports solicitados: celular vertical (390×844), celular horizontal (844×390), tablet (768×1024) e notebook (1366×768).

---

### Atualização da validação T09 (2026-11-23)
- [x] Auditoria do ciclo RAF: loop único; pausas, reinício, desmontagem e troca de música cancelam o frame pendente. A retomada após suspensão limita o intervalo para evitar saltos.
- [x] Teste de troca de faixa durante execução: 34 testes focados de StageMode, autoscroll e transposição aprovados.
- [x] Suíte geral: 216 testes passaram; 46 testes de Firestore Rules foram ignorados sem o emulador e não são contabilizados como aprovados.
- [x] TypeScript e build passaram. Lint passou com 2 avisos preexistentes em `ChurchModePage.tsx`; o build reportou chunks acima de 500 kB.
- [x] `git diff --check` passou; houve somente avisos de conversão CRLF em arquivos preexistentes do Modo Palco.
- [x] Inspeção manual nos viewports 390×844, 844×390, 768×1024 e 1366×768 confirmada pelo usuário.
- **Estado da T09**: `CONCLUÍDA`, com validação automatizada registrada acima e inspeção manual confirmada pelo usuário.

### [ ] T10 — Exportação PDF e TXT
- **Estado**: `EM VALIDACAO; inspecao visual do PDF pendente`
- **Objetivo**: Implementar geração e download de arquivos em formato PDF (com jsPDF) e TXT puro para músicas individuais e playlists completas, mantendo rigorosamente títulos, acordes e ordem.
- **Dependências**: T04, T06.
- **Subtarefas**:
  - [x] Formatadores puros para músicas, playlists ordenadas e dez momentos fixos de Igreja, sem mutação dos dados.
  - [x] TXT UTF-8 via Blob, com LF, nome seguro e download local.
  - [x] PDF jsPDF sob demanda, sempre A4 retrato, Courier em 14 pt quando cabe e mínimo de 12 pt, painéis dimensionados pelas métricas reais, linhas de acordes em negrito azul-escuro, paginação, cabeçalho e número de página.
  - [x] Ações PDF/TXT e opção de metadados na Biblioteca, Playlists e Modo Igreja; estado de geração, bloqueio de repetição e mensagem de falha.
- **Testes Obrigatórios**:
  - [x] Testes de formatação cobrem cifra literal, espaços/tabs, acentos, ordem, metadados, nomes e dez momentos vazios.
  - [x] Typecheck, lint, suíte completa e build executados; 230 testes passaram e 46 testes de regras foram ignorados pela configuração atual.
  - [ ] Inspeção manual do PDF e download real em navegadores desktop e dispositivos móveis.
- **Critérios de Aceite**:
  - Ordem e dados em memória preservados; nenhuma escrita do Firestore é chamada durante exportação.
  - Limitação: fontes Courier padrão do jsPDF podem não conter todos os símbolos musicais Unicode. Cortes horizontais comuns preservam o alinhamento relativo; cortes inevitáveis podem atravessar acordes ou palavras.

---

### [ ] T11 — Motor Musical e Capotraste Inteligente
- **Estado**: `PENDENTE — planejado; nenhuma implementação iniciada nesta atualização documental`
- **Objetivo**: Desenvolver um motor musical reutilizável em TypeScript puro, executado localmente no navegador, capaz de interpretar acordes, transpor cifras, estimar tonalidades e recomendar posições de capotraste. A cifra original da Biblioteca permanece inalterada.
- **Dependências**: T04, T06, T09 e T10. Deve ser iniciada somente após a conclusão da T10, salvo decisão futura expressa. Reutiliza a transposição já existente na T09.
- **Subtarefas**:
  - [ ] **T11.1 — Parser e representação de acordes**: interpretar notas naturais, sustenidos e bemóis; acordes maiores, menores, sétimas, extensões, suspensos, diminutos e aumentados; inversões e baixos alternativos. Produzir representação estruturada e preservar tokens não reconhecidos sem corromper a cifra.
  - [ ] **T11.2 — Transposição reutilizável**: consolidar a implementação de `chordTransposer.ts`, manter compatibilidade com o Modo Palco e transpor entre tonalidades preservando letras, pontuação, espaços, quebras de linha e alinhamento. Nunca sobrescrever o conteúdo original da música.
  - [ ] **T11.3 — Identificação de tonalidade**: analisar acordes, estimar tonalidades maiores e menores, expor confiança/ambiguidade e permitir resultado inconclusivo quando não houver evidência suficiente.
  - [ ] **T11.4 — Capotraste inteligente**: calcular posições candidatas, apresentar tom de execução e formas correspondentes, aplicar critérios determinísticos e documentados de facilidade, aceitar limites configuráveis e informar quando não houver recomendação confiável. Manter transposição manual disponível.
  - [ ] **T11.5 — Integração com Modo Palco**: expor transposição e recomendações na interface, preservar os controles atuais, recalcular ao trocar música ou tonalidade e não persistir resultados derivados como cifra original.
  - [ ] **T11.6 — Documentação e limites**: documentar formatos de cifra suportados, heurísticas, incertezas da estimativa tonal e critérios de facilidade do capotraste. Não adicionar serviços externos, infraestrutura ou dependências sem justificativa técnica e aprovação.
- **Testes Obrigatórios**:
  - [ ] Testes unitários do parser para acordes válidos, inválidos e ambíguos, incluindo inversões e tokens não reconhecidos.
  - [ ] Testes de transposição para diferentes tipos de acorde e preservação de letras, pontuação, espaços, quebras e alinhamento.
  - [ ] Testes de tonalidades maiores, menores e ambíguas, incluindo confiança e resultados inconclusivos.
  - [ ] Testes de capotraste cobrindo recomendações, limites configuráveis, desempates determinísticos e ausência de recomendação confiável.
  - [ ] Casos sem acordes e com conteúdo ambíguo; comprovar que a cifra original permanece integralmente inalterada.
  - [ ] Testes de integração com Modo Palco e regressão da transposição e do autoscroll atuais.
  - [ ] Executar e registrar `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`.
- **Critérios de Aceite**:
  - O núcleo funciona independentemente de React e Firebase, em TypeScript strict e com processamento local.
  - A transposição atual continua funcionando e cifras não reconhecidas não são corrompidas.
  - A análise tonal explicita ambiguidade ou inconclusão em vez de inventar um tom.
  - Recomendações de capotraste são reproduzíveis, documentadas e testadas.
  - A cifra original permanece inalterada; resultados derivados são apenas em memória/apresentação.
  - O Modo Palco mantém seus recursos existentes e todos os testes e verificações exigidos são executados, com resultados registrados.

---

### [ ] T12 — Exportação DOCX e HTML
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

### [ ] T13 — Integração Google Drive (OAuth Picker e Escopos Mínimos)
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

### [ ] T14 — Patrocínio via Pix Estático
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

### [ ] T15 — PWA, Acessibilidade (WCAG) e Responsividade Móvel
- **Estado**: `PENDENTE`
- **Objetivo**: Configurar a aplicação como Progressive Web App (PWA) instalável, com funcionamento offline para cifras já visualizadas, auditoria de acessibilidade (WCAG AA), foco visível por teclado e refinamento responsivo.
- **Dependências**: T01 a T14.
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

### [ ] T16 — Testes Finais Automatizados, Auditoria e Documentação de Entrega
- **Estado**: `PENDENTE`
- **Objetivo**: Executar toda a esteira de testes automatizados (`lint`, `typecheck`, `test`, `build`), auditar o cumprimento da regra inegociável de custo zero e consolidar a documentação completa de implantação.
- **Dependências**: T00 a T15.
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
