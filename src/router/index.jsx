import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';

// Keep Entry eager - most common first page
import Entry from '../pages/Entry';

// Route-level code splitting - heavy pages loaded on demand
const Search = lazy(() => import('../pages/Search'));
const AllBrolays = lazy(() => import('../pages/AllBrolays'));
const AllPicks = lazy(() => import('../pages/AllPicks'));
const IndividualDashboard = lazy(() => import('../pages/IndividualDashboard'));
const GroupDashboard = lazy(() => import('../pages/GroupDashboard'));
const Payments = lazy(() => import('../pages/Payments'));
const Rankings = lazy(() => import('../pages/Rankings'));
const Grid = lazy(() => import('../pages/Grid'));
const Settings = lazy(() => import('../pages/Settings'));
const Import = lazy(() => import('../pages/Import'));
const Recommendations = lazy(() => import('../pages/Recommendations'));

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
 * - /recommendations → AI-curated pick recommendations
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
        path: 'recommendations',
        element: <Recommendations />
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
