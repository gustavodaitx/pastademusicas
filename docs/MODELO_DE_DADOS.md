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
    tomOriginal: string | null
    conteudoCifrado: string
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

## Limites validados

As regras e repositories impõem limites de campos, listas e cifras, definidos em `firestore.rules` e nos serviços TypeScript. Operações de lista são limitadas no momento a 400 itens por transação para respeitar o teto de escritas. As consultas de listagem ainda não têm paginação; veja [custos e cuidados](INTEGRACAO_FIRESTORE.md#custo-e-carga).
