import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LibraryPage } from '../features/library/LibraryPage';
import { PlaylistsPage } from '../features/playlists/PlaylistsPage';
import { ImportMusicPage } from '../features/import-music/ImportMusicPage';
import { ChurchModePage } from '../features/church-mode/ChurchModePage';
import { BarModePage } from '../features/bar-mode/BarModePage';
import { StageModePage } from '../features/stage-mode/StageModePage';
import { SponsorshipPage } from '../features/sponsorship/SponsorshipPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { LoginPage } from '../features/auth/LoginPage';
import { NotFoundPage } from '../features/not-found/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'biblioteca',
        element: <LibraryPage />,
      },
      {
        path: 'playlists',
        element: <PlaylistsPage />,
      },
      {
        path: 'importar',
        element: <ImportMusicPage />,
      },
      {
        path: 'modo-igreja',
        element: <ChurchModePage />,
      },
      {
        path: 'modo-barzinho',
        element: <BarModePage />,
      },
      {
        path: 'patrocinio',
        element: <SponsorshipPage />,
      },
      {
        path: 'configuracoes',
        element: <SettingsPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  {
    // Stage mode runs full viewport with its own custom stage header
    path: 'palco',
    element: <StageModePage />,
  },
]);
