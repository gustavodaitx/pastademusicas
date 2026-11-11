# Integração Cloud Firestore

Status: cliente Firestore e persistência privada implementados nas etapas T03.1–T03.5. As regras deste repositório são locais até uma publicação explicitamente autorizada.

## Autenticação e propriedade

O Firebase Authentication existente é inicializado em `src/lib/firebase.ts` junto com o aplicativo Firebase nomeado. Os repositories usam `auth.currentUser.uid` internamente para formar caminhos; não recebem UID de formulário nem da rota. As rotas de dados estão protegidas por `ProtectedRoute` e as regras conferem o UID da sessão com o segmento `{uid}` do caminho.

## Estrutura atual

```text
usuarios/{uid}
  musicas/{musicaId}
  playlists/{playlistId}
    itens/{musicaId}
  repertorios/{repertorioId}
    itens/{musicaId}
  configuracoes/preferencias
```

Os documentos não repetem `uid` ou `proprietarioUid`: a propriedade é indicada pelo caminho privado. Os IDs dos itens de playlist/repertório são o ID da música e o campo `musicaId` deve coincidir com ele, evitando duplicatas no mesmo conjunto.

| Dados | Campos principais | Repository |
| --- | --- | --- |
| Música | título, artista, tom, cifra, listas de categorias/tags/estilos, `createdAt`, `updatedAt` | `musicRepository` |
| Playlist | nome, tipo, timestamps; itens com música, posição, momento e tom personalizado | `playlistRepository` |
| Repertório | nome, tipo, parâmetros de geração, timestamps; itens com a mesma forma básica de playlist | `repertoireRepository` |
| Preferências | tema (`claro`, `escuro`, `sistema`), fonte (10–72 px), autoscroll (1–10), `updatedAt` | `preferencesRepository` |

Criações e atualizações usam `serverTimestamp()`; as regras verificam que os timestamps de mutação correspondam ao horário da requisição (`request.time`). Os itens de listas ficam em subcoleções, não em arrays no documento pai. Preferências ausentes são criadas com `sistema`, 18 px e velocidade 3 na primeira leitura autenticada.

### Operações de playlist (T06)

- Criar/listar/editar/excluir playlists é restrito ao caminho do UID autenticado. A edição altera nome e tipo, preservando itens.
- Adicionar um item verifica a existência da playlist, da música do mesmo UID e a ausência de duplicata. Remover um item exclui somente a associação e compacta as posições. Excluir playlist remove explicitamente seus itens antes do pai; os documentos de música permanecem.
- O tom personalizado atualiza somente `tomPersonalizado` no item. Reordenação atualiza somente `posicao` dos itens e `updatedAt` do pai; drag-and-drop, teclado e botões chamam a mesma operação.
- Duplicar valida pai, itens e existência das músicas dentro de transação, cria um pai novo com sufixo “(cópia)” e grava itens em lotes de até 10, preservando posição, momento e tom personalizado. Se a gravação falhar, tenta excluir os itens escritos e o pai da cópia; falha também na compensação é sinalizada explicitamente. A origem não é alterada.
- Repositories limitam operações de lista a 400 itens. Em 400 itens, reordenar ou excluir a playlist grava no máximo 401 documentos na transação; a duplicação grava um pai e 400 itens em lotes pequenos. Esses fluxos usam leituras e gravações do Firestore e não têm paginação ou cache.

## Regras de segurança

`firestore.rules` restringe leituras e gravações ao dono do caminho, valida campos obrigatórios/tipos/tamanhos, preserva timestamps de criação imutáveis em atualizações e termina em negação global. Música, playlist, repertório, perfil e preferências não podem ser acessados anonimamente ou por outro UID. Itens de lista exigem pai existente e música da mesma conta; seu `musicaId` não pode ser trocado numa atualização.

Os testes de regras estão em `src/test/firestore-rules.test.ts`. Eles cobrem usuário autenticado/anônimo, acesso cruzado, payloads inválidos, referências de músicas inválidas, campos desconhecidos e operações de repositories. `describe.skipIf` pula essa parte se o emulador não estiver ativo; por isso, execute o comando de Emulator Suite abaixo para uma validação completa sem skips.

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
