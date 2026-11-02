# Arquitetura atual — Pasta de Música

O projeto é uma SPA React/TypeScript executada no navegador. Authentication e Firestore usam o Firebase Web SDK configurado em `src/lib/firebase.ts`. Não há backend, Cloud Functions ou Scheduler.

## Camadas

- **Aplicação/rotas:** `src/app/router.tsx`; rotas privadas são envolvidas por `ProtectedRoute`.
- **Autenticação:** `AuthProvider` observa Firebase Authentication e mantém usuário/sessão. Nesta versão, o método implementado é e-mail/senha.
- **Apresentação:** `src/features/` contém Biblioteca, Playlists, Repertórios, Configurações e modos Igreja, Barzinho e Palco.
- **Persistência:** `src/services/` contém repositories com operações tipadas para músicas, playlists, repertórios e preferências. O UID vem de `auth.currentUser` em cada repository.
- **Segurança:** `firestore.rules` valida caminhos por UID e payloads; o último match nega caminhos não especificados.
- **Tipos:** modelos de documentos em `src/types/firestore.ts`.

## Firestore

Dados ficam em `usuarios/{uid}`: `musicas`, `playlists/{id}/itens`, `repertorios/{id}/itens` e `configuracoes/preferencias`. Listas usam subcoleções de itens. Não há catálogo público ou documentos globais no escopo atual. Veja o [modelo de dados](MODELO_DE_DADOS.md) e o [guia da integração](INTEGRACAO_FIRESTORE.md).

O tema usa cache local para inicialização; a tela Configurações sincroniza preferências com o Firestore. Fonte e velocidade têm cache local separado por UID para Modo Palco.

## Validação e emulação

Testes de repositories e regras usam Firebase Emulator Suite. O comando de validação completa é:

```bash
firebase emulators:exec --only firestore --project demo-pasta-de-musica-t03 "npm test"
```

A interface não se conecta automaticamente ao emulador. As telas de Modo Igreja/Barzinho ainda não carregam um repertório salvo integralmente; o Modo Palco atual não seleciona cifras. Não devem apresentar conteúdo de exemplo como persistido.
