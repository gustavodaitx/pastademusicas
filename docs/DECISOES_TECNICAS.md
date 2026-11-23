# Decisões técnicas — estado implementado

Este registro descreve decisões da implementação atual T03.1–T03.6. Requisitos planejados para etapas futuras não devem ser interpretados como funcionalidades disponíveis. O guia operacional é [INTEGRACAO_FIRESTORE.md](INTEGRACAO_FIRESTORE.md).

## Firebase e autenticação

- Usar Firebase JavaScript SDK modular no cliente e manter Authentication existente com e-mail/senha.
- Usar Cloud Firestore no Firebase Spark, sem Functions, Scheduler, APIs pagas ou dependência de serviço de backend.
- Inicializar Auth e Firestore no mesmo app Firebase, por configuração `.env.local`.
- Usar UID da sessão como segmento do caminho para propriedade; não aceitar UID em dados de formulário.

## Dados e segurança

- Colocar músicas, playlists, repertórios e preferências sob `usuarios/{uid}`.
- Manter itens de listas em subcoleções e usar `musicaId` como ID do item para evitar duplicatas.
- Aplicar validação no repository para feedback e nas Security Rules como fronteira de confiança.
- Negar caminhos não declarados por padrão. Não há catálogo público, compartilhamento ou claims ADMIN nesta versão.
- Usar `serverTimestamp()` para timestamps de mutação e preservar criação em atualizações.

## Estado e interface

- Separar acesso Firestore em `src/services/*Repository.ts`.
- Fazer leituras pontuais sob demanda; não há listeners `onSnapshot` nem cache IndexedDB.
- Manter tema no `localStorage` para inicialização. A tela Configurações sincroniza com o documento privado; preferências de palco usam cache local por UID.
- Apresentar estados vazios/erros em telas conectadas. Os modos Igreja/Barzinho e seleção de cifra no Modo Palco ainda não são fluxos integrados completos.

## Custos e testes

- Listagens ainda não paginam nem aplicam `limit`, logo o custo cresce conforme os documentos e recargas aumentam. Paginação/cache devem preceder contas grandes.
- Operações de itens são limitadas a 400 por operação atômica nos repositories.
- Validar regras com Firebase Emulator Suite em ID `demo-*`; testes de regras são pulados sem `FIRESTORE_EMULATOR_HOST`.
- Consultar [limites do Firestore e execução local](INTEGRACAO_FIRESTORE.md) antes de preparar publicação ou mudanças de plano.

## Planejamento aprovado — T11 Motor Musical e Capotraste Inteligente

T10 permanece dedicado à exportação PDF e TXT conforme seus requisitos existentes. A tarefa seguinte, T11, planeja o motor musical reutilizável descrito em `TASK.md`; ela depende de T04, T06, T09 e da conclusão de T10. O motor será TypeScript puro e executado localmente, sem APIs externas pagas nem nova infraestrutura. Não se adicionará dependência externa sem justificativa técnica e aprovação.

A transposição atual do Modo Palco, em `src/features/stage-mode/chordTransposer.ts`, já existe e deve ser reutilizada/consolidada, não duplicada. Parser estruturado, identificação tonal com incerteza explícita e recomendação inteligente de capotraste ainda são requisitos futuros, não funcionalidades disponíveis. Todo processamento musical será derivado e em memória; `conteudoCifrado` original no Firestore não será sobrescrito.

Para manter IDs únicos após inserir T11, as antigas tarefas T11–T15 foram deliberadamente deslocadas para T12–T16 no `TASK.md`. Seus objetivos e dependências foram preservados e as referências/ranges afetados foram atualizados. Essa reorganização é documental e não indica implementação ou conclusão das tarefas.
