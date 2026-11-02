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
