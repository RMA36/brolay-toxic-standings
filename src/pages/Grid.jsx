import React from 'react';
import { useBrolayContext } from '../contexts/BrolayContext';
import BrolayGrid from '../components/dashboard/BrolayGrid';
import { applyFilters } from '../utils/actionHandlers';

/**
 * Grid - Grid view of all brolays showing player matchups
 */
const Grid = () => {
  const { parlays, players, filters, editingParlay } = useBrolayContext();

  const filteredParlays = applyFilters([...parlays], filters, editingParlay?.id);

  return <BrolayGrid parlays={filteredParlays} players={players} />;
};

export default Grid;
