# Arquitetura atual — Pasta de Música

O projeto é uma SPA React/TypeScript executada no navegador. Authentication e Firestore usam o Firebase Web SDK configurado em `src/lib/firebase.ts`. Não há backend, Cloud Functions ou Scheduler.

## Camadas

- **Aplicação/rotas:** `src/app/router.tsx`; rotas privadas são envolvidas por `ProtectedRoute`.
- **Autenticação:** `AuthProvider` observa Firebase Authentication e mantém usuário/sessão. Nesta versão, o método implementado é e-mail/senha.
- **Apresentação:** `src/features/` contém Biblioteca, Playlists, Repertórios, Configurações e modos Igreja, Barzinho e Palco.
- **Persistência:** `src/services/` contém repositories com operações tipadas para músicas, playlists, repertórios e preferências. O UID vem de `auth.currentUser` em cada repository.
- **Segurança:** `firestore.rules` valida caminhos por UID e payloads; o último match nega caminhos não especificados.
- **Tipos:** modelos de documentos em `src/types/firestore.ts`.

## Exportação local PDF e TXT (T10)

`src/features/export/exportFormatters.ts` prepara conteúdo sem React ou Firebase e sem modificar a cifra. A exportação TXT usa Blob UTF-8 e LF. O PDF carrega `jspdf` dinamicamente quando solicitado e gera páginas A4 retrato em Courier, preferindo 14 pt e mantendo o mínimo em 12 pt. Linhas formadas apenas por tokens válidos de acordes recebem Courier Bold azul-escuro; texto misto e letras permanecem Courier normal preto. As larguras são medidas pelas métricas reais do estilo usado; linhas extensas viram painéis com cortes comuns a todas as linhas, sem reflow automático de `doc.text()`. Tabs são expandidas até a próxima parada de oito colunas. Linhas vazias consomem espaço, blocos cabem juntos quando possível, e pares adjacentes de acorde/letra são mantidos juntos no limite de página. `ExportActions.tsx` integra as opções à Biblioteca, playlists manuais e Modo Igreja; usa músicas em memória e não escreve no Firestore. Os dez momentos litúrgicos permanecem na ordem fixa, inclusive posições vazias. A inspeção manual de PDF e downloads em navegadores ainda precisa ser feita.

## Firestore

Dados ficam em `usuarios/{uid}`: `musicas`, `playlists/{id}/itens`, `repertorios/{id}/itens` e `configuracoes/preferencias`. Listas usam subcoleções de itens. Não há catálogo público ou documentos globais no escopo atual. Veja o [modelo de dados](MODELO_DE_DADOS.md) e o [guia da integração](INTEGRACAO_FIRESTORE.md).

## Playlists manuais (T06)

`PlaylistsPage.tsx` oferece CRUD de playlists privadas, edição de nome/tipo, duplicação, inclusão e remoção de músicas existentes e edição do tom personalizado em cada item. Itens referenciam a música pelo ID e guardam posição, momento e tom personalizado; excluir playlist ou remover item não exclui documentos da Biblioteca. Referências cuja música foi excluída permanecem visíveis como indisponíveis até remoção manual.

`playlistRepository.ts` valida dados e UID, usa transações para inclusão, remoção e reordenação e lotes limitados para duplicação compensável. A reordenação pela interface aceita botões, setas do teclado e HTML drag-and-drop nativo; os botões permanecem como alternativa quando arrastar não estiver disponível. A lista é limitada a 400 itens por operação de mutação.

Playlists estruturadas de Igreja são documentos únicos com dez momentos canônicos. A v1 armazena `musicaId: string | null`; a v2 armazena `referenciaMusical: { musicaId: string } | null`. Ambas preservam os dez momentos na ordem fixa. Playlists legadas de Igreja continuam no formato T06, sem migração automática, e operações genéricas de itens/reordenação não devem alterar as estruturas.

O repository lê v1 e v2, mantém a versão ao duplicar uma playlist estruturada e copia os dez momentos sem consultar a existência de cada música, preservando posições vazias e referências órfãs. `copiadaDePlaylist` identifica a origem imediata da cópia. As Rules verificam a origem no mesmo caminho de UID, a igualdade do tipo, versão, chaves e conteúdo dos dez momentos no momento da criação. Depois disso, a cópia pode ser editada independentemente e continua válida se a origem for excluída.

A duplicação de música também grava o ID imediato em `duplicadaDe` e agora lê a origem e grava a cópia em uma transação. As Rules exigem a existência da origem no mesmo UID e igualdade de todos os campos musicais, exceto `duplicadaDe`, `createdAt` e `updatedAt`, na criação. A presença e o valor da referência ficam imutáveis depois da criação; as alterações musicais posteriores da cópia são independentes da origem.

Novas playlists estruturadas criadas pelo repository são v2. Entradas ainda recebidas em formato v1 são normalizadas para v2 durante uma nova criação; isso não migra documentos existentes. As Rules rejeitam nova criação estruturada v1, mas permitem leitura, edição e cópia v1→v1. Playlists planas/legadas e manuais da T06 continuam usando o formato simples e `itens/{musicaId}`.

Limitação: as Rules validam o formato das referências nos momentos, mas não consultam cada documento de música para verificar sua existência. O repository valida músicas ao criar ou alterar referências; cópias preservam os IDs armazenados, inclusive os órfãos.

O tema usa cache local para inicialização; a tela Configurações sincroniza preferências com o Firestore. Fonte e velocidade têm cache local separado por UID para Modo Palco.

## Validação e emulação

Testes de repositories e regras usam Firebase Emulator Suite. A suíte de Rules tem 45 testes e pode ser executada com o emulador ativo:

```bash
firebase emulators:exec --only firestore --project demo-pasta-de-musica-t03 "npx vitest run src/test/firestore-rules.test.ts --reporter=basic"
```

Os testes incluem cópias legítimas v1/v2, rejeição de origem ausente/de outro UID e conteúdo divergente em cada posição, imutabilidade dos campos de linhagem, edição independente, exclusão da origem, compatibilidade v1 e criação v2. A suíte também mantém os casos de segurança e persistência das playlists manuais/legadas.

A interface não se conecta automaticamente ao emulador. O Modo Igreja abre e edita playlists estruturadas v1 sem migrá-las, preservando a versão e atualizando somente os momentos alterados. Em v2, referências ausentes do catálogo são identificadas como históricas, permanecem no estado e só são removidas ou substituídas por ação explícita. As Rules limitam atualizações v1/v2 a no máximo um momento alterado por gravação; momentos não modificados, inclusive referências órfãs, são preservados. O Modo Barzinho gera seleções dinâmicas a partir da biblioteca real e salva playlists com itens ordenados. O Modo Palco carrega músicas reais da Biblioteca ou itens ordenados de playlists manuais e estruturadas de Igreja, usando os repositories existentes. Referências indisponíveis são ignoradas na fila de execução e informadas na tela; os documentos originais não são alterados.

## Modo Palco (T09)

`StageModePage.tsx` usa os parâmetros `musicaId` e `playlistId` na rota protegida `/palco`. A cifra é apresentada como texto literal monoespaçado em um contêiner rolável; a transposição é calculada somente para a apresentação e não grava alterações na música. Playlists manuais mantêm a ordem e o tom personalizado dos itens; playlists estruturadas de Igreja são lidas pelo contrato específico existente. Referências sem música correspondente são indicadas e omitidas da fila tocável.

`useAutoscroll.ts` avança a posição do contêiner com um único ciclo `requestAnimationFrame`, calculando o deslocamento pelo tempo decorrido e limitando intervalos longos para evitar saltos após inatividade. Pausa, reinício, fim da cifra e desmontagem cancelam o frame pendente. Velocidade e tamanho da fonte usam cache local separado por UID; posição de rolagem e transposição adicional são temporárias e não persistidas no Firestore. A validação automatizada cobre os controles e a apresentação. O usuário confirmou a inspeção visual e prática nos viewports 390×844, 844×390, 768×1024 e 1366×768.

O autoscroll interrompe e reinicia quando a rota troca a faixa. O contêiner do palco usa `100dvh` quando suportado, com fallback para `100vh`.

## Motor musical planejado (T11)

A T11 ainda não está implementada. O código existente em `src/features/stage-mode/chordTransposer.ts` já reconhece tokens de acordes por padrões textuais, transpõe linhas dedicadas e acordes entre colchetes e é usado pelo Modo Palco. Essa implementação não é ainda um motor musical reutilizável com acordes estruturados, análise tonal ou recomendação de capotraste.

O plano da T11 é extrair um núcleo TypeScript independente de React, Firebase e persistência, reutilizando a transposição existente e mantendo sua compatibilidade. A análise produzirá resultados derivados em memória: parser de acordes, estimativa de tonalidade com confiança/ambiguidade e candidatos de capotraste com critérios determinísticos documentados. A integração ao Modo Palco exibirá esses resultados sem substituir nem gravar sobre `musicas/{musicaId}.conteudoCifrado`. Tokens não reconhecidos devem permanecer intactos. O processamento será local, sem APIs externas; detalhes e critérios de aceite estão em `TASK.md`.

## Modo Barzinho (T08)

`BarModePage.tsx` implementa o gerador inteligente de repertório para apresentações e shows em barzinhos:
- Carrega as músicas reais da biblioteca do usuário via `listMusics()`.
- Oferece parâmetros interativos: estilo musical (extraído dinamicamente do catálogo e opção "Todos"), quantidade (slider de 5 a 40 músicas), preferência de tom (qualquer tom, tons graves C/D, médios E/F/G, altos A/B) e alternância de ritmo (animada vs. lenta).
- Executa a seleção e ordenação em memória via `generateBarRepertoire()` em `barModeGenerator.ts`, classificando andamentos heurísticamente (`classifyTempo()`) a partir de tags, observações, categorias e estilo, sem necessidade de campos adicionais no esquema ou chamadas extras ao Firestore.
- Garante total ausência de músicas fictícias ou alucinações (anti-hallucination). Deduplica rigorosamente os itens por ID.
- Exibe banner de aviso explícito caso o número de músicas compatíveis seja menor que o solicitado ou caso a biblioteca esteja vazia.
- Permite descarte manual de músicas individuais da prévia antes de salvar.
- Converte a seleção diretamente em uma playlist manual editável (`tipo: 'barzinho'`) através de `createPlaylistWithItems()`, validando a existência de todas as referências na biblioteca e persistindo o documento em `playlists/{playlistId}` e seus itens em lotes na subcoleção `itens/{musicaId}` com posições 1..N.

## Importação local de documentos (T05)

A importação aceita arquivos TXT, DOCX e PDF com camada de texto. O arquivo é lido e processado no navegador; não é enviado para APIs externas nem armazenado como binário no Firebase. A extração não executa OCR e PDFs digitalizados sem camada textual não são reconhecidos.

Em `src/features/import-music/`:

- `fileExtractors.ts` contém os extratores TXT, DOCX e PDF. TXT é decodificado como UTF-8; DOCX é lido localmente como OOXML com JSZip dentro de Worker; PDF.js ordena elementos por coordenadas e linha de base, detecta vales verticais centrais para separar duas colunas, calibra a grade por linhas textuais longas e infere estrofes pelas distâncias verticais. PDF proporcional e layouts complexos continuam sujeitos a estimativas.
- A leitura OOXML percorre parágrafos, runs, tabs, quebras e tabelas de `word/document.xml`. Parágrafos adjacentes viram uma quebra simples; parágrafos vazios permanecem vazios; tabelas são serializadas por coluna (uma coluna inteira antes da seguinte). Tabs explícitas são expandidas em paradas fixas de quatro colunas para exibição monoespaçada; sequências internas de espaços em linhas de acordes são comprimidas pelo fator 0,65, e um parágrafo vazio entre acorde e letra é removido; as posições dos acordes são recalibradas pela largura proporcional estimada da letra seguinte (letras estreitas/espaços 0,85; letras largas 1,15), mantendo espaço entre acordes. Tab stops personalizados e propriedades visuais do Word não são reproduzidos.
- `fileExtractorTypes.ts` define erros tipados usados pelos extratores e validações.
- `fileImportValidation.ts` verifica formato, tamanho e conteúdo, e carrega os extratores sob demanda. JSZip é carregado só para DOCX; PDF.js e seu worker só para PDF. O arquivo compactado e os parsers permanecem no dispositivo.
- `importMusicDraft.ts` define e valida o rascunho textual e seus metadados mínimos para trânsito entre as telas.

`ImportMusicPage.tsx` seleciona o arquivo, apresenta erros e a prévia editável e encaminha o texto, o nome original e o formato em estado de navegação. `LibraryPage.tsx` valida esse rascunho e preenche o formulário existente da T04; o salvamento continua explícito e usa o `musicRepository` atual. A música é gravada no mesmo modelo e fluxo da Biblioteca com `origemTipo: upload_local`, `arquivoNome` igual ao nome original e `driveFileId: null`. Somente texto editado e metadados seguem para a persistência; o arquivo binário não é armazenado.

Limites de tamanho, custos e limitações de fidelidade estão detalhados em [LIMITES_E_CUSTOS.md](LIMITES_E_CUSTOS.md).
