import { createBrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
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
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

const protect = (element: ReactNode) => <ProtectedRoute>{element}</ProtectedRoute>;

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
        element: protect(<LibraryPage />),
      },
      {
        path: 'playlists',
        element: protect(<PlaylistsPage />),
      },
      {
        path: 'importar',
        element: protect(<ImportMusicPage />),
      },
      {
        path: 'modo-igreja',
        element: protect(<ChurchModePage />),
      },
      {
        path: 'modo-barzinho',
        element: protect(<BarModePage />),
      },
      {
        path: 'patrocinio',
        element: protect(<SponsorshipPage />),
      },
      {
        path: 'configuracoes',
        element: protect(<SettingsPage />),
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
    element: protect(<StageModePage />),
  },
]);
