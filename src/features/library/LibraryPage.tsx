import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Music, Mic2, Heart, Tag } from 'lucide-react';

interface MockMusica {
  id: string;
  titulo: string;
  artista: string;
  tom: string;
  categoria: string;
  tags: string[];
}

const SAMPLE_SONGS: MockMusica[] = [
  {
    id: '1',
    titulo: 'Como Zaqueu (Entra na Minha Casa)',
    artista: 'Regis Danese',
    tom: 'G',
    categoria: 'Litúrgica',
    tags: ['Comunhão', 'Entrada', 'Adoração'],
  },
  {
    id: '2',
    titulo: 'Aleluia, A Minha Alma Abrirei',
    artista: 'Comunidade Católica',
    tom: 'D',
    categoria: 'Litúrgica',
    tags: ['Aclamação', 'Missa'],
  },
  {
    id: '3',
    titulo: 'O Sol',
    artista: 'Jota Quest',
    tom: 'A',
    categoria: 'Pop/Rock',
    tags: ['Barzinho', 'Animada', 'Acústico'],
  },
  {
    id: '4',
    titulo: 'Pais e Filhos',
    artista: 'Legião Urbana',
    tom: 'C',
    categoria: 'Rock Nacional',
    tags: ['Barzinho', 'Voz e Violão'],
  },
  {
    id: '5',
    titulo: 'Eis que Venho, Senhor',
    artista: 'Músicas para a Missa',
    tom: 'E',
    categoria: 'Litúrgica',
    tags: ['Ofertório', 'Missa'],
  },
  {
    id: '6',
    titulo: 'Tocando em Frente',
    artista: 'Almir Sater',
    tom: 'D',
    categoria: 'MPB / Regional',
    tags: ['Barzinho', 'Clássico'],
  },
];

export const LibraryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedKey, setSelectedKey] = useState('Todos');

  const categories = ['Todas', 'Litúrgica', 'Pop/Rock', 'Rock Nacional', 'MPB / Regional'];
  const keys = ['Todos', 'C', 'D', 'E', 'F', 'G', 'A', 'B'];

  const filteredSongs = SAMPLE_SONGS.filter((song) => {
    const matchesSearch =
      song.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artista.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCat = selectedCategory === 'Todas' || song.categoria === selectedCategory;
    const matchesKey = selectedKey === 'Todos' || song.tom === selectedKey;

    return matchesSearch && matchesCat && matchesKey;
  });

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Music className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Biblioteca de Músicas</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Explore seu catálogo de cifras, pesquise por tom ou adicione novas composições.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/importar"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Importar Arquivo
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Música</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por título, artista, tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Key Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:inline" />
            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Tom:</span>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {keys.map((k) => (
                <option key={k} value={k}>
                  {k === 'Todos' ? 'Todos os Tons' : `Tom ${k}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Music Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongs.map((song) => (
          <div
            key={song.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 shadow-sm transition-all flex flex-col justify-between group"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {song.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {song.artista}
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-mono font-bold">
                  Tom {song.tom}
                </span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                  {song.categoria}
                </span>
                {song.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium flex items-center gap-1"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between">
              <button
                type="button"
                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                title="Favoritar"
              >
                <Heart className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <Link
                  to="/palco"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors"
                >
                  <Mic2 className="w-3.5 h-3.5" />
                  <span>Palco</span>
                </Link>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  Ver Cifra
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
