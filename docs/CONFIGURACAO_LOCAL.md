# Configuração local — Pasta de Música

## Requisitos

- Node.js 20 ou 22 LTS e npm 10 ou superior.
- Java 21 ou superior somente para Firebase Emulator Suite.
- Firebase CLI somente para emuladores/publicação futura de regras.

Instale dependências e inicie a SPA:

```bash
npm install
npm run dev
```

## Projeto Firebase de desenvolvimento

Crie um projeto Firebase no plano Spark, um app Web e habilite Authentication por e-mail/senha. Crie o banco Cloud Firestore numa região apropriada. Copie `.env.example` para `.env.local`, preencha `VITE_FIREBASE_*` e reinicie o servidor Vite. O arquivo `.env.local` é local e não deve ser commitado. A SPA usa o projeto indicado nessas variáveis; não use credenciais de produção para testes que gravem dados.

As regras locais em `firestore.rules` não são publicadas pela execução da SPA, testes ou build. Leia [INTEGRACAO_FIRESTORE.md](INTEGRACAO_FIRESTORE.md) antes de configurar o Console ou publicar regras.

## Emulator Suite

O teste de regras requer JDK 21+ e Firebase CLI. O projeto `demo-pasta-de-musica-t03` é um ID local de demonstração. O comando inicia exclusivamente o emulador Firestore e executa a suíte completa, incluindo testes de regras sem skips:

```bash
firebase emulators:exec --only firestore --project demo-pasta-de-musica-t03 "npm test"
```

O Java pode ser configurado só no terminal que executa o CLI, sem trocar o Java global usado por outros projetos:

```powershell
$env:JAVA_HOME = 'C:\caminho\para\jdk-21'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
firebase emulators:exec --only firestore --project demo-pasta-de-musica-t03 "npm test"
```

O app Web não é conectado automaticamente ao emulador. Para proteção contra gravação em produção, não abra a SPA com `.env.local` real enquanto testar fluxo que altera dados. Consulte [Integração Firestore](INTEGRACAO_FIRESTORE.md#execucao-local-segura).

## Validação

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

Para regras, execute `npm test` por meio de `firebase emulators:exec` como acima; sem `FIRESTORE_EMULATOR_HOST`, o bloco de testes de regras é pulado.
