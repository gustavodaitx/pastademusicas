# Segurança — Pasta de Música

O arquivo [`firestore.rules`](../firestore.rules) é a fonte executável das regras atuais. Este resumo substitui o esboço conceitual antigo; consulte [INTEGRACAO_FIRESTORE.md](INTEGRACAO_FIRESTORE.md) para detalhes de implantação e testes.

## Controles implementados

- Acesso privado sob `usuarios/{uid}` somente quando `request.auth.uid == uid`.
- Perfil, músicas, playlists, repertórios e preferências validam campos permitidos, obrigatórios e tipos/tamanhos relevantes.
- `createdAt` é preservado em atualizações onde aplicável; `updatedAt` deve coincidir com `request.time`.
- Criar itens de playlist/repertório exige pai existente e música no mesmo UID; `musicaId` deve corresponder ao ID do documento. Atualizações de item não podem trocar a referência e ficam limitadas a `posicao`, `momento` e `tomPersonalizado`.
- Playlists estruturadas v1/v2 validam campos, versão, dez momentos e a ordem canônica por posições explícitas. V1 usa `musicaId`; v2 usa `referenciaMusical`. Atualizações podem mudar no máximo um momento; referências não modificadas não precisam existir, e uma referência nova ou substituída em atualização deve apontar para música do mesmo UID.
- Itens de playlist pertencem à associação e não alteram a música. A exclusão da música não apaga a associação existente, que continua legível e pode ser removida pelo dono da playlist.
- Caminhos sem regra específica são negados pela regra final `match /{document=**}`.
- O cliente Firebase Web não é uma fronteira de confiança; as regras são obrigatórias em produção.

## Linhagem de duplicação

- `duplicadaDe` registra o ID da música de origem imediata. Na criação, `validMusicCreate` consulta o caminho da origem sob o mesmo UID e compara os dados: só `duplicadaDe`, `createdAt` e `updatedAt` podem diferir. A referência não pode ser adicionada posteriormente nem alterada/removida em atualizações. O conteúdo musical da cópia pode ser editado independentemente; as Rules não consultam a origem em atualizações, portanto a exclusão posterior da origem não invalida a cópia.
- `duplicateMusic` lê a origem e grava a cópia numa transação do repository. A transação evita que uma alteração concorrente da origem entre a leitura e a gravação produza uma cópia com conteúdo diferente daquele lido.
- `copiadaDePlaylist` identifica a origem imediata de uma cópia estruturada. No momento da criação, as Rules consultam a playlist sob o mesmo UID e comparam tipo, versão, dez momentos, chaves e conteúdo de cada posição. V1 permanece v1 e v2 permanece v2. A cópia pode ser editada posteriormente sem igualdade contínua com a origem; sua linhagem é imutável e a exclusão da origem não a invalida.
- `duplicateStructuredChurchPlaylist` faz a leitura e criação em uma transação. As Rules não dependem dessa validação do cliente para verificar propriedade e igualdade no momento da gravação.
- A cópia preserva posições vazias e referências musicais órfãs. As Rules validam a forma da referência embutida, mas não consultam a existência de cada música. O repository valida novas referências em operações normais de criação/edição; a cópia deliberadamente mantém os valores já persistidos.
- Novas playlists estruturadas são persistidas em v2. As Rules rejeitam nova criação estruturada v1, mas suportam documentos v1 existentes para leitura, edição e cópia v1. Não há migração automática. O formato plano de playlists manuais/legadas da T06 permanece separado.

## Testes da T07.3

`src/test/firestore-rules.test.ts` cobre linhagem musical legítima e forjada, origem inexistente/de outro UID, imutabilidade, edição independente, exclusão da origem e documentos legados sem linhagem. Para playlists estruturadas, cobre cópia legítima v1/v2, origem ausente/de outro UID, divergência em cada uma das dez posições, momentos vazios, referências órfãs, imutabilidade, edição independente e exclusão da origem. Também verifica criação estruturada v2, rejeição de nova estrutura v1, leitura/edição v1, cópias que preservam a versão e bloqueio de mudança de versão. Os testes usam Firebase Emulator e cada comportamento de cópia tem casos positivos e negativos.

A T07.3 implementa os controles de linhagem e compatibilidade descritos. As Rules não exigem que músicas referenciadas em criações v2 ou em momentos não modificados continuem existindo, o que preserva referências históricas órfãs. O repository valida novas criações e alterações de referência; as Rules validam a existência de uma referência nova ou substituída durante atualização. Cópias preservam referências armazenadas. Atualizações v1/v2 são limitadas a no máximo um momento alterado por gravação.

## Fora do escopo atual

Não há catálogo público, permissões ADMIN/custom claims, compartilhamento de listas, Cloud Functions ou backend privilegiado. Nenhuma regra é publicada pelos comandos de teste. A publicação futura requer revisão e autorização explícitas, seguida dos testes locais descritos em [INTEGRACAO_FIRESTORE.md](INTEGRACAO_FIRESTORE.md#publicacao-futura-das-regras).

## Limitações de integridade

O Firestore não apaga subcoleções ao apagar um documento pai. Os repositories apagam itens explicitamente, mas regras do cliente não conseguem contar toda uma subcoleção para impedir exclusão direta do pai. Excluir uma música também não remove automaticamente referências de listas. Esses casos e seus impactos estão documentados em [limites e cuidados](INTEGRACAO_FIRESTORE.md#limites-e-cuidados-conhecidos).
