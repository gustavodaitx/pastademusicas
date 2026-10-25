# Diretrizes de Segurança — PDS Pasta de Música

Data: 2026-10-25  
Versão: 1.0  

---

## 1. Princípios Fundamentais

1. **Princípio do Menor Privilégio**: Por padrão, nenhum acesso de gravação é concedido sem autenticação e verificação explícita de propriedade (`proprietarioUid == request.auth.uid`).
2. **Sem Regras Abertas**: Sob nenhuma hipótese o arquivo `firestore.rules` conterá regras permissivas como `allow read, write: if true;`.
3. **Privacidade de Dados de Usuários**:
   - Músicas privadas de um usuário (`visibilidade == 'privada'`) jamais podem ser lidas ou editadas por outro usuário comum.
   - Playlists privadas pertencem estritamente ao criador.
4. **Proteção do Perfil ADMIN**:
   - Um usuário **não** pode se autopromover a ADMIN alterando o campo `perfil` no documento `usuarios/{uid}`.
   - Privilégios administrativos no Firestore são validados via Firebase Custom Claims (`request.auth.token.admin == true`) ou via coleção de controle restrita com gravação bloqueada no cliente.
   - Não existe botão ou interface pública para autoatribuição de perfil administrativo.
5. **Proteção de Segredos e Tokens**:
   - Nenhum Client Secret, chave privada de serviço ou token OAuth é commitado no repositório Git ou exposto no bundle do frontend.
   - Tokens de acesso do Google Drive Picker são mantidos apenas em memória volátil durante a sessão do usuário e descartados após o uso.
6. **Tratamento de Arquivos Não Confiáveis**:
   - Arquivos `.docx`, `.pdf` e `.txt` enviados pelo usuário são processados localmente no navegador via bibliotecas seguras (Mammoth, PDF.js, FileReader).
   - Nenhuma macro ou script embutido em documentos é executado.
   - O conteúdo textual é sanitizado antes de ser renderizado na tela para evitar ataques de Cross-Site Scripting (XSS).

---

## 2. Esboço das Regras de Segurança do Firestore (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Funções auxiliares de autorização
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && request.auth.token.admin == true;
    }

    // Regras para perfil de usuário
    match /usuarios/{uid} {
      allow read: if isAuthenticated();
      allow create: if isOwner(uid) && request.resource.data.perfil == 'FREE';
      allow update: if isOwner(uid) && request.resource.data.perfil == resource.data.perfil;
      allow delete: if false; // Exclusão somente por processo administrativo
    }

    // Regras para músicas
    match /musicas/{musicaId} {
      // Leitura permitida se pública ou se for o proprietário
      allow read: if resource.data.visibilidade == 'publica' || isOwner(resource.data.proprietarioUid);
      
      // Criação: usuário comum só cria música própria com visibilidade privada
      allow create: if isAuthenticated() && 
                    ((request.resource.data.visibilidade == 'privada' && request.resource.data.proprietarioUid == request.auth.uid) ||
                     (request.resource.data.visibilidade == 'publica' && isAdmin()));
                     
      // Edição: proprietário pode editar suas músicas privadas; admin pode editar públicas
      allow update: if (isOwner(resource.data.proprietarioUid) && request.resource.data.proprietarioUid == resource.data.proprietarioUid) ||
                    (resource.data.visibilidade == 'publica' && isAdmin());
                    
      // Exclusão: proprietário exclui suas músicas; admin exclui públicas
      allow delete: if isOwner(resource.data.proprietarioUid) || (resource.data.visibilidade == 'publica' && isAdmin());
    }

    // Regras para playlists
    match /playlists/{playlistId} {
      allow read: if isOwner(resource.data.proprietarioUid);
      allow create: if isAuthenticated() && request.resource.data.proprietarioUid == request.auth.uid;
      allow update: if isOwner(resource.data.proprietarioUid) && request.resource.data.proprietarioUid == resource.data.proprietarioUid;
      allow delete: if isOwner(resource.data.proprietarioUid);
    }

    // Regras para categorias
    match /categorias/{categoriaId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Regras para patrocínios informados
    match /patrocinios/{patrocinioId} {
      allow create: if isAuthenticated();
      allow read, update, delete: if isAdmin();
    }
  }
}
```
