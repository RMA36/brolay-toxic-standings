import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { getFirestore, deleteField } from 'firebase/firestore';
import { useBrolays } from '../hooks/useBrolays';
import { useESPN } from '../hooks/useESPN';
import { useStats } from '../hooks/useStats';
import { useOdds } from '../hooks/useOdds';
import { getCurrentETDate } from '../utils/formatters';
import { findMoneyMaker, findDangerZone, getCurrentDayOfWeek, getCurrentSportsInSeason, getSeasonalTip } from '../insightsHelper';
import { PRELOADED_TEAMS, COMMON_PROP_TYPES } from '../constants/sports';

/**
 * BrolayContext - Provides shared application state and handlers
 *
 * This context consolidates:
 * - Brolay data (parlays, CRUD operations)
 * - ESPN integration
 * - Statistics
 * - Odds API
 * - Filter state
 * - Search state
 * - Calendar state
 * - Mobile UI state
 * - Insights data
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
  // Players configuration
  const [players] = useState(['Management', 'CD', '914', 'Junior', 'Jacoby']);

  // Brolay data management
  const {
    parlays,
    loading: brolaysLoading,
    addBrolay,
    updateBrolay,
    deleteBrolay
  } = useBrolays(authenticated ? db : null);

  // ESPN integration
  const {
    autoUpdating,
    checkGameResult,
    autoUpdatePendingPicks,
    matchTeamName
  } = useESPN();

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

  // Filter state
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    player: '',
    sport: '',
    teamPlayer: '',
    placedBy: '',
    minPayout: '',
    maxPayout: '',
    result: '',
    autoUpdated: '',
    betType: '',
    propType: ''
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [searchCache, setSearchCache] = useState({});
  const [showSuggestions, setShowSuggestions] = useState({});

  // Calendar state
  const [calendarView, setCalendarView] = useState(false); // Default to list view
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Individual dashboard state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState(new Set());
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [expandedPlayers, setExpandedPlayers] = useState(new Set());

  // Entry form state
  const [newParlay, setNewParlay] = useState({
    date: getCurrentETDate(),
    betAmount: 10,
    totalPayout: 0,
    participants: {},
    placedBy: '',
    settled: false
  });
  const [editingPick, setEditingPick] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [learnedTeams, setLearnedTeams] = useState([]);
  const [learnedPropTypes, setLearnedPropTypes] = useState([]);
  const [learnedPlayers, setLearnedPlayers] = useState([]);

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null);

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

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch handlers for pull-to-refresh
  const handleTouchStart = (e) => {
    if (!isMobile || window.scrollY > 0) return;
    setPullStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || window.scrollY > 0 || pullStartY === 0) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - pullStartY);
    setPullDistance(Math.min(distance, 100));
  };

  const handleTouchEnd = async () => {
    if (!isMobile) return;
    if (pullDistance > 80) {
      setRefreshing(true);
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
    setPullDistance(0);
    setPullStartY(0);
  };

  // Parlay management handlers
  const handleToggleSettlement = async (parlayId) => {
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
  };

  const handleDeleteParlay = async (parlayId) => {
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
  };

  const handleSaveEditedParlay = async (editedParlay) => {
    try {
      setSaving(true);

      // Identify which participants need actualStats deleted
      const participantsToClean = Object.entries(editedParlay.participants)
        .filter(([id, participant]) => participant.result === 'pending')
        .map(([id]) => id);

      if (editedParlay.id) {
        console.log('🔄 Updating parlay in Firebase:', editedParlay.id);

        // Build update object that explicitly deletes actualStats fields
        const updateObject = {};

        // Update all participants
        Object.entries(editedParlay.participants).forEach(([id, participant]) => {
          // For participants with pending status, we need to delete actualStats
          // but still update all other fields
          if (participantsToClean.includes(id)) {
            // Update the full participant object first
            updateObject[`participants.${id}`] = participant;
            // Then explicitly delete actualStats field
            updateObject[`participants.${id}.actualStats`] = deleteField();
            // Ensure result and autoUpdated are set correctly
            updateObject[`participants.${id}.result`] = 'pending';
            updateObject[`participants.${id}.autoUpdated`] = false;
          } else {
            // For non-pending participants, just update normally
            updateObject[`participants.${id}`] = participant;
          }
        });

        // Add top-level parlay fields to the update
        updateObject.date = editedParlay.date;
        updateObject.betAmount = editedParlay.betAmount;
        updateObject.totalPayout = editedParlay.totalPayout;
        updateObject.placedBy = editedParlay.placedBy;

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

  const handleAutoUpdate = async () => {
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
  };

  // Autocomplete suggestion helpers
  const getTeamSuggestions = (input, sport) => {
    if (!input || input.length < 2) return [];

    const inputLower = input.toLowerCase();
    const preloaded = PRELOADED_TEAMS[sport] || [];
    const allTeams = [...new Set([...preloaded, ...learnedTeams])];

    return allTeams
      .filter(team => team.toLowerCase().includes(inputLower))
      .slice(0, 8);
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
  const handleTeamInput = (id, value, sport) => {
    const suggestions = getTeamSuggestions(value, sport);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`team-${id}`]: suggestions.length > 0 });
  };

  const handlePropTypeInput = (id, value) => {
    const suggestions = getPropTypeSuggestions(value);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`prop-${id}`]: suggestions.length > 0 });
  };

  const handleAwayTeamInput = (id, value, sport) => {
    const suggestions = getTeamSuggestions(value, sport);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`awayTeam-${id}`]: suggestions.length > 0 });
  };

  const handleHomeTeamInput = (id, value, sport) => {
    const suggestions = getTeamSuggestions(value, sport);
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
