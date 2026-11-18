# Arquitetura atual — Pasta de Música

O projeto é uma SPA React/TypeScript executada no navegador. Authentication e Firestore usam o Firebase Web SDK configurado em `src/lib/firebase.ts`. Não há backend, Cloud Functions ou Scheduler.

## Camadas

- **Aplicação/rotas:** `src/app/router.tsx`; rotas privadas são envolvidas por `ProtectedRoute`.
- **Autenticação:** `AuthProvider` observa Firebase Authentication e mantém usuário/sessão. Nesta versão, o método implementado é e-mail/senha.
- **Apresentação:** `src/features/` contém Biblioteca, Playlists, Repertórios, Configurações e modos Igreja, Barzinho e Palco.
- **Persistência:** `src/services/` contém repositories com operações tipadas para músicas, playlists, repertórios e preferências. O UID vem de `auth.currentUser` em cada repository.
- **Segurança:** `firestore.rules` valida caminhos por UID e payloads; o último match nega caminhos não especificados.
- **Tipos:** modelos de documentos em `src/types/firestore.ts`.

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

A interface não se conecta automaticamente ao emulador. O Modo Igreja abre e edita playlists estruturadas v1 sem migrá-las, preservando a versão e atualizando somente os momentos alterados. Em v2, referências ausentes do catálogo são identificadas como históricas, permanecem no estado e só são removidas ou substituídas por ação explícita. As Rules limitam atualizações v1/v2 a no máximo um momento alterado por gravação; momentos não modificados, inclusive referências órfãs, são preservados. O Modo Barzinho gera seleções dinâmicas a partir da biblioteca real e salva playlists com itens ordenados. O Modo Palco atual não seleciona cifras. Não devem apresentar conteúdo de exemplo como persistido.

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

- `fileExtractors.ts` contém os extratores TXT, DOCX e PDF. TXT é decodificado como UTF-8; DOCX usa Mammoth para extrair texto bruto; PDF.js reconstitui linhas e espaços de forma heurística a partir da posição dos itens textuais.
- `fileExtractorTypes.ts` define erros tipados usados pelos extratores e validações.
- `fileImportValidation.ts` verifica formato, tamanho e conteúdo, e carrega os extratores/parsers sob demanda. Mammoth só é importado para DOCX e PDF.js/worker só para PDF.
- `importMusicDraft.ts` define e valida o rascunho textual e seus metadados mínimos para trânsito entre as telas.

`ImportMusicPage.tsx` seleciona o arquivo, apresenta erros e a prévia editável e encaminha o texto, o nome original e o formato em estado de navegação. `LibraryPage.tsx` valida esse rascunho e preenche o formulário existente da T04; o salvamento continua explícito e usa o `musicRepository` atual. A música é gravada no mesmo modelo e fluxo da Biblioteca com `origemTipo: upload_local`, `arquivoNome` igual ao nome original e `driveFileId: null`. Somente texto editado e metadados seguem para a persistência; o arquivo binário não é armazenado.

Limites de tamanho, custos e limitações de fidelidade estão detalhados em [LIMITES_E_CUSTOS.md](LIMITES_E_CUSTOS.md).
