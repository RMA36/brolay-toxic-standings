import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, TrendingUp, Users, Award, AlertCircle, Loader, Menu, X, RefreshCw } from 'lucide-react';

import { getCurrentSportsInSeason, getCurrentDayOfWeek, findMoneyMaker, findDangerZone, getSeasonalTip, formatComboDescription } from './insightsHelper';
import { tokenizeQuery, findBestTeamMatch, filterByRelevance, calculateRelevanceScore, teamAliases } from './searchUtils';

import { formatDateForDisplay, formatDateForStorage, formatCalendarDate, formatBetDescription, normalizePlayerName, normalizePropType, getStatValue, getCurrentETDate } from './utils/formatters';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, deleteField } from 'firebase/firestore';

import { colors, buttonStyles, cardStyles, inputClasses } from './constants/theme';
import { 
  SPORTS, 
  PLAYERS, 
  PICK_TYPES, 
  PRELOADED_TEAMS, 
  COMMON_PROP_TYPES,
  PROP_TYPE_VARIATIONS,
  ODDS_API_PROP_MAPPINGS,
  ESPN_STAT_MAPPINGS 
} from './constants/sports';

import LoadingSpinner from './components/common/LoadingSpinner';
import Button from './components/common/Button';
import Card from './components/common/Card';
import StatCard from './components/dashboard/StatCard';
import ComparisonTable from './components/dashboard/ComparisonTable';
import BrolayGrid from './components/dashboard/BrolayGrid';
import FilterBar from './components/filters/FilterBar';
import PickEntry from './components/forms/PickEntry';
import Rankings from './pages/Rankings';
import IndividualDashboard from './pages/IndividualDashboard';
import GroupDashboard from './pages/GroupDashboard';
import AllBrolays from './pages/AllBrolays';

import { useBrolays } from './hooks/useBrolays';
import { useESPN } from './hooks/useESPN';
import { useStats } from './hooks/useStats';
import { useOdds } from './hooks/useOdds';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWhm77FUPJUHt7Bdb9R1NHH9PoAorkxlc",
  authDomain: "brolay-toxic-standings.firebaseapp.com",
  projectId: "brolay-toxic-standings",
  storageBucket: "brolay-toxic-standings.firebasestorage.app",
  messagingSenderId: "466981190192",
  appId: "1:466981190192:web:f03423a047f8ce554a8bf5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add custom styles for Theme 3
const customStyles = `
  @keyframes slideInFromLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes gradientFlow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  .animate-slideInLeft {
    animation: slideInFromLeft 0.5s ease-out;
  }
  
  .animate-slideInRight {
    animation: slideInFromRight 0.5s ease-out;
  }
  
  .animate-fadeInUp {
    animation: fadeInUp 0.5s ease-out;
  }
  
  .stat-card {
    transition: all 0.3s ease;
  }
  
  .stat-card:hover {
    transform: translateY(-5px) scale(1.02);
  }
  
  .flowing-bg {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    background-size: 200% 200%;
    animation: gradientFlow 15s ease infinite;
  }
  
  .dropdown {
    position: relative;
  }
  
  .dropdown-content {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 50;
    min-width: 200px;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
  }
  
  .dropdown:hover .dropdown-content {
    display: block;
  }

  .dropdown.dropdown-open .dropdown-content {
    display: block;
  }
  
  .dropdown-content:hover {
    display: block;
  }
  
  /* Keep dropdown visible when hovering over the area between button and content */
  .dropdown::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    height: 0.5rem;
  }
  
  .dropdown-content::before {
    content: '';
    position: absolute;
    top: -0.5rem;
    left: 0;
    right: 0;
    height: 0.5rem;
    background: transparent;
  }
  
  /* Optimize input performance and prevent mobile zoom */
  input[type="text"],
  input[type="number"],
  textarea,
  select {
    font-size: 16px;
  }
  
  @media (min-width: 768px) {
    input[type="text"],
    input[type="number"],
    textarea,
    select {
      font-size: 14px;
    }
  }
`;

// Inject styles into document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}

const App = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const PASSWORD = 'manipulation';

  const THE_ODDS_API_KEY = '42cd1e5f5a4033ada2a492c738f33014';
  
  const SHOW_IMPORT_TAB = false; // Set to true to show Import Data tab
  const SHOW_SETTINGS_TAB = false; // Set to true to show Settings tab
  
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('currentActiveTab') || 'entry';
  });
  const [csvInput, setCsvInput] = useState('');
  const [players] = useState(['Management', 'CD', '914', 'Junior', 'Jacoby']);
  const { 
    parlays, 
    loading: brolaysLoading, 
    addBrolay, 
    updateBrolay, 
    deleteBrolay 
  } = useBrolays(authenticated ? db : null);
  const { 
    autoUpdating, 
    checkGameResult, 
    autoUpdatePendingPicks,
    matchTeamName 
  } = useESPN();
  const moneyMaker = useMemo(() => findMoneyMaker(parlays, players), [parlays, players]);
  const dangerZone = useMemo(() => findDangerZone(parlays, players), [parlays, players]);
  const currentDay = useMemo(() => getCurrentDayOfWeek(), []);
  const currentSports = useMemo(() => getCurrentSportsInSeason(), []);
  const seasonalTip = useMemo(() => getSeasonalTip(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState({});
  const [learnedTeams, setLearnedTeams] = useState([]);
  const [learnedPropTypes, setLearnedPropTypes] = useState([]);
  const [editingParlay, setEditingParlay] = useState(null);
  const { stats, calculateStatsForPlayer } = useStats(parlays, players, editingParlay);
  const { fetchOddsFromTheOddsAPI } = useOdds(THE_ODDS_API_KEY, matchTeamName);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [searchCache, setSearchCache] = useState({});
  const [editingPick, setEditingPick] = useState(null);
  const [picksToShow, setPicksToShow] = useState(20); 
  const [calendarView, setCalendarView] = useState(true); // Toggle between calendar and list view
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null); // Selected day for details
  const [calendarMonth, setCalendarMonth] = useState(new Date()); // Current month being viewed
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
  const [expandedPlayers, setExpandedPlayers] = useState(new Set());
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState(new Set());
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
    const [newParlay, setNewParlay] = useState({
  date: getCurrentETDate(),
  betAmount: 10,
  totalPayout: 0,
  participants: {},
  placedBy: '',
  settled: false
});
// Mobile-specific states
const [isMobile, setIsMobile] = useState(false);
const [sidebarOpen, setSidebarOpen] = useState(false);
const [refreshing, setRefreshing] = useState(false);
const [pullStartY, setPullStartY] = useState(0);
const [pullDistance, setPullDistance] = useState(0);
const [brolaysToShow, setBrolaysToShow] = useState(10);
const [settledBrolaysToShow, setSettledBrolaysToShow] = useState(10);
const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null);

// Detect mobile device
useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  return () => window.removeEventListener('resize', checkMobile);
}, []);
  
  const sports = [
  'NFL',
  'NBA',
  'MLB',
  'NHL',
  'College Football',
  'College Basketball',
  'College Basketball (Women\'s)',
  'Soccer',
  'Soccer (Women\'s)',
  'Tennis',
  'Tennis (Women\'s)',
  'WNBA',
  'College Baseball',
  'Golf',
  'Rugby',
  'UFC',
  'Other'
];
  const betTypes = [
  'Spread', 
  'Moneyline', 
  'Total', 
  'Prop Bet',
  'First Half Moneyline',
  'First Half Total',
  'First Half Team Total',
  'First Inning Runs',
  'Quarter Moneyline',
  'Quarter Total',
  'Quarter Team Total'
];
// Pre-loaded teams and common values
const preloadedTeams = PRELOADED_TEAMS; // Now imported from constants/sports
const commonPropTypes = COMMON_PROP_TYPES; // Now imported from constants/sports

const matchPlayerName = (pickPlayer, apiPlayer) => {
  if (!pickPlayer || !apiPlayer) return false;
  
  const normalizedPick = normalizePlayerName(pickPlayer);
  const normalizedApi = normalizePlayerName(apiPlayer);
  
  if (normalizedPick === normalizedApi) return true;
  
  const pickParts = normalizedPick.split(' ');
  const apiParts = normalizedApi.split(' ');
  const pickLastName = pickParts[pickParts.length - 1];
  const apiLastName = apiParts[apiParts.length - 1];
  
  if (pickLastName === apiLastName && pickLastName.length > 3) {
    return true;
  }
  
  return false;
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
  
  // Handle loading state
useEffect(() => {
  if (!brolaysLoading) {
    setLoading(false);
  }
}, [brolaysLoading]);

// Clear search cache when parlays update
useEffect(() => {
  setSearchCache({});
}, [parlays]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem('brolay-auth', 'true');
    } else {
      alert('Incorrect password');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('brolay-auth') === 'true') {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('brolay-learned-data');
    if (stored) {
      const learned = JSON.parse(stored);
      setLearnedTeams(learned.teams || []);
      setLearnedPropTypes(learned.propTypes || []);
    }
  }, []);

// Refresh data when switching tabs
useEffect(() => {
  if (authenticated) {
    // Reset pagination when switching tabs
    if (activeTab === 'allBrolays') {
      setBrolaysToShow(10);
    }
  }
}, [activeTab, authenticated]);

  // Rotate insights ticker every 5 seconds
useEffect(() => {
  if (activeTab === 'individual') {
    const interval = setInterval(() => {
      setCurrentInsightIndex(prev => {
        // We need to calculate insights length here
        const filteredParlays = applyFilters([...parlays]);
        const allStats = players.map(p => ({
          player: p,
          ...calculateStatsForPlayer(p, filteredParlays)
        }));
        
        let insightsCount = 0;
        if (allStats.filter(s => s.totalPicks >= 5).length > 0) insightsCount++;
        if (allStats.filter(s => s.totalPicks >= 5).length > 0) insightsCount++;
        if (allStats.some(s => (s.moneyWon - s.moneyLost) > 0)) insightsCount++;
        if (allStats.some(s => s.and1s > 0)) insightsCount++;
        
        return insightsCount > 0 ? (prev + 1) % insightsCount : 0;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }
}, [activeTab, parlays, filters]);

const extractTeamsFromExistingParlays = () => {
  const newTeams = [...learnedTeams];
  const newPropTypes = [...learnedPropTypes];
  
  parlays.forEach(parlay => {
    Object.values(parlay.participants || {}).forEach(p => {
      if (p.team && !newTeams.includes(p.team)) {
        newTeams.push(p.team);
      }
      if (p.awayTeam && !newTeams.includes(p.awayTeam)) {
        newTeams.push(p.awayTeam);
      }
      if (p.homeTeam && !newTeams.includes(p.homeTeam)) {
        newTeams.push(p.homeTeam);
      }
      if (p.propType && !newPropTypes.includes(p.propType)) {
        newPropTypes.push(p.propType);
      }
    });
  });
  
  setLearnedTeams(newTeams);
  setLearnedPropTypes(newPropTypes);
  saveLearnedData(newTeams, newPropTypes);
  
  alert(`Extracted ${newTeams.length - learnedTeams.length} new teams and ${newPropTypes.length - learnedPropTypes.length} new prop types from existing parlays!`);
};
  
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
  
  const saveLearnedData = (teams, propTypes) => {
    localStorage.setItem('brolay-learned-data', JSON.stringify({
      teams: teams,
      propTypes: propTypes
    }));
  };
  
  const addParticipant = () => {
  const participantId = Object.keys(newParlay.participants).length;
  setNewParlay({
    ...newParlay,
    participants: {
      ...newParlay.participants,
      [participantId]: {
        player: '',
        sport: 'NFL',
        team: '',
        awayTeam: '',
        homeTeam: '',
        betType: 'Spread',
        favorite: 'Favorite',
        spread: '',
        total: '',
        overUnder: 'Over',
        propType: '',
        line: '',
        odds: '',
        yesNoRuns: '',
        quarter: '',
        result: 'pending',
        // Multi-entity prop fields
        player1: '',              // For H2H Prop
        player1PropType: '',      // For H2H Prop - NEW
        player2: '',              // For H2H Prop
        player2PropType: '',      // For H2H Prop - NEW
        selectedPlayer: '',       // For H2H Prop - who you're betting on
        h2hLine: '',              // For H2H Prop - optional spread
        h2hLineType: ''          // For H2H Prop - 'Favorite' or 'Dog' (only if h2hLine exists)
      }
    }
  });
};
  const updateParticipant = (id, field, value) => {
    // Extract base participant ID for multi-entity props
    // IDs like "participant-1-player2" should become "participant-1"
    const baseId = id.includes('-player') || id.includes('-prop') ? id.split('-').slice(0, 2).join('-') : id;
    
    // Only update if the base participant exists
    if (!newParlay.participants[baseId]) {
      return;
    }
    
    setNewParlay({
      ...newParlay,
      participants: {
        ...newParlay.participants,
        [baseId]: {
          ...newParlay.participants[baseId],
          [field]: value
        }
      }
    });
  };

const getTeamSuggestions = (input, sport) => {
  if (!input || input.length < 2) return [];
  
  const inputLower = input.toLowerCase();
  const preloaded = preloadedTeams[sport] || [];
  const allTeams = [...new Set([...preloaded, ...learnedTeams])];
  
  return allTeams
    .filter(team => team.toLowerCase().includes(inputLower))
    .slice(0, 8);
};

const getPropTypeSuggestions = (input) => {
  if (!input || input.length < 2) return [];
  
  const inputLower = input.toLowerCase();
  const allPropTypes = [...new Set([...commonPropTypes, ...learnedPropTypes])];
  
  return allPropTypes
    .filter(prop => prop.toLowerCase().includes(inputLower))
    .slice(0, 8);
};

const handleTeamInput = (id, value, sport) => {
  // Only update newParlay if this is a real participant ID (not editing mode with modified IDs)
  if (newParlay.participants && newParlay.participants[id]) {
    updateParticipant(id, 'team', value);
  }
  const suggestions = getTeamSuggestions(value, sport);
  setSuggestions(suggestions);
  setShowSuggestions({ ...showSuggestions, [`team-${id}`]: suggestions.length > 0 });
};

const handlePropTypeInput = (id, value) => {
  // Only update newParlay if this is a real participant ID (not editing mode with modified IDs)
  if (newParlay.participants && newParlay.participants[id]) {
    updateParticipant(id, 'propType', value);
  }
  const suggestions = getPropTypeSuggestions(value);
  setSuggestions(suggestions);
  setShowSuggestions({ ...showSuggestions, [`prop-${id}`]: suggestions.length > 0 });
};

const handleAwayTeamInput = (id, value, sport) => {
  updateParticipant(id, 'awayTeam', value);
  const suggestions = getTeamSuggestions(value, sport);
  setSuggestions(suggestions);
  setShowSuggestions({ ...showSuggestions, [`awayTeam-${id}`]: suggestions.length > 0 });
};

const handleHomeTeamInput = (id, value, sport) => {
  updateParticipant(id, 'homeTeam', value);
  const suggestions = getTeamSuggestions(value, sport);
  setSuggestions(suggestions);
  setShowSuggestions({ ...showSuggestions, [`homeTeam-${id}`]: suggestions.length > 0 });
};
  
const selectSuggestion = (id, field, value) => {
  updateParticipant(id, field, value);
  setShowSuggestions({});
  setSuggestions([]);
};
  
  const removeParticipant = (id) => {
    const updated = { ...newParlay.participants };
    delete updated[id];
    setNewParlay({ ...newParlay, participants: updated });
  };

const submitParlay = async () => {
  const participantCount = Object.keys(newParlay.participants).length;
  if (participantCount < 3) {
    alert('Minimum 3 participants required');
    return;
  }
  
  const hasEmptyPlayer = Object.values(newParlay.participants).some(p => !p.player);
  if (hasEmptyPlayer) {
    alert('Please select a player for all picks');
    return;
  }
  
// Auto-fetch odds for ALL picks without odds from The Odds API (FanDuel primary, DraftKings secondary)
  setSaving(true);
  const participantsWithOdds = {};
  let oddsFetchedCount = 0;
  let oddsFailedCount = 0;
  
  // Pre-fetch all events for all sports needed (do this once, not per pick)
  const sportsNeeded = new Set();
  Object.values(newParlay.participants).forEach(p => {
    if (!p.odds) sportsNeeded.add(p.sport);
  });
  
  const eventsBySport = {};
  const sportMap = {
    'NFL': 'americanfootball_nfl',
    'NBA': 'basketball_nba',
    'MLB': 'baseball_mlb',
    'NHL': 'icehockey_nhl',
    'College Football': 'americanfootball_ncaaf',
    'College Basketball': 'basketball_ncaab',
    'College Basketball (Women\'s)': 'basketball_wncaab',
    'WNBA': 'basketball_wnba',
    'Soccer': 'soccer_usa_mls',
    'Soccer (Women\'s)': 'soccer_usa_nwsl',
    'College Baseball': 'baseball_ncaa'
  };
  
  for (const sport of sportsNeeded) {
    const oddsApiSport = sportMap[sport];
    if (!oddsApiSport) continue;
    
    try {
      const gameDateObj = new Date(newParlay.date + 'T00:00:00');
      const commenceTimeFrom = gameDateObj.toISOString();
      const gameDateNext = new Date(gameDateObj);
      gameDateNext.setDate(gameDateNext.getDate() + 1);
      const commenceTimeTo = gameDateNext.toISOString();
      
      const eventsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/events?apiKey=${THE_ODDS_API_KEY}&commenceTimeFrom=${commenceTimeFrom}&commenceTimeTo=${commenceTimeTo}`;
      
      console.log(`Pre-fetching events for ${sport}`);
      const eventsResponse = await fetch(eventsUrl);
      const eventsData = await eventsResponse.json();
      
      eventsBySport[sport] = eventsData || [];
    } catch (error) {
      console.error(`Error fetching events for ${sport}:`, error);
      eventsBySport[sport] = [];
    }
  }
  
  // Now fetch odds for each pick, using the pre-fetched events
  for (const [id, participant] of Object.entries(newParlay.participants)) {
    if (!participant.odds) {
      try {
        const result = await fetchOddsFromTheOddsAPI(participant, newParlay.date, eventsBySport[participant.sport]);
        
        if (result) {
          const odds = result.odds;
          const bookmaker = result.bookmaker;
          
          participantsWithOdds[id] = {
            ...participant,
            odds: typeof odds === 'string' ? odds : (odds > 0 ? `+${odds}` : `${odds}`),
            oddsSource: bookmaker
          };
          oddsFetchedCount++;
        } else {
          participantsWithOdds[id] = participant;
          oddsFailedCount++;
        }
      } catch (error) {
        console.error(`Error fetching odds for pick ${id}:`, error);
        participantsWithOdds[id] = participant;
        oddsFailedCount++;
      }
    } else {
      participantsWithOdds[id] = participant;
    }
  }
  
  const parlayData = {
    ...newParlay,
    participants: participantsWithOdds,
    totalParticipants: participantCount,
    dayOfWeek: getDayOfWeek(newParlay.date)
  };
  
  // Learn from new entries
  const newTeams = [...learnedTeams];
  const newPropTypes = [...learnedPropTypes];
  
  Object.values(parlayData.participants).forEach(p => {
    if (p.team && !newTeams.includes(p.team)) {
      newTeams.push(p.team);
    }
    if (p.propType && !newPropTypes.includes(p.propType)) {
      newPropTypes.push(p.propType);
    }
  });
  
  setLearnedTeams(newTeams);
  setLearnedPropTypes(newPropTypes);
  saveLearnedData(newTeams, newPropTypes);
  
  try {
    // Save to Firebase using the hook
    const result = await addBrolay(parlayData);
    
    if (!result.success) {
      throw result.error;
    }
    
    // Show success message with odds info
    let message = 'Brolay saved successfully!';
    if (oddsFetchedCount > 0) {
      message += ` Fetched odds for ${oddsFetchedCount} pick(s).`;
    }
    if (oddsFailedCount > 0) {
      message += ` Could not find odds for ${oddsFailedCount} pick(s) - enter manually if needed.`;
    }
    alert(message);
  } catch (error) {
    console.error('Error adding parlay:', error);
    alert('Failed to save parlay. Please try again.');
  } finally {
    setSaving(false);
  }
    
  setNewParlay({
    date: (() => {
      const etDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const year = etDate.getFullYear();
      const month = String(etDate.getMonth() + 1).padStart(2, '0');
      const day = String(etDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    betAmount: 10,
    totalPayout: 0,
    participants: {},
    placedBy: '',
    settled: false
  });
};

const applyFilters = (parlaysList) => {
  return parlaysList.filter(parlay => {
    // Skip the parlay being edited - it's in draft state
    if (editingParlay && parlay.id === editingParlay.id) return false;
    
    // Date range filter
    if (filters.dateFrom && parlay.date < filters.dateFrom) return false;
    if (filters.dateTo && parlay.date > filters.dateTo) return false;
    
    // Placed By filter
    if (filters.placedBy && parlay.placedBy !== filters.placedBy) return false;
    
    // Total Payout range filter
    const payout = parlay.totalPayout || 0;
    if (filters.minPayout && payout < Number(filters.minPayout)) return false;
    if (filters.maxPayout && payout > Number(filters.maxPayout)) return false;
    
    // Player filter (check if any participant matches)
    if (filters.player) {
      const hasPlayer = Object.values(parlay.participants || {}).some(p => p.player === filters.player);
      if (!hasPlayer) return false;
    }
    
    // Sport filter (check if any participant matches)
    if (filters.sport) {
      const hasSport = Object.values(parlay.participants || {}).some(p => p.sport === filters.sport);
      if (!hasSport) return false;
    }
    
    // Result filter (check if any participant matches)
    if (filters.result) {
      const hasResult = Object.values(parlay.participants || {}).some(p => p.result === filters.result);
      if (!hasResult) return false;
    }
    
    if (filters.teamPlayer) {
      const hasTeamPlayer = Object.values(parlay.participants || {}).some(p => {
        const normalizedFilter = filters.teamPlayer.toLowerCase();
        return (p.team && p.team.toLowerCase().includes(normalizedFilter)) ||
               (p.awayTeam && p.awayTeam.toLowerCase().includes(normalizedFilter)) ||
               (p.homeTeam && p.homeTeam.toLowerCase().includes(normalizedFilter));
      });
      if (!hasTeamPlayer) return false;
    }
    return true;
  });
};
    
const updateParlayResult = async (parlayId, participantId, newResult) => {
    const updatedParlays = parlays.map(parlay => {
      if (parlay.id === parlayId) {
        return {
          ...parlay,
          participants: {
            ...parlay.participants,
            [participantId]: {
              ...parlay.participants[participantId],
              result: newResult,
              actualStats: newResult === 'pending' ? null : parlay.participants[participantId].actualStats,
              autoUpdated: false,
              manuallyOverridden: newResult !== 'pending'
            }
          }
        };
      }
      return parlay;
    });
    
    const parlayToUpdate = updatedParlays.find(p => p.id === parlayId);
    if (parlayToUpdate && parlayToUpdate.id) {
      try {
        await updateBrolay(parlayToUpdate.id, {
          participants: parlayToUpdate.participants
        });
      } catch (error) {
        console.error('Error updating parlay:', error);
      }
    }
  };
  
  const toggleSettlement = async (parlayId) => {
  console.log('🔄 Attempting to toggle settlement for parlay ID:', parlayId);

  // Find the parlay in current state
  const parlayToUpdate = parlays.find(p => p.id === parlayId);
  if (!parlayToUpdate) {
    console.error('❌ Parlay not found in state:', parlayId);
    alert('Error: Parlay not found');
    return;
  }

  console.log('📋 Found parlay:', {
    id: parlayToUpdate.id,
    date: parlayToUpdate.date,
    currentSettled: parlayToUpdate.settled
  });

  const newSettled = !parlayToUpdate.settled;

  try {
    setSaving(true);

    // Update in Firebase first
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
  
  const deleteParlay = async (parlayId) => {
  if (window.confirm('Are you sure you want to delete this parlay?')) {
    const parlayToDelete = parlays.find(p => p.id === parlayId);
    const updatedParlays = parlays.filter(p => p.id !== parlayId);
    
    // Delete from Firebase
    if (parlayToDelete && parlayToDelete.id) {
      try {
        await deleteBrolay(parlayToDelete.id);
      } catch (error) {
        console.error('Error deleting parlay:', error);
      }
    }
  }
};

const saveEditedParlay = async (editedParlay) => {
  try {
    setSaving(true);
    
    // Identify which participants need actualStats deleted
    const participantsToClean = Object.entries(editedParlay.participants)
      .filter(([id, participant]) => participant.result === 'pending')
      .map(([id]) => id);
    
    // Clear actualStats for pending picks in local state
    const cleanedParlay = {
      ...editedParlay,
      participants: Object.fromEntries(
        Object.entries(editedParlay.participants).map(([id, participant]) => {
          if (participant.result === 'pending') {
            const { actualStats, ...rest } = participant;
            return [id, rest];
          }
          return [id, participant];
        })
      )
    };
    
    // Update in Firebase (local state will update automatically via the hook's listener)
    if (cleanedParlay.id) {  // ✅ CHANGED from firestoreId to id
      console.log('🔄 Updating parlay in Firebase:', cleanedParlay.id);
      
      // Build update object that explicitly deletes actualStats fields
      const updateObject = {};
      
      // For participants being set to pending, delete their actualStats
      participantsToClean.forEach(participantId => {
        updateObject[`participants.${participantId}.actualStats`] = deleteField();
        updateObject[`participants.${participantId}.result`] = 'pending';
        updateObject[`participants.${participantId}.autoUpdated`] = false;
      });
      
      // For other participants, just update normally
      Object.entries(cleanedParlay.participants).forEach(([id, participant]) => {
        if (!participantsToClean.includes(id)) {
          updateObject[`participants.${id}`] = participant;
        }
      });
      
      // Add top-level parlay fields to the update
      updateObject.date = cleanedParlay.date;
      updateObject.betAmount = cleanedParlay.betAmount;
      updateObject.totalPayout = cleanedParlay.totalPayout;
      updateObject.placedBy = cleanedParlay.placedBy;
      
      console.log('📝 Update object:', updateObject);
      const result = await updateBrolay(cleanedParlay.id, updateObject);
      console.log('✅ Firebase update result:', result);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Update failed');
      }
    } else {
      console.error('❌ No ID found for parlay');
      throw new Error('Parlay has no ID');
    }
    
    setEditingParlay(null);
    alert('Parlay updated successfully!');
    console.log('✅ Parlay edit saved successfully');
  } catch (error) {
    console.error('💥 Error updating parlay:', error);
    alert('Failed to update parlay. Please try again.');
  } finally {
    setSaving(false);
  }
};
  
  // Helper function to get day of week from date string
const getDayOfWeek = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// Calendar helper functions
const getCalendarDays = (month, year) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
  
  const days = [];
  
  // Add empty days for the beginning of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  return days;
};

const getBrolaysForDate = (dateStr) => {
  return parlays.filter(parlay => parlay.date === dateStr);
};


const changeMonth = (direction) => {
  const newDate = new Date(calendarMonth);
  newDate.setMonth(newDate.getMonth() + direction);
  setCalendarMonth(newDate);
  setSelectedCalendarDate(null); // Clear selection when changing months
};
  // Helper function to format bet description for display
  
const renderEditModal = () => {
  if (!editingParlay) return null;

  const participants = editingParlay.participants || {};

return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4 overflow-y-auto"
      onClick={(e) => {
        // Close modal if clicking the backdrop
        if (e.target === e.currentTarget) {
          setEditingParlay(null);
        }
      }}
    >
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto border border-yellow-500/20" style={{ maxWidth: isMobile ? '100%' : '1024px' }}>
        <div className="p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-400">Edit Brolay</h2>
          
          {/* Brolay Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Date</label>
              <input
                type="date"
                value={editingParlay.date}
                onChange={(e) => setEditingParlay({...editingParlay, date: e.target.value})}
                className="w-full px-3 py-2 border rounded text-base bg-gray-900 border-gray-700 text-white focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Placed By</label>
              <select
                value={editingParlay.placedBy || ''}
                onChange={(e) => setEditingParlay({...editingParlay, placedBy: e.target.value})}
                className="w-full px-3 py-2 border rounded text-base bg-gray-900 border-gray-700 text-white focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              >
                <option value="">Select Big Guy</option>
                {players.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Bet Amount (per person)</label>
              <input
                type="number"
                value={editingParlay.betAmount}
                onChange={(e) => setEditingParlay({...editingParlay, betAmount: Number(e.target.value)})}
                className="w-full px-3 py-2 border rounded text-base bg-gray-900 border-gray-700 text-white focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Total Payout</label>
              <input
                type="number"
                value={editingParlay.totalPayout || ''}
                onChange={(e) => {
                  const payout = Number(e.target.value) || 0;
                  setEditingParlay({...editingParlay, totalPayout: payout});
                }}
                className="w-full px-3 py-2 border rounded text-base bg-gray-900 border-gray-700 text-white focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Net Profit</label>
              <input
                type="number"
                value={Math.max(0, (editingParlay.totalPayout || 0) - (editingParlay.betAmount * Object.keys(participants).length))}
                onChange={(e) => {
                  const netProfit = Number(e.target.value) || 0;
                  const totalRisk = editingParlay.betAmount * Object.keys(participants).length;
                  const calculatedPayout = netProfit + totalRisk;
                  setEditingParlay({...editingParlay, totalPayout: calculatedPayout});
                }}
                className="w-full px-3 py-2 border rounded text-base bg-gray-900 border-gray-700 text-white focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
          </div>

          {/* Picks */}
          <h3 className="text-base md:text-lg font-semibold mb-3 text-yellow-400">Picks</h3>
          <div className="space-y-4 mb-6">
            {Object.entries(editingParlay.participants).map(([id, participant]) => (
              <PickEntry
                key={id}
                participant={participant}
                participantId={id}
                onUpdate={(partId, field, value) => {
                  const updated = {...editingParlay};
                  updated.participants[partId][field] = value;
                  setEditingParlay(updated);
                }}
                onRemove={(partId) => {
                  const updated = {...editingParlay};
                  delete updated.participants[partId];
                  setEditingParlay(updated);
                }}
                players={PLAYERS}
                sports={SPORTS}
                betTypes={PICK_TYPES}
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                onTeamInput={(partId, value, sport) => {
                  // Extract base participant ID (remove -player1, -player2 suffixes)
                  const baseId = partId.replace(/-player[12]$/, '');
                  const updated = {...editingParlay};
                  
                  // Don't update team field for multi-entity props
                  if (!partId.includes('-player')) {
                    updated.participants[baseId].team = value;
                  }
                  
                  setEditingParlay(updated);
                  handleTeamInput(partId, value, sport);
                }}
                onPropTypeInput={(partId, value) => {
                  // Extract base participant ID (remove -prop1, -prop2 suffixes)
                  const baseId = partId.replace(/-prop[12]$/, '');
                  const updated = {...editingParlay};
                  
                  // Don't update propType field for multi-entity props with separate prop types
                  if (!partId.includes('-prop')) {
                    updated.participants[baseId].propType = value;
                  }
                  
                  setEditingParlay(updated);
                  handlePropTypeInput(partId, value);
                }}
                onAwayTeamInput={(partId, value, sport) => {
                  const updated = {...editingParlay};
                  updated.participants[partId].awayTeam = value;
                  setEditingParlay(updated);
                  handleAwayTeamInput(partId, value, sport);
                }}
                onHomeTeamInput={(partId, value, sport) => {
                  const updated = {...editingParlay};
                  updated.participants[partId].homeTeam = value;
                  setEditingParlay(updated);
                  handleHomeTeamInput(partId, value, sport);
                }}
                onSelectSuggestion={selectSuggestion}
                isMobile={isMobile}
                isEditMode={true}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button 
              variant="secondary" 
              onClick={() => setEditingParlay(null)}
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => saveEditedParlay(editingParlay)}
              disabled={saving}
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
  
const importFromCSV = async (csvText) => {
  try {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const importedParlays = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Build participants object
      const participants = {};
      let pickNum = 0;
      
      for (let j = 1; j <= 5; j++) {
        if (row[`pick${j}_player`]) {
          participants[pickNum] = {
            player: row[`pick${j}_player`],
            sport: row[`pick${j}_sport`],
            team: row[`pick${j}_team`] || '',
            betType: row[`pick${j}_betType`],
            
            // Spread fields
            favorite: row[`pick${j}_favorite`] || 'Favorite',
            spread: row[`pick${j}_spread`] || '',
            
            // Total fields
            awayTeam: row[`pick${j}_awayTeam`] || '',
            homeTeam: row[`pick${j}_homeTeam`] || '',
            overUnder: row[`pick${j}_overUnder`] || 'Over',
            total: row[`pick${j}_total`] || '',
            
            // Prop fields
            propType: row[`pick${j}_propType`] || '',
            line: row[`pick${j}_line`] || '',

            // First Inning Runs field
            yesNoRuns: row[`pick${j}_yesNoRuns`] || '',

            // Quarter field
            quarter: row[`pick${j}_quarter`] || '',

            // Common fields
            odds: row[`pick${j}_odds`] || '',
            result: row[`pick${j}_result`] || 'pending'
          };
          pickNum++;
        }
      }
      
      const parlay = {
        date: row.date,
        betAmount: Number(row.betAmount) || 10,
        totalPayout: Number(row.totalPayout) || 0,
        placedBy: row.placedBy || '', // Optional
        settled: row.settled === 'true' || row.settled === 'TRUE',
        participants: participants,
        id: Date.now() + i + Math.random(), // Ensure unique IDs
        totalParticipants: Object.keys(participants).length
      };
      
      importedParlays.push(parlay);
    }
    
    // Save all to Firebase
    setSaving(true);
    for (const parlay of importedParlays) {
      // Remove 'id' field if it exists to let Firebase generate its own
      const { id, ...parlayWithoutId } = parlay;
      const parlaysCollection = collection(db, 'parlays');
      await addDoc(parlaysCollection, parlayWithoutId);
    }
    // Learn teams/players from imported data
    const newTeams = [...learnedTeams];
    const newPropTypes = [...learnedPropTypes];
    
    importedParlays.forEach(parlay => {
      Object.values(parlay.participants).forEach(p => {
        if (p.team && !newTeams.includes(p.team)) {
          newTeams.push(p.team);
        }
        if (p.awayTeam && !newTeams.includes(p.awayTeam)) {
          newTeams.push(p.awayTeam);
        }
        if (p.homeTeam && !newTeams.includes(p.homeTeam)) {
          newTeams.push(p.homeTeam);
        }
        if (p.propType && !newPropTypes.includes(p.propType)) {
          newPropTypes.push(p.propType);
        }
      });
    });
    
    setLearnedTeams(newTeams);
    setLearnedPropTypes(newPropTypes);
    saveLearnedData(newTeams, newPropTypes);
    
    alert(`Successfully imported ${importedParlays.length} brolays!`);
    setCsvInput(''); // Clear input
  } catch (error) {
    console.error('Import error:', error);
    alert(`Error importing data: ${error.message}`);
  } finally {
    setSaving(false);
  }
};
  

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-3 md:p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">Brolay Toxic Standings</h1>
          <p className="text-gray-600 text-center mb-6">Enter password to access</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              type="submit"
              variant="primary"
              className={`w-full ${isMobile ? 'min-h-[44px]' : ''}`}
            >
              Login
            </Button>
          </form>
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" message="Loading Toxic Standings..." />
        </div>
      </div>
    );
  }

const analyzeSearchQuery = (query) => {
  if (!query || query.trim().length < 3) {
    return null;
  }

  const lowerQuery = query.toLowerCase();
  const results = {
    query: query,
    matchedCategory: null,
    data: {},
    searchContext: null
  };
  
  // Tokenize the search query
  const searchContext = tokenizeQuery(lowerQuery);
  
  // Add players to context
  searchContext.players = players.filter(player => 
    lowerQuery.includes(player.toLowerCase())
  );
  
  // Try to find team match with fuzzy matching
  const allTeams = [...new Set([...Object.values(preloadedTeams).flat(), ...learnedTeams])];
  searchContext.matchedTeam = findBestTeamMatch(lowerQuery, allTeams);

  // Detect what they're searching for - with stricter matching
  const isPropType = commonPropTypes.some(prop => 
    lowerQuery.includes(prop.toLowerCase())
  ) || lowerQuery.includes('prop') || lowerQuery.includes('touchdown') || 
     lowerQuery.includes('yards') || lowerQuery.includes('points');

  const isSport = sports.some(sport => 
    lowerQuery.includes(sport.toLowerCase())
  );

  const isPlayer = searchContext.players.length > 0;

  const isTeam = searchContext.matchedTeam !== null;

  const isBetType = betTypes.some(type => 
    lowerQuery.includes(type.toLowerCase())
  );

  // Check if searching by day of week
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const isDayOfWeek = daysOfWeek.some(day => lowerQuery.includes(day));

  if (isDayOfWeek) {
    results.matchedCategory = 'dayOfWeek';
    
    const matchedDay = daysOfWeek.find(day => lowerQuery.includes(day));
    const dayIndex = daysOfWeek.indexOf(matchedDay);
    
    // Collect all picks on this day of week
    const matchingPicks = [];
    parlays.forEach(parlay => {
      const date = new Date(parlay.date + 'T00:00:00');
      const pickDayIndex = date.getDay();
      
      const adjustedDayIndex = pickDayIndex === 0 ? 6 : pickDayIndex - 1;
      
      if (adjustedDayIndex === dayIndex) {
        Object.values(parlay.participants || {}).forEach(pick => {
          if (pick.result !== 'pending') {
            matchingPicks.push({
              ...pick,
              parlayDate: parlay.date
            });
          }
        });
      }
    });

    // Apply relevance filtering if other criteria specified
    const filteredPicks = searchContext.hasNFL || searchContext.hasNBA || 
                          searchContext.hasMLB || searchContext.hasNHL ||
                          searchContext.hasCollege || isPlayer ?
      filterByRelevance(matchingPicks, searchContext, 8) : matchingPicks;

    const stats = {
      total: filteredPicks.length,
      wins: filteredPicks.filter(p => p.result === 'win').length,
      losses: filteredPicks.filter(p => p.result === 'loss').length,
      pushes: filteredPicks.filter(p => p.result === 'push').length,
      winPct: 0,
      byPlayer: {},
      bySport: {}
    };

    stats.winPct = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;

    filteredPicks.forEach(pick => {
      if (!pick.player || !pick.betType || !pick.sport) return; // Skip incomplete picks
      if (!stats.byPlayer[pick.player]) {
        stats.byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }
      if (!stats.bySport[pick.sport]) {
        stats.bySport[pick.sport] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }

      if (pick.result === 'win') {
        stats.bySport[pick.sport].wins++;
        stats.byBetType[pick.betType].wins++;
      } else if (pick.result === 'loss') {
        stats.bySport[pick.sport].losses++;
        stats.byBetType[pick.betType].losses++;
      } else if (pick.result === 'push') {
        stats.bySport[pick.sport].pushes++;
        stats.byBetType[pick.betType].pushes++;
      }
      stats.bySport[pick.sport].total++;
      stats.byBetType[pick.betType].total++;
    });

    stats.recentPicks = filteredPicks
      .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
      .slice(0, 10);

    results.data = stats;
    results.searchContext = searchContext;
    
    if (filteredPicks.length === 0) return null;
    return results;
  }

  // Prop Type search with relevance filtering
  if (isPropType) {
    results.matchedCategory = 'propType';
    
    const matchedPropType = commonPropTypes.find(prop => 
      lowerQuery.includes(prop.toLowerCase())
    );

    const matchingPicks = [];
    parlays.forEach(parlay => {
      Object.values(parlay.participants || {}).forEach(pick => {
        if (pick.result === 'pending') return;
        
        const pickPropLower = (pick.propType || pick.betType || '').toLowerCase();
        const matchesProp = pickPropLower.includes(lowerQuery) || 
                           lowerQuery.includes(pickPropLower) ||
                           (matchedPropType && pickPropLower.includes(matchedPropType.toLowerCase()));
        
        if (matchesProp) {
          matchingPicks.push({
            ...pick,
            parlayDate: parlay.date
          });
        }
      });
    });

    // Apply relevance filtering for more specific queries
    const filteredPicks = isSport || isPlayer ?
      filterByRelevance(matchingPicks, searchContext, 10) : matchingPicks;

    const stats = {
      total: filteredPicks.length,
      wins: filteredPicks.filter(p => p.result === 'win').length,
      losses: filteredPicks.filter(p => p.result === 'loss').length,
      pushes: filteredPicks.filter(p => p.result === 'push').length,
      winPct: 0,
      byPlayer: {}
    };

    stats.winPct = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;

    filteredPicks.forEach(pick => {
      if (!pick.player) return; // Skip incomplete picks
      if (!stats.byPlayer[pick.player]) {
        stats.byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }
      if (pick.result === 'win') {
        stats.byPlayer[pick.player].wins++;
      } else if (pick.result === 'loss') {
        stats.byPlayer[pick.player].losses++;
      } else if (pick.result === 'push') {
        stats.byPlayer[pick.player].pushes++;
      }
      stats.byPlayer[pick.player].total++;
    });

    stats.recentPicks = filteredPicks
      .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
      .slice(0, 10);

    results.data = stats;
    results.searchContext = searchContext;
    
    if (filteredPicks.length === 0) return null;
    return results;
  }

  // Team search with fuzzy matching
  if (isTeam) {
    results.matchedCategory = 'team';
    
    const matchingPicks = [];
    parlays.forEach(parlay => {
      Object.values(parlay.participants || {}).forEach(pick => {
        if (pick.result === 'pending') return;
        
        // Check ALL possible team-related fields
        const pickTeam = pick.team || '';
        const pickOpp = pick.opponent || '';
        const pickAwayTeam = pick.awayTeam || '';
        const pickHomeTeam = pick.homeTeam || '';
        const pickFavorite = pick.favorite || '';
        
        // Match if the searched team appears in ANY team field
        if (pickTeam.includes(searchContext.matchedTeam) || 
            pickOpp.includes(searchContext.matchedTeam) ||
            pickAwayTeam.includes(searchContext.matchedTeam) ||
            pickHomeTeam.includes(searchContext.matchedTeam) ||
            pickFavorite.includes(searchContext.matchedTeam)) {
          matchingPicks.push({
            ...pick,
            parlayDate: parlay.date
          });
        }
      });
    });
  
    // Apply relevance filtering for specific queries - use lower threshold for team-only searches
    const shouldFilter = isSport || isPlayer || isBetType;
    const filteredPicks = shouldFilter ?
      filterByRelevance(matchingPicks, searchContext, 3) : matchingPicks;
    
    const stats = {
      team: searchContext.matchedTeam,
      total: filteredPicks.length,
      wins: filteredPicks.filter(p => p.result === 'win').length,
      losses: filteredPicks.filter(p => p.result === 'loss').length,
      pushes: filteredPicks.filter(p => p.result === 'push').length,
      winPct: 0,
      byPlayer: {},
      byBetType: {}
    };
  
    stats.winPct = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;
  
    filteredPicks.forEach(pick => {
      if (!pick.player || !pick.betType) return; // Skip incomplete picks
      if (!stats.byPlayer[pick.player]) {
        stats.byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }
      if (!stats.byBetType[pick.betType]) {
        stats.byBetType[pick.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }
  
      if (pick.result === 'win') {
        stats.byPlayer[pick.player].wins++;
        stats.byBetType[pick.betType].wins++;
      } else if (pick.result === 'loss') {
        stats.byPlayer[pick.player].losses++;
        stats.byBetType[pick.betType].losses++;
      } else if (pick.result === 'push') {
        stats.byPlayer[pick.player].pushes++;
        stats.byBetType[pick.betType].pushes++;
      }
      stats.byPlayer[pick.player].total++;
      stats.byBetType[pick.betType].total++;
    });
  
    stats.recentPicks = filteredPicks
      .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
      .slice(0, 10);
  
    results.data = stats;
    results.searchContext = searchContext;
    
    if (filteredPicks.length === 0) return null;
    return results;
  }
  // Sport search with strict matching
  if (isSport) {
    results.matchedCategory = 'sport';
    
    const matchedSport = sports.find(sport => lowerQuery.includes(sport.toLowerCase()));
    
    const matchingPicks = [];
    parlays.forEach(parlay => {
      Object.values(parlay.participants || {}).forEach(pick => {
        if (!pick.player || !pick.betType) return; // Skip incomplete picks
        if (pick.result === 'pending') return;
        if (pick.sport === matchedSport) {
          matchingPicks.push({
            ...pick,
            parlayDate: parlay.date
          });
        }
      });
    });

    // Apply relevance filtering for specific queries
    const filteredPicks = isPlayer || isBetType ?
      filterByRelevance(matchingPicks, searchContext, 10) : matchingPicks;

    const stats = {
      sport: matchedSport,
      total: filteredPicks.length,
      wins: filteredPicks.filter(p => p.result === 'win').length,
      losses: filteredPicks.filter(p => p.result === 'loss').length,
      pushes: filteredPicks.filter(p => p.result === 'push').length,
      winPct: 0,
      byPlayer: {},
      byBetType: {}
    };

    stats.winPct = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;

    filteredPicks.forEach(pick => {
      if (!pick.player || !pick.betType) return; // Skip incomplete picks
      if (!stats.byPlayer[pick.player]) {
        stats.byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }
      if (!stats.byBetType[pick.betType]) {
        stats.byBetType[pick.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }

      if (pick.result === 'win') {
        stats.byPlayer[pick.player].wins++;
      } else if (pick.result === 'loss') {
        stats.byPlayer[pick.player].losses++;
      } else if (pick.result === 'push') {
        stats.byPlayer[pick.player].pushes++;
      }
      stats.byPlayer[pick.player].total++;
      stats.byBetType[pick.betType][pick.result]++;
      stats.byBetType[pick.betType].total++;
    });

    stats.recentPicks = filteredPicks
      .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
      .slice(0, 10);

    results.data = stats;
    results.searchContext = searchContext;
    
    if (filteredPicks.length === 0) return null;
    return results;
  }

  // Player search with relevance filtering
  if (isPlayer) {
    results.matchedCategory = 'player';
    
    const targetPlayer = searchContext.players[0];
    
    const matchingPicks = [];
    parlays.forEach(parlay => {
      Object.values(parlay.participants || {}).forEach(pick => {
        if (pick.result === 'pending') return;
        if (pick.player === targetPlayer) {
          matchingPicks.push({
            ...pick,
            parlayDate: parlay.date
          });
        }
      });
    });

    // Apply relevance filtering for specific queries
    const filteredPicks = isSport || isBetType ?
      filterByRelevance(matchingPicks, searchContext, 8) : matchingPicks;

    const stats = {
      player: targetPlayer,
      total: filteredPicks.length,
      wins: filteredPicks.filter(p => p.result === 'win').length,
      losses: filteredPicks.filter(p => p.result === 'loss').length,
      pushes: filteredPicks.filter(p => p.result === 'push').length,
      winPct: 0,
      bySport: {},
      byBetType: {}
    };

    stats.winPct = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;

    filteredPicks.forEach(pick => {
      if (!pick.sport || !pick.betType) return; // Skip incomplete picks
      if (!stats.bySport[pick.sport]) {
        stats.bySport[pick.sport] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }
      if (!stats.byBetType[pick.betType]) {
        stats.byBetType[pick.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }

      if (pick.result === 'win') {
        stats.bySport[pick.sport].wins++;
        stats.byBetType[pick.betType].wins++;
      } else if (pick.result === 'loss') {
        stats.bySport[pick.sport].losses++;
        stats.byBetType[pick.betType].losses++;
      } else if (pick.result === 'push') {
        stats.bySport[pick.sport].pushes++;
        stats.byBetType[pick.betType].pushes++;
      }
      stats.bySport[pick.sport].total++;
      stats.byBetType[pick.betType].total++;
    });

    stats.recentPicks = filteredPicks
      .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
      .slice(0, 10);

    results.data = stats;
    results.searchContext = searchContext;
    
    if (filteredPicks.length === 0) return null;
    return results;
  }

  return null;
};

const generateSearchInsights = (searchResults) => {
  if (!searchResults || !searchResults.data) return [];
  
  const insights = [];
  const { data, matchedCategory, searchContext } = searchResults;
  
  // Determine if search is specific or general
  const isSpecific = (searchContext.players.length > 0 && 
                     (searchContext.hasNFL || searchContext.hasNBA || 
                      searchContext.hasMLB || searchContext.hasNHL)) ||
                     (searchContext.matchedTeam && 
                      (searchContext.hasMoneyline || searchContext.hasSpread));
  
  if (matchedCategory === 'player') {
    // Player-specific insights
    if (data.total >= 10) {
      const bestSport = Object.entries(data.bySport)
        .sort((a, b) => {
          const aRate = a[1].total > 0 ? (a[1].wins / a[1].total) : 0;
          const bRate = b[1].total > 0 ? (b[1].wins / b[1].total) : 0;
          return bRate - aRate;
        })[0];
      
      if (bestSport && bestSport[1].total >= 5) {
        const winRate = ((bestSport[1].wins / bestSport[1].total) * 100).toFixed(1);
        insights.push(`🎯 ${data.player} performs best in ${bestSport[0]} with a ${winRate}% win rate`);
      }
    }
    
    const bestBetType = Object.entries(data.byBetType)
      .sort((a, b) => {
        const aRate = a[1].total > 0 ? (a[1].wins / a[1].total) : 0;
        const bRate = b[1].total > 0 ? (b[1].wins / b[1].total) : 0;
        return bRate - aRate;
      })[0];
    
    if (bestBetType && bestBetType[1].total >= 3) {
      const winRate = ((bestBetType[1].wins / bestBetType[1].total) * 100).toFixed(1);
      insights.push(`💡 ${bestBetType[0]}s are ${data.player}'s strength at ${winRate}%`);
    }
    
  } else if (matchedCategory === 'sport') {
    // Sport-specific insights
    const bestPlayer = Object.entries(data.byPlayer)
      .filter(([_, stats]) => stats.total >= 5)
      .sort((a, b) => {
        const aRate = (a[1].wins / a[1].total);
        const bRate = (b[1].wins / b[1].total);
        return bRate - aRate;
      })[0];
    
    if (bestPlayer) {
      const winRate = ((bestPlayer[1].wins / bestPlayer[1].total) * 100).toFixed(1);
      insights.push(`⭐ ${bestPlayer[0]} leads in ${data.sport} with ${winRate}% win rate`);
    }
    
    const mostActiveBetType = Object.entries(data.byBetType)
      .sort((a, b) => b[1].total - a[1].total)[0];
    
    if (mostActiveBetType) {
      insights.push(`📊 ${mostActiveBetType[0]} is the most popular bet type for ${data.sport} (${mostActiveBetType[1].total} picks)`);
    }
    
  } else if (matchedCategory === 'team') {
    // Team-specific insights
    if (data.total >= 5) {
      const bestPlayer = Object.entries(data.byPlayer)
        .sort((a, b) => {
          const aRate = a[1].total > 0 ? (a[1].wins / a[1].total) : 0;
          const bRate = b[1].total > 0 ? (b[1].wins / b[1].total) : 0;
          return bRate - aRate;
        })[0];
      
      if (bestPlayer && bestPlayer[1].total >= 3) {
        const winRate = ((bestPlayer[1].wins / bestPlayer[1].total) * 100).toFixed(1);
        insights.push(`🔥 ${bestPlayer[0]} has the best record on ${data.team} at ${winRate}%`);
      }
    }
    
  } else if (matchedCategory === 'propType') {
    // Prop type insights
    const dominantPlayer = Object.entries(data.byPlayer)
      .sort((a, b) => b[1].total - a[1].total)[0];
    
    if (dominantPlayer && dominantPlayer[1].total >= 3) {
      insights.push(`👑 ${dominantPlayer[0]} picks this prop type most often (${dominantPlayer[1].total} times)`);
    }
    
    if (data.winPct >= 60) {
      insights.push(`💰 This prop type has been profitable at ${data.winPct}% win rate!`);
    } else if (data.winPct <= 40) {
      insights.push(`⚠️ Caution: This prop type is below 50% at ${data.winPct}%`);
    }
    
  } else if (matchedCategory === 'dayOfWeek') {
    // Day-specific insights
    const bestSport = Object.entries(data.bySport)
      .filter(([_, stats]) => stats.total >= 3)
      .sort((a, b) => {
        const aRate = a[1].total > 0 ? (a[1].wins / a[1].total) : 0;
        const bRate = b[1].total > 0 ? (b[1].wins / b[1].total) : 0;
        return bRate - aRate;
      })[0];
    
    if (bestSport) {
      const winRate = ((bestSport[1].wins / bestSport[1].total) * 100).toFixed(1);
      insights.push(`🏆 ${bestSport[0]} performs best on this day at ${winRate}%`);
    }
  }
  
  // General insights based on sample size
  if (data.total >= 20) {
    insights.push(`📈 Strong sample size of ${data.total} picks for reliable analysis`);
  } else if (data.total < 10 && data.total > 0) {
    insights.push(`⚠️ Limited data (${data.total} picks) - insights may vary with more samples`);
  }
  
  // Streak detection
  if (data.recentPicks && data.recentPicks.length >= 5) {
    const lastFive = data.recentPicks.slice(0, 5);
    const recentWins = lastFive.filter(p => p.result === 'win').length;
    
    if (recentWins >= 4) {
      insights.push(`🔥 Hot streak! ${recentWins}/5 wins in recent picks`);
    } else if (recentWins <= 1) {
      insights.push(`📉 Cold stretch: ${recentWins}/5 wins in last 5 picks`);
    }
  }
  
  return insights;
};
  
  const renderEntry = () => {
  // Calculate who is currently out
  const getPlayerOut = () => {
    // Get all brolays sorted by date (most recent first)
    const sortedParlays = [...parlays].sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      const aKey = a.id || a.id;
      const bKey = b.id || b.id;
      return String(bKey).localeCompare(String(aKey));
    });

    // Look for the most recent 4-person brolay that either:
    // 1. Was an And-1 (1 loss, rest wins)
    // 2. Was a winning 4-person brolay
    for (const parlay of sortedParlays) {
      const participants = Object.values(parlay.participants || {});
      
      // Skip if not 4 people
      if (participants.length !== 4) continue;
      
      const losers = participants.filter(p => p.result === 'loss');
      const winners = participants.filter(p => p.result === 'win');
      const pushes = participants.filter(p => p.result === 'push');
      
      // Check for And-1 (1 loss, rest wins/pushes)
      const isAnd1 = losers.length === 1 && winners.length === participants.length - 1;
      if (isAnd1) {
        const loserPlayer = losers[0].player;
        return {
          player: loserPlayer,
          reason: 'And-1',
          date: parlay.date,
          parlayId: parlay.id
        };
      }
      
      // Check for winning 4-person brolay (no losses, at least one win)
      const isWinning = losers.length === 0 && winners.length > 0 && pushes.length < participants.length;
      if (isWinning) {
        // Find who was NOT in this brolay
        const participantPlayers = participants.map(p => p.player);
        const playerOut = players.find(p => !participantPlayers.includes(p));
        return {
          player: playerOut,
          reason: '4-person win',
          date: parlay.date,
          parlayId: parlay.id
        };
      }
    }
    
    return null;
  };

  const playerOutInfo = getPlayerOut();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Who's Out Panel */}
      {playerOutInfo && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-600" size={24} />
            <h3 className="text-lg md:text-xl font-bold text-red-900">Who's Out</h3>
          </div>
          <div className="text-base md:text-lg">
            <span className="font-bold text-red-700">{playerOutInfo.player}</span> is currently out
          </div>
          <div className="text-sm text-red-700 mt-1">
            Reason: {playerOutInfo.reason} on {formatDateForDisplay(playerOutInfo.date)}
          </div>
          <div className="text-xs text-red-600 mt-2">
            Next 4-man brolay should not include {playerOutInfo.player}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-400">✨ New Brolay Entry</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
  <div>
    <label className="block text-sm font-medium mb-1 text-white">Bet Amount (per person)</label>
    <input
      type="number"
      value={newParlay.betAmount}
      onChange={(e) => setNewParlay({...newParlay, betAmount: Number(e.target.value)})}
      className="w-full px-3 py-2 border rounded text-base"
      style={{ fontSize: isMobile ? '16px' : '14px' }}
    />
  </div>
  <div>
  <label className="block text-sm font-medium mb-1 text-white">Total Payout</label>
    <input
      type="number"
      value={newParlay.totalPayout || ''}
      onChange={(e) => {
        const payout = Number(e.target.value) || 0;
        setNewParlay({...newParlay, totalPayout: payout});
      }}
      className="w-full px-3 py-2 border rounded text-base"
      style={{ fontSize: isMobile ? '16px' : '14px' }}
      placeholder="Enter total payout"
    />
  </div>
  <div>
  <label className="block text-sm font-medium mb-1 text-white">Net Profit</label>
    <input
      type="number"
      value={Math.max(0, (newParlay.totalPayout || 0) - (newParlay.betAmount * Object.keys(newParlay.participants).length))}
      onChange={(e) => {
        const netProfit = Number(e.target.value) || 0;
        const totalRisk = newParlay.betAmount * Object.keys(newParlay.participants).length;
        const calculatedPayout = netProfit + totalRisk;
        setNewParlay({...newParlay, totalPayout: calculatedPayout});
      }}
      className="w-full px-3 py-2 border rounded text-base"
      style={{ fontSize: isMobile ? '16px' : '14px' }}
      placeholder="Or enter net profit"
      />
    </div>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
    <div className={isMobile ? 'max-w-full overflow-hidden' : ''}>
      <label className="block text-sm font-medium mb-1 text-white">Date</label>
      <input
        type="date"
        value={newParlay.date}
        onChange={(e) => setNewParlay({...newParlay, date: e.target.value})}
        className="w-full px-3 py-2 border rounded text-base"
        style={{ 
          fontSize: isMobile ? '16px' : '14px',
          maxWidth: '100%'
        }}
      />
    </div>
    <div>
    <label className="block text-sm font-medium mb-1 text-white">Placed By</label>
      <select
        value={newParlay.placedBy}
        onChange={(e) => setNewParlay({...newParlay, placedBy: e.target.value})}
        className="w-full px-3 py-2 border rounded text-base"
        style={{ fontSize: isMobile ? '16px' : '14px' }}
      >
        <option value="">Select Big Guy</option>
        {players.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  </div>
        
        <div className="space-y-4 mb-6">
          {(() => {
            const participants = Object.values(newParlay.participants);
            const pushes = participants.filter(p => p.result === 'push');
            const losses = participants.filter(p => p.result === 'loss');
            const wins = participants.filter(p => p.result === 'win');
            const hasPushesAndWon = pushes.length > 0 && losses.length === 0 && wins.length > 0;
            
            return hasPushesAndWon && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 mt-1" size={20} />
                  <div>
                    <h4 className="font-semibold text-yellow-800">Push Detected on Winning Brolay</h4>
                    <p className="text-sm text-yellow-700">
                      {pushes.length} leg{pushes.length > 1 ? 's' : ''} pushed. Make sure to enter the <strong>adjusted payout</strong> you actually received from your sportsbook, not the original expected payout.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
          
          <div className="flex justify-between items-center">
            <h3 className="text-base md:text-lg font-semibold text-yellow-400">Picks</h3>
          </div>
          {Object.entries(newParlay.participants).map(([id, participant]) => (
            <PickEntry
              key={id}
              participant={participant}
              participantId={id}
              onUpdate={updateParticipant}
              onRemove={removeParticipant}
              players={PLAYERS}
              sports={SPORTS}
              betTypes={PICK_TYPES}
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              onTeamInput={handleTeamInput}
              onPropTypeInput={handlePropTypeInput}
              onAwayTeamInput={handleAwayTeamInput}
              onHomeTeamInput={handleHomeTeamInput}
              onSelectSuggestion={selectSuggestion}
              isMobile={isMobile}
            />
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={addParticipant}
            variant="primary"
            className={`flex items-center gap-2 ${isMobile ? 'min-h-[44px]' : ''}`}
          >
            <PlusCircle size={isMobile ? 24 : 20} />
            Add Pick
          </Button>
        </div>
        
        <Button
          onClick={submitParlay}
          disabled={saving}
          variant="success"
          className={`w-full ${isMobile ? 'min-h-[44px]' : ''}`}
        >
          {saving ? 'Submitting...' : 'Submit Brolay'}
        </Button>
      </div>
    </div>
  );
};

const renderIndividualDashboard = () => {
  return (
    <IndividualDashboard
      parlays={parlays}
      players={players}
      applyFilters={applyFilters}
      calculateStatsForPlayer={calculateStatsForPlayer}
      stats={stats}
      currentInsightIndex={currentInsightIndex}
      setCurrentInsightIndex={setCurrentInsightIndex}
      comparisonMode={comparisonMode}
      setComparisonMode={setComparisonMode}
      selectedForComparison={selectedForComparison}
      setSelectedForComparison={setSelectedForComparison}
      filters={filters}
      setFilters={setFilters}
      filtersExpanded={filtersExpanded}
      setFiltersExpanded={setFiltersExpanded}
      preloadedTeams={PRELOADED_TEAMS}
      learnedTeams={learnedTeams}
      isMobile={isMobile}
    />
  );
};

const renderGroupDashboard = () => {
  return (
    <GroupDashboard
      parlays={parlays}
      players={players}
      applyFilters={applyFilters}
      selectedCalendarDate={selectedCalendarDate}
      setSelectedCalendarDate={setSelectedCalendarDate}
      calendarMonth={calendarMonth}
      setCalendarMonth={setCalendarMonth}
      filters={filters}
      setFilters={setFilters}
      filtersExpanded={filtersExpanded}
      setFiltersExpanded={setFiltersExpanded}
      preloadedTeams={PRELOADED_TEAMS}
      learnedTeams={learnedTeams}
      isMobile={isMobile}
      handleESPNSync={handleAutoUpdate}
      isSyncing={autoUpdating}
      autoUpdateStatus={autoUpdateStatus}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchResults={searchResults}
      setSearchResults={setSearchResults}
      lastSearchedQuery={lastSearchedQuery}
      setLastSearchedQuery={setLastSearchedQuery}
      showSuggestions={showSuggestions}
      generateSearchInsights={generateSearchInsights}
    />
  );
};
 
const renderGrid = () => {
  const filteredParlays = applyFilters([...parlays]);
  return <BrolayGrid parlays={filteredParlays} players={players} />;
};  

const renderRankings = () => {
  const filteredParlays = applyFilters([...parlays]);
  return <Rankings parlays={filteredParlays} players={players} />;
};

const renderSearch = () => {
  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 3) {
      setLastSearchedQuery(trimmedQuery);
      
      // Check cache first
      const cacheKey = trimmedQuery.toLowerCase();
      if (searchCache[cacheKey]) {
        setSearchResults(searchCache[cacheKey]);
        return;
      }
      
      const results = analyzeSearchQuery(trimmedQuery);
      setSearchResults(results);
      
      // Cache the results
      if (results) {
        setSearchCache(prev => ({
          ...prev,
          [cacheKey]: results
        }));
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">🔍 Insights & Deep Dive</h2>
      
      {/* Search Bar */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <div className="flex gap-3"><input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder='Try: "Anytime Touchdown Scorer record" or "Chiefs record" or "Management NBA stats"'
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
            style={{ fontSize: isMobile ? '16px' : '14px' }}
          />
          <Button
            onClick={handleSearch}
            variant="primary"
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            Search
          </Button>
        </div>
        
        {/* Search Examples */}     
        <div className="mt-3 text-sm text-gray-600">
          <p className="font-semibold mb-2 text-gray-400">Examples:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'Anytime Touchdown Scorer record',
              'Spread bets stats',
              `${currentDay} picks`,
              'Management NFL stats',
              'Vanderbilt picks'
            ].map(example => (
              <Button
                key={example}
                onClick={() => {
                  setSearchQuery(example);
                  setSearchResults(analyzeSearchQuery(example));
                }}
                variant="ghost"
                size="small"
                className="text-xs"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* No Results Message - Show immediately after search bar */}
      {searchResults === null && lastSearchedQuery && (
        <div className="bg-gradient-to-br from-red-900/30 to-gray-800 rounded-xl p-4 md:p-6 border border-red-500/30">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <p className="text-red-400 font-semibold">
              No results found for "{lastSearchedQuery}"
            </p>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Try searching for a specific prop type, team, player, sport, or bet type.
          </p>
        </div>
      )}

{/* Dynamic Featured Insights - Only show if no search results */}
      {!searchResults && (
        <div className="space-y-4">
          {/* Seasonal Tip Banner */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <div className="font-semibold text-blue-400 text-sm">Today's Tip</div>
                <div className="text-white">{seasonalTip}</div>
              </div>
            </div>
          </div>

          {/* Money Maker & Danger Zone Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Money Maker */}
            {moneyMaker ? (
              <Card 
                variant="success" 
                padding="default"
                className="transform hover:scale-105 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-green-400 font-bold text-lg">💰 Money Maker</h3>
                    <p className="text-gray-400 text-sm">Your best combo</p>
                  </div>
                  <span className="text-2xl">🎯</span>
                </div>
                <p className="text-white text-lg mb-2">{formatComboDescription(moneyMaker)}</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-400 font-bold">{moneyMaker.winRate.toFixed(1)}% win rate</span>
                  <span className="text-gray-400">{moneyMaker.totalPicks} picks</span>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  {moneyMaker.wins}-{moneyMaker.losses} record
                </div>
              </Card>
            ) : (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-yellow-400 font-bold text-lg">💰 Money Maker Alert</h3>
                    <p className="text-gray-400 text-sm">Looking for patterns...</p>
                  </div>
                  <span className="text-2xl">🔍</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Need more data for {currentSports[0]} on {currentDay}s. Keep betting to unlock insights!
                </p>
              </div>
            )}
            
            {/* Danger Zone */}
            {dangerZone ? (
              <Card 
                variant="danger" 
                padding="default"
                className="transform hover:scale-105 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-red-400 font-bold text-lg">⚠️ Danger Zone</h3>
                    <p className="text-gray-400 text-sm">Avoid this combo</p>
                  </div>
                  <span className="text-2xl">🚨</span>
                </div>
                <p className="text-white text-lg mb-2">{formatComboDescription(dangerZone)}</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-red-400 font-bold">{dangerZone.winRate.toFixed(1)}% win rate</span>
                  <span className="text-gray-400">{dangerZone.totalPicks} picks</span>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  {dangerZone.wins}-{dangerZone.losses} record
                </div>
              </Card>
            ) : (
              <Card variant="default" padding="default">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-red-400 font-bold text-lg">⚠️ Danger Zone</h3>
                    <p className="text-gray-400 text-sm">Looking for warning signs...</p>
                  </div>
                  <span className="text-2xl">🔍</span>
                </div>
                <p className="text-gray-400 text-sm">
                  No concerning patterns detected yet. Keep tracking!
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {searchResults && (
        <Card title={`Results for: "${searchResults.query}"`} className="text-yellow-400">
          {(() => {
            const insights = generateSearchInsights(searchResults);
            return insights.length > 0 ? (
              <div className="mb-6 space-y-2">
                <h4 className="font-semibold text-sm text-gray-400">💡 Key Insights</h4>
                <div className="space-y-2">
                  {insights.map((insight, idx) => (
                    <div key={idx} className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-sm text-blue-200">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
          
          {searchResults.matchedCategory === 'propType' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-400">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-900/40 p-4 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Wins</div>
                  <div className="text-2xl font-bold text-green-400">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-900/40 p-4 rounded-lg border border-red-500/30">
                  <div className="text-sm text-red-300">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Win %</div>
                  <div className="text-2xl font-bold text-purple-400">{searchResults.data.winPct}%</div>
                </div>
              </div>
      
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">📊 By Big Guy</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => (
                    <div key={player} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                      <span className="font-semibold text-white">{player}</span>
                      <span className="text-sm text-gray-300">
                        {stats.wins}-{stats.losses}-{stats.pushes} ({stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
                      
              {searchResults.data.topPlayers.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-lg mb-3">🎯 Most Common Players Picked</h4>
                  <div className="space-y-2">
                    {searchResults.data.topPlayers.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="font-semibold">{item.player}</span>
                        <span className="text-sm">{item.count} picks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
      
          {(searchResults.matchedCategory === 'betType' || searchResults.matchedCategory === 'sport') && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-400">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-900/40 p-4 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Wins</div>
                  <div className="text-2xl font-bold text-green-400">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-900/40 p-4 rounded-lg border border-red-500/30">
                  <div className="text-sm text-red-300">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Win %</div>
                  <div className="text-2xl font-bold text-purple-400">{searchResults.data.winPct}%</div>
                </div>
              </div>
      
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">📊 By Big Guy</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => (
                    <div key={player} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                      <span className="font-semibold text-white">{player}</span>
                      <span className="text-sm text-gray-300">
                        {stats.wins}-{stats.losses}-{stats.pushes} ({stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
      
          {searchResults.matchedCategory === 'team' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-400">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-900/40 p-4 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Wins</div>
                  <div className="text-2xl font-bold text-green-400">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-900/40 p-4 rounded-lg border border-red-500/30">
                  <div className="text-sm text-red-300">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Win %</div>
                  <div className="text-2xl font-bold text-purple-400">{searchResults.data.winPct}%</div>
                </div>
              </div>
      
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">📊 Who Picks {searchResults.data.team}?</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => (
                    <div key={player} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                      <span className="font-semibold text-white">{player}</span>
                      <span className="text-sm text-gray-300">
                        {stats.wins}-{stats.losses}-{stats.pushes} ({stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
      
          {searchResults.matchedCategory === 'dayOfWeek' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-400">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-900/40 p-4 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Wins</div>
                  <div className="text-2xl font-bold text-green-400">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-900/40 p-4 rounded-lg border border-red-500/30">
                  <div className="text-sm text-red-300">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Win %</div>
                  <div className="text-2xl font-bold text-purple-400">{searchResults.data.winPct}%</div>
                </div>
              </div>
      
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">📊 By Big Guy</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => (
                    <div key={player} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                      <span className="font-semibold text-white">{player}</span>
                      <span className="text-sm text-gray-300">
                        {stats.wins}-{stats.losses}-{stats.pushes} ({stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
      
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">🏈 By Sport</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.bySport).map(([sport, stats]) => (
                    <div key={sport} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                      <span className="font-semibold text-white">{sport}</span>
                      <span className="text-sm text-gray-300">
                        {stats.wins}-{stats.losses}-{stats.pushes} ({stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
      
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">🎲 By Bet Type</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byBetType).map(([betType, stats]) => (
                    <div key={betType} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                      <span className="font-semibold text-white">{betType}</span>
                      <span className="text-sm text-gray-300">
                        {stats.wins}-{stats.losses}-{stats.pushes} ({stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {searchResults.matchedCategory === 'player' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-400">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-900/40 p-4 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Wins</div>
                  <div className="text-2xl font-bold text-green-400">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-900/40 p-4 rounded-lg border border-red-500/30">
                  <div className="text-sm text-red-300">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Win %</div>
                  <div className="text-2xl font-bold text-purple-400">{searchResults.data.winPct}%</div>
                </div>
              </div>
          
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">📊 By Sport</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.bySport).map(([sport, stats]) => (
                    <div key={sport} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                      <span className="font-semibold text-white">{sport}</span>
                      <span className="text-sm text-gray-300">
                        {stats.wins}-{stats.losses}-{stats.pushes} ({stats.total > 0 ?
                        ((stats.wins / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
      
          {searchResults.data.recentPicks && searchResults.data.recentPicks.length > 0 && (
            <div>
              <h4 className="font-semibold text-lg mb-3 text-yellow-400">📅 Recent Picks</h4>
              <div className="space-y-2">
                {searchResults.data.recentPicks.map((pick, idx) => (
                  <div key={idx} className="p-3 bg-gray-900/50 rounded text-sm border border-gray-700">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-white">{formatDateForDisplay(pick.parlayDate)}</span>
                      <span className={`font-semibold ${
                        pick.result === 'win' ? 'text-green-400' :
                        pick.result === 'loss' ? 'text-red-400' :
                        pick.result === 'push' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {pick.result.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-gray-300">
                      {pick.player} - {pick.sport} - {pick.team || `${pick.awayTeam} @ ${pick.homeTeam}`}
                      {pick.betType === 'Prop Bet' && ` - ${pick.propType} ${pick.overUnder} ${pick.line}`}
                    </div>
                    {pick.actualStats && (
                      <div className="text-blue-400 mt-1">[{pick.actualStats}]</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

const renderAllBrolays = () => {
  return (
    <AllBrolays
      parlays={parlays}
      players={players}
      sports={sports}
      applyFilters={applyFilters}
      calendarMonth={calendarMonth}
      setCalendarMonth={setCalendarMonth}
      getCalendarDays={getCalendarDays}
      selectedCalendarDate={selectedCalendarDate}
      setSelectedCalendarDate={setSelectedCalendarDate}
      calendarView={calendarView}
      setCalendarView={setCalendarView}
      changeMonth={changeMonth}
      formatCalendarDate={formatCalendarDate}
      getBrolaysForDate={getBrolaysForDate}
      formatBetDescription={formatBetDescription}
      setEditingParlay={setEditingParlay}
      deleteParlay={deleteParlay}
      handleAutoUpdate={handleAutoUpdate}
      autoUpdating={autoUpdating}
      isMobile={isMobile}
      filters={filters}
      setFilters={setFilters}
      filtersExpanded={filtersExpanded}
      setFiltersExpanded={setFiltersExpanded}
      preloadedTeams={PRELOADED_TEAMS}
      learnedTeams={learnedTeams}
    />
  );
};

const renderPayments = () => {
  return (
    <Card padding="default">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400 mb-4">💰 Payments</h2>
      <div className="text-center text-gray-400 py-8">
        <p className="text-lg mb-2">Payments feature is being refactored.</p>
        <p className="text-sm">This feature will be restored shortly.</p>
      </div>
    </Card>
  );
};

const renderAllPicks = () => {
  // Flatten all picks with parlay context
  const allPicks = [];
  parlays.forEach(parlay => {
    Object.entries(parlay.participants || {}).forEach(([participantId, pick]) => {
      allPicks.push({
        ...pick,
        participantId,
        parlayId: parlay.id,
        parlayDate: parlay.date,
        parlayBetAmount: parlay.betAmount,
        parlayTotalPayout: parlay.totalPayout,
        parlayPlacedBy: parlay.placedBy
      });
    });
  });

  // Apply filters
  const filteredPicks = allPicks.filter(pick => {
    if (filters.dateFrom && pick.parlayDate < filters.dateFrom) return false;
    if (filters.dateTo && pick.parlayDate > filters.dateTo) return false;
    if (filters.player && pick.player !== filters.player) return false;
    if (filters.sport && pick.sport !== filters.sport) return false;
    if (filters.placedBy && pick.parlayPlacedBy !== filters.placedBy) return false;
    if (filters.result && pick.result !== filters.result) return false;
    if (filters.autoUpdated === 'true' && !pick.autoUpdated) return false;
    if (filters.autoUpdated === 'false' && pick.autoUpdated) return false;
  
  // Bet Type filter
  if (filters.betType && pick.betType !== filters.betType) return false;
  
  // Prop Type filter (only applies to Prop Bets)
  if (filters.propType) {
    if (pick.betType !== 'Prop Bet') return false;
    if (!pick.propType) return false;
    
    const normalizedPickProp = normalizePropType(pick.propType);
    const normalizedFilterProp = normalizePropType(filters.propType);
    
    if (!normalizedPickProp.includes(normalizedFilterProp) && 
        !normalizedFilterProp.includes(normalizedPickProp)) {
      return false;
    }
  }
  
  if (filters.teamPlayer) {
    const normalizedFilter = filters.teamPlayer.toLowerCase();
    const hasTeamPlayer = (pick.team && pick.team.toLowerCase().includes(normalizedFilter)) ||
                          (pick.awayTeam && pick.awayTeam.toLowerCase().includes(normalizedFilter)) ||
                          (pick.homeTeam && pick.homeTeam.toLowerCase().includes(normalizedFilter));
    if (!hasTeamPlayer) return false;
  }
  
  return true;
});

  // Sort by date descending
  const sortedPicks = filteredPicks.sort((a, b) => 
    new Date(b.parlayDate) - new Date(a.parlayDate)
  );

const handleSavePickEdit = async () => {
  console.log('🎯 handleSavePickEdit called');
  console.log('📋 editingPick:', editingPick);
  
  if (!editingPick) {
    console.log('❌ No editingPick found, exiting');
    return;
  }
  
  try {
    setSaving(true);
    
    // Find the parlay this pick belongs to
    const parlay = parlays.find(p => p.id === editingPick.parlayId);
    if (!parlay) {
      console.error('Parlay not found for ID:', editingPick.parlayId);
      alert('Parlay not found');
      return;
    }

    console.log('Found parlay:', parlay);
    console.log('Editing participant:', editingPick.participantId);
    console.log('Current participant data:', parlay.participants[editingPick.participantId]);

    // Get the original participant to preserve any fields we're not editing
    const originalParticipant = parlay.participants[editingPick.participantId];
    
    // Update the specific participant, preserving all original fields
    const updatedParticipants = { ...parlay.participants };
    updatedParticipants[editingPick.participantId] = {
      ...originalParticipant, // Start with original to preserve any extra fields
      player: editingPick.player,
      sport: editingPick.sport,
      team: editingPick.team || '',
      awayTeam: editingPick.awayTeam || '',
      homeTeam: editingPick.homeTeam || '',
      betType: editingPick.betType,
      favorite: editingPick.favorite || 'Favorite',
      spread: editingPick.spread || '',
      total: editingPick.total || '',
      overUnder: editingPick.overUnder || 'Over',
      propType: editingPick.propType || '',
      line: editingPick.line || '',
      odds: editingPick.odds || '',
      yesNoRuns: editingPick.yesNoRuns || '',
      quarter: editingPick.quarter || '',
      result: editingPick.result,
      actualStats: editingPick.actualStats || null,
      autoUpdated: editingPick.autoUpdated || false,
      manuallyOverridden: true // Mark as manually edited
    };

    console.log('Updated participant data:', updatedParticipants[editingPick.participantId]);

    // Update in Firebase
    if (parlay.id) {
      console.log('🔄 Updating Firebase document:', parlay.id);
      console.log('📝 Parlay object:', parlay);
      console.log('📝 Updated participants:', updatedParticipants);
      
      try {
        const result = await updateBrolay(parlay.id, {
          participants: updatedParticipants
        });
        
        console.log('✅ Update result:', result);
        
        if (!result.success) {
          throw new Error(result.error?.message || 'Update failed without error details');
        }
        
        console.log('✅ Firebase update successful');
      } catch (fbError) {
        console.error('💥 Firebase update error:', fbError);
        console.error('Error code:', fbError.code);
        console.error('Error message:', fbError.message);
        console.error('Full error object:', fbError);
        throw fbError;
      }
    } else {
      console.error('❌ No Firestore ID found for parlay');
      console.log('Parlay object:', parlay);
      alert('Cannot update: Parlay has no Firestore ID');
      return;
    }

    // Close the modal and show success
    setEditingPick(null);
    alert('Pick updated successfully!');
    console.log('✅ Edit complete, modal closed');
  } catch (error) {
    console.error('Error updating pick:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    alert(`Failed to update pick: ${error.message || 'Unknown error'}. Check console for details.`);
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">📋 All Individual Picks</h2>
      
      {/* Filters */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <Button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          variant="ghost"
          className="w-full flex justify-between items-center text-base md:text-lg font-semibold mb-2 text-white"
        >
          <span>Filters</span>
          <span className="text-2xl">{filtersExpanded ? '−' : '+'}</span>
        </Button>
        
        {filtersExpanded && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Big Guy</label>
                <select
                  value={filters.player}
                  onChange={(e) => setFilters({...filters, player: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Sport</label>
                <select
                  value={filters.sport}
                  onChange={(e) => setFilters({...filters, sport: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {sports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Placed By</label>
                <select
                  value={filters.placedBy}
                  onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Result</label>
                <select
                  value={filters.result}
                  onChange={(e) => setFilters({...filters, result: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="push">Push</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Auto-Updated</label>
                <select
                  value={filters.autoUpdated}
                  onChange={(e) => setFilters({...filters, autoUpdated: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  <option value="true">Auto-Updated Only</option>
                  <option value="false">Manual Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Team/Player</label>
                <input
                  type="text"
                  value={filters.teamPlayer}
                  onChange={(e) => setFilters({...filters, teamPlayer: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="Search teams/players..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Bet Type</label>
                <select
                  value={filters.betType || ''}
                  onChange={(e) => setFilters({...filters, betType: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {betTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Prop Type</label>
                <input
                  type="text"
                  value={filters.propType || ''}
                  onChange={(e) => setFilters({...filters, propType: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="e.g., Passing Touchdowns"
                  list="prop-type-filter-suggestions"
                />
                <datalist id="prop-type-filter-suggestions">
                  {[...new Set([...commonPropTypes, ...learnedPropTypes])].map((prop, idx) => (
                    <option key={idx} value={prop} />
                  ))}
                </datalist>
              </div>
            </div>
            <Button
              onClick={() => setFilters({
                dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '',
                placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: '',
                betType: '', propType: ''
              })}
              variant="secondary"
              className={`mt-4 ${isMobile ? 'min-h-[44px]' : ''}`}
            >
              Clear Filters
            </Button>
          </>
        )}
      </div>

      {/* Picks List */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg md:text-xl font-bold text-yellow-400">
            {sortedPicks.length} Pick{sortedPicks.length !== 1 ? 's' : ''}
          </h3>
        </div>
        
        <div className="space-y-3">
          {sortedPicks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No picks match your filters</p>
          ) : (
            sortedPicks.slice(0, picksToShow).map((pick, idx) => {
              let teamDisplay = '';
              if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(pick.betType)) {
                teamDisplay = `${pick.awayTeam} @ ${pick.homeTeam}`;
              } else {
                teamDisplay = pick.team;
              }
              
              const betDetails = formatBetDescription(pick);
              
              return (
                <div key={`${pick.parlayId}-${pick.participantId}-${idx}`} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 hover:bg-gray-800/70 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm text-gray-400 mb-1">
                        {formatDateForDisplay(pick.parlayDate)} • Placed by {pick.parlayPlacedBy || 'Unknown'}
                      </div>
                      <div className="font-semibold text-white">
                        <strong className="text-yellow-400">{pick.player}</strong> - {pick.sport} - {teamDisplay} {betDetails}
                      </div>
                      <div className="text-sm text-gray-400">
                        {pick.betType}
                        {pick.odds && ` • ${pick.odds}`}
                      </div>
                      {pick.actualStats && (
                        <div className="text-sm text-blue-400 font-semibold mt-1">
                          [{pick.actualStats}]
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {pick.autoUpdated && (
                        <span 
                          className="text-blue-600 cursor-help" 
                          title={`Auto-updated on ${new Date(pick.autoUpdatedAt).toLocaleString()}`}
                        >
                          🤖
                        </span>
                      )}
                      <span className={`font-semibold text-sm ${
                        pick.result === 'win' ? 'text-green-400' :
                        pick.result === 'loss' ? 'text-red-400' :
                        pick.result === 'push' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {pick.result.toUpperCase()}
                      </span>
                      <Button
                        onClick={() => setEditingPick(pick)}
                        variant="ghost"
                        size="small"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Pagination */}
        {sortedPicks.length > picksToShow && (
          <div className="mt-4 flex gap-3 justify-center">
            <Button
              onClick={() => setPicksToShow(prev => prev + 20)}
              variant="blue"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Show More (20)
            </Button>
            <Button
              onClick={() => setPicksToShow(sortedPicks.length)}
              variant="secondary"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Show All ({sortedPicks.length})
            </Button>
          </div>
        )}
      </div>

      {/* Edit Pick Modal */}
        {editingPick && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4 overflow-y-auto"
                onClick={(e) => {
                  // Close modal if clicking the backdrop
                  if (e.target === e.currentTarget) {
                    setEditingPick(null);
                  }
                }}
              >
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto border border-yellow-500/20" style={{ maxWidth: isMobile ? '100%' : '800px' }}>
            <div className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-400">Edit Pick</h2>
              
              <div className="mb-4 p-3 bg-gray-900/50 border border-gray-700 rounded text-sm">
                <div className="font-semibold text-gray-300">From Brolay:</div>
                <div className="text-gray-400">
                  {formatDateForDisplay(editingPick.parlayDate)} • Placed by {editingPick.parlayPlacedBy || 'Unknown'}
                </div>
              </div>

              {editingPick.autoUpdated && (
                <div className="mb-4 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  ✓ This pick was auto-updated on {new Date(editingPick.autoUpdatedAt).toLocaleString()}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Big Guy</label>
                  <select
                    value={editingPick.player}
                    onChange={(e) => setEditingPick({...editingPick, player: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    <option value="">Select</option>
                    {players.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Sport</label>
                  <select
                    value={editingPick.sport}
                    onChange={(e) => setEditingPick({...editingPick, sport: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    {sports.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Bet Type</label>
                  <select
                    value={editingPick.betType}
                    onChange={(e) => setEditingPick({...editingPick, betType: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    {betTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
              </div>

              {!['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(editingPick.betType) && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1 text-gray-300">Team/Player</label>
                  <input
                    type="text"
                    value={editingPick.team || ''}
                    onChange={(e) => setEditingPick({...editingPick, team: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
              )}

              {['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(editingPick.betType) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Away Team</label>
                    <input
                      type="text"
                      value={editingPick.awayTeam || ''}
                      onChange={(e) => setEditingPick({...editingPick, awayTeam: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Home Team</label>
                    <input
                      type="text"
                      value={editingPick.homeTeam || ''}
                      onChange={(e) => setEditingPick({...editingPick, homeTeam: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {editingPick.betType === 'Prop Bet' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Prop Type</label>
                      <input
                        type="text"
                        value={editingPick.propType || ''}
                        onChange={(e) => setEditingPick({...editingPick, propType: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Over/Under</label>
                      <select
                        value={editingPick.overUnder || 'Over'}
                        onChange={(e) => setEditingPick({...editingPick, overUnder: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      >
                        <option value="Over">Over</option>
                        <option value="Under">Under</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Line</label>
                      <input
                        type="text"
                        value={editingPick.line || ''}
                        onChange={(e) => setEditingPick({...editingPick, line: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Odds (Optional)</label>
                  <input
                    type="text"
                    value={editingPick.odds || ''}
                    onChange={(e) => setEditingPick({...editingPick, odds: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Result</label>
                  <select
                    value={editingPick.result}
                    onChange={(e) => setEditingPick({...editingPick, result: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="push">Push</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Actual Stats (Optional)</label>
                  <input
                    type="text"
                    value={editingPick.actualStats || ''}
                    onChange={(e) => setEditingPick({...editingPick, actualStats: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <Button
                  onClick={() => setEditingPick(null)}
                  variant="secondary"
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePickEdit}
                  disabled={saving}
                  variant="primary"
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const renderSettings = () => {
  const handleRemovePropType = (propType) => {
    if (window.confirm(`Remove "${propType}" from learned prop types?`)) {
      const updatedPropTypes = learnedPropTypes.filter(p => p !== propType);
      setLearnedPropTypes(updatedPropTypes);
      saveLearnedData(learnedTeams, updatedPropTypes);
      alert(`"${propType}" removed successfully!`);
    }
  };

  const handleRemoveTeam = (team) => {
    if (window.confirm(`Remove "${team}" from learned teams?`)) {
      const updatedTeams = learnedTeams.filter(t => t !== team);
      setLearnedTeams(updatedTeams);
      saveLearnedData(updatedTeams, learnedPropTypes);
      alert(`"${team}" removed successfully!`);
    }
  };

  const handleClearAllLearnedData = () => {
    if (window.confirm('Clear ALL learned teams and prop types? This cannot be undone.')) {
      setLearnedTeams([]);
      setLearnedPropTypes([]);
      saveLearnedData([], []);
      alert('All learned data cleared!');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">⚙️ Settings</h2>
      
      {/* Learned Prop Types */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">Learned Prop Types ({learnedPropTypes.length})</h3>
        <p className="text-sm text-gray-600 mb-4">
          These are prop types that have been learned from your betting history. You can remove any that were entered incorrectly.
        </p>
        
        {learnedPropTypes.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No learned prop types yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {learnedPropTypes.sort().map((propType, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <span className="text-sm">{propType}</span>
                <Button
                  onClick={() => handleRemovePropType(propType)}
                  variant="danger"
                  size="small"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learned Teams */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">Learned Teams ({learnedTeams.length})</h3>
        <p className="text-sm text-gray-600 mb-4">
          These are teams that have been learned from your betting history. You can remove any that were entered incorrectly.
        </p>
        
        {learnedTeams.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No learned teams yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {learnedTeams.sort().map((team, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <span className="text-sm">{team}</span>
                <Button
                  onClick={() => handleRemoveTeam(team)}
                  variant="danger"
                  size="small"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6">
          <h3 className="text-lg font-bold text-red-900 mb-4">⚠️ Danger Zone</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <Button
              onClick={handleClearAllLearnedData}
              variant="danger"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Clear All Learned Data
            </Button>
            <Button
              onClick={extractTeamsFromExistingParlays}
              disabled={parlays.length === 0}
              variant="blue"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Extract Teams
            </Button>
            <Button
              onClick={async () => {
                if (window.confirm('Add day of week to all existing brolays? This will update all records in the database.')) {
                  setSaving(true);
                  try {
                    let updatedCount = 0;
                    for (const parlay of parlays) {
                      if (!parlay.dayOfWeek && parlay.date) {
                        const dayOfWeek = getDayOfWeek(parlay.date);
                        if (parlay.id) {
                          await updateBrolay(parlay.id, { dayOfWeek });
                          updatedCount++;
                        }
                      }
                    }
                    alert(`Successfully added day of week to ${updatedCount} brolay(s)!`);
                  } catch (error) {
                    console.error('Error backfilling day of week:', error);
                    alert('Error updating brolays. Please try again.');
                  } finally {
                    setSaving(false);
                  }
                }
              }}
              disabled={parlays.length === 0 || saving}
              variant="success"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Backfill Day of Week
            </Button>
          </div>
        <p className="text-sm text-red-800 mt-3">
          Clear all will remove all learned teams and prop types. Re-extract will scan all your brolays and rebuild the learned data.
        </p>
      </div>
    </div>
  );
};
  
  return (
  <div 
    className="min-h-screen flowing-bg"
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
  >
    {/* Pull to refresh indicator */}
{pullDistance > 0 && (
  <div 
    className="fixed top-0 left-0 right-0 flex justify-center items-center bg-blue-100 transition-all duration-200 z-50"
    style={{ height: `${pullDistance}px` }}
  >
    <div className="text-blue-600 font-semibold">
      {pullDistance > 80 ? 'Release to refresh...' : 'Pull to refresh...'}
    </div>
  </div>
)}

{refreshing && (
  <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white py-2 text-center z-50">
    <Loader className="inline animate-spin mr-2" size={16} />
    Refreshing...
  </div>
)}
    {renderEditModal()}
    <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-md text-white p-4 md:p-6 shadow-2xl border-b border-yellow-500/20 animate-slideInLeft">
  <div className="flex items-center justify-between">
    {isMobile && (
      <Button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        variant="ghost"
        className={isMobile ? 'min-h-[44px]' : ''}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>
    )}
    <div className="flex items-center gap-3 flex-1">
      <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl p-2 md:p-3 shadow-lg">
        <span className="text-2xl md:text-3xl">👑</span>
      </div>
      <div>
        <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-transparent bg-clip-text">
          Brolay Toxic Standings
        </h1>
        <p className="text-gray-400 text-xs md:text-sm">5 Big Guys, Inc.</p>
      </div>
    </div>
    {saving && (
      <div className="text-sm bg-gray-800 px-3 py-1 rounded-lg border border-gray-700">
        <Loader className="inline animate-spin text-yellow-400" size={16} />
      </div>
    )}
  </div>
</div>
    
    {/* Mobile Sidebar Overlay */}
{isMobile && sidebarOpen && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 z-40"
    onClick={() => setSidebarOpen(false)}
  />
)}

{/* Navigation - Enhanced with Dropdowns */}
<div className={`${
  isMobile 
    ? `fixed top-0 left-0 h-full w-64 bg-gray-900 shadow-lg z-50 transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : 'container mx-auto p-4 md:p-6'
}`}>
  <div className={isMobile ? 'pt-20 px-4' : 'mb-6'}>
    <div className={`${
      isMobile ? 'space-y-2' : 'bg-gray-900/80 backdrop-blur-md rounded-xl p-2 border border-gray-700 shadow-xl flex gap-2 flex-wrap animate-slideInRight'
    }`}>
      {/* New Brolay Button */}
      <Button
        onClick={() => {
          const newTab = 'entry';
          setActiveTab(newTab);
          localStorage.setItem('currentActiveTab', newTab);
          if (isMobile) setSidebarOpen(false);
        }}
        variant={activeTab === 'entry' ? 'primary' : 'secondary'}
        className={isMobile ? 'w-full min-h-[44px]' : ''}
      >
        ✨ New Brolay
      </Button>
      
      {/* Brolay Data Dropdown */}
      <div className={`${isMobile ? 'w-full' : 'dropdown'}`}>
        <Button
          onClick={() => {
            if (isMobile) {
              const newState = mobileDropdownOpen === 'brolayData' ? null : 'brolayData';
              setMobileDropdownOpen(newState);
            }
          }}
          onMouseEnter={(e) => !isMobile && e.currentTarget.parentElement.classList.add('dropdown-open')}
          variant={['allBrolays', 'allPicks'].includes(activeTab) ? 'primary' : 'secondary'}
          className={isMobile ? 'w-full min-h-[44px]' : ''}
        >
          📚 Brolay Data {isMobile ? (mobileDropdownOpen === 'brolayData' ? '▲' : '▼') : '▼'}
        </Button>
        {!isMobile && (
          <div 
            className="dropdown-content"
            onMouseLeave={(e) => e.currentTarget.parentElement.classList.remove('dropdown-open')}
          >
            <div className="bg-gray-800 rounded-lg border border-yellow-500/30 shadow-2xl overflow-hidden">
              <Button
                onClick={() => {
                  const newTab = 'allBrolays';
                  setActiveTab(newTab);
                  localStorage.setItem('currentActiveTab', newTab);
                  if (isMobile) setSidebarOpen(false);
                }}
                variant="ghost"
                className="w-full text-left"
              >
                📅 All Brolays
              </Button>
              <Button
                onClick={() => {
                  const newTab = 'allPicks';
                  setActiveTab(newTab);
                  localStorage.setItem('currentActiveTab', newTab);
                  if (isMobile) setSidebarOpen(false);
                }}
                variant="ghost"
                className="w-full text-left"
              >
                📊 All Picks
              </Button>
            </div>
          </div>
        )}
        {isMobile && mobileDropdownOpen === 'brolayData' && (
          <div className="ml-4 mt-2 space-y-2">
            <Button
              onClick={() => {
                setActiveTab('allBrolays');
                setSidebarOpen(false);
                setMobileDropdownOpen(null);
              }}
              variant="ghost"
              className="w-full text-left min-h-[44px]"
            >
              📅 All Brolays
            </Button>
            <Button
              onClick={() => {
                setActiveTab('allPicks');
                setSidebarOpen(false);
                setMobileDropdownOpen(null);
              }}
              variant="ghost"
              className="w-full text-left min-h-[44px]"
            >
              📊 All Picks
            </Button>
          </div>
        )}
      </div>
      
      {/* Analytics Dropdown */}
      <div className={`${isMobile ? 'w-full' : 'dropdown'}`}>
        <Button
          onClick={() => {
            if (isMobile) {
              const newState = mobileDropdownOpen === 'analytics' ? null : 'analytics';
              setMobileDropdownOpen(newState);
            }
          }}
          onMouseEnter={(e) => !isMobile && e.currentTarget.parentElement.classList.add('dropdown-open')}
          variant={['search', 'individual', 'group', 'rankings', 'grid'].includes(activeTab) ? 'primary' : 'secondary'}
          className={isMobile ? 'w-full min-h-[44px]' : ''}
        >
          📈 Analytics {isMobile ? (mobileDropdownOpen === 'analytics' ? '▲' : '▼') : '▼'}
        </Button>
        {!isMobile && (
          <div 
            className="dropdown-content"
            onMouseLeave={(e) => e.currentTarget.parentElement.classList.remove('dropdown-open')}
          >
            <div className="bg-gray-800 rounded-lg border border-yellow-500/30 shadow-2xl overflow-hidden">
              <Button
                onClick={() => {
                  const newTab = 'search';
                  setActiveTab(newTab);
                  localStorage.setItem('currentActiveTab', newTab);
                  if (isMobile) setSidebarOpen(false);
                }}
                variant="ghost"
                className="w-full text-left"
              >
                🔍 Insights
              </Button>
              <Button
                onClick={() => {
                  const newTab = 'individual';
                  setActiveTab(newTab);
                  localStorage.setItem('currentActiveTab', newTab);
                  if (isMobile) setSidebarOpen(false);
                }}
                variant="ghost"
                className="w-full text-left"
              >
                👤 Individual Stats
              </Button>
              <Button
                onClick={() => {
                  const newTab = 'group';
                  setActiveTab(newTab);
                  localStorage.setItem('currentActiveTab', newTab);
                  if (isMobile) setSidebarOpen(false);
                }}
                variant="ghost"
                className="w-full text-left"
              >
                👥 Group Stats
              </Button>
              <Button
                onClick={() => {
                  const newTab = 'rankings';
                  setActiveTab(newTab);
                  localStorage.setItem('currentActiveTab', newTab);
                  if (isMobile) setSidebarOpen(false);
                }}
                variant="ghost"
                className="w-full text-left"
              >
                🏆 Rankings
              </Button>
              <Button
                onClick={() => {
                  const newTab = 'grid';
                  setActiveTab(newTab);
                  localStorage.setItem('currentActiveTab', newTab);
                  if (isMobile) setSidebarOpen(false);
                }}
                variant="ghost"
                className="w-full text-left"
              >
                🎯 Grid View
              </Button>
            </div>
          </div>
        )}
        {isMobile && mobileDropdownOpen === 'analytics' && (
          <div className="ml-4 mt-2 space-y-2">
            <Button
              onClick={() => {
                setActiveTab('search');
                setSidebarOpen(false);
                setMobileDropdownOpen(null);
              }}
              variant="ghost"
              className="w-full text-left min-h-[44px]"
            >
              🔍 Insights
            </Button>
            <Button
              onClick={() => {
                setActiveTab('individual');
                setSidebarOpen(false);
                setMobileDropdownOpen(null);
              }}
              variant="ghost"
              className="w-full text-left min-h-[44px]"
            >
              👤 Individual Stats
            </Button>
            <Button
              onClick={() => {
                setActiveTab('group');
                setSidebarOpen(false);
                setMobileDropdownOpen(null);
              }}
              variant="ghost"
              className="w-full text-left min-h-[44px]"
            >
              👥 Group Stats
            </Button>
            <Button
              onClick={() => {
                setActiveTab('rankings');
                setSidebarOpen(false);
                setMobileDropdownOpen(null);
              }}
              variant="ghost"
              className="w-full text-left min-h-[44px]"
            >
              🏆 Rankings
            </Button>
            <Button
              onClick={() => {
                setActiveTab('grid');
                setSidebarOpen(false);
                setMobileDropdownOpen(null);
              }}
              variant="ghost"
              className="w-full text-left min-h-[44px]"
            >
              🎯 Grid View
            </Button>
          </div>
        )}
      </div>
      
      {/* Payments Button */}
      <Button
        onClick={() => {
          const newTab = 'payments';
          setActiveTab(newTab);
          localStorage.setItem('currentActiveTab', newTab);
          if (isMobile) setSidebarOpen(false);
        }}
        variant={activeTab === 'payments' ? 'primary' : 'secondary'}
        className={isMobile ? 'w-full min-h-[44px]' : ''}
      >
        💰 Payments
      </Button>
      
      {/* Settings (if enabled) */}
      {SHOW_SETTINGS_TAB && (
        <Button
          onClick={() => {
            setActiveTab('settings');
            if (isMobile) setSidebarOpen(false);
          }}
          variant={activeTab === 'settings' ? 'primary' : 'secondary'}
          className={isMobile ? 'w-full min-h-[44px]' : ''}
        >
          ⚙️ Settings
        </Button>
      )}
      
      {/* Import (if enabled) */}
      {SHOW_IMPORT_TAB && (
        <Button
          onClick={() => {
            setActiveTab('import');
            if (isMobile) setSidebarOpen(false);
          }}
          variant={activeTab === 'import' ? 'primary' : 'secondary'}
          className={isMobile ? 'w-full min-h-[44px]' : ''}
        >
          📥 Import Data
        </Button>
      )}
    </div>
  </div>
</div>
  <div className="container mx-auto p-4 md:p-6">
    {activeTab === 'entry' && renderEntry()}
    {activeTab === 'search' && renderSearch()}
    {activeTab === 'allBrolays' && renderAllBrolays()}
    {activeTab === 'allPicks' && renderAllPicks()}
    {activeTab === 'individual' && renderIndividualDashboard()}
    {activeTab === 'group' && renderGroupDashboard()}
    {activeTab === 'payments' && renderPayments()}
    {activeTab === 'rankings' && renderRankings()}
    {activeTab === 'grid' && renderGrid()}
    {activeTab === 'settings' && renderSettings()}
    {activeTab === 'import' && renderImport()}
  </div>
  </div>
);
}

export default App;
