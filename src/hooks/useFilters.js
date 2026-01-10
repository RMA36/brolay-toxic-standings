import { useState, useMemo } from 'react';

/**
 * Custom hook for managing filter state across the application
 * Handles filtering by sport, Big Guy, status, date range, and search query
 */
export const useFilters = () => {
  const [sportFilter, setSportFilter] = useState('All');
  const [playerFilter, setPlayerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [searchQuery, setSearchQuery] = useState('');

  // Clear all filters
  const clearFilters = () => {
    setSportFilter('All');
    setPlayerFilter('All');
    setStatusFilter('All');
    setDateFilter('All Time');
    setSearchQuery('');
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return sportFilter !== 'All' || 
           playerFilter !== 'All' || 
           statusFilter !== 'All' || 
           dateFilter !== 'All Time' || 
           searchQuery.trim() !== '';
  }, [sportFilter, playerFilter, statusFilter, dateFilter, searchQuery]);

  return {
    // Filter state
    sportFilter,
    playerFilter,
    statusFilter,
    dateFilter,
    searchQuery,
    
    // Filter setters
    setSportFilter,
    setPlayerFilter,
    setStatusFilter,
    setDateFilter,
    setSearchQuery,
    
    // Utilities
    clearFilters,
    hasActiveFilters,
  };
};
