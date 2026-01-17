import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Entry from '../pages/Entry';
import Search from '../pages/Search';
import AllBrolays from '../pages/AllBrolays';
import AllPicks from '../pages/AllPicks';
import IndividualDashboard from '../pages/IndividualDashboard';
import GroupDashboard from '../pages/GroupDashboard';
import Payments from '../pages/Payments';
import Rankings from '../pages/Rankings';
import Grid from '../pages/Grid';
import Settings from '../pages/Settings';
import Import from '../pages/Import';

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
      }
    ]
  }
]);

export default router;
