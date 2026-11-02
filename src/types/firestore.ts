import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  nome: string;
  email: string;
  perfil: 'FREE';
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type MusicOrigin = 'catalogo' | 'upload_local' | 'google_drive' | 'manual';

export type Music = {
  titulo: string;
  artista: string | null;
  tomOriginal: string | null;
  conteudoCifrado: string;
  categorias: string[];
  tags: string[];
  momentosLiturgicos: string[];
  estilo: string[];
  origemTipo: MusicOrigin;
  driveFileId: string | null;
  arquivoNome: string | null;
  licencaOuPermissao: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type PlaylistType = 'manual' | 'igreja' | 'barzinho';

export type Playlist = {
  nome: string;
  tipo: PlaylistType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type PlaylistItem = {
  musicaId: string;
  posicao: number;
  momento: string | null;
  tomPersonalizado: string | null;
};

export type RepertoireType = 'igreja' | 'barzinho';

export type Repertoire = {
  nome: string;
  tipo: RepertoireType;
  parametrosGeracao: Record<string, string | number | boolean> | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type RepertoireItem = {
  musicaId: string;
  posicao: number;
  momento: string | null;
  tomPersonalizado: string | null;
};

export type UserPreferences = {
  tema: 'claro' | 'escuro' | 'sistema';
  tamanhoFonte: number;
  velocidadeAutoscroll: number;
  updatedAt: Timestamp;
};
