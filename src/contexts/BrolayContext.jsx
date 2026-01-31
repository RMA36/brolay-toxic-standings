import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { getFirestore, deleteField } from 'firebase/firestore';
import { useBrolays } from '../hooks/useBrolays';
import { useESPN } from '../hooks/useESPN';
import { useESPNTeams } from '../hooks/useESPNTeams';
import { useStats } from '../hooks/useStats';
import { useOdds } from '../hooks/useOdds';
import { getCurrentETDate } from '../utils/formatters';
import { findMoneyMaker, findDangerZone, getCurrentDayOfWeek, getCurrentSportsInSeason, getSeasonalTip } from '../insightsHelper';
import { PRELOADED_TEAMS, COMMON_PROP_TYPES } from '../constants/sports';
import { extractTeamsFromParlays, saveLearnedData } from '../utils/actionHandlers';
import { useUIContext } from './UIContext';
import { useFilterContext } from './FilterContext';

/**
 * BrolayContext - Provides shared application state and handlers
 *
 * NOTE: UI and Filter state have been extracted to UIContext and FilterContext
 * for better performance. This context re-exports those values for backward
 * compatibility, but new components should import from the specific contexts.
 *
 * This context provides:
 * - Brolay data (parlays, CRUD operations)
 * - ESPN integration
 * - Statistics
 * - Odds API
 * - Insights data
 * - (Re-exported) Filter state from FilterContext
 * - (Re-exported) UI state from UIContext
 */
const BrolayContext = createContext(null);

/**
 * BrolayProvider - Wraps the application and provides shared state
 * @param {Object} props
 * @param {Object} props.db - Firestore database instance
 * @param {boolean} props.authenticated - Whether user is authenticated
 * @param {string} props.oddsApiKey - The Odds API key
 * @param {React.ReactNode} props.children
 */
export const BrolayProvider = ({ db, authenticated, oddsApiKey, children }) => {
  // Import state from separated contexts for re-export (backward compatibility)
  const uiContext = useUIContext();
  const filterContext = useFilterContext();

  // Destructure UI state
  const {
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    mobileDropdownOpen,
    setMobileDropdownOpen,
    refreshing,
    setRefreshing,
    pullStartY,
    setPullStartY,
    pullDistance,
    setPullDistance,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = uiContext;

  // Destructure Filter state
  const {
    filters,
    setFilters,
    filtersExpanded,
    setFiltersExpanded,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    lastSearchedQuery,
    setLastSearchedQuery,
    searchCache,
    setSearchCache,
    showSuggestions,
    setShowSuggestions,
    suggestions: filterSuggestions,
    setSuggestions: setFilterSuggestions
  } = filterContext;

  // Players configuration
  const [players] = useState(['Management', 'CD', '914', 'Junior', 'Jacoby']);

  // Brolay data management
  const {
    parlays,
    loading: brolaysLoading,
    addBrolay,
    updateBrolay,
    deleteBrolay,
    forceRefresh
  } = useBrolays(authenticated ? db : null);

  // ESPN integration
  const {
    autoUpdating,
    checkGameResult,
    autoUpdatePendingPicks,
    matchTeamName
  } = useESPN();

  // ESPN Teams for autocomplete
  const { lookupTeams, loading: teamsLoading } = useESPNTeams();

  // Statistics and insights
  const [editingParlay, setEditingParlay] = useState(null);
  const { stats, calculateStatsForPlayer } = useStats(parlays, players, editingParlay);

  // Odds API
  const { fetchOddsFromTheOddsAPI, prefetchEventsBySport } = useOdds(oddsApiKey, matchTeamName);

  // Insights data (memoized)
  const moneyMaker = useMemo(() => findMoneyMaker(parlays, players), [parlays, players]);
  const dangerZone = useMemo(() => findDangerZone(parlays, players), [parlays, players]);
  const currentDay = useMemo(() => getCurrentDayOfWeek(), []);
  const currentSports = useMemo(() => getCurrentSportsInSeason(), []);
  const seasonalTip = useMemo(() => getSeasonalTip(), []);

  // Calendar state
  const [calendarView, setCalendarView] = useState(false); // Default to list view
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Individual dashboard state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState(new Set());
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [expandedPlayers, setExpandedPlayers] = useState(new Set());

  // Entry form state - supports both old and new schema field names
  const [newParlay, setNewParlay] = useState({
    date: getCurrentETDate(),
    betAmount: 10,
    totalPayout: 0,
    participants: {},
    submittedBy: '',
    placedBy: '', // Legacy support
    settled: false
  });
  const [editingPick, setEditingPick] = useState(null);

  // UI state (not in UIContext - specific to this context)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [learnedTeams, setLearnedTeams] = useState([]);
  const [learnedPropTypes, setLearnedPropTypes] = useState([]);
  const [learnedPlayers, setLearnedPlayers] = useState([]);

  // Mobile state is now provided by UIContext (see destructuring above)

  // Pagination state
  const [picksToShow, setPicksToShow] = useState(20);
  const [brolaysToShow, setBrolaysToShow] = useState(10);
  const [settledBrolaysToShow, setSettledBrolaysToShow] = useState(10);

  // Load learned data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('brolay-learned-data');
    if (stored) {
      const learned = JSON.parse(stored);
      setLearnedTeams(learned.teams || []);
      setLearnedPropTypes(learned.propTypes || []);
      setLearnedPlayers(learned.players || []);
    }
  }, []);

  // Extract teams/players from existing Firestore data on first load
  useEffect(() => {
    if (parlays.length > 0 && learnedTeams.length === 0 && learnedPlayers.length === 0 && learnedPropTypes.length === 0) {
      const extracted = extractTeamsFromParlays(
        parlays,
        learnedTeams,
        learnedPropTypes,
        learnedPlayers
      );

      if (extracted.teamsAdded > 0 || extracted.playersAdded > 0 || extracted.propTypesAdded > 0) {
        console.log('📚 Extracted from existing parlays:', {
          teamsAdded: extracted.teamsAdded,
          playersAdded: extracted.playersAdded,
          propTypesAdded: extracted.propTypesAdded
        });
        setLearnedTeams(extracted.newTeams);
        setLearnedPropTypes(extracted.newPropTypes);
        setLearnedPlayers(extracted.newPlayers);
        saveLearnedData(extracted.newTeams, extracted.newPropTypes, extracted.newPlayers);
      }
    }
  }, [parlays, learnedTeams, learnedPlayers, learnedPropTypes]);

  // Mobile detection and touch handlers are now in UIContext

  // Parlay management handlers
  const handleToggleSettlement = useCallback(async (parlayId) => {
    console.log('🔄 Attempting to toggle settlement for parlay ID:', parlayId);

    const parlayToUpdate = parlays.find(p => p.id === parlayId);
    if (!parlayToUpdate) {
      console.error('❌ Parlay not found in state:', parlayId);
      alert('Error: Parlay not found');
      return;
    }

    const newSettled = !parlayToUpdate.settled;

    try {
      setSaving(true);

      const result = await updateBrolay(parlayToUpdate.id, {
        settled: newSettled,
        settledAt: newSettled ? new Date().toISOString() : null
      });

      if (!result.success) {
        console.error('❌ Firebase update failed:', result.error);
        alert(`Error updating brolay: ${result.error.message}`);
        setSaving(false);
        return;
      }

      console.log('✅ Successfully toggled settlement to:', newSettled);
      setSaving(false);
    } catch (error) {
      console.error('❌ Error updating settlement:', error);
      alert(`Error: ${error.message}`);
      setSaving(false);
    }
  }, [parlays, updateBrolay, setSaving]);

  const handleDeleteParlay = useCallback(async (parlayId) => {
    if (window.confirm('Are you sure you want to delete this parlay?')) {
      const parlayToDelete = parlays.find(p => p.id === parlayId);

      if (parlayToDelete && parlayToDelete.id) {
        try {
          await deleteBrolay(parlayToDelete.id);
        } catch (error) {
          console.error('Error deleting parlay:', error);
        }
      }
    }
  }, [parlays, deleteBrolay]);

  const handleSaveEditedParlay = async (editedParlay) => {
    try {
      setSaving(true);

      // Detect schema: new schema uses 'picks', old uses 'participants'
      const isNewSchema = !!editedParlay.picks;
      const picksObj = editedParlay.picks || editedParlay.participants || {};
      const picksFieldName = isNewSchema ? 'picks' : 'participants';

      // Helper to get result from pick (supports both schemas)
      const getPickResult = (pick) => pick.outcome?.status || pick.result;

      // Identify which picks need actualStats deleted (those reset to pending)
      const picksToClean = Object.entries(picksObj)
        .filter(([id, pick]) => getPickResult(pick) === 'pending')
        .map(([id]) => id);

      if (editedParlay.id) {
        console.log('🔄 Updating parlay in Firebase:', editedParlay.id);

        // Build update object that explicitly deletes actualStats fields
        const updateObject = {};

        // Update all picks
        Object.entries(picksObj).forEach(([id, pick]) => {
          // For picks with pending status, we need to delete actualStats
          // but still update all other fields
          if (picksToClean.includes(id)) {
            // Update the full pick object first
            updateObject[`${picksFieldName}.${id}`] = pick;

            if (isNewSchema) {
              // New schema: clear outcome.actualStats
              updateObject[`${picksFieldName}.${id}.outcome.actualStats`] = deleteField();
              updateObject[`${picksFieldName}.${id}.outcome.status`] = 'pending';
              updateObject[`${picksFieldName}.${id}.outcome.autoUpdated`] = false;
            } else {
              // Old schema: clear actualStats directly
              updateObject[`${picksFieldName}.${id}.actualStats`] = deleteField();
              updateObject[`${picksFieldName}.${id}.result`] = 'pending';
              updateObject[`${picksFieldName}.${id}.autoUpdated`] = false;
            }
          } else {
            // For non-pending picks, just update normally
            updateObject[`${picksFieldName}.${id}`] = pick;
          }
        });

        // Add top-level parlay fields to the update
        updateObject.date = editedParlay.date;
        updateObject.betAmount = editedParlay.betAmount;
        updateObject.totalPayout = editedParlay.totalPayout;
        // Support both old and new schema field names
        updateObject.submittedBy = editedParlay.submittedBy || editedParlay.placedBy;
        updateObject.placedBy = editedParlay.placedBy || editedParlay.submittedBy; // Keep for compatibility

        const result = await updateBrolay(editedParlay.id, updateObject);

        if (!result.success) {
          throw new Error(result.error?.message || 'Update failed');
        }
      } else {
        throw new Error('Parlay has no ID');
      }

      setEditingParlay(null);
      alert('Parlay updated successfully!');
    } catch (error) {
      console.error('💥 Error updating parlay:', error);
      alert('Failed to update parlay. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoUpdate = useCallback(async () => {
    const result = await autoUpdatePendingPicks(parlays, updateBrolay);

    if (result.success) {
      if (result.updatedCount > 0) {
        alert(`Successfully updated ${result.updatedCount} pending pick(s)!`);
      } else {
        alert('No pending picks could be updated at this time.');
      }
    } else {
      alert(`Error updating picks: ${result.error || 'Please try again.'}`);
    }
  }, [parlays, autoUpdatePendingPicks, updateBrolay]);

  // Autocomplete suggestion helpers
  const getTeamSuggestions = async (input, sport) => {
    if (!input || input.length < 2) return [];

    try {
      // Try ESPN API first
      const espnTeams = await lookupTeams(input, sport);

      if (espnTeams && espnTeams.length > 0) {
        // Return full team names from ESPN (e.g., "Michigan Wolverines")
        return espnTeams.map(team => team.name);
      }

      // Fallback to static list if ESPN fails
      const inputLower = input.toLowerCase();
      const preloaded = PRELOADED_TEAMS[sport] || [];
      const allTeams = [...new Set([...preloaded, ...learnedTeams])];

      return allTeams
        .filter(team => team.toLowerCase().includes(inputLower))
        .slice(0, 8);
    } catch (error) {
      console.error('Error fetching team suggestions:', error);

      // Fallback to static list
      const inputLower = input.toLowerCase();
      const preloaded = PRELOADED_TEAMS[sport] || [];
      const allTeams = [...new Set([...preloaded, ...learnedTeams])];

      return allTeams
        .filter(team => team.toLowerCase().includes(inputLower))
        .slice(0, 8);
    }
  };

  const getPropTypeSuggestions = (input) => {
    if (!input || input.length < 2) return [];

    const inputLower = input.toLowerCase();
    const allPropTypes = [...new Set([...COMMON_PROP_TYPES, ...learnedPropTypes])];

    return allPropTypes
      .filter(prop => prop.toLowerCase().includes(inputLower))
      .slice(0, 8);
  };

  // Input handlers for autocomplete
  const handleTeamInput = async (id, value, sport) => {
    const suggestions = await getTeamSuggestions(value, sport);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`team-${id}`]: suggestions.length > 0 });
  };

  const handlePropTypeInput = (id, value) => {
    const suggestions = getPropTypeSuggestions(value);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`prop-${id}`]: suggestions.length > 0 });
  };

  const handleAwayTeamInput = async (id, value, sport) => {
    const suggestions = await getTeamSuggestions(value, sport);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`awayTeam-${id}`]: suggestions.length > 0 });
  };

  const handleHomeTeamInput = async (id, value, sport) => {
    const suggestions = await getTeamSuggestions(value, sport);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`homeTeam-${id}`]: suggestions.length > 0 });
  };

  const handlePlayerInput = (id, field, value, sport) => {
    const suggestions = getTeamSuggestions(value, sport); // Reuse team suggestions for now
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`player-${id}`]: suggestions.length > 0 });
  };

  const handleSelectSuggestion = (id, field, value) => {
    setShowSuggestions({});
    setSuggestions([]);
  };

  // Context value with all shared state and handlers
  const value = {
    // Data
    parlays,
    players,
    stats,

    // Loading states
    brolaysLoading,
    loading,
    saving,
    autoUpdating,
    refreshing,

    // Brolay CRUD
    addBrolay,
    updateBrolay,
    deleteBrolay,
    forceRefresh,
    handleToggleSettlement,
    handleDeleteParlay,
    handleSaveEditedParlay,

    // ESPN integration
    checkGameResult,
    autoUpdatePendingPicks,
    matchTeamName,
    handleAutoUpdate,

    // Statistics
    calculateStatsForPlayer,

    // Odds API
    fetchOddsFromTheOddsAPI,
    prefetchEventsBySport,

    // Insights
    moneyMaker,
    dangerZone,
    currentDay,
    currentSports,
    seasonalTip,

    // Filter state
    filters,
    setFilters,
    filtersExpanded,
    setFiltersExpanded,

    // Search state
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    lastSearchedQuery,
    setLastSearchedQuery,
    searchCache,
    setSearchCache,
    showSuggestions,
    setShowSuggestions,
    suggestions,
    setSuggestions,
    handleTeamInput,
    handlePropTypeInput,
    handleAwayTeamInput,
    handleHomeTeamInput,
    handlePlayerInput,
    handleSelectSuggestion,

    // Calendar state
    calendarView,
    setCalendarView,
    selectedCalendarDate,
    setSelectedCalendarDate,
    calendarMonth,
    setCalendarMonth,

    // Individual dashboard state
    comparisonMode,
    setComparisonMode,
    selectedForComparison,
    setSelectedForComparison,
    currentInsightIndex,
    setCurrentInsightIndex,
    expandedPlayers,
    setExpandedPlayers,

    // Entry form state
    newParlay,
    setNewParlay,
    editingParlay,
    setEditingParlay,
    editingPick,
    setEditingPick,

    // UI state
    setLoading,
    setSaving,
    learnedTeams,
    setLearnedTeams,
    learnedPropTypes,
    setLearnedPropTypes,
    learnedPlayers,
    setLearnedPlayers,

    // Mobile state
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    setRefreshing,
    pullStartY,
    setPullStartY,
    pullDistance,
    setPullDistance,
    mobileDropdownOpen,
    setMobileDropdownOpen,
    refreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Pagination state
    picksToShow,
    setPicksToShow,
    brolaysToShow,
    setBrolaysToShow,
    settledBrolaysToShow,
    setSettledBrolaysToShow
  };

  return (
    <BrolayContext.Provider value={value}>
      {children}
    </BrolayContext.Provider>
  );
};

/**
 * useBrolayContext - Custom hook to access BrolayContext
 * @returns {Object} Context value with all shared state and handlers
 * @throws {Error} If used outside of BrolayProvider
 */
export const useBrolayContext = () => {
  const context = useContext(BrolayContext);

  if (!context) {
    throw new Error('useBrolayContext must be used within a BrolayProvider');
  }

  return context;
};

export default BrolayContext;
