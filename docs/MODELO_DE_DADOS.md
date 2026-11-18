# Modelo de Dados Firestore — Pasta de Música

Este documento descreve o esquema implementado em T03. Para regras, repositories, execução local e limitações, consulte [INTEGRACAO_FIRESTORE.md](INTEGRACAO_FIRESTORE.md).

## Princípios

- Dados privados ficam dentro de `usuarios/{uid}`; `{uid}` é o UID do Firebase Authentication.
- O cliente não envia `uid`/`proprietarioUid` dentro dos documentos para estabelecer propriedade.
- IDs de músicas, playlists e repertórios são gerados pelo Firestore. Itens de playlist e repertório usam o ID da música para evitar duplicação.
- Timestamps são escritos pelos repositories com `serverTimestamp()`.
- Binários não são gravados no Firestore; cifra e metadados textuais são armazenados no documento de música.

## Esquema

```text
usuarios/{uid}
  musicas/{musicaId}
    titulo: string
    artista: string | null
    compositor?: string | null (máximo 200 caracteres)
    tomOriginal: string | null
    conteudoCifrado: string
    observacoes?: string | null (máximo 5.000 caracteres)
    categorias, tags, momentosLiturgicos, estilo: string[]
    origemTipo: catalogo | upload_local | google_drive | manual
    driveFileId, arquivoNome, licencaOuPermissao: string | null
    duplicadaDe?: string (ID da origem imediata, em cópia)
    createdAt, updatedAt: Timestamp
  playlists/{playlistId}
    nome: string
    tipo: manual | igreja | barzinho
    createdAt, updatedAt: Timestamp
    versaoEstrutura?: 1 | 2 (playlist de Igreja estruturada)
    momentosIgreja?: MomentoIgreja[10] (estrutura v1 ou v2)
    copiadaDePlaylist?: string (ID da playlist de origem, em cópia)
    itens/{musicaId}
      musicaId: string
      posicao: integer (1-based)
      momento, tomPersonalizado: string | null
  repertorios/{repertorioId}
    nome: string
    tipo: igreja | barzinho
    parametrosGeracao: map | null
    createdAt, updatedAt: Timestamp
    itens/{musicaId}
      musicaId: string
      posicao: integer (1-based)
      momento, tomPersonalizado: string | null
  configuracoes/preferencias
    tema: claro | escuro | sistema
    tamanhoFonte: number (10–72 px)
    velocidadeAutoscroll: number (1–10)
    updatedAt: Timestamp
```

O perfil em `usuarios/{uid}` tem tipo `UserProfile` e não é criado automaticamente pelas telas T03. Música, playlist, repertório e preferências são os documentos usados pelos fluxos implementados.

### Playlists (T06)

`playlists/{playlistId}` contém somente `nome`, `tipo` (`manual`, `igreja` ou `barzinho`) e timestamps. Cada `itens/{musicaId}` é um documento independente com `musicaId` igual ao ID da música, `posicao` inteira iniciada em 1, `momento` textual opcional (até 100 caracteres) e `tomPersonalizado` textual opcional (até 12 caracteres). O tom personalizado pertence à associação da música com a playlist; não altera `musicas/{musicaId}.tomOriginal`. A duplicação cria novo documento pai e novos documentos de item, preservando a sequência e os metadados; não copia nem modifica documentos da Biblioteca.

Uma música removida da Biblioteca pode deixar sua referência na playlist. A leitura preserva essa associação e a interface a apresenta como indisponível até que o usuário remova o item ou a playlist.

### Playlists estruturadas de Igreja (T07)

Uma playlist estruturada usa `tipo: igreja`, `versaoEstrutura` igual a `1` ou `2` e exatamente dez posições em `momentosIgreja`, na ordem canônica: `entrada`, `perdao`, `gloria`, `salmo`, `aclamacao`, `ofertorio`, `santo`, `comunhao`, `pos-comunhao`, `final`. Em v1, cada posição contém `momentoId`, `musicaId: string | null` e `tomPersonalizado: string | null`. Em v2, a referência é `referenciaMusical: { musicaId: string } | null`, junto com `momentoId` e `tomPersonalizado`. Posições vazias são representadas por `null`, sem documento de música fictício.

O repository identifica estruturas pela versão e pelos campos, rejeita estruturas inválidas/desconhecidas e não migra automaticamente playlists antigas de tipo Igreja. Novas playlists estruturadas são persistidas como v2; entradas de criação no formato v1 são normalizadas para v2, enquanto cópias e edições de documentos v1 mantêm v1. `createEmptyChurchMoments()` usa v2 por padrão. Playlists manuais e legadas continuam usando `itens/{musicaId}`.

`duplicadaDe` registra o ID imediato da música de origem. Na criação da cópia, as Rules exigem uma origem existente no mesmo UID e igualdade dos campos musicais, exceto a referência e os timestamps. Depois da criação, a linhagem é imutável, mas a cópia pode ser editada e não depende da existência continuada da origem.

`copiadaDePlaylist` registra o ID imediato da playlist de origem. As Rules exigem origem existente no mesmo UID, tipo e versão iguais e igualdade estrutural das chaves e conteúdo dos dez momentos, incluindo posições vazias, referências órfãs e tons. A igualdade é verificada somente na criação; depois, a cópia pode ser editada independentemente e permanece válida se a origem for excluída. Ambas as versões v1 e v2 são copiadas sem migração.

As Rules validam o formato das referências e, em atualizações, exigem existência para uma referência musical nova ou substituída; não exigem existência das referências não modificadas. O repository também valida referências novas. Atualizações estruturadas alteram no máximo um dos dez momentos por gravação; referências históricas órfãs e posições vazias permanecem intactas quando não modificadas.

### Playlists do Modo Barzinho (T08)

O gerador do Modo Barzinho cria playlists convencionais com `tipo: barzinho` utilizando a operação `createPlaylistWithItems()`. O documento principal em `playlists/{playlistId}` armazena `nome`, `tipo: 'barzinho'`, `createdAt` e `updatedAt`. As músicas selecionadas são gravadas em `playlists/{playlistId}/itens/{musicaId}` com `musicaId`, `posicao` sequencial (1 a N), `momento: null` e `tomPersonalizado: null`.

As músicas selecionadas provêm exclusivamente do catálogo real do usuário autenticado. A escrita dos itens é realizada em lotes atômicos de até 10 itens com rollback compensatório em caso de falha. As playlists geradas podem ser abertas, editadas, reordenadas e excluídas na tela de Playlists (`/playlists`), mantendo total compatibilidade com as regras de segurança e o formato manual da T06.

### Compatibilidade da Biblioteca

`compositor` e `observacoes` são opcionais. Documentos criados antes da inclusão desses campos continuam válidos e são exibidos sem metadados ausentes; não é necessária migração em massa. Escritas atuais representam campos opcionais vazios como `null`. Compositor tem limite de 200 caracteres e observações, 5.000 caracteres. Ambos são normalizados nas bordas do texto pelo repository, preservando acentos; observações preservam quebras de linha.

A busca da Biblioteca é feita no cliente sobre a lista já carregada e cobre título, artista, tags e conteúdo de letra/cifra. Ela ignora diferenças entre maiúsculas/minúsculas, acentos e espaços consecutivos. Os filtros locais de tom e categoria podem ser combinados com a busca. A cifra mantém fonte monoespaçada, quebras e espaços, com rolagem horizontal em telas estreitas para preservar alinhamento.

## Limites validados

As regras e repositories impõem limites de campos, listas e cifras, definidos em `firestore.rules` e nos serviços TypeScript. Operações de lista são limitadas no momento a 400 itens por transação para respeitar o teto de escritas. As consultas de listagem ainda não têm paginação; veja [custos e cuidados](INTEGRACAO_FIRESTORE.md#custo-e-carga).
