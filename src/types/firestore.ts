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
  compositor?: string | null;
  tomOriginal: string | null;
  conteudoCifrado: string;
  observacoes?: string | null;
  categorias: string[];
  tags: string[];
  momentosLiturgicos: string[];
  estilo: string[];
  origemTipo: MusicOrigin;
  driveFileId: string | null;
  arquivoNome: string | null;
  licencaOuPermissao: string | null;
  duplicadaDe?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type PlaylistType = 'manual' | 'igreja' | 'barzinho';

export const MOMENTOS_IGREJA = [
  { id: 'entrada', nome: 'Entrada', descricao: 'Canto de acolhida e procissão de entrada' },
  { id: 'perdao', nome: 'Perdão', descricao: 'Ato Penitencial (Senhor, tende piedade)' },
  { id: 'gloria', nome: 'Glória', descricao: 'Hino de Louvor (Glória a Deus nas alturas)' },
  { id: 'salmo', nome: 'Salmo', descricao: 'Salmo Responsorial do dia' },
  { id: 'aclamacao', nome: 'Aclamação', descricao: 'Aclamação ao Evangelho (Aleluia)' },
  { id: 'ofertorio', nome: 'Ofertório', descricao: 'Apresentação das oferendas (pão e vinho)' },
  { id: 'santo', nome: 'Santo', descricao: 'Canto do Santo, Santo, Santo' },
  { id: 'comunhao', nome: 'Comunhão', descricao: 'Procissão da Eucaristia' },
  { id: 'pos-comunhao', nome: 'Pós-comunhão', descricao: 'Ação de graças e recolhimento' },
  { id: 'final', nome: 'Final', descricao: 'Canto de envio e bênção final' },
] as const;

export type MomentoIgrejaId = typeof MOMENTOS_IGREJA[number]['id'];

export type ChurchMusicReference = {
  musicaId: string;
};

export type MomentoIgrejaV1 = {
  momentoId: MomentoIgrejaId;
  musicaId: string | null;
  tomPersonalizado: string | null;
  referenciaMusical?: never;
};

export type MomentoIgrejaV2 = {
  momentoId: MomentoIgrejaId;
  referenciaMusical: ChurchMusicReference | null;
  tomPersonalizado: string | null;
  musicaId?: string | null;
};

export type MomentoIgreja = MomentoIgrejaV1 | MomentoIgrejaV2;

export type Playlist = {
  nome: string;
  tipo: PlaylistType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type PlaylistIgrejaV1 = Omit<Playlist, 'tipo'> & {
  tipo: 'igreja';
  versaoEstrutura: 1;
  momentosIgreja: MomentoIgrejaV1[];
  copiadaDePlaylist?: string;
};

export type PlaylistIgrejaV2 = Omit<Playlist, 'tipo'> & {
  tipo: 'igreja';
  versaoEstrutura: 2;
  momentosIgreja: MomentoIgrejaV2[];
  copiadaDePlaylist?: string;
};

export type PlaylistIgreja = PlaylistIgrejaV1 | PlaylistIgrejaV2;

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
