import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';

// Keep Entry eager - most common first page
import Entry from '../pages/Entry';

// After a deploy, a tab still running the old build asks for page chunks whose
// hashed filenames no longer exist, and the import fails. Reload once to pick up
// the new build instead of showing the router's error screen. The timestamp
// guard prevents a reload loop if the chunk is genuinely broken.
const CHUNK_RELOAD_KEY = 'brolay-chunk-reload-at';
const lazyWithReload = (importPage) => lazy(() =>
  importPage().catch((error) => {
    let lastReload = 0;
    try { lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0; } catch { /* storage blocked */ }

    if (Date.now() - lastReload > 10000) {
      try { sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now())); } catch { /* storage blocked */ }
      window.location.reload();
      return new Promise(() => {}); // keep Suspense fallback up while the page reloads
    }
    throw error;
  })
);

// Route-level code splitting - heavy pages loaded on demand
const Search = lazyWithReload(() => import('../pages/Search'));
const AllBrolays = lazyWithReload(() => import('../pages/AllBrolays'));
const AllPicks = lazyWithReload(() => import('../pages/AllPicks'));
const IndividualDashboard = lazyWithReload(() => import('../pages/IndividualDashboard'));
const GroupDashboard = lazyWithReload(() => import('../pages/GroupDashboard'));
const Payments = lazyWithReload(() => import('../pages/Payments'));
const Rankings = lazyWithReload(() => import('../pages/Rankings'));
const Grid = lazyWithReload(() => import('../pages/Grid'));
const Settings = lazyWithReload(() => import('../pages/Settings'));
const Import = lazyWithReload(() => import('../pages/Import'));
// Recommendations tab decommissioned — was the only active Odds API consumer

/**
 * Application router configuration using React Router v6
 *
 * Routes:
 * - / → redirects to /entry
 * - /entry → Brolay entry form
 * - /search → Search functionality
 * - /brolays → All Brolays calendar/list view
 * - /picks → All Picks view
 * - /individual → Individual player dashboard
 * - /group → Group dashboard
 * - /payments → Payment tracking
 * - /rankings → Player rankings
 * - /grid → Brolay grid view
 * - /settings → Application settings
 * - /import → Data import
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/entry" replace />
      },
      {
        path: 'entry',
        element: <Entry />
      },
      {
        path: 'search',
        element: <Search />
      },
      {
        path: 'brolays',
        element: <AllBrolays />
      },
      {
        path: 'picks',
        element: <AllPicks />
      },
      {
        path: 'individual',
        element: <IndividualDashboard />
      },
      {
        path: 'group',
        element: <GroupDashboard />
      },
      {
        path: 'payments',
        element: <Payments />
      },
      {
        path: 'rankings',
        element: <Rankings />
      },
      {
        path: 'grid',
        element: <Grid />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: 'import',
        element: <Import />
      },
      {
        path: '*',
        element: <Navigate to="/entry" replace />
      }
    ]
  }
]);

export default router;
