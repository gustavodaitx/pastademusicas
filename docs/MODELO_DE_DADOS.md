# Modelo de Dados Firestore — PDS Pasta de Música

Data: 2026-10-25  
Versão: 1.0  

---

## 1. Princípios de Modelagem
- **IDs autogerados**: Todos os documentos utilizam identificadores únicos gerados pelo Firestore (`doc.id`), exceto a coleção `usuarios` cujo ID é o próprio `uid` do Firebase Authentication.
- **Auditoria**: Documentos contêm timestamps de criação (`createdAt`) e atualização (`updatedAt`).
- **Validação de Payload**: Limitação do tamanho do texto das cifras e de arrays no frontend para proteção das cotas de 1 MB por documento.
- **Armazenamento de Binários**: **Proibido**. Arquivos PDF e DOCX nunca são armazenados brutos no banco; apenas texto extraído e metadados.

---

## 2. Coleções e Esquemas

### 2.1 `usuarios/{uid}`
Representa o perfil do usuário na aplicação.
```typescript
interface Usuario {
  uid: string;
  nome: string;
  email: string;
  perfil: "ADMIN" | "FREE"; // Informativo no documento; privilégios reais verificados por claims
  preferencias: {
    tema: "claro" | "escuro" | "sistema";
    tamanhoFonte: number;         // Padrão em pixels (ex: 18)
    velocidadeAutoscroll: number; // Nível de 1 a 10 (ex: 3)
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.2 `musicas/{musicaId}`
Armazena as músicas cifradas e seus metadados.
```typescript
interface Musica {
  id?: string;
  titulo: string;
  artista: string | null;
  tomOriginal: string | null;            // Ex: "C", "F#m", "Bb"
  conteudoCifrado: string;               // Letra com acordes monoespaçados
  categorias: string[];                  // Ex: ["Litúrgica", "MPB", "Rock"]
  tags: string[];                        // Ex: ["Missa", "Comunhão", "Voz e Violão"]
  momentosLiturgicos: string[];          // Ex: ["Comunhão", "Entrada"]
  estilo: string[];                      // Ex: ["Lenta", "Animada", "Balada"]
  origemTipo: "catalogo" | "upload_local" | "google_drive" | "manual";
  proprietarioUid: string | null;        // null para catálogo público (gerenciado por ADMIN)
  visibilidade: "publica" | "privada";
  driveFileId: string | null;            // ID do arquivo no Google Drive se importado via Picker
  arquivoNome: string | null;            // Nome do arquivo original
  licencaOuPermissao: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.3 `playlists/{playlistId}`
Armazena as listas de músicas do usuário ou públicas.
```typescript
interface ItemPlaylist {
  musicaId: string;
  posicao: number;                       // 1, 2, 3...
  momento: string | null;                // Nome do momento litúrgico quando aplicável
  tomPersonalizado: string | null;       // Tom específico para esta playlist
}

interface Playlist {
  id?: string;
  nome: string;
  tipo: "manual" | "igreja" | "barzinho";
  proprietarioUid: string;
  visibilidade: "privada" | "compartilhada";
  itens: ItemPlaylist[];
  parametrosGeracao?: {
    estilo?: string;
    quantidade?: number;
    preferenciaTom?: string;
  } | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.4 `categorias/{categoriaId}`
Categorias administrativas para classificação do catálogo.
```typescript
interface Categoria {
  id?: string;
  nome: string;
  tipo: "publica" | "pessoal";
  proprietarioUid: string | null;
  ativa: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.5 `patrocinios/{patrocinioId}`
Registro informativo e voluntário de apoio via Pix.
```typescript
interface Patrocinio {
  id?: string;
  usuarioUid?: string | null;
  valorInformado: number | null;
  status: "informado" | "confirmado_manualmente";
  referencia: string | null;
  createdAt: Timestamp;
}
```
*Atenção: Nenhum dado bancário sensível ou cartão de crédito é registrado neste esquema.*
