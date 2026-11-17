# Integração Cloud Firestore

Status: cliente Firestore e persistência privada implementados nas etapas T03.1–T03.5. As regras deste repositório são locais até uma publicação explicitamente autorizada.

## Autenticação e propriedade

O Firebase Authentication existente é inicializado em `src/lib/firebase.ts` junto com o aplicativo Firebase nomeado. Os repositories usam `auth.currentUser.uid` internamente para formar caminhos; não recebem UID de formulário nem da rota. As rotas de dados estão protegidas por `ProtectedRoute` e as regras conferem o UID da sessão com o segmento `{uid}` do caminho.

## Estrutura atual

```text
usuarios/{uid}
  musicas/{musicaId}
  playlists/{playlistId}
    momentosIgreja: MomentoIgreja[10] (playlists estruturadas v1 ou v2)
    itens/{musicaId}
  repertorios/{repertorioId}
    itens/{musicaId}
  configuracoes/preferencias
```

Os documentos não repetem `uid` ou `proprietarioUid`: a propriedade é indicada pelo caminho privado. Os IDs dos itens de playlist/repertório são o ID da música e o campo `musicaId` deve coincidir com ele, evitando duplicatas no mesmo conjunto.

### Playlists estruturadas de Igreja (T07)

O documento principal de uma playlist estruturada contém `tipo: igreja`, `versaoEstrutura` 1 ou 2 e dez momentos na ordem canônica. V1 usa `musicaId: string | null`; v2 usa `referenciaMusical: { musicaId: string } | null`. `null` representa posição vazia. O ID aponta para `usuarios/{uid}/musicas/{musicaId}`; não se copia cifra ou metadado para o momento.

Novas criações estruturadas são persistidas em v2. A entrada do repository ainda pode chegar em formato v1 e é normalizada para v2 durante a criação; documentos já salvos não são convertidos. O repository e a tela permitem leitura e edição v1, preservando a versão e os dez momentos; uma cópia v1 permanece v1. Referências órfãs v2 são identificadas na tela e mantidas até remoção ou substituição explícita. As Rules limitam cada atualização a no máximo um momento alterado e preservam momentos não modificados, inclusive referências históricas. A estrutura plana das playlists manuais/legadas da T06 não é migrada nem alterada.

A duplicação estruturada lê a origem dentro de uma transação e grava `copiadaDePlaylist` com seu ID imediato. As Rules confirmam que a origem existe no caminho do mesmo UID e que tipo, versão, chaves e conteúdo dos dez momentos coincidem no momento da cópia. Momentos vazios, tons e referências órfãs são preservados. Após a criação, a cópia pode ser editada independentemente; excluir a origem não a invalida.

A duplicação de música também usa transação e registra a origem imediata em `duplicadaDe`. Na criação, as Rules consultam a música de origem no mesmo UID e comparam o conteúdo musical; somente `duplicadaDe`, `createdAt` e `updatedAt` podem diferir. Não é permitido adicionar, alterar ou remover `duplicadaDe` após criar o documento. Campos musicais da cópia podem ser editados independentemente e a origem pode ser excluída sem invalidá-la.

As Rules validam o esquema das referências embutidas, mas não consultam a existência de cada música nos momentos estruturados. O repository valida as músicas em novas criações e alterações de referência. Na cópia, não faz essa validação, para manter IDs órfãos já armazenados.

| Dados | Campos principais | Repository |
| --- | --- | --- |
| Música | título, artista, tom, cifra, listas de categorias/tags/estilos, `createdAt`, `updatedAt` | `musicRepository` |
| Playlist | nome, tipo, timestamps; itens com música, posição, momento e tom personalizado | `playlistRepository` |
| Repertório | nome, tipo, parâmetros de geração, timestamps; itens com a mesma forma básica de playlist | `repertoireRepository` |
| Preferências | tema (`claro`, `escuro`, `sistema`), fonte (10–72 px), autoscroll (1–10), `updatedAt` | `preferencesRepository` |

Criações e atualizações usam `serverTimestamp()`; as regras verificam que os timestamps de mutação correspondam ao horário da requisição (`request.time`). Os itens de listas ficam em subcoleções, não em arrays no documento pai. Preferências ausentes são criadas com `sistema`, 18 px e velocidade 3 na primeira leitura autenticada.
`momentosIgreja` é uma exceção delimitada para estruturas v1/v2: uma sequência fixa de dez posições, não uma lista de tamanho variável.

### Operações de playlist (T06)

- Criar/listar/editar/excluir playlists é restrito ao caminho do UID autenticado. A edição altera nome e tipo, preservando itens.
- Adicionar um item verifica a existência da playlist, da música do mesmo UID e a ausência de duplicata. Remover um item exclui somente a associação e compacta as posições. Excluir playlist remove explicitamente seus itens antes do pai; os documentos de música permanecem.
- O tom personalizado atualiza somente `tomPersonalizado` no item. Reordenação atualiza somente `posicao` dos itens e `updatedAt` do pai; drag-and-drop, teclado e botões chamam a mesma operação.
- Duplicar valida pai, itens e existência das músicas dentro de transação, cria um pai novo com sufixo “(cópia)” e grava itens em lotes de até 10, preservando posição, momento e tom personalizado. Se a gravação falhar, tenta excluir os itens escritos e o pai da cópia; falha também na compensação é sinalizada explicitamente. A origem não é alterada.
- Repositories limitam operações de lista a 400 itens. Em 400 itens, reordenar ou excluir a playlist grava no máximo 401 documentos na transação; a duplicação grava um pai e 400 itens em lotes pequenos. Esses fluxos usam leituras e gravações do Firestore e não têm paginação ou cache.

## Regras de segurança

`firestore.rules` restringe leituras e gravações ao dono do caminho, valida esquemas suportados e termina em negação global. Para cópias, as Rules validam a origem autorizada e a igualdade inicial; atualizações preservam imutáveis os campos de linhagem e a versão. Referências de momentos não modificados não precisam existir; em atualizações, referências novas ou substituídas são verificadas. A suíte de `src/test/firestore-rules.test.ts` tem 45 testes e cobre cópias válidas/forjadas, os dez momentos, compatibilidade v1/v2, rejeição de alterações simultâneas e os controles de propriedade. Sem `FIRESTORE_EMULATOR_HOST`, os testes são pulados por `describe.skipIf`.

Veja [SEGURANCA.md](SEGURANCA.md) para o detalhamento das garantias e da limitação de validação de referências.

## Console Firebase e variáveis

1. Crie um projeto Firebase no plano Spark e registre um aplicativo Web.
2. Habilite Authentication por e-mail/senha.
3. Crie o banco Cloud Firestore e selecione sua região. Não é necessário Cloud Functions, Scheduler, Storage ou billing para os fluxos implementados.
4. Copie a configuração Web para `.env.local` usando `.env.example` como referência.
5. Revise `firestore.rules`. Nenhum passo de desenvolvimento ou teste publica regras.

O SDK usa uma configuração de cliente. Não armazene service account, chave privada ou segredos de servidor em variáveis `VITE_*`.

## Execução local segura

Pré-requisitos: Node.js e npm do projeto, Firebase CLI e JDK 21 ou superior. A versão atual do CLI requer Java 21 para o emulador. Instale o JDK paralelamente ao Java de outros projetos e defina `JAVA_HOME` apenas no terminal da execução, se necessário.

```bash
firebase emulators:exec --only firestore --project demo-pasta-de-musica-t03 "npm test"
```

O ID `demo-pasta-de-musica-t03` é reservado ao ambiente de demonstração local. O comando inicia somente Firestore; os testes fornecem identidades autenticadas simuladas via Rules Unit Testing. `firebase.json` aponta o emulador para `firestore.rules`. O aplicativo web não chama `connectFirestoreEmulator` automaticamente e o teste de interface usa repositories simulados; não aponte a interface a um projeto real para testes destrutivos.

Para executar somente a suíte de Rules no PowerShell com o emulador já iniciado:

```powershell
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
npx vitest run src/test/firestore-rules.test.ts --reporter=basic
```

## Custo e carga

Não há listeners permanentes `onSnapshot`, Functions ou Scheduler. As leituras são pontuais (`getDoc`/`getDocs`). Listagens de músicas, playlists, repertórios e itens atualmente não usam paginação nem `limit`; o custo cresce com o número de documentos e com a frequência de recarga. A inclusão de um item também consulta a música referenciada. Monitore as cotas do Spark e implemente paginação/cache se as bibliotecas crescerem.

Conforme a [tabela oficial de cotas do Firestore](https://firebase.google.com/docs/firestore/quotas) verificada em 2026-11-02, o nível gratuito Standard documenta 1 GiB armazenado, 50.000 leituras/dia, 20.000 gravações/dia, 20.000 exclusões/dia e 10 GiB/mês de saída, para uma única base gratuita por projeto. Recursos como TTL, PITR e backups exigem billing. Spark não habilita pagamento por uso automaticamente; ultrapassar cotas pode interromper o acesso ao produto segundo as regras de uso do Spark. Consulte a [documentação de planos Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) antes de qualquer mudança de plano.

Operações de exclusão, remoção e reordenação de itens são transacionais. Repositories limitam listas a 400 itens por operação para manter as escritas abaixo do teto de 500 operações por transação/lote usado aqui.

## Limitações e cuidados conhecidos

- Excluir uma música não remove referências existentes em playlists e repertórios. A interface mostra o item como indisponível; a referência fica armazenada até remoção manual.
- Excluir um documento pai no Firestore não apaga automaticamente sua subcoleção. Os repositories fazem exclusão explícita dos itens antes do pai, mas as regras não conseguem enumerar/verificar uma subcoleção inteira para impedir que um cliente autenticado delete o pai diretamente. Isso pode deixar documentos órfãos inacessíveis e consumindo armazenamento. Não apague pais pelo Console sem conferir/limpar os itens.
- A exclusão de uma lista com mais de 400 itens requer uma estratégia futura em múltiplas transações; não remova o limite sem revisar atomicidade e cotas.
- Modo Igreja, Modo Barzinho e seleção de música no Modo Palco ainda não carregam repertórios/cifras do Firestore integralmente. A interface não deve tratar prévias fixas como dados persistidos.
- Preferências de tema podem ser alteradas pelo atalho da Navbar e ficam imediatamente no cache local. Para sincronizar o valor da conta, use Salvar preferências em Configurações. Preferências de fonte e autoscroll têm cache local separado por UID.

## Publicação futura das regras

Publicação não faz parte do fluxo local. Em uma futura janela autorizada, primeiro confirme o projeto/ambiente, revise o diff das regras e execute os testes do emulador. Só então uma pessoa autorizada pode publicar, por exemplo, com `firebase deploy --only firestore:rules --project <ID_DO_PROJETO>`. Esse comando altera o Firebase remoto e não foi executado nesta etapa.
