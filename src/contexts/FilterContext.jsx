import React, { createContext, useContext, useState } from 'react';

/**
 * FilterContext - Provides filter and search state
 *
 * Separated from BrolayContext so filter changes only re-render
 * components that depend on filters, not the entire app.
 */
const FilterContext = createContext(null);

/**
 * FilterProvider - Wraps the application and provides filter state
 */
export const FilterProvider = ({ children }) => {
  // Filter state - supports both old (placedBy) and new (submittedBy) schema
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    player: '',
    sport: '',
    teamPlayer: '',
    submittedBy: '',
    placedBy: '', // Legacy support
    minPayout: '',
    maxPayout: '',
    result: '',
    autoUpdated: '',
    betType: '',
    propType: ''
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Rankings-specific filters
  const [rankingsFilters, setRankingsFilters] = useState({
    dateFrom: '',
    dateTo: '',
    players: [], // Multi-select array
    sports: [], // Multi-select array
    minSampleSize: 10 // Default minimum sample size for combos
  });
  const [rankingsFiltersExpanded, setRankingsFiltersExpanded] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [searchCache, setSearchCache] = useState({});

  // Autocomplete suggestions
  const [showSuggestions, setShowSuggestions] = useState({});
  const [suggestions, setSuggestions] = useState([]);

  const value = {
    // Filter state (for AllBrolays, etc.)
    filters,
    setFilters,
    filtersExpanded,
    setFiltersExpanded,

    // Rankings filter state
    rankingsFilters,
    setRankingsFilters,
    rankingsFiltersExpanded,
    setRankingsFiltersExpanded,

    // Search state
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    lastSearchedQuery,
    setLastSearchedQuery,
    searchCache,
    setSearchCache,

    // Autocomplete suggestions
    showSuggestions,
    setShowSuggestions,
    suggestions,
    setSuggestions
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

/**
 * useFilterContext - Custom hook to access FilterContext
 * @returns {Object} Context value with filter state
 * @throws {Error} If used outside of FilterProvider
 */
export const useFilterContext = () => {
  const context = useContext(FilterContext);

  if (!context) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }

  return context;
};

export default FilterContext;
