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
    createdAt, updatedAt: Timestamp
  playlists/{playlistId}
    nome: string
    tipo: manual | igreja | barzinho
    createdAt, updatedAt: Timestamp
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

### Compatibilidade da Biblioteca

`compositor` e `observacoes` são opcionais. Documentos criados antes da inclusão desses campos continuam válidos e são exibidos sem metadados ausentes; não é necessária migração em massa. Escritas atuais representam campos opcionais vazios como `null`. Compositor tem limite de 200 caracteres e observações, 5.000 caracteres. Ambos são normalizados nas bordas do texto pelo repository, preservando acentos; observações preservam quebras de linha.

A busca da Biblioteca é feita no cliente sobre a lista já carregada e cobre título, artista, tags e conteúdo de letra/cifra. Ela ignora diferenças entre maiúsculas/minúsculas, acentos e espaços consecutivos. Os filtros locais de tom e categoria podem ser combinados com a busca. A cifra mantém fonte monoespaçada, quebras e espaços, com rolagem horizontal em telas estreitas para preservar alinhamento.

## Limites validados

As regras e repositories impõem limites de campos, listas e cifras, definidos em `firestore.rules` e nos serviços TypeScript. Operações de lista são limitadas no momento a 400 itens por transação para respeitar o teto de escritas. As consultas de listagem ainda não têm paginação; veja [custos e cuidados](INTEGRACAO_FIRESTORE.md#custo-e-carga).
