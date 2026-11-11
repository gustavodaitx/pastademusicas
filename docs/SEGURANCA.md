# Segurança — Pasta de Música

O arquivo [`firestore.rules`](../firestore.rules) é a fonte executável das regras atuais. Este resumo substitui o esboço conceitual antigo; consulte [INTEGRACAO_FIRESTORE.md](INTEGRACAO_FIRESTORE.md) para detalhes de implantação e testes.

## Controles implementados

- Acesso privado sob `usuarios/{uid}` somente quando `request.auth.uid == uid`.
- Perfil, músicas, playlists, repertórios e preferências validam campos permitidos, obrigatórios e tipos/tamanhos relevantes.
- Campos `createdAt` e dados de perfil imutáveis são protegidos em atualizações onde aplicável; timestamps de mutação devem coincidir com `request.time`.
- Criar itens de playlist/repertório exige pai existente e música no mesmo UID; `musicaId` deve corresponder ao ID do documento. Atualizações de item não podem trocar a referência e ficam limitadas a `posicao`, `momento` e `tomPersonalizado`.
- Itens de playlist pertencem à associação e não alteram a música. A exclusão da música não apaga a associação existente, que continua legível e pode ser removida pelo dono da playlist.
- Caminhos sem regra específica são negados pela regra final `match /{document=**}`.
- O cliente Firebase Web não é uma fronteira de confiança; as regras são obrigatórias em produção.

## Fora do escopo atual

Não há catálogo público, permissões ADMIN/custom claims, compartilhamento de listas, Cloud Functions ou backend privilegiado. Nenhuma regra é publicada pelos comandos de teste. A publicação futura requer revisão e autorização explícitas, seguida dos testes locais descritos em [INTEGRACAO_FIRESTORE.md](INTEGRACAO_FIRESTORE.md#publicacao-futura-das-regras).

## Limitações de integridade

O Firestore não apaga subcoleções ao apagar um documento pai. Os repositories apagam itens explicitamente, mas regras do cliente não conseguem contar toda uma subcoleção para impedir exclusão direta do pai. Excluir uma música também não remove automaticamente referências de listas. Esses casos e seus impactos estão documentados em [limites e cuidados](INTEGRACAO_FIRESTORE.md#limites-e-cuidados-conhecidos).
