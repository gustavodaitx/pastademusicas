import { describe, expect, it } from 'vitest';
import { createPlaylistRepository } from '../services/playlistRepository';

describe('barPlaylistRepository (createPlaylistWithItems)', () => {
  it('rejects invalid or empty playlist names', async () => {
    const repository = createPlaylistRepository({} as never, () => 'user-1');

    await expect(repository.createPlaylistWithItems({ nome: '   ', musicIds: [] })).rejects.toMatchObject({
      code: 'validation/required',
    });
    await expect(repository.createPlaylistWithItems({ nome: 'a'.repeat(121), musicIds: [] })).rejects.toMatchObject({
      code: 'validation/too-long',
    });
  });

  it('rejects church type directing to specific church operations', async () => {
    const repository = createPlaylistRepository({} as never, () => 'user-1');

    await expect(
      repository.createPlaylistWithItems({ nome: 'Igreja', tipo: 'igreja', musicIds: [] }),
    ).rejects.toMatchObject({
      code: 'validation/type',
    });
  });

  it('rejects duplicate musicIds in the list', async () => {
    const repository = createPlaylistRepository({} as never, () => 'user-1');

    await expect(
      repository.createPlaylistWithItems({ nome: 'Barzinho', musicIds: ['song-1', 'song-1'] }),
    ).rejects.toMatchObject({
      code: 'validation/duplicate',
    });
  });

  it('rejects invalid music ID format', async () => {
    const repository = createPlaylistRepository({} as never, () => 'user-1');

    await expect(
      repository.createPlaylistWithItems({ nome: 'Barzinho', musicIds: ['song/invalid'] }),
    ).rejects.toMatchObject({
      code: 'validation/id',
    });
  });

  it('rejects lists exceeding 400 items', async () => {
    const repository = createPlaylistRepository({} as never, () => 'user-1');
    const tooMany = Array.from({ length: 401 }, (_, i) => `song-${i}`);

    await expect(
      repository.createPlaylistWithItems({ nome: 'Barzinho', musicIds: tooMany }),
    ).rejects.toMatchObject({
      code: 'validation/too-many-items',
    });
  });

  it('rejects unauthenticated user', async () => {
    const repository = createPlaylistRepository({} as never, () => null);

    await expect(
      repository.createPlaylistWithItems({ nome: 'Barzinho', musicIds: ['song-1'] }),
    ).rejects.toMatchObject({
      code: 'auth/unauthenticated',
    });
  });
});
