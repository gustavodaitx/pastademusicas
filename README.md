# Pasta de Música

Aplicação web responsiva para organizar cifras privadas, playlists, repertórios e preferências de palco. A persistência usa Firebase Authentication e Cloud Firestore no plano Spark. O projeto não usa Cloud Functions, Cloud Scheduler, pagamentos ou catálogo público.

## Funcionalidades conectadas

- Cadastro, login, logout, recuperação de senha e proteção de rotas com Firebase Authentication.
- Biblioteca privada com cadastro, consulta, edição e exclusão de músicas no Firestore.
- Playlists e repertórios privados com inclusão, remoção e ordenação de músicas da biblioteca.
- Preferências privadas de tema, tamanho da fonte e velocidade de autoscroll.
- Preferências de tema disponíveis no `localStorage` para inicialização local; fonte e velocidade ficam em cache local por UID.
- Importação local de TXT, DOCX e PDF textual: extração e pré-visualização editável no navegador, com encaminhamento do texto ao formulário existente da Biblioteca para revisão e salvamento explícito. Os arquivos binários não são armazenados.

Os modos Igreja, Barzinho e Palco ainda não selecionam e carregam repertórios/músicas salvos como uma experiência completa. Eles não exibem dados fixos como conteúdo persistido. Consulte [Limitações](docs/INTEGRACAO_FIRESTORE.md#limites-e-cuidados).

## Stack e scripts

- React, TypeScript, Vite, Tailwind CSS e React Router.
- Firebase JavaScript SDK modular.
- Vitest, React Testing Library e Firebase Emulator Suite.

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

## Configuração Firebase

Crie um projeto Firebase no plano Spark e um aplicativo Web. Em **Authentication > Sign-in method**, habilite **E-mail/senha**. Crie o banco Cloud Firestore no projeto e escolha uma região. Copie `.env.example` para `.env.local` e preencha as variáveis `VITE_FIREBASE_*` com a configuração do aplicativo. Não coloque segredos de servidor nesse arquivo; as credenciais Web são configuração de cliente e `.env.local` não deve ser commitado.

As regras estão em [`firestore.rules`](firestore.rules), mas não são publicadas automaticamente. Revise-as antes de qualquer publicação autorizada. O guia completo está em [Integração Firestore](docs/INTEGRACAO_FIRESTORE.md) e [Configuração local](docs/CONFIGURACAO_LOCAL.md).

## Testes locais com Emulator Suite

Instale Firebase CLI e Java 21 ou superior. O script abaixo usa apenas o emulador Firestore e um ID `demo-*`; não acessa dados reais nem serviços Firebase não emulados:

```bash
firebase emulators:exec --only firestore --project demo-pasta-de-musica-t03 "npm test"
```

Os testes de regras ficam em `src/test/firestore-rules.test.ts`. O aplicativo web não se conecta automaticamente ao emulador; não use um `.env.local` de produção para experimentos de interface que gravem dados.

## Documentação

- [Integração Firestore, regras e limitações](docs/INTEGRACAO_FIRESTORE.md)
- [Modelo de dados](docs/MODELO_DE_DADOS.md)
- [Diretrizes de segurança](docs/SEGURANCA.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [Limites e custos](docs/LIMITES_E_CUSTOS.md)
- [Configuração local](docs/CONFIGURACAO_LOCAL.md)
- [Plano de tarefas](TASK.md)
