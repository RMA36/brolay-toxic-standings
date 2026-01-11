import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, TrendingUp, Users, Award, AlertCircle, Loader, Menu, X, RefreshCw } from 'lucide-react';

import { getCurrentSportsInSeason, getCurrentDayOfWeek, findMoneyMaker, findDangerZone, getSeasonalTip, formatComboDescription } from './insightsHelper';
import { tokenizeQuery, findBestTeamMatch, filterByRelevance, calculateRelevanceScore, teamAliases } from './searchUtils';

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

import { useBrolays } from './hooks/useBrolays';
import { useESPN } from './hooks/useESPN';

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

    // Helper function to format date to mm/dd/yyyy for display
    const formatDateForDisplay = (dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${month}/${day}/${year}`;
    };
    
    // Helper function to convert mm/dd/yyyy to yyyy-mm-dd for storage
    const formatDateForStorage = (dateStr) => {
      if (!dateStr) return '';
      if (dateStr.includes('-')) return dateStr; // Already in storage format
      const [month, day, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };
  
    const [newParlay, setNewParlay] = useState({
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
// Mobile-specific states
const [isMobile, setIsMobile] = useState(false);
const [sidebarOpen, setSidebarOpen] = useState(false);
const [refreshing, setRefreshing] = useState(false);
const [pullStartY, setPullStartY] = useState(0);
const [pullDistance, setPullDistance] = useState(0);
const [brolaysToShow, setBrolaysToShow] = useState(10);
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
const normalizePlayerName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
};

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

const normalizePropType = (propType) => {
  if (!propType) return '';
  const normalized = propType.toLowerCase().trim();
  
  const mappings = PROP_TYPE_VARIATIONS; // Now imported from constants/sports

  return mappings[normalized] || normalized;
};

const getStatValue = (stats, propType, sport, labels) => {
  if (!stats || !labels) return null;
  
  const statMappings = ESPN_STAT_MAPPINGS; // Now imported from constants/sports
  
  const sportMappings = statMappings[sport] || {};
  const possibleLabels = sportMappings[propType] || [];
  
  if (propType === 'passing completions') {
    const index = labels.findIndex(label => 
      label === 'C/ATT' || label.toUpperCase() === 'COMP'
    );
    
    if (index !== -1 && stats[index] !== undefined) {
      const value = stats[index].toString().split('/')[0];
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return parsed;
    }
  }
  
  for (const possibleLabel of possibleLabels) {
    const index = labels.findIndex(label => 
      label.toUpperCase() === possibleLabel.toUpperCase() ||
      label.toUpperCase().includes(possibleLabel.toUpperCase())
    );
    
    if (index !== -1 && stats[index] !== undefined) {
      const value = parseFloat(stats[index]);
      if (!isNaN(value)) return value;
    }
  }
  
  return null;
};

const fetchOddsFromTheOddsAPI = async (participant, gameDate, eventsData = null) => {
  const { sport, betType, team, awayTeam, homeTeam, propType, overUnder, line, favorite } = participant;
  
  if (!THE_ODDS_API_KEY || THE_ODDS_API_KEY === 'YOUR_API_KEY_HERE') {
    console.warn('The Odds API key not configured');
    return null;
  }
  
  try {
    // Comprehensive sport mapping
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
    
    const oddsApiSport = sportMap[sport];
    if (!oddsApiSport) {
      console.log(`Sport ${sport} not supported by The Odds API`);
      return null;
    }
    
    // Use pre-fetched events if available, otherwise fetch them
    if (!eventsData) {
      const gameDateObj = new Date(gameDate + 'T00:00:00');
      const commenceTimeFrom = gameDateObj.toISOString();
      const gameDateNext = new Date(gameDateObj);
      gameDateNext.setDate(gameDateNext.getDate() + 1);
      const commenceTimeTo = gameDateNext.toISOString();
      
      const eventsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/events?apiKey=${THE_ODDS_API_KEY}&commenceTimeFrom=${commenceTimeFrom}&commenceTimeTo=${commenceTimeTo}`;
      
      console.log(`Fetching events for ${sport} on ${gameDate}`);
      const eventsResponse = await fetch(eventsUrl);
      eventsData = await eventsResponse.json();
    }
    
    if (!eventsData || eventsData.length === 0) {
      console.log('No events found for this date');
      return null;
    }
    
    // Find the matching game
    let matchingEvent = null;
    for (const event of eventsData) {
      if (betType === 'Total' || betType === 'First Half Total' || betType === 'First Inning Runs' || betType === 'Quarter Total') {
        // Match by both teams
        if (matchTeamName(awayTeam, event.away_team) && matchTeamName(homeTeam, event.home_team)) {
          matchingEvent = event;
          break;
        }
      } else {
        // Match by single team
        if (matchTeamName(team, event.home_team) || matchTeamName(team, event.away_team)) {
          matchingEvent = event;
          break;
        }
      }
    }
    
    if (!matchingEvent) {
      console.log('No matching game found');
      return null;
    }
    
    console.log(`Found matching event: ${matchingEvent.away_team} @ ${matchingEvent.home_team}`);
    
    // Determine which markets to fetch based on bet type
    let markets = [];
    if (betType === 'Spread') {
      markets = ['spreads'];
    } else if (betType === 'Moneyline' || betType === 'First Half Moneyline' || betType === 'Quarter Moneyline') {
      markets = ['h2h'];
    } else if (betType === 'Total' || betType === 'First Half Total' || betType === 'Quarter Total') {
      markets = ['totals'];
    } else if (betType === 'Prop Bet') {
      // Comprehensive prop type mapping
      const propTypeMapping = ODDS_API_PROP_MAPPINGS; // Now imported from constants/sports
      
      const normalizedPropType = normalizePropType(propType);
      const oddsApiMarket = propTypeMap[normalizedPropType];
      
      if (!oddsApiMarket) {
        console.log(`Prop type "${propType}" (normalized: "${normalizedPropType}") not available in The Odds API`);
        return null;
      }
      
      markets = [oddsApiMarket];
    } else {
      console.log(`Bet type ${betType} not yet supported`);
      return null;
    }
    
    // Fetch odds for the specific event and markets (FanDuel primary, DraftKings secondary)
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/events/${matchingEvent.id}/odds?apiKey=${THE_ODDS_API_KEY}&regions=us&markets=${markets.join(',')}&oddsFormat=american&bookmakers=fanduel,draftkings`;
    
    console.log(`Fetching odds for markets: ${markets.join(', ')}`);
    const oddsResponse = await fetch(oddsUrl);
    const oddsData = await oddsResponse.json();
    
    if (!oddsData.bookmakers || oddsData.bookmakers.length === 0) {
      console.log('No bookmaker odds available');
      return null;
    }
    
    // Try FanDuel first, then DraftKings as fallback
    let bookmaker = oddsData.bookmakers.find(b => b.key === 'fanduel');
    let bookmakerName = 'FanDuel';
    
    if (!bookmaker || !bookmaker.markets) {
      console.log('FanDuel not available, trying DraftKings...');
      bookmaker = oddsData.bookmakers.find(b => b.key === 'draftkings');
      bookmakerName = 'DraftKings';
      
      if (!bookmaker || !bookmaker.markets) {
        console.log('Neither FanDuel nor DraftKings available');
        return null;
      }
    }
    
    console.log(`Using ${bookmakerName} odds`);
    
    // Process based on bet type
    if (betType === 'Spread') {
      const spreadMarket = bookmaker.markets.find(m => m.key === 'spreads');
      if (!spreadMarket) return null;
      
      const pickedTeamIsHome = matchTeamName(team, matchingEvent.home_team);
      const pickedTeamName = pickedTeamIsHome ? matchingEvent.home_team : matchingEvent.away_team;
      
      const outcome = spreadMarket.outcomes.find(o => o.name === pickedTeamName);
      if (!outcome) return null;
      
      // Verify spread matches (within 0.5 points)
      const pickSpread = parseFloat(line);
      const oddsSpread = Math.abs(parseFloat(outcome.point));
      
      if (Math.abs(pickSpread - oddsSpread) <= 0.5) {
        console.log(`Found spread odds: ${outcome.price} from ${bookmakerName}`);
        return { odds: outcome.price, bookmaker: bookmakerName };
      }
      
    } else if (betType === 'Moneyline' || betType === 'First Half Moneyline' || betType === 'Quarter Moneyline') {
      const moneylineMarket = bookmaker.markets.find(m => m.key === 'h2h');
      if (!moneylineMarket) return null;
      
      const pickedTeamIsHome = matchTeamName(team, matchingEvent.home_team);
      const pickedTeamName = pickedTeamIsHome ? matchingEvent.home_team : matchingEvent.away_team;
      
      const outcome = moneylineMarket.outcomes.find(o => o.name === pickedTeamName);
      if (outcome) {
        console.log(`Found moneyline odds: ${outcome.price} from ${bookmakerName}`);
        return { odds: outcome.price, bookmaker: bookmakerName };
      }
      
    } else if (betType === 'Total' || betType === 'First Half Total' || betType === 'Quarter Total') {
      const totalsMarket = bookmaker.markets.find(m => m.key === 'totals');
      if (!totalsMarket) return null;
      
      const outcome = totalsMarket.outcomes.find(o => o.name === overUnder);
      if (!outcome) return null;
      
      // Verify total matches (within 0.5 points)
      const pickTotal = parseFloat(line);
      const oddsTotal = parseFloat(outcome.point);
      
      if (Math.abs(pickTotal - oddsTotal) <= 0.5) {
        console.log(`Found total odds: ${outcome.price} from ${bookmakerName}`);
        return { odds: outcome.price, bookmaker: bookmakerName };
      }
      
    } else if (betType === 'Prop Bet') {
      const market = bookmaker.markets[0]; // We only requested one market
      if (!market || !market.outcomes) return null;
      
      const playerName = participant.team; // For props, player name is in 'team' field
      
      // Search for matching player
      for (const outcome of market.outcomes) {
        if (!outcome.description) continue;
        
        // Fuzzy match player name
        const outcomePlayerName = outcome.description.toLowerCase();
        const searchPlayerName = playerName.toLowerCase();
        
        if (outcomePlayerName.includes(searchPlayerName) || searchPlayerName.includes(outcomePlayerName)) {
          // Check if line matches
          const outcomeLine = parseFloat(outcome.point);
          const pickLine = parseFloat(line);
          
          if (Math.abs(outcomeLine - pickLine) <= 0.5) {
            // Match over/under direction
            if ((overUnder === 'Over' && outcome.name === 'Over') ||
                (overUnder === 'Under' && outcome.name === 'Under')) {
              console.log(`Found prop odds: ${outcome.price} for ${playerName} ${propType} from ${bookmakerName}`);
              return { odds: outcome.price, bookmaker: bookmakerName };
            }
          }
        }
      }
    }
    
    console.log('No matching odds found');
    return null;
    
  } catch (error) {
    console.error('Error fetching odds from The Odds API:', error);
    if (error.message && error.message.includes('401')) {
      console.error('API Key may be invalid or expired');
    }
    return null;
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
  
  const saveParlays = async (updatedParlays) => {
  try {
    setSaving(true);
    setParlays(updatedParlays);
    // Note: Individual operations (add/update/delete) will handle Firestore sync
  } catch (error) {
    console.error('Error saving data:', error);
    alert('Failed to save data. Please try again.');
  } finally {
    setSaving(false);
  }
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
        yesNoRuns: 'Yes',
        quarter: '1Q',
        result: 'pending'
      }
    }
  });
};
  const updateParticipant = (id, field, value) => {
    setNewParlay({
      ...newParlay,
      participants: {
        ...newParlay.participants,
        [id]: {
          ...newParlay.participants[id],
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
  updateParticipant(id, 'team', value);
  const suggestions = getTeamSuggestions(value, sport);
  setSuggestions(suggestions);
  setShowSuggestions({ ...showSuggestions, [`team-${id}`]: suggestions.length > 0 });
};

const handlePropTypeInput = (id, value) => {
  updateParticipant(id, 'propType', value);
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
  
  const parlayWithId = {
    ...newParlay,
    participants: participantsWithOdds,
    id: Date.now(),
    totalParticipants: participantCount,
    dayOfWeek: getDayOfWeek(newParlay.date)
  };
  
  // Learn from new entries
  const newTeams = [...learnedTeams];
  const newPropTypes = [...learnedPropTypes];
  
  Object.values(parlayWithId.participants).forEach(p => {
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
    const result = await addBrolay(parlayWithId);
    
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
    
    setParlays(updatedParlays);
    
    const parlayToUpdate = updatedParlays.find(p => p.id === parlayId);
    if (parlayToUpdate && parlayToUpdate.firestoreId) {
      try {
        await updateBrolay(parlayToUpdate.firestoreId, {
          participants: parlayToUpdate.participants
        });
      } catch (error) {
        console.error('Error updating parlay:', error);
      }
    }
  };
  
  const toggleSettlement = async (parlayId) => {
  const updatedParlays = parlays.map(parlay => {
    if (parlay.id === parlayId) {
      const newSettled = !parlay.settled;
      return { 
        ...parlay, 
        settled: newSettled,
        settledAt: newSettled ? new Date().toISOString() : null
      };
    }
    return parlay;
  });
  
  setParlays(updatedParlays);
  
  // Update in Firebase
  const parlayToUpdate = updatedParlays.find(p => p.id === parlayId);
  if (parlayToUpdate && parlayToUpdate.firestoreId) {
    try {
      await updateBrolay(parlayToUpdate.firestoreId, {
        settled: parlayToUpdate.settled,
        settledAt: parlayToUpdate.settledAt
      });
    } catch (error) {
      console.error('Error updating settlement:', error);
    }
  }
};
  
  const deleteParlay = async (parlayId) => {
  if (window.confirm('Are you sure you want to delete this parlay?')) {
    const parlayToDelete = parlays.find(p => p.id === parlayId);
    const updatedParlays = parlays.filter(p => p.id !== parlayId);
    setParlays(updatedParlays);
    
    // Delete from Firebase
    if (parlayToDelete && parlayToDelete.firestoreId) {
      try {
        await deleteBrolay(parlayToDelete.firestoreId);
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
    
    // Update in local state
    const updatedParlays = parlays.map(p => 
      p.id === cleanedParlay.id ? cleanedParlay : p
    );
    setParlays(updatedParlays);
    
    // Update in Firebase
    if (cleanedParlay.firestoreId) {
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
      
      await updateBrolay(cleanedParlay.firestoreId, updateObject);
    }
    
    setEditingParlay(null);
  } catch (error) {
    console.error('Error updating parlay:', error);
    alert('Failed to update parlay. Please try again.');
  } finally {
    setSaving(false);
  }
};
  
  // Helper function to render bet-specific fields
const renderBetSpecificFields = (participant, id, isEditMode = false) => {
  const updateFunc = isEditMode 
    ? (field, value) => {
        const updated = {...editingParlay};
        updated.participants[id][field] = value;
        setEditingParlay(updated);
      }
    : (field, value) => updateParticipant(id, field, value);

  const inputStyle = { fontSize: isMobile ? '16px' : '14px' };

  switch(participant.betType) {
    case 'Spread':
      return (
        <>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Favorite/Dog</label>
            <select
              value={participant.favorite || 'Favorite'}
              onChange={(e) => updateFunc('favorite', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="Favorite">Favorite</option>
              <option value="Dog">Dog</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Spread</label>
            <input
              type="text"
              value={participant.spread || ''}
              onChange={(e) => updateFunc('spread', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
              placeholder="e.g., 7.5"
            />
          </div>
        </>
      );

    case 'Total':
      return (
        <>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
            <select
              value={participant.overUnder || 'Over'}
              onChange={(e) => updateFunc('overUnder', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="Over">Over</option>
              <option value="Under">Under</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Total</label>
            <input
              type="text"
              value={participant.total || ''}
              onChange={(e) => updateFunc('total', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
              placeholder="e.g., 45.5"
            />
          </div>
        </>
      );

    case 'First Half Total':
      return (
        <>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
            <select
              value={participant.overUnder || 'Over'}
              onChange={(e) => updateFunc('overUnder', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="Over">Over</option>
              <option value="Under">Under</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">1H Total</label>
            <input
              type="text"
              value={participant.total || ''}
              onChange={(e) => updateFunc('total', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
              placeholder="e.g., 23.5"
            />
          </div>
        </>
      );

    case 'First Half Team Total':
      return (
        <>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
            <select
              value={participant.overUnder || 'Over'}
              onChange={(e) => updateFunc('overUnder', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="Over">Over</option>
              <option value="Under">Under</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Team Total</label>
            <input
              type="text"
              value={participant.total || ''}
              onChange={(e) => updateFunc('total', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
              placeholder="e.g., 13.5"
            />
          </div>
        </>
      );

    case 'First Inning Runs':
      return (
        <div>
          <label className="block text-xs font-medium mb-1 text-white">Yes/No Runs</label>
          <select
            value={participant.yesNoRuns || 'Yes'}
            onChange={(e) => updateFunc('yesNoRuns', e.target.value)}
            className="w-full px-2 py-1 border rounded text-base"
            style={inputStyle}
          >
            <option value="Yes">Yes Runs (YRFI)</option>
            <option value="No">No Runs (NRFI)</option>
          </select>
        </div>
      );

    case 'Quarter Moneyline':
      return (
        <div>
          <label className="block text-xs font-medium mb-1 text-white">Quarter</label>
          <select
            value={participant.quarter || '1Q'}
            onChange={(e) => updateFunc('quarter', e.target.value)}
            className="w-full px-2 py-1 border rounded text-base"
            style={inputStyle}
          >
            <option value="1Q">1st Quarter</option>
            <option value="2Q">2nd Quarter</option>
            <option value="3Q">3rd Quarter</option>
            <option value="4Q">4th Quarter</option>
          </select>
        </div>
      );

    case 'Quarter Total':
      return (
        <>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Quarter</label>
            <select
              value={participant.quarter || '1Q'}
              onChange={(e) => updateFunc('quarter', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="1Q">1st Quarter</option>
              <option value="2Q">2nd Quarter</option>
              <option value="3Q">3rd Quarter</option>
              <option value="4Q">4th Quarter</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
            <select
              value={participant.overUnder || 'Over'}
              onChange={(e) => updateFunc('overUnder', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="Over">Over</option>
              <option value="Under">Under</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Quarter Total</label>
            <input
              type="text"
              value={participant.total || ''}
              onChange={(e) => updateFunc('total', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
              placeholder="e.g., 10.5"
            />
          </div>
        </>
      );

    case 'Quarter Team Total':
      return (
        <>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Quarter</label>
            <select
              value={participant.quarter || '1Q'}
              onChange={(e) => updateFunc('quarter', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="1Q">1st Quarter</option>
              <option value="2Q">2nd Quarter</option>
              <option value="3Q">3rd Quarter</option>
              <option value="4Q">4th Quarter</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
            <select
              value={participant.overUnder || 'Over'}
              onChange={(e) => updateFunc('overUnder', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="Over">Over</option>
              <option value="Under">Under</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Team Total</label>
            <input
              type="text"
              value={participant.total || ''}
              onChange={(e) => updateFunc('total', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
              placeholder="e.g., 7.5"
            />
          </div>
        </>
      );

    case 'Prop Bet':
      return (
        <>
          <div className="relative">
            <label className="block text-xs font-medium mb-1 text-white">Prop Type</label>
            <input
              type="text"
              value={participant.propType || ''}
              onChange={(e) => {
                if (isEditMode) {
                  updateFunc('propType', e.target.value);
                } else {
                  handlePropTypeInput(id, e.target.value);
                }
              }}
              onFocus={(e) => !isEditMode && handlePropTypeInput(id, e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions({}), 200)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
              placeholder="Start typing..."
            />
            {!isEditMode && showSuggestions[`prop-${id}`] && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectSuggestion(id, 'propType', suggestion)}
                    className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
            <select
              value={participant.overUnder || 'Over'}
              onChange={(e) => updateFunc('overUnder', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="Over">Over</option>
              <option value="Under">Under</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Line</label>
            <input
              type="text"
              value={participant.line || ''}
              onChange={(e) => updateFunc('line', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
              placeholder="e.g., 255.5"
            />
          </div>
        </>
      );

    default:
      return null;
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

const formatCalendarDate = (year, month, day) => {
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

const changeMonth = (direction) => {
  const newDate = new Date(calendarMonth);
  newDate.setMonth(newDate.getMonth() + direction);
  setCalendarMonth(newDate);
  setSelectedCalendarDate(null); // Clear selection when changing months
};
  // Helper function to format bet description for display
const formatBetDescription = (participant) => {
  switch(participant.betType) {
    case 'Spread':
      return `${participant.favorite} ${participant.spread}`;
    case 'Total':
      return `${participant.overUnder} ${participant.total}`;
    case 'First Half Moneyline':
      return 'FH ML';
    case 'First Half Total':
      return `FH ${participant.overUnder} ${participant.total}`;
    case 'First Half Team Total':
      return `FH Team ${participant.overUnder} ${participant.total}`;
    case 'First Inning Runs':
      return participant.yesNoRuns === 'Yes' ? 'YRFI' : 'NRFI';
    case 'Quarter Moneyline':
      return `${participant.quarter} ML`;
    case 'Quarter Total':
      return `${participant.quarter} ${participant.overUnder} ${participant.total}`;
    case 'Quarter Team Total':
      return `${participant.quarter} Team ${participant.overUnder} ${participant.total}`;
    case 'Prop Bet':
      return `${participant.propType} ${participant.overUnder} ${participant.line}`;
    case 'Moneyline':
      return 'ML';
    default:
      return '';
  }
};
  
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
      <div className="bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto" style={{ maxWidth: isMobile ? '100%' : '1024px' }}>
        <div className="p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4">Edit Brolay</h2>
          
          {/* Brolay Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={editingParlay.date}
                onChange={(e) => setEditingParlay({...editingParlay, date: e.target.value})}
                className="w-full px-3 py-2 border rounded text-base"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Placed By</label>
              <select
                value={editingParlay.placedBy || ''}
                onChange={(e) => setEditingParlay({...editingParlay, placedBy: e.target.value})}
                className="w-full px-3 py-2 border rounded text-base"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              >
                <option value="">Select Big Guy</option>
                {players.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Bet Amount (per person)</label>
              <input
                type="number"
                value={editingParlay.betAmount}
                onChange={(e) => setEditingParlay({...editingParlay, betAmount: Number(e.target.value)})}
                className="w-full px-3 py-2 border rounded text-base"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total Payout</label>
              <input
                type="number"
                value={editingParlay.totalPayout || ''}
                onChange={(e) => {
                  const payout = Number(e.target.value) || 0;
                  setEditingParlay({...editingParlay, totalPayout: payout});
                }}
                className="w-full px-3 py-2 border rounded text-base"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Net Profit</label>
              <input
                type="number"
                value={Math.max(0, (editingParlay.totalPayout || 0) - (editingParlay.betAmount * Object.keys(participants).length))}
                onChange={(e) => {
                  const netProfit = Number(e.target.value) || 0;
                  const totalRisk = editingParlay.betAmount * Object.keys(participants).length;
                  const calculatedPayout = netProfit + totalRisk;
                  setEditingParlay({...editingParlay, totalPayout: calculatedPayout});
                }}
                className="w-full px-3 py-2 border rounded text-base"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
          </div>

          {/* Picks */}
          <h3 className="text-base md:text-lg font-semibold mb-3">Picks</h3>
          <div className="space-y-4 mb-6">
            {Object.entries(participants).map(([id, participant]) => (
              <div key={id} className="border rounded p-3 md:p-4 bg-gray-50">
                {participant.autoUpdated && (
                  <div className="mb-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    ✓ Auto-updated on {new Date(participant.autoUpdatedAt).toLocaleString()}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white">Big Guy</label>
                    <select
                      value={participant.player}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].player = e.target.value;
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      <option value="">Select</option>
                      {players.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white">Sport</label>
                    <select
                      value={participant.sport}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].sport = e.target.value;
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      {sports.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white">Bet Type</label>
                    <select
                      value={participant.betType}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].betType = e.target.value;
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      {betTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                  
                  {!['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(participant.betType) && (
                    <div>
                      <label className="block text-xs font-medium mb-1 text-white">Team/Player</label>
                      <input
                        type="text"
                        value={participant.team || ''}
                        onChange={(e) => {
                          const updated = {...editingParlay};
                          updated.participants[id].team = e.target.value;
                          setEditingParlay(updated);
                        }}
                        className="w-full px-2 py-1 border rounded text-base"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                  )}
                </div>

                {['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(participant.betType) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-white">Away Team</label>
                      <input
                        type="text"
                        value={participant.awayTeam || ''}
                        onChange={(e) => {
                          const updated = {...editingParlay};
                          updated.participants[id].awayTeam = e.target.value;
                          setEditingParlay(updated);
                        }}
                        className="w-full px-2 py-1 border rounded text-base"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-white">Home Team</label>
                      <input
                        type="text"
                        value={participant.homeTeam || ''}
                        onChange={(e) => {
                          const updated = {...editingParlay};
                          updated.participants[id].homeTeam = e.target.value;
                          setEditingParlay(updated);
                        }}
                        className="w-full px-2 py-1 border rounded text-base"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {renderBetSpecificFields(participant, id, true)}

                  <div>
                    <label className="block text-xs font-medium mb-1 text-white">Odds (Optional)</label>
                    <input
                      type="text"
                      value={participant.odds || ''}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].odds = e.target.value;
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="e.g., -120 (Optional)"
                    />
                    {participant.oddsSource && (
                      <div className="text-xs text-gray-500 mt-1 text-white">Source: {participant.oddsSource}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-white">Result</label>
                    <select
                      value={participant.result}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].result = e.target.value;
                        updated.participants[id].autoUpdated = false;
                        updated.participants[id].manuallyOverridden = e.target.value !== 'pending';
                        // Clear actualStats if setting to pending
                        if (e.target.value === 'pending') {
                          updated.participants[id].actualStats = null;
                        }
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                      <option value="push">Push</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Actual Stats (Optional)</label>
                    <input
                      type="text"
                      value={participant.actualStats || ''}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].actualStats = e.target.value || null;
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="e.g., 212 passing yards"
                    />
                  </div>
                </div>
              </div>
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
            yesNoRuns: row[`pick${j}_yesNoRuns`] || 'Yes',
            
            // Quarter field
            quarter: row[`pick${j}_quarter`] || '1Q',
            
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
      const parlaysCollection = collection(db, 'parlays');
      await addDoc(parlaysCollection, parlay);
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
  
  const calculateStats = () => {
    const stats = {};
    players.forEach(player => {
      stats[player] = {
        totalPicks: 0,
        wins: 0,
        losses: 0,
        moneyWon: 0,
        moneyLost: 0,
        and1s: 0,
        and1Cost: 0,
        bySport: {},
        byBetType: {}
      };
    });

    parlays.forEach(parlay => {
      const participants = Object.values(parlay.participants);
      const losers = participants.filter(p => p.result === 'loss');
      const winners = participants.filter(p => p.result === 'win');
      const parlayWon = losers.length === 0 && winners.length > 0;
      const and1 = losers.length === 1 && winners.length === participants.length - 1;

      participants.forEach(participant => {
        if (!participant.player || participant.player === '') return;
        
        const playerStats = stats[participant.player];
        playerStats.totalPicks++;

        if (!playerStats.bySport[participant.sport]) {
        playerStats.bySport[participant.sport] = { wins: 0, losses: 0, total: 0 };
        }
        playerStats.bySport[participant.sport].total++;
        
        if (!playerStats.byBetType[participant.betType]) {
          playerStats.byBetType[participant.betType] = { wins: 0, losses: 0, total: 0 };
        }
        playerStats.byBetType[participant.betType].total++;

        if (participant.result === 'win') {
          playerStats.wins++;
          playerStats.bySport[participant.sport].wins++;
          playerStats.byBetType[participant.betType].wins++;
          
          if (parlayWon) {
            const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
            playerStats.moneyWon += netProfit / winners.length;
          }
        } else if (participant.result === 'loss') {
          playerStats.losses++;
          playerStats.bySport[participant.sport].losses++;
          playerStats.byBetType[participant.betType].losses++;
          
          if (and1) {
            playerStats.and1s++;
            // For And-1s, the cost is the potential net profit we would have won
            const potentialNetProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
            playerStats.and1Cost += potentialNetProfit;
            playerStats.moneyLost += parlay.betAmount * participants.length;
          } else {
            playerStats.moneyLost += (parlay.betAmount * participants.length) / losers.length;
          }
        }
      });
    });

    return stats;
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

  const stats = calculateStats();

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
      const aKey = a.firestoreId || a.id;
      const bKey = b.firestoreId || b.id;
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
            <div key={id} className="border border-gray-700 rounded-lg p-4 md:p-6 bg-gray-800/50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-white">Big Guy</label>
                  <select
                    value={participant.player}
                    onChange={(e) => updateParticipant(id, 'player', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    <option value="">Select</option>
                    {players.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-white">Sport</label>
                  <select
                    value={participant.sport}
                    onChange={(e) => updateParticipant(id, 'sport', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    {sports.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-white">Bet Type</label>
                  <select
                    value={participant.betType}
                    onChange={(e) => updateParticipant(id, 'betType', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    {betTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
                
                {!['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(participant.betType) && (
                  <div className="relative">
                    <label className="block text-xs font-medium mb-1 text-white">Team/Player</label>
                    <input
                      type="text"
                      value={participant.team}
                      onChange={(e) => handleTeamInput(id, e.target.value, participant.sport)}
                      onFocus={(e) => handleTeamInput(id, e.target.value, participant.sport)}
                      onBlur={() => setTimeout(() => setShowSuggestions({}), 200)}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="Start typing..."
                    />
                    {showSuggestions[`team-${id}`] && suggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto">
                        {suggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            onClick={() => selectSuggestion(id, 'team', suggestion)}
                            className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
          
              {['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(participant.betType) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="relative">
                    <label className="block text-xs font-medium mb-1 text-white">Away Team</label>
                    <input
                      type="text"
                      value={participant.awayTeam || ''}
                      onChange={(e) => handleAwayTeamInput(id, e.target.value, participant.sport)}
                      onFocus={(e) => handleAwayTeamInput(id, e.target.value, participant.sport)}
                      onBlur={() => setTimeout(() => setShowSuggestions({}), 200)}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="Start typing..."
                    />
                    {showSuggestions[`awayTeam-${id}`] && suggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto">
                        {suggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            onClick={() => selectSuggestion(id, 'awayTeam', suggestion)}
                            className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium mb-1 text-white">Home Team</label>
                    <input
                      type="text"
                      value={participant.homeTeam || ''}
                      onChange={(e) => handleHomeTeamInput(id, e.target.value, participant.sport)}
                      onFocus={(e) => handleHomeTeamInput(id, e.target.value, participant.sport)}
                      onBlur={() => setTimeout(() => setShowSuggestions({}), 200)}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="Start typing..."
                    />
                    {showSuggestions[`homeTeam-${id}`] && suggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto">
                        {suggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            onClick={() => selectSuggestion(id, 'homeTeam', suggestion)}
                            className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
          
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                {renderBetSpecificFields(participant, id, false)}
          
                <div>
                  <label className="block text-xs font-medium mb-1 text-white">Odds (Optional)</label>
                  <input
                    type="text"
                    value={participant.odds || ''}
                    onChange={(e) => updateParticipant(id, 'odds', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                    placeholder="e.g., -120 (Optional)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-white">Result</label>
                  <select
                    value={participant.result}
                    onChange={(e) => updateParticipant(id, 'result', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="push">Push</option>
                  </select>
                </div>
              </div>
              <Button
                onClick={() => removeParticipant(id)}
                variant="danger"
                size="small"
                className={isMobile ? 'min-h-[44px]' : ''}
              >
                Remove Pick
              </Button>
            </div>
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

const calculateStatsForPlayer = (player, parlaysList) => {
    const playerStats = {
      totalPicks: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      moneyWon: 0,
      moneyLost: 0,
      and1s: 0,
      and1Cost: 0,
      bySport: {},
      byBetType: {}
    };

parlaysList.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const losers = participants.filter(p => p.result === 'loss');
    const winners = participants.filter(p => p.result === 'win');
    const parlayWon = losers.length === 0 && winners.length > 0;
    const and1 = losers.length === 1 && winners.length === participants.length - 1;
    participants.forEach(participant => {
      if (participant.player !== player) return;
      
      playerStats.totalPicks++;
      if (!playerStats.bySport[participant.sport]) {
        playerStats.bySport[participant.sport] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }
      playerStats.bySport[participant.sport].total++;
      
      if (!playerStats.byBetType[participant.betType]) {
        playerStats.byBetType[participant.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      }
      playerStats.byBetType[participant.betType].total++;
      
      if (participant.result === 'win') {
        playerStats.wins++;
        playerStats.bySport[participant.sport].wins++;
        playerStats.byBetType[participant.betType].wins++;
        
        if (parlayWon) {
          const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
          playerStats.moneyWon += netProfit / winners.length;
        }
      } else if (participant.result === 'loss') {
        playerStats.losses++;
        playerStats.bySport[participant.sport].losses++;
        playerStats.byBetType[participant.betType].losses++;
        
        if (and1) {
          playerStats.and1s++;
          // For And-1s, the cost is the potential net profit we would have won
          const potentialNetProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
          playerStats.and1Cost += potentialNetProfit;
          playerStats.moneyLost += parlay.betAmount * participants.length;
        } else {
          playerStats.moneyLost += (parlay.betAmount * participants.length) / losers.length;
        }
      } else if (participant.result === 'push') {
        playerStats.pushes++;
        playerStats.bySport[participant.sport].pushes++;
        playerStats.byBetType[participant.betType].pushes++;
      }
    });
  });

  return playerStats;
};

const renderIndividualDashboard = () => {
    const filteredParlays = applyFilters([...parlays]);

    const pendingPicksCount = filteredParlays.reduce((count, parlay) => {
        const participants = Object.values(parlay.participants || {});
        return count + participants.filter(p => p.result === 'pending').length;
      }, 0);
    
    // Calculate insights
    const allStats = players.map(p => ({
      player: p,
      ...calculateStatsForPlayer(p, filteredParlays)
    }));
    
    const hottestPlayer = allStats
      .filter(s => s.totalPicks >= 5)
      .sort((a, b) => {
        const aWinRate = ((a.wins + a.pushes * 0.5) / a.totalPicks) * 100;
        const bWinRate = ((b.wins + b.pushes * 0.5) / b.totalPicks) * 100;
        return bWinRate - aWinRate;
      })[0];
    
    const coldestPlayer = allStats
      .filter(s => s.totalPicks >= 5)
      .sort((a, b) => {
        const aWinRate = ((a.wins + a.pushes * 0.5) / a.totalPicks) * 100;
        const bWinRate = ((b.wins + b.pushes * 0.5) / b.totalPicks) * 100;
        return aWinRate - bWinRate;
      })[0];
    
    const biggestWinner = [...allStats].sort((a, b) => 
      (b.moneyWon - b.moneyLost) - (a.moneyWon - a.moneyLost)
    )[0];
    
    const mostAnd1s = [...allStats].sort((a, b) => b.and1s - a.and1s)[0];
    
    const insights = [];
    
    if (hottestPlayer) {
      const winRate = ((hottestPlayer.wins + hottestPlayer.pushes * 0.5) / hottestPlayer.totalPicks * 100).toFixed(1);
      insights.push(`🔥 ${hottestPlayer.player} is on fire with a ${winRate}% win rate!`);
    }
    
    if (coldestPlayer) {
      const winRate = ((coldestPlayer.wins + coldestPlayer.pushes * 0.5) / coldestPlayer.totalPicks * 100).toFixed(1);
      insights.push(`❄️ ${coldestPlayer.player} is struggling at ${winRate}% - time to turn it around!`);
    }
    
    if (biggestWinner && (biggestWinner.moneyWon - biggestWinner.moneyLost) > 0) {
      const netMoney = (biggestWinner.moneyWon - biggestWinner.moneyLost).toFixed(2);
      insights.push(`💰 ${biggestWinner.player} leads with $${netMoney} in profits!`);
    }
    
    if (mostAnd1s && mostAnd1s.and1s > 0) {
      insights.push(`💀 ${mostAnd1s.player} has the most And-1s (${mostAnd1s.and1s}) - so close!`);
    }
       
    const currentInsight = insights[currentInsightIndex] || 'Keep betting to unlock insights!';
    
return (
    <div className="space-y-4 md:space-y-6">
      {/* Rotating Insights Ticker */}
      <div className="bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-blue-900/30 rounded-xl p-4 border border-blue-500/30 overflow-hidden">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <div className="font-semibold text-blue-400 text-sm">Quick Insight</div>
            <div className="text-white text-sm md:text-base">
              {currentInsight}
            </div>
          </div>
        </div>
      </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="text-xl md:text-2xl font-bold text-yellow-400" style={{ margin: 0 }}>👤 Individual Statistics</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {pendingPicksCount > 0 && (
            <Button
              onClick={handleAutoUpdate}
              disabled={autoUpdating}
              variant="primary"
              className={`flex items-center gap-2 ${isMobile ? 'min-h-[44px]' : ''}`}
            >
              <RefreshCw size={isMobile ? 20 : 16} className={autoUpdating ? 'animate-spin' : ''} />
              {autoUpdating ? 'Updating...' : `Auto-Update ${pendingPicksCount} Pending`}
            </Button>
          )}
          <Button
            onClick={() => {
              setComparisonMode(!comparisonMode);
              setSelectedForComparison(new Set());
            }}
            variant={comparisonMode ? 'primary' : 'secondary'}
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            {comparisonMode ? '✓ Comparing' : '🔄 Compare Players'}
          </Button>
        </div>
      </div>
      
      {/* Filters - Collapsible */}
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
                <label className="block text-sm font-medium mb-1 text-gray-300">Min Payout</label>
                <input
                  type="number"
                  value={filters.minPayout}
                  onChange={(e) => setFilters({...filters, minPayout: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="$0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Max Payout</label>
                <input
                  type="number"
                  value={filters.maxPayout}
                  onChange={(e) => setFilters({...filters, maxPayout: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="Any"
                />
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
              <div className="relative">
                <label className="block text-sm font-medium mb-1 text-gray-300">Team/Player</label>
                <input
                  type="text"
                  value={filters.teamPlayer}
                  onChange={(e) => setFilters({...filters, teamPlayer: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="Search teams/players..."
                  list="team-player-suggestions"
                />
                <datalist id="team-player-suggestions">
                  {[...new Set([...Object.values(preloadedTeams).flat(), ...learnedTeams])].map((team, idx) => (
                    <option key={idx} value={team} />
                  ))}
                </datalist>
              </div>
            </div>
            <Button
              onClick={() => setFilters({
                dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '', 
                placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: ''
              })}
              variant="secondary"
              className={`mt-4 ${isMobile ? 'min-h-[44px]' : ''}`}
            >
              Clear Filters
            </Button>
          </>
        )}
      </div>
      
      {/* Leaderboard */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-400">🏆 Leaderboard</h3>
        <div className="space-y-3">
          {players
            .map(player => ({
              player,
              ...calculateStatsForPlayer(player, filteredParlays)
            }))
            .sort((a, b) => {
              const aWinRate = a.totalPicks > 0 ? ((a.wins + a.pushes * 0.5) / a.totalPicks) * 100 : 0;
              const bWinRate = b.totalPicks > 0 ? ((b.wins + b.pushes * 0.5) / b.totalPicks) * 100 : 0;
              return bWinRate - aWinRate;
            })
            .map((stats, index) => {
              const isExpanded = expandedPlayers.has(stats.player);
              const isSelected = selectedForComparison.has(stats.player);
              const adjustedWins = stats.wins + (stats.pushes * 0.5);
              const winPct = stats.totalPicks > 0 
                ? ((adjustedWins / stats.totalPicks) * 100).toFixed(1)
                : '0.0';
              const netMoney = stats.moneyWon - stats.moneyLost;
              
              // Medal for top 3
              const medals = ['🥇', '🥈', '🥉'];
              const medal = index < 3 ? medals[index] : null;

              return (
                <div 
                  key={stats.player} 
                  className={`border rounded-lg transition-all ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-700 bg-gray-800/50'
                  } ${isExpanded ? 'shadow-xl' : 'hover:bg-gray-800/70'}`}
                >
                  {/* Header - Always Visible */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {comparisonMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const newSelected = new Set(selectedForComparison);
                            if (isSelected) {
                              newSelected.delete(stats.player);
                            } else {
                              newSelected.add(stats.player);
                            }
                            setSelectedForComparison(newSelected);
                          }}
                          className="w-5 h-5"
                        />
                      )}
                      <div className="flex items-center gap-2 flex-1">
                        {medal && <span className="text-2xl">{medal}</span>}
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-white">{stats.player}</h4>
                          <div className="text-xs text-gray-400">Rank #{index + 1}</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          const newExpanded = new Set(expandedPlayers);
                          if (isExpanded) {
                            newExpanded.delete(stats.player);
                          } else {
                            newExpanded.add(stats.player);
                          }
                          setExpandedPlayers(newExpanded);
                        }}
                        variant="ghost"
                        size="small"
                        className="text-yellow-400 hover:text-yellow-300"
                      >
                        {isExpanded ? '▲' : '▼'}
                      </Button>
                    </div>

                    {/* Quick Stats - Always Visible */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-900/50 rounded p-2 border border-gray-700">
                        <div className="text-xs text-gray-400">Record</div>
                        <div className="text-sm font-semibold text-white">
                          {stats.wins}-{stats.losses}-{stats.pushes}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-2 border border-gray-700">
                        <div className="text-xs text-gray-400">Win %</div>
                        <div className="text-sm font-semibold text-white">{winPct}%</div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-2 border border-gray-700">
                        <div className="text-xs text-gray-400">Net Money</div>
                        <div className={`text-sm font-semibold ${netMoney >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${netMoney.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-2 border border-gray-700">
                        <div className="text-xs text-gray-400">And-1s</div>
                        <div className="text-sm font-semibold text-red-400">{stats.and1s}</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 p-4 space-y-4 bg-gray-900/30">
                      {/* And-1 Cost */}
                      <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">And-1 Cost (Lost Profit):</span>
                          <span className="text-lg font-bold text-red-400">
                            ${stats.and1Cost.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* By Sport */}
                      {Object.keys(stats.bySport).length > 0 && (
                        <div>
                          <h5 className="font-semibold text-sm mb-2 text-gray-300">📊 By Sport</h5>
                          <div className="space-y-2">
                            {Object.entries(stats.bySport)
                              .sort(([, a], [, b]) => b.total - a.total)
                              .map(([sport, data]) => {
                                const sportWinPct = data.total > 0 ? (((data.wins + data.pushes * 0.5) / data.total) * 100).toFixed(0) : 0;
                                return (
                                  <div key={sport} className="flex justify-between items-center bg-gray-800/50 rounded p-2 border border-gray-700">
                                    <span className="text-sm text-gray-300">{sport}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-gray-400">
                                        {data.wins}-{data.losses}-{data.pushes}
                                      </span>
                                      <span className={`text-sm font-semibold ${
                                        sportWinPct >= 55 ? 'text-green-400' :
                                        sportWinPct >= 45 ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`}>
                                        {sportWinPct}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* By Bet Type */}
                      {Object.keys(stats.byBetType).length > 0 && (
                        <div>
                          <h5 className="font-semibold text-sm mb-2 text-gray-300">🎲 By Bet Type</h5>
                          <div className="space-y-2">
                            {Object.entries(stats.byBetType)
                              .sort(([, a], [, b]) => b.total - a.total)
                              .map(([type, data]) => {
                                const betWinPct = data.total > 0 ? (((data.wins + data.pushes * 0.5) / data.total) * 100).toFixed(0) : 0;
                                return (
                                  <div key={type} className="flex justify-between items-center bg-gray-800/50 rounded p-2 border border-gray-700">
                                    <span className="text-sm text-gray-300">{type}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-gray-400">
                                        {data.wins}-{data.losses}-{data.pushes}
                                      </span>
                                      <span className={`text-sm font-semibold ${
                                        betWinPct >= 55 ? 'text-green-400' :
                                        betWinPct >= 45 ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`}>
                                        {betWinPct}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Comparison Table - Below Leaderboard */}
      {comparisonMode && selectedForComparison.size >= 2 && (
        <div className="bg-gradient-to-br from-purple-900/30 to-gray-800 rounded-xl shadow-xl p-4 md:p-6 border border-purple-500/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-purple-400">
              📊 Comparing {selectedForComparison.size} Players
            </h3>
            <Button
              onClick={() => setSelectedForComparison(new Set())}
              variant="ghost"
              size="small"
              className="text-gray-400 hover:text-red-400"
            >
              Clear Selection
            </Button>
          </div>
          
          {(() => {
            // Calculate stats for all selected players
            const comparisonData = Array.from(selectedForComparison).map(player => {
              const stats = calculateStatsForPlayer(player, filteredParlays);
              const adjustedWins = stats.wins + (stats.pushes * 0.5);
              const winPct = stats.totalPicks > 0 
                ? ((adjustedWins / stats.totalPicks) * 100)
                : 0;
              const netMoney = stats.moneyWon - stats.moneyLost;
              
              return {
                player,
                record: `${stats.wins}-${stats.losses}-${stats.pushes}`,
                winPct,
                netMoney,
                and1s: stats.and1s,
                and1Cost: stats.and1Cost,
                bySport: stats.bySport,
                byBetType: stats.byBetType
              };
            });

            // Find common sports (where all players have 10+ bets)
            const commonSports = {};
            Object.keys(comparisonData[0]?.bySport || {}).forEach(sport => {
              const allHaveEnough = comparisonData.every(p => 
                p.bySport[sport] && p.bySport[sport].total >= 10
              );
              if (allHaveEnough) {
                commonSports[sport] = true;
              }
            });

            // Find common bet types (where all players have 10+ bets)
            const commonBetTypes = {};
            Object.keys(comparisonData[0]?.byBetType || {}).forEach(betType => {
              const allHaveEnough = comparisonData.every(p => 
                p.byBetType[betType] && p.byBetType[betType].total >= 10
              );
              if (allHaveEnough) {
                commonBetTypes[betType] = true;
              }
            });

            // Helper to determine winner for a metric
            const getWinner = (metric, higherIsBetter = true) => {
              const values = comparisonData.map(p => p[metric]);
              const bestValue = higherIsBetter ? Math.max(...values) : Math.min(...values);
              return values.indexOf(bestValue);
            };

            return (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-purple-500/30">
                      <th className="text-left py-3 px-4 text-gray-300 font-semibold sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
                        Metric
                      </th>
                      {comparisonData.map((data, idx) => (
                        <th key={idx} className="text-center py-3 px-4 text-purple-400 font-bold">
                          {data.player}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Overall Stats */}
                    <tr className="border-b border-gray-700">
                      <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
                        Record
                      </td>
                      {comparisonData.map((data, idx) => (
                        <td key={idx} className="py-3 px-4 text-center text-white">
                          {data.record}
                        </td>
                      ))}
                    </tr>

                    <tr className="border-b border-gray-700 bg-gray-800/30">
                      <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
                        Win %
                      </td>
                      {comparisonData.map((data, idx) => {
                        const isWinner = idx === getWinner('winPct', true);
                        return (
                          <td key={idx} className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isWinner && <span className="text-yellow-400">👑</span>}
                              <span className={`font-semibold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                                {data.winPct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-gray-700">
                      <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
                        Net Money
                      </td>
                      {comparisonData.map((data, idx) => {
                        const isWinner = idx === getWinner('netMoney', true);
                        return (
                          <td key={idx} className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isWinner && <span className="text-yellow-400">👑</span>}
                              <span className={`font-semibold ${
                                isWinner ? 'text-yellow-400' : 
                                data.netMoney >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                ${data.netMoney.toFixed(2)}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-gray-700 bg-gray-800/30">
                      <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
                        And-1s
                      </td>
                      {comparisonData.map((data, idx) => {
                        const isWinner = idx === getWinner('and1s', false); // Lower is better
                        return (
                          <td key={idx} className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isWinner && <span className="text-yellow-400">👑</span>}
                              <span className={`font-semibold ${isWinner ? 'text-yellow-400' : 'text-red-400'}`}>
                                {data.and1s}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="border-b border-gray-700">
                      <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
                        And-1 Cost
                      </td>
                      {comparisonData.map((data, idx) => {
                        const isWinner = idx === getWinner('and1Cost', false); // Lower is better
                        return (
                          <td key={idx} className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isWinner && <span className="text-yellow-400">👑</span>}
                              <span className={`font-semibold ${isWinner ? 'text-yellow-400' : 'text-red-400'}`}>
                                ${data.and1Cost.toFixed(2)}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* By Sport - Only sports where all have 10+ */}
                    {Object.keys(commonSports).length > 0 && (
                      <>
                        <tr>
                          <td colSpan={comparisonData.length + 1} className="py-3 px-4 bg-gray-700/50">
                            <h4 className="font-bold text-purple-400">📊 By Sport (10+ bets)</h4>
                          </td>
                        </tr>
                        {Object.keys(commonSports).map(sport => (
                          <tr key={sport} className="border-b border-gray-700">
                            <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
                              {sport}
                            </td>
                            {comparisonData.map((data, idx) => {
                              const sportData = data.bySport[sport];
                              const sportWinPct = sportData.total > 0 
                                ? (((sportData.wins + sportData.pushes * 0.5) / sportData.total) * 100)
                                : 0;
                              
                              // Find winner for this sport
                              const sportWinPcts = comparisonData.map(p => {
                                const sd = p.bySport[sport];
                                return sd.total > 0 ? (((sd.wins + sd.pushes * 0.5) / sd.total) * 100) : 0;
                              });
                              const bestSportWinPct = Math.max(...sportWinPcts);
                              const isWinner = sportWinPct === bestSportWinPct;

                              return (
                                <td key={idx} className="py-3 px-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2">
                                      {isWinner && <span className="text-yellow-400">👑</span>}
                                      <span className={`font-semibold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                                        {sportWinPct.toFixed(1)}%
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {sportData.wins}-{sportData.losses}-{sportData.pushes}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    )}

                    {/* By Bet Type - Only bet types where all have 10+ */}
                    {Object.keys(commonBetTypes).length > 0 && (
                      <>
                        <tr>
                          <td colSpan={comparisonData.length + 1} className="py-3 px-4 bg-gray-700/50">
                            <h4 className="font-bold text-purple-400">🎲 By Bet Type (10+ bets)</h4>
                          </td>
                        </tr>
                        {Object.keys(commonBetTypes).map(betType => (
                          <tr key={betType} className="border-b border-gray-700">
                            <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
                              {betType}
                            </td>
                            {comparisonData.map((data, idx) => {
                              const betData = data.byBetType[betType];
                              const betWinPct = betData.total > 0 
                                ? (((betData.wins + betData.pushes * 0.5) / betData.total) * 100)
                                : 0;
                              
                              // Find winner for this bet type
                              const betWinPcts = comparisonData.map(p => {
                                const bd = p.byBetType[betType];
                                return bd.total > 0 ? (((bd.wins + bd.pushes * 0.5) / bd.total) * 100) : 0;
                              });
                              const bestBetWinPct = Math.max(...betWinPcts);
                              const isWinner = betWinPct === bestBetWinPct;

                              return (
                                <td key={idx} className="py-3 px-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2">
                                      {isWinner && <span className="text-yellow-400">👑</span>}
                                      <span className={`font-semibold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                                        {betWinPct.toFixed(1)}%
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {betData.wins}-{betData.losses}-{betData.pushes}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

const renderGroupDashboard = () => {
  const filteredParlays = applyFilters([...parlays]);
  
  const pendingPicksCount = filteredParlays.reduce((count, parlay) => {
    const participants = Object.values(parlay.participants || {});
    return count + participants.filter(p => p.result === 'pending').length;
  }, 0);
  
  const totalParlays = filteredParlays.length;
  const wonParlays = filteredParlays.filter(p => {
    const participants = Object.values(p.participants);
    const losers = participants.filter(part => part.result === 'loss');
    return losers.length === 0 && participants.some(part => part.result === 'win');
  }).length;
  const lostParlays = filteredParlays.filter(p => {
    const participants = Object.values(p.participants);
    return participants.some(part => part.result === 'loss');
  }).length;
  const pendingParlays = totalParlays - wonParlays - lostParlays;
  const groupWinPct = totalParlays > 0 ? ((wonParlays / totalParlays) * 100).toFixed(1) : '0.0';

  // Calculate by sport
  const bySport = {};
  filteredParlays.forEach(p => {
    const participants = Object.values(p.participants);
    
    participants.forEach(part => {
      if (part.sport) {
        if (!bySport[part.sport]) {
          bySport[part.sport] = { total: 0, won: 0, lost: 0, pending: 0 };
        }
        bySport[part.sport].total++;
        if (part.result === 'win') bySport[part.sport].won++;
        else if (part.result === 'loss') bySport[part.sport].lost++;
        else if (part.result === 'pending') bySport[part.sport].pending++;
      }
    });
  });

  // Last 10 brolays
  const last10Brolays = [...filteredParlays]
    .sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      const aKey = a.firestoreId || a.id;
      const bKey = b.firestoreId || b.id;
      return String(bKey).localeCompare(String(aKey));
    })
    .slice(0, 10);
  
  const last10Won = last10Brolays.filter(p => {
    const participants = Object.values(p.participants);
    const losers = participants.filter(part => part.result === 'loss');
    return losers.length === 0 && participants.some(part => part.result === 'win');
  }).length;
  
  const last10Lost = last10Brolays.filter(p => {
    const participants = Object.values(p.participants);
    return participants.some(part => part.result === 'loss');
  }).length;

  // Current month stats
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthBrolays = filteredParlays.filter(p => {
    const parlayDate = new Date(p.date + 'T00:00:00');
    return parlayDate >= currentMonthStart;
  });
  
  const currentMonthWon = currentMonthBrolays.filter(p => {
    const participants = Object.values(p.participants);
    const losers = participants.filter(part => part.result === 'loss');
    return losers.length === 0 && participants.some(part => part.result === 'win');
  }).length;
  
  const currentMonthLost = currentMonthBrolays.filter(p => {
    const participants = Object.values(p.participants);
    return participants.some(part => part.result === 'loss');
  }).length;

  // Calculate total money metrics
  const totalMoneyWon = filteredParlays
    .filter(p => {
      const participants = Object.values(p.participants);
      const losers = participants.filter(part => part.result === 'loss');
      return losers.length === 0 && participants.some(part => part.result === 'win');
    })
    .reduce((sum, p) => {
      const participants = Object.values(p.participants);
      const netProfit = Math.max(0, (p.totalPayout || 0) - (p.betAmount * participants.length));
      return sum + netProfit;
    }, 0);
  
  const totalMoneyLost = filteredParlays
    .filter(p => {
      const participants = Object.values(p.participants);
      return participants.some(part => part.result === 'loss');
    })
    .reduce((sum, p) => {
      const participants = Object.values(p.participants);
      return sum + (p.betAmount * participants.length);
    }, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold text-yellow-400">👥 Group Statistics</h2>
        {pendingPicksCount > 0 && (
          <Button
            onClick={handleAutoUpdate}
            disabled={autoUpdating}
            variant="primary"
            className={`flex items-center gap-2 ${isMobile ? 'min-h-[44px]' : ''}`}
          >
            <RefreshCw size={isMobile ? 20 : 16} className={autoUpdating ? 'animate-spin' : ''} />
            {autoUpdating ? 'Updating...' : `Auto-Update ${pendingPicksCount} Pending`}
          </Button>
        )}
      </div>
      
      {/* Filters - Collapsible */}
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
                <label className="block text-sm font-medium mb-1 text-gray-300">Min Payout</label>
                <input
                  type="number"
                  value={filters.minPayout}
                  onChange={(e) => setFilters({...filters, minPayout: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="$0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Max Payout</label>
                <input
                  type="number"
                  value={filters.maxPayout}
                  onChange={(e) => setFilters({...filters, maxPayout: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="Any"
                />
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
              <div className="relative">
                <label className="block text-sm font-medium mb-1 text-gray-300">Team/Player</label>
                <input
                  type="text"
                  value={filters.teamPlayer}
                  onChange={(e) => setFilters({...filters, teamPlayer: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="Search teams/players..."
                  list="team-player-suggestions"
                />
                <datalist id="team-player-suggestions">
                  {[...new Set([...Object.values(preloadedTeams).flat(), ...learnedTeams])].map((team, idx) => (
                    <option key={idx} value={team} />
                  ))}
                </datalist>
              </div>
            </div>
            <Button
              onClick={() => setFilters({
                dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '', 
                placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: ''
              })}
              variant="secondary"
              className={`mt-4 ${isMobile ? 'min-h-[44px]' : ''}`}
            >
              Clear Filters
            </Button>
          </>
        )}
      </div>
      
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
        <Card variant="info" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-400" size={28} />
            <h3 className="text-base md:text-lg font-semibold text-blue-400">Total Brolays</h3>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-white">{totalParlays}</p>
          <p className="text-sm text-gray-400 mt-1">
            {wonParlays}W-{lostParlays}L
          </p>
        </Card>
        
        <Card variant="success" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-400" size={28} />
            <h3 className="text-base md:text-lg font-semibold text-green-400">Win Rate</h3>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-white">{groupWinPct}%</p>
          <p className="text-sm text-gray-400 mt-1">
            {wonParlays} wins out of {totalParlays}
          </p>
        </Card>
        
        <Card variant="warning" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <Award className="text-yellow-400" size={28} />
            <h3 className="text-base md:text-lg font-semibold text-yellow-400">Net Profit</h3>
          </div>
          <p className={`text-3xl md:text-4xl font-bold ${
            (totalMoneyWon - totalMoneyLost) >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            ${(totalMoneyWon - totalMoneyLost).toFixed(0)}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            ${totalMoneyWon.toFixed(0)} won, ${totalMoneyLost.toFixed(0)} lost
          </p>
        </Card>

        <Card variant="info" padding="default" className="bg-gradient-to-br from-purple-900/30 to-gray-800 border-purple-500/30">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-purple-400" size={28} />
            <h3 className="text-base md:text-lg font-semibold text-purple-400">Avg Payout</h3>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-white">
            ${wonParlays > 0 ? (totalMoneyWon / wonParlays).toFixed(0) : 0}
          </p>
        </Card>
      </div>

      {/* Recent Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
          <h3 className="text-lg font-bold mb-4 text-yellow-400">📅 This Month</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Brolays:</span>
              <span className="text-white font-semibold text-lg">{currentMonthBrolays.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Record:</span>
              <span className="text-white font-semibold text-lg">
                {currentMonthWon}-{currentMonthLost}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Win Rate:</span>
              <span className={`font-bold text-lg ${
                currentMonthBrolays.length > 0 && ((currentMonthWon / currentMonthBrolays.length) * 100) >= 50 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {currentMonthBrolays.length > 0 
                  ? ((currentMonthWon / currentMonthBrolays.length) * 100).toFixed(1) 
                  : '0.0'}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
          <h3 className="text-lg font-bold mb-4 text-yellow-400">🔥 Last 10 Brolays</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Record:</span>
              <span className="text-white font-semibold text-lg">
                {last10Won}-{last10Lost}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Net Profit:</span>
              <span className={`font-bold text-lg ${
                (() => {
                  const last10NetProfit = last10Brolays.reduce((sum, parlay) => {
                    const participants = Object.values(parlay.participants);
                    const losers = participants.filter(p => p.result === 'loss');
                    const winners = participants.filter(p => p.result === 'win');
                    const won = losers.length === 0 && winners.length > 0;
                    
                    if (won) {
                      return sum + ((parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
                    } else if (losers.length > 0) {
                      return sum - (parlay.betAmount * participants.length);
                    }
                    return sum;
                  }, 0);
                  return last10NetProfit >= 0 ? 'text-green-400' : 'text-red-400';
                })()
              }`}>
                ${(() => {
                  const last10NetProfit = last10Brolays.reduce((sum, parlay) => {
                    const participants = Object.values(parlay.participants);
                    const losers = participants.filter(p => p.result === 'loss');
                    const winners = participants.filter(p => p.result === 'win');
                    const won = losers.length === 0 && winners.length > 0;
                    
                    if (won) {
                      return sum + ((parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
                    } else if (losers.length > 0) {
                      return sum - (parlay.betAmount * participants.length);
                    }
                    return sum;
                  }, 0);
                  return last10NetProfit.toFixed(2);
                })()}
              </span>
            </div>
            <div className="flex gap-1 mt-2">
              {last10Brolays.map((parlay, idx) => {
                const participants = Object.values(parlay.participants);
                const losers = participants.filter(p => p.result === 'loss');
                const winners = participants.filter(p => p.result === 'win');
                const won = losers.length === 0 && winners.length > 0;
                const lost = losers.length > 0;
                
                return (
                  <div
                    key={idx}
                    className={`flex-1 h-8 rounded ${
                      won ? 'bg-green-500' : lost ? 'bg-red-500' : 'bg-gray-600'
                    }`}
                    title={`${formatDateForDisplay(parlay.date)} - ${won ? 'Won' : lost ? 'Lost' : 'Pending'}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Performance by Sport */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-400">🏆 Performance by Sport</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {Object.entries(bySport)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([sport, data]) => {
              const winPct = data.total > 0 ? ((data.won / data.total) * 100).toFixed(1) : '0.0';
              return (
                <div key={sport} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white">{sport}</h4>
                    <span className={`text-sm font-bold px-2 py-1 rounded ${
                      parseFloat(winPct) >= 55 ? 'bg-green-500/20 text-green-400' :
                      parseFloat(winPct) >= 45 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {winPct}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {data.won}-{data.lost} ({data.total} picks)
                  </div>
                  {data.pending > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {data.pending} pending
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
      {/* Sport Distribution Pie Chart */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-400">📊 Sport Distribution</h3>
        <div className="flex justify-center">
          {/* Pie Chart */}
          <div className="relative" style={{ width: '400px', height: '400px' }}>
            <svg viewBox="0 0 200 200" className="transform -rotate-90">
              {(() => {
                const sortedSports = Object.entries(bySport).sort(([, a], [, b]) => b.total - a.total);
                const totalPicks = sortedSports.reduce((sum, [, data]) => sum + data.total, 0);
                let cumulativePercent = 0;
                
                return sortedSports.map(([sport, data], idx) => {
                  const percentage = (data.total / totalPicks) * 100;
                  const hue = idx * 360 / sortedSports.length;
                  
                  // Calculate SVG arc
                  const startAngle = (cumulativePercent / 100) * 360;
                  const endAngle = ((cumulativePercent + percentage) / 100) * 360;
                  const midAngle = (startAngle + endAngle) / 2;
                  cumulativePercent += percentage;
                  
                  const startRad = (startAngle - 90) * Math.PI / 180;
                  const endRad = (endAngle - 90) * Math.PI / 180;
                  
                  const x1 = 100 + 80 * Math.cos(startRad);
                  const y1 = 100 + 80 * Math.sin(startRad);
                  const x2 = 100 + 80 * Math.cos(endRad);
                  const y2 = 100 + 80 * Math.sin(endRad);
                  
                  const largeArcFlag = percentage > 50 ? 1 : 0;
                  
                  const pathData = [
                    `M 100 100`,
                    `L ${x1} ${y1}`,
                    `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    `Z`
                  ].join(' ');
                  
                  // Calculate label position (for large slices)
                  const midRad = (midAngle - 90) * Math.PI / 180;
                  const labelRadius = 50; // Closer to center for label
                  const labelX = 100 + labelRadius * Math.cos(midRad);
                  const labelY = 100 + labelRadius * Math.sin(midRad);
                  
                  const showLabel = percentage >= 15; // Only show labels for slices >= 15%
                  
                  return (
                    <g key={sport}>
                      <path
                        d={pathData}
                        fill={`hsl(${hue}, 70%, 55%)`}
                        stroke="#1f2937"
                        strokeWidth="1"
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                        data-sport={sport}
                        data-total={data.total}
                        data-percentage={percentage.toFixed(1)}
                        onMouseEnter={(e) => {
                          const tooltip = document.getElementById('sport-tooltip');
                          tooltip.style.display = 'block';
                          tooltip.innerHTML = `
                            <div class="bg-gray-900 text-white p-3 rounded-lg border border-gray-700 shadow-xl">
                              <div class="font-bold text-yellow-400">${sport}</div>
                              <div class="text-sm">${data.total} picks (${percentage.toFixed(1)}%)</div>
                              <div class="text-xs text-gray-400 mt-1">${data.won}W-${data.lost}L</div>
                            </div>
                          `;
                        }}
                        onMouseMove={(e) => {
                          const tooltip = document.getElementById('sport-tooltip');
                          tooltip.style.left = e.pageX + 10 + 'px';
                          tooltip.style.top = e.pageY + 10 + 'px';
                        }}
                        onMouseLeave={() => {
                          const tooltip = document.getElementById('sport-tooltip');
                          tooltip.style.display = 'none';
                        }}
                      />
                      {showLabel && (
                        <g transform={`rotate(${midAngle} ${labelX} ${labelY})`}>
                          <text
                            x={labelX}
                            y={labelY}
                            fill="white"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="pointer-events-none"
                          >
                            {sport}
                          </text>
                          <text
                            x={labelX}
                            y={labelY + 12}
                            fill="white"
                            fontSize="8"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="pointer-events-none"
                          >
                            {percentage.toFixed(1)}%
                          </text>
                        </g>
                      )}
                    </g>
                  );
                });
              })()}
            </svg>
            {/* Center circle for donut effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-gray-800 rounded-full" style={{ width: '120px', height: '120px' }} />
            </div>
            {/* Tooltip */}
            <div id="sport-tooltip" style={{ display: 'none', position: 'fixed', zIndex: 1000, pointerEvents: 'none' }}></div>
          </div>
        </div>
      </div>
      
      {/* Rolling 12-Month Stats */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-400">📅 Rolling 12-Month Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(() => {
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
            
            const recentBrolays = filteredParlays.filter(p => {
              const parlayDate = new Date(p.date + 'T00:00:00');
              return parlayDate >= twelveMonthsAgo;
            });
            
            const recent12Won = recentBrolays.filter(p => {
              const participants = Object.values(p.participants);
              const losers = participants.filter(part => part.result === 'loss');
              return losers.length === 0 && participants.some(part => part.result === 'win');
            }).length;
            
            const recent12Lost = recentBrolays.filter(p => {
              const participants = Object.values(p.participants);
              return participants.some(part => part.result === 'loss');
            }).length;
            
            const recent12WinRate = recentBrolays.length > 0 
              ? ((recent12Won / recentBrolays.length) * 100).toFixed(1) 
              : '0.0';
            
            const recent12Payout = recentBrolays
              .filter(p => {
                const participants = Object.values(p.participants);
                const losers = participants.filter(part => part.result === 'loss');
                return losers.length === 0 && participants.some(part => part.result === 'win');
              })
              .reduce((sum, p) => {
                const participants = Object.values(p.participants);
                return sum + Math.max(0, (p.totalPayout || 0) - (p.betAmount * participants.length));
              }, 0);

            return (
              <>
                <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500/30">
                  <div className="text-sm text-gray-400 mb-1">Record</div>
                  <div className="text-2xl font-bold text-white">
                    {recent12Won}W-{recent12Lost}L
                  </div>
                </div>
                <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/30">
                  <div className="text-sm text-gray-400 mb-1">Win Rate</div>
                  <div className={`text-2xl font-bold ${
                    parseFloat(recent12WinRate) >= 50 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {recent12WinRate}%
                  </div>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                  <div className="text-sm text-gray-400 mb-1">Total Brolays</div>
                  <div className="text-2xl font-bold text-white">
                    {recentBrolays.length}
                  </div>
                </div>
                <div className="bg-green-900/30 rounded-lg p-4 border border-green-500/30">
                  <div className="text-sm text-gray-400 mb-1">Net Profit</div>
                  <div className={`text-2xl font-bold ${
                    (() => {
                      const recent12Lost = recentBrolays
                        .filter(p => {
                          const participants = Object.values(p.participants);
                          return participants.some(part => part.result === 'loss');
                        })
                        .reduce((sum, p) => {
                          const participants = Object.values(p.participants);
                          return sum + (p.betAmount * participants.length);
                        }, 0);
                      const netProfit = recent12Payout - recent12Lost;
                      return netProfit >= 0 ? 'text-green-400' : 'text-red-400';
                    })()
                  }`}>
                    ${(() => {
                      const recent12Lost = recentBrolays
                        .filter(p => {
                          const participants = Object.values(p.participants);
                          return participants.some(part => part.result === 'loss');
                        })
                        .reduce((sum, p) => {
                          const participants = Object.values(p.participants);
                          return sum + (p.betAmount * participants.length);
                        }, 0);
                      return (recent12Payout - recent12Lost).toFixed(0);
                    })()}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Net Profit Over Time Line Graph */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-400">📈 Net Profit Over Time</h3>
        {(() => {
          // Group brolays by month
          const monthlyData = {};
          const sortedParlays = [...filteredParlays].sort((a, b) => new Date(a.date) - new Date(b.date));
          
          sortedParlays.forEach(parlay => {
            const date = new Date(parlay.date + 'T00:00:00');
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                month: monthKey,
                total: 0,
                byPlayer: {},
                stats: {
                  total: { wins: 0, losses: 0, profit: 0 },
                  byPlayer: {}
                }
              };
              players.forEach(p => {
                monthlyData[monthKey].byPlayer[p] = 0;
                monthlyData[monthKey].stats.byPlayer[p] = { wins: 0, losses: 0, profit: 0 };
              });
            }
            
            const participants = Object.values(parlay.participants);
            const losers = participants.filter(p => p.result === 'loss');
            const winners = participants.filter(p => p.result === 'win');
            const won = losers.length === 0 && winners.length > 0;
            
            if (won) {
              const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
              monthlyData[monthKey].total += netProfit;
              monthlyData[monthKey].stats.total.wins++;
              monthlyData[monthKey].stats.total.profit += netProfit;
              
              winners.forEach(winner => {
                if (winner.player && monthlyData[monthKey].byPlayer[winner.player] !== undefined) {
                  const playerProfit = netProfit / winners.length;
                  monthlyData[monthKey].byPlayer[winner.player] += playerProfit;
                  monthlyData[monthKey].stats.byPlayer[winner.player].wins++;
                  monthlyData[monthKey].stats.byPlayer[winner.player].profit += playerProfit;
                }
              });
            } else if (losers.length > 0) {
              const loss = parlay.betAmount * participants.length;
              monthlyData[monthKey].total -= loss;
              monthlyData[monthKey].stats.total.losses++;
              monthlyData[monthKey].stats.total.profit -= loss;
              
              losers.forEach(loser => {
                if (loser.player && monthlyData[monthKey].byPlayer[loser.player] !== undefined) {
                  const playerLoss = loss / losers.length;
                  monthlyData[monthKey].byPlayer[loser.player] -= playerLoss;
                  monthlyData[monthKey].stats.byPlayer[loser.player].losses++;
                  monthlyData[monthKey].stats.byPlayer[loser.player].profit -= playerLoss;
                }
              });
            }
          });
          
          // Convert to cumulative data
          const months = Object.keys(monthlyData).sort();
          const cumulativeData = [];
          let cumulativeTotal = 0;
          const cumulativeByPlayer = {};
          players.forEach(p => { cumulativeByPlayer[p] = 0; });
          
          months.forEach(month => {
            cumulativeTotal += monthlyData[month].total;
            players.forEach(p => {
              cumulativeByPlayer[p] += monthlyData[month].byPlayer[p];
            });
            
            cumulativeData.push({
              month,
              displayMonth: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              total: cumulativeTotal,
              monthStats: monthlyData[month].stats,
              ...cumulativeByPlayer
            });
          });
          
          if (cumulativeData.length === 0) {
            return <p className="text-gray-400 text-center py-8">No data available yet</p>;
          }
          
          // Calculate graph dimensions
          const maxProfit = Math.max(...cumulativeData.map(d => d.total), ...players.flatMap(p => cumulativeData.map(d => d[p])));
          const minProfit = Math.min(...cumulativeData.map(d => d.total), ...players.flatMap(p => cumulativeData.map(d => d[p])), 0);
          const range = maxProfit - minProfit;
          const padding = range * 0.1;
          
          const graphHeight = 300;
          const graphWidth = Math.max(800, cumulativeData.length * 60);
          const leftMargin = 60;
          
          const getY = (value) => {
            const normalized = (value - (minProfit - padding)) / (range + 2 * padding);
            return graphHeight - (normalized * graphHeight);
          };
          
          const getX = (index) => {
            return leftMargin + (index / (cumulativeData.length - 1)) * (graphWidth - leftMargin);
          };
          
          // Generate line paths
          const totalPath = cumulativeData.map((d, i) => 
            `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.total)}`
          ).join(' ');
          
          const playerColors = {
            'Management': 'hsl(0, 70%, 55%)',
            'CD': 'hsl(330, 70%, 60%)', // Pink for CD
            '914': 'hsl(120, 70%, 55%)',
            'Junior': 'hsl(180, 70%, 55%)',
            'Jacoby': 'hsl(240, 70%, 55%)'
          };
          
          return (
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${graphWidth + 20} ${graphHeight + 60}`} className="w-full" style={{ minWidth: '600px' }}>
                {/* Y-axis scale */}
                {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                  const y = graphHeight * ratio;
                  const value = maxProfit + padding - (ratio * (range + 2 * padding));
                  return (
                    <g key={ratio}>
                      <line
                        x1={leftMargin}
                        y1={y}
                        x2={graphWidth}
                        y2={y}
                        stroke="#374151"
                        strokeWidth="1"
                        strokeDasharray="4"
                      />
                      <text
                        x={leftMargin - 10}
                        y={y + 5}
                        fill="#9ca3af"
                        fontSize="12"
                        textAnchor="end"
                      >
                        ${value.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
                
                {/* Y-axis label */}
                <text
                  x="15"
                  y={graphHeight / 2}
                  fill="#fbbf24"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  transform={`rotate(-90 15 ${graphHeight / 2})`}
                >
                  Net Profit ($)
                </text>
                
                {/* Zero line */}
                <line
                  x1={leftMargin}
                  y1={getY(0)}
                  x2={graphWidth}
                  y2={getY(0)}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="8"
                />
                
                {/* Player lines */}
                {players.map(player => {
                  const path = cumulativeData.map((d, i) => 
                    `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[player])}`
                  ).join(' ');
                  
                  return (
                    <path
                      key={player}
                      d={path}
                      fill="none"
                      stroke={playerColors[player]}
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  );
                })}
                
                {/* Total line (bold) */}
                <path
                  d={totalPath}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="4"
                />
                
                {/* Data points with hover */}
                {cumulativeData.map((d, i) => {
                  const stats = d.monthStats;
                  const totalBrolays = stats.total.wins + stats.total.losses;
                  const totalWinPct = totalBrolays > 0 ? ((stats.total.wins / totalBrolays) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <circle
                      key={i}
                      cx={getX(i)}
                      cy={getY(d.total)}
                      r="6"
                      fill="#fbbf24"
                      className="cursor-pointer hover:r-8 transition-all"
                      onMouseEnter={(e) => {
                        const tooltip = document.getElementById('month-tooltip');
                        tooltip.style.display = 'block';
                        
                        let playerStatsHTML = players.map(player => {
                          const pStats = stats.byPlayer[player];
                          const pTotal = pStats.wins + pStats.losses;
                          const pWinPct = pTotal > 0 ? ((pStats.wins / pTotal) * 100).toFixed(1) : '0.0';
                          return `
                            <div class="flex justify-between gap-4 text-xs border-t border-gray-700 pt-1 mt-1">
                              <span style="color: ${playerColors[player]}">${player}:</span>
                              <span>${pStats.wins}-${pStats.losses} (${pWinPct}%) • $${pStats.profit.toFixed(0)}</span>
                            </div>
                          `;
                        }).join('');
                        
                        tooltip.innerHTML = `
                          <div class="bg-gray-900 text-white p-3 rounded-lg border border-gray-700 shadow-xl">
                            <div class="font-bold text-yellow-400 mb-2">${d.displayMonth}</div>
                            <div class="text-sm mb-1">
                              <span class="font-semibold">Group:</span> ${stats.total.wins}-${stats.total.losses} (${totalWinPct}%)
                            </div>
                            <div class="text-sm font-bold mb-2">
                              Net: $${stats.total.profit.toFixed(0)}
                            </div>
                            ${playerStatsHTML}
                          </div>
                        `;
                      }}
                      onMouseMove={(e) => {
                        const tooltip = document.getElementById('month-tooltip');
                        tooltip.style.left = e.pageX + 10 + 'px';
                        tooltip.style.top = e.pageY + 10 + 'px';
                      }}
                      onMouseLeave={() => {
                        const tooltip = document.getElementById('month-tooltip');
                        tooltip.style.display = 'none';
                      }}
                    />
                  );
                })}
                
                {/* X-axis labels */}
                {cumulativeData.map((d, i) => {
                  if (cumulativeData.length > 12 && i % 2 !== 0) return null;
                  return (
                    <text
                      key={i}
                      x={getX(i)}
                      y={graphHeight + 20}
                      fill="#9ca3af"
                      fontSize="12"
                      textAnchor="middle"
                    >
                      {d.displayMonth}
                    </text>
                  );
                })}
              </svg>
              
              {/* Tooltip */}
              <div id="month-tooltip" style={{ display: 'none', position: 'fixed', zIndex: 1000, pointerEvents: 'none' }}></div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-yellow-400"></div>
                  <span className="text-sm text-gray-300 font-bold">Total Group</span>
                </div>
                {players.map(player => (
                  <div key={player} className="flex items-center gap-2">
                    <div className="w-8 h-1" style={{ backgroundColor: playerColors[player] }}></div>
                    <span className="text-sm text-gray-300">{player}</span>
                  </div>
                ))}</div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

const renderAllBrolays = () => {
  const filteredParlays = applyFilters([...parlays]).sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    // For same-day brolays, use sortOrder if available
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return b.sortOrder - a.sortOrder;
    }
    const aKey = a.firestoreId || a.id;
    const bKey = b.firestoreId || b.id;
    return String(bKey).localeCompare(String(aKey));
  });

  const pendingPicksCount = filteredParlays.reduce((count, parlay) => {
    const participants = Object.values(parlay.participants || {});
    return count + participants.filter(p => p.result === 'pending').length;
  }, 0);

  // Calculate dynamic color scale thresholds based on all settled brolays
  const calculateDynamicThresholds = () => {
    const allProfits = [];
    const allLosses = [];
    
    parlays.forEach(parlay => {
      const participants = Object.values(parlay.participants);
      const losers = participants.filter(p => p.result === 'loss');
      const winners = participants.filter(p => p.result === 'win');
      const pushes = participants.filter(p => p.result === 'push');
      const won = losers.length === 0 && winners.length > 0 && pushes.length < participants.length;
      
      if (won) {
        const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
        if (netProfit > 0) allProfits.push(netProfit);
      } else if (losers.length > 0) {
        const totalRisk = parlay.betAmount * participants.length;
        allLosses.push(-totalRisk);
      }
    });
    
    // Sort to find percentiles
    allProfits.sort((a, b) => a - b);
    allLosses.sort((a, b) => a - b);
    
    // Calculate profit thresholds (20th, 40th, 60th, 80th percentiles)
    const getPercentile = (arr, percentile) => {
      if (arr.length === 0) return 0;
      const index = Math.floor(arr.length * percentile);
      return arr[Math.min(index, arr.length - 1)];
    };
    
    return {
      profit: {
        tiny: getPercentile(allProfits, 0.2) || 150,
        small: getPercentile(allProfits, 0.4) || 300,
        medium: getPercentile(allProfits, 0.6) || 500,
        big: getPercentile(allProfits, 0.8) || 800,
        huge: getPercentile(allProfits, 0.95) || 1000
      },
      loss: {
        tiny: getPercentile(allLosses, 0.2) || -40,
        small: getPercentile(allLosses, 0.4) || -60,
        medium: getPercentile(allLosses, 0.6) || -90,
        big: getPercentile(allLosses, 0.8) || -130,
        huge: getPercentile(allLosses, 0.95) || -200
      }
    };
  };
  
  const thresholds = calculateDynamicThresholds();

  // Calendar data
  const currentMonth = calendarMonth.getMonth();
  const currentYear = calendarMonth.getFullYear();
  const calendarDays = getCalendarDays(currentMonth, currentYear);
  const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Get today's date in Eastern Time
  const getTodayET = () => {
    const now = new Date();
    const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return etDate.toDateString();
  };
  const todayET = getTodayET();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold text-yellow-400">📅 All Brolays</h2>
        <div className="flex gap-2">
          {pendingPicksCount > 0 && (
            <Button
              onClick={handleAutoUpdate}
              disabled={autoUpdating}
              variant="primary"
              className={`flex items-center gap-2 ${isMobile ? 'min-h-[44px]' : ''}`}
            >
              <RefreshCw size={isMobile ? 20 : 16} className={autoUpdating ? 'animate-spin' : ''} />
              {autoUpdating ? 'Updating...' : `Auto-Update ${pendingPicksCount} Pending`}
            </Button>
          )}
          <Button
            onClick={() => setCalendarView(!calendarView)}
            variant="secondary"
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            {calendarView ? '📋 List View' : '📅 Calendar View'}
          </Button>
        </div>
      </div>
      
      {/* Calendar View */}
      {calendarView && (
        <Card padding="default" className="animate-fadeInUp">
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl md:text-2xl font-bold text-yellow-400">{monthName}</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => changeMonth(-1)}
                variant="secondary"
                size="small"
              >
                ← Prev
              </Button>
              <Button
                onClick={() => setCalendarMonth(new Date())}
                variant="secondary"
                size="small"
              >
                Today
              </Button>
              <Button
                onClick={() => changeMonth(1)}
                variant="secondary"
                size="small"
              >
                Next →
              </Button>
            </div>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-gray-500 font-semibold py-2 text-sm">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }
              
              const dateStr = formatCalendarDate(currentYear, currentMonth, day);
              const dayBrolays = getBrolaysForDate(dateStr);
              const hasBrolays = dayBrolays.length > 0;
              const isSelected = selectedCalendarDate === dateStr;
              const isToday = todayET === new Date(dateStr + 'T00:00:00').toDateString();
              
              // Calculate day's financial performance
              let dayNetProfit = 0;
              let dayWins = 0;
              let dayLosses = 0;
              let dayAnd1s = 0;
              
              dayBrolays.forEach(parlay => {
                const participants = Object.values(parlay.participants);
                const losers = participants.filter(p => p.result === 'loss');
                const winners = participants.filter(p => p.result === 'win');
                const pushes = participants.filter(p => p.result === 'push');
                const won = losers.length === 0 && winners.length > 0 && pushes.length < participants.length;
                const and1 = losers.length === 1 && winners.length === participants.length - 1;
                
                if (won) {
                  const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
                  dayNetProfit += netProfit;
                  dayWins++;
                } else if (losers.length > 0) {
                  const totalRisk = parlay.betAmount * participants.length;
                  dayNetProfit -= totalRisk;
                  dayLosses++;
                  if (and1) dayAnd1s++;
                }
              });
              
              // Determine color based on profit/loss using DYNAMIC thresholds
              let bgColorClass = 'bg-gray-800';
              let borderColorClass = 'border-gray-700';
              let hoverBorderClass = 'hover:border-yellow-500/50';
              
              if (hasBrolays && dayNetProfit !== 0) {
                if (dayNetProfit > 0) {
                  // Green gradient based on dynamic profit thresholds
                  if (dayNetProfit >= thresholds.profit.huge) {
                    bgColorClass = 'bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 shadow-lg shadow-green-500/30';
                    borderColorClass = 'border-green-300';
                    hoverBorderClass = 'hover:border-green-200';
                  } else if (dayNetProfit >= thresholds.profit.big) {
                    bgColorClass = 'bg-gradient-to-br from-green-500 to-emerald-700';
                    borderColorClass = 'border-green-400';
                    hoverBorderClass = 'hover:border-green-300';
                  } else if (dayNetProfit >= thresholds.profit.medium) {
                    bgColorClass = 'bg-gradient-to-br from-green-600 to-green-800';
                    borderColorClass = 'border-green-500';
                    hoverBorderClass = 'hover:border-green-400';
                  } else if (dayNetProfit >= thresholds.profit.small) {
                    bgColorClass = 'bg-gradient-to-br from-green-700 to-green-900';
                    borderColorClass = 'border-green-600';
                    hoverBorderClass = 'hover:border-green-500';
                  } else {
                    bgColorClass = 'bg-gradient-to-br from-green-800 to-gray-800';
                    borderColorClass = 'border-green-700';
                    hoverBorderClass = 'hover:border-green-600';
                  }
                } else {
                  // Red gradient based on dynamic loss thresholds
                  if (dayNetProfit <= thresholds.loss.huge) {
                    bgColorClass = 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700 shadow-lg shadow-red-500/30';
                    borderColorClass = 'border-red-400';
                    hoverBorderClass = 'hover:border-red-300';
                  } else if (dayNetProfit <= thresholds.loss.big) {
                    bgColorClass = 'bg-gradient-to-br from-red-600 to-red-800';
                    borderColorClass = 'border-red-500';
                    hoverBorderClass = 'hover:border-red-400';
                  } else if (dayNetProfit <= thresholds.loss.medium) {
                    bgColorClass = 'bg-gradient-to-br from-red-700 to-red-900';
                    borderColorClass = 'border-red-600';
                    hoverBorderClass = 'hover:border-red-500';
                  } else if (dayNetProfit <= thresholds.loss.small) {
                    bgColorClass = 'bg-gradient-to-br from-red-800 to-gray-800';
                    borderColorClass = 'border-red-700';
                    hoverBorderClass = 'hover:border-red-600';
                  } else {
                    bgColorClass = 'bg-gradient-to-br from-red-900 to-gray-800';
                    borderColorClass = 'border-red-800';
                    hoverBorderClass = 'hover:border-red-700';
                  }
                }
              } else if (hasBrolays) {
                // Pending/no result yet
                bgColorClass = 'bg-gray-700';
                borderColorClass = 'border-gray-600';
              }
              
              // Emoji indicator - ONLY show skull for And-1s
              let emoji = '';
              if (dayAnd1s > 0) {
                emoji = '💀'; // Had and-1(s)
              }
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedCalendarDate(isSelected ? null : dateStr)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-yellow-500/30 border-yellow-400 scale-105 shadow-lg shadow-yellow-500/50'
                      : `${bgColorClass} ${borderColorClass} ${hoverBorderClass} hover:scale-105`
                  } ${isToday ? 'ring-2 ring-blue-500' : ''} relative overflow-hidden`}
                >
                  {/* Emoji indicator at top - only And-1 skull */}
                  {emoji && (
                    <div className="absolute top-0.5 right-0.5 text-xs md:text-sm">
                      {emoji}
                    </div>
                  )}
                  
                  <div className={`text-lg font-bold ${
                    hasBrolays ? 'text-white' : 'text-gray-500'
                  }`}>
                    {day}
                  </div>
                  
                  {/* Desktop: Show all details */}
                  {hasBrolays && !isMobile && (
                    <div className="text-center mt-1">
                      <div className="text-xs text-gray-200 font-semibold">
                        {dayBrolays.length} {dayBrolays.length === 1 ? 'brolay' : 'brolays'}
                      </div>
                      {dayBrolays.length > 1 && (
                        <div className="text-xs font-bold mt-0.5" style={{
                          color: dayNetProfit > 0 ? '#4ade80' : dayNetProfit < 0 ? '#f87171' : '#fbbf24'
                        }}>
                          {dayWins}-{dayLosses}
                        </div>
                      )}
                      {dayNetProfit !== 0 && (
                        <div className={`text-xs font-bold mt-0.5 ${
                          dayNetProfit > 0 ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {dayNetProfit > 0 ? '+' : ''}{dayNetProfit > 0 ? `$${dayNetProfit.toFixed(0)}` : `-$${Math.abs(dayNetProfit).toFixed(0)}`}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Mobile: Just show small dot indicator if has brolays */}
                  {hasBrolays && isMobile && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Selected Day Details */}
          {selectedCalendarDate && (
            <div className="mt-6">
              <div className="space-y-4">
                {getBrolaysForDate(selectedCalendarDate).map(parlay => {
                  const participants = Object.values(parlay.participants);
                  const losers = participants.filter(p => p.result === 'loss');
                  const winners = participants.filter(p => p.result === 'win');
                  const pushes = participants.filter(p => p.result === 'push');
                  const won = losers.length === 0 && winners.length > 0 && pushes.length < participants.length;
                  const and1 = losers.length === 1 && winners.length === participants.length - 1;
                  
                  const sports = [...new Set(participants.map(p => p.sport).filter(Boolean))];
                  const parlayType = sports.length > 1 ? 'Multi-Sport' : sports[0] || 'Brolay';
                  
                  return (
                    <div
                      key={parlay.id}
                      className={`bg-gray-800/50 rounded-lg p-4 border transition-all ${
                        won ? 'border-green-500/30' :
                        losers.length > 0 ? 'border-red-500/30' :
                        'border-yellow-500/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-white font-semibold">{parlayType} • {participants.length} picks</div>
                          <div className="text-gray-400 text-sm">
                            ${parlay.betAmount * participants.length} Risked • 
                            ${parlay.totalPayout || 0} Total Payout • 
                            ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length))} Net Profit
                            {parlay.placedBy && ` • Placed by ${parlay.placedBy}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full font-bold text-sm ${
                            won ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-black' :
                            losers.length > 0 ? 'bg-gradient-to-r from-red-400 to-rose-500 text-white' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {won ? 'WON' : losers.length > 0 ? (and1 ? 'LOST (And-1)' : 'LOST') : 'PENDING'}
                          </span>
                          {pushes.length > 0 && won && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
                              ⚠️ {pushes.length} Push{pushes.length > 1 ? 'es' : ''}
                            </span>
                          )}
                          <Button
                            onClick={() => setEditingParlay(parlay)}
                            variant="ghost"
                            size="small"
                            className={`text-blue-400 hover:text-blue-300 ${isMobile ? 'min-h-[44px]' : ''}`}
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => deleteParlay(parlay.id)}
                            variant="ghost"
                            size="small"
                            className={`text-red-400 hover:text-red-300 ${isMobile ? 'min-h-[44px]' : ''}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      {/* Individual Picks */}
                      <div className="space-y-2">
                        {Object.entries(parlay.participants).map(([pid, participant]) => {
                          let teamDisplay = '';
                          if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(participant.betType)) {
                            teamDisplay = `${participant.awayTeam} @ ${participant.homeTeam}`;
                          } else {
                            teamDisplay = participant.team;
                          }
                        
                          const betDetails = formatBetDescription(participant);
                        
                          return (
                            <div key={pid} className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm bg-gray-900/50 p-2 rounded gap-1 border border-gray-800">
                              <span className="flex-1 text-gray-300">
                                <strong className="text-white">{participant.player}</strong> - {participant.sport} - {teamDisplay} {betDetails}
                                {participant.odds && (
                                  <span className="ml-2 text-purple-400 font-semibold">
                                    {participant.odds}
                                    {participant.oddsSource && <span className="text-xs text-gray-500"> ({participant.oddsSource})</span>}
                                  </span>
                                )}
                                {participant.actualStats && (
                                  <span className="ml-2 text-blue-400 font-semibold">
                                    [{participant.actualStats}]
                                  </span>
                                )}
                              </span>
                                
                              <div className="flex items-center gap-2">
                                {participant.autoUpdated && (
                                  <span 
                                    className="text-blue-400 cursor-help text-base" 
                                    title={`Auto-updated on ${new Date(participant.autoUpdatedAt).toLocaleString()}`}
                                  >
                                    🤖
                                  </span>
                                )}
                                
                                <span className={`font-semibold ${
                                  participant.result === 'win' ? 'text-green-400' :
                                  participant.result === 'loss' ? 'text-red-400' :
                                  participant.result === 'push' ? 'text-yellow-400' :
                                  'text-gray-500'
                                }`}>
                                  {participant.result.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
             </div>
            )}
          </Card>
        )}
            
      {/* List View (existing code) */}
      {!calendarView && (
        <>
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
                    <label className="block text-sm font-medium mb-1 text-gray-300">Min Payout</label>
                    <input
                      type="number"
                      value={filters.minPayout}
                      onChange={(e) => setFilters({...filters, minPayout: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="$0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Max Payout</label>
                    <input
                      type="number"
                      value={filters.maxPayout}
                      onChange={(e) => setFilters({...filters, maxPayout: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="Any"
                    />
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
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1 text-gray-300">Team/Player</label>
                    <input
                      type="text"
                      value={filters.teamPlayer}
                      onChange={(e) => setFilters({...filters, teamPlayer: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="Search teams/players..."
                      list="team-player-suggestions"
                    />
                    <datalist id="team-player-suggestions">
                      {[...new Set([...Object.values(preloadedTeams).flat(), ...learnedTeams])].map((team, idx) => (
                        <option key={idx} value={team} />
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

          {/* Brolays List */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg md:text-xl font-bold text-white">
                {filteredParlays.length} Brolay{filteredParlays.length !== 1 ? 's' : ''}
              </h3>
            </div>
            
            <div className="space-y-3">
              {filteredParlays.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No brolays match your filters</p>
              ) : (
                filteredParlays.slice(0, brolaysToShow).map(parlay => {
                  const participants = Object.values(parlay.participants);
                  const losers = participants.filter(p => p.result === 'loss');
                  const winners = participants.filter(p => p.result === 'win');
                  const pushes = participants.filter(p => p.result === 'push');
                  const won = losers.length === 0 && winners.length > 0 && pushes.length < participants.length;
                  const and1 = losers.length === 1 && winners.length === participants.length - 1;
                  
                  const sports = [...new Set(participants.map(p => p.sport).filter(Boolean))];
                  const parlayType = sports.length > 1 ? 'Multi-Sport Brolay' : 
                                     sports.length === 1 ? `${sports[0]} Brolay` : 'Brolay';
                  
                  return (
                    <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 md:p-6 bg-gray-800/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-white">{formatDateForDisplay(parlay.date)} - {parlayType}</div>
                          <div className="text-sm text-gray-400">
                            {participants.length} picks • ${parlay.betAmount * participants.length} Risked • 
                            ${parlay.totalPayout || 0} Total Payout • 
                            ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length))} Net Profit
                            {parlay.placedBy && <span> • Placed by {parlay.placedBy}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {won && (
                            <>
                              <span className="text-green-600 font-semibold">WON</span>
                              {pushes.length > 0 && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                  ⚠️ {pushes.length} Push{pushes.length > 1 ? 'es' : ''} - Adjusted Payout
                                </span>
                              )}
                            </>
                          )}
                          {!won && losers.length > 0 && (
                            <span className="text-red-600 font-semibold">
                              LOST {and1 && '(And-1)'}
                            </span>
                          )}
                          {losers.length === 0 && winners.length === 0 && (
                            <span className="text-gray-500 font-semibold">PENDING</span>
                          )}
                          <Button
                            onClick={() => setEditingParlay(parlay)}
                            variant="ghost"
                            size="small"
                            className={`text-blue-400 hover:text-blue-300 ${isMobile ? 'min-h-[44px]' : ''}`}
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => deleteParlay(parlay.id)}
                            variant="ghost"
                            size="small"
                            className={`text-red-400 hover:text-red-300 ${isMobile ? 'min-h-[44px]' : ''}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries(parlay.participants).map(([pid, participant]) => {
                          let teamDisplay = '';
                          if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(participant.betType)) {
                            teamDisplay = `${participant.awayTeam} @ ${participant.homeTeam}`;
                          } else {
                            teamDisplay = participant.team;
                          }
                        
                          const betDetails = formatBetDescription(participant);
                        
                          return (
                            <div key={pid} className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm bg-gray-900/50 p-2 rounded gap-1">
                              <span className="flex-1 text-gray-300">
                                <strong className="text-white">{participant.player}</strong> - {participant.sport} - {teamDisplay} {betDetails}
                                {participant.odds && (
                                  <span className="ml-2 text-purple-400 font-semibold">
                                    {participant.odds}
                                    {participant.oddsSource && <span className="text-xs text-gray-500"> ({participant.oddsSource})</span>}
                                  </span>
                                )}
                                {participant.actualStats && (
                                  <span className="ml-2 text-blue-400 font-semibold">
                                    [{participant.actualStats}]
                                  </span>
                                )}
                              </span>
                                
                              <div className="flex items-center gap-2">
                                {participant.autoUpdated && (
                                  <span 
                                    className="text-blue-400 cursor-help text-base" 
                                    title={`Auto-updated on ${new Date(participant.autoUpdatedAt).toLocaleString()}`}
                                  >
                                    🤖
                                  </span>
                                )}
                                
                                <span className={`font-semibold ${
                                  participant.result === 'win' ? 'text-green-400' :
                                  participant.result === 'loss' ? 'text-red-400' :
                                  participant.result === 'push' ? 'text-yellow-400' :
                                  'text-gray-500'
                                }`}>
                                  {participant.result.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Pagination Controls */}
            {filteredParlays.length > brolaysToShow && (
              <div className="mt-4 flex gap-3 justify-center">
                <Button
                  onClick={() => setBrolaysToShow(prev => prev + 10)}
                  variant="blue"
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  Show More (10)
                </Button>
                <Button
                  onClick={() => setBrolaysToShow(filteredParlays.length)}
                  variant="secondary"
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  Show All ({filteredParlays.length})
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
      
const renderPayments = () => {
  const filteredParlays = applyFilters([...parlays]).sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder;
    }
    const aKey = a.firestoreId || a.id;
    const bKey = b.firestoreId || b.id;
    return String(aKey).localeCompare(String(bKey));
  });
  const unsettledParlays = filteredParlays.filter(p => !p.settled);
  const settledParlays = filteredParlays.filter(p => p.settled);
  const lostParlays = unsettledParlays.filter(p => {
    const participants = Object.values(p.participants);
    return participants.some(part => part.result === 'loss');
  });
  const wonParlays = unsettledParlays.filter(p => {
    const participants = Object.values(p.participants);
    const losers = participants.filter(part => part.result === 'loss');
    return losers.length === 0 && participants.some(part => part.result === 'win');
  });

  // Calculate who owes who
  const payments = [];
  
  // Lost parlays - winners get paid by placer
  lostParlays.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const losers = participants.filter(p => p.result === 'loss');
    const winners = participants.filter(p => p.result === 'win');
    const and1 = losers.length === 1 && winners.length === participants.length - 1; // For tracking only
    const totalAmount = parlay.betAmount * participants.length;
    const amountPerLoser = losers.length === 1 ? totalAmount : totalAmount / losers.length; // Payment logic
    
    losers.forEach(loser => {
      if (loser.player && parlay.placedBy) {
        payments.push({
          from: loser.player,
          to: parlay.placedBy,
          amount: amountPerLoser,
          parlayId: parlay.id,
          parlayDate: parlay.date,
          type: 'loss',
          and1: and1
        });
      }
    });
  });
  
  // Won parlays - placer pays winners
  wonParlays.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const winners = participants.filter(p => p.result === 'win');
    const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
    const amountPerWinner = winners.length > 0 ? netProfit / winners.length : 0;
    
    winners.forEach(winner => {
      if (winner.player && parlay.placedBy) {
        payments.push({
          from: parlay.placedBy,
          to: winner.player,
          amount: amountPerWinner,
          parlayId: parlay.id,
          parlayDate: parlay.date,
          type: 'win'
        });
      }
    });
  });

  // Get all unique players from payments
  const allPlayersSet = new Set();
  payments.forEach(payment => {
    if (payment.from) allPlayersSet.add(payment.from);
    if (payment.to) allPlayersSet.add(payment.to);
  });
  const allPlayers = Array.from(allPlayersSet);

  // Calculate net positions (who owes who overall)
  const netPositions = {};
  allPlayers.forEach(player => {
    netPositions[player] = {};
    allPlayers.forEach(otherPlayer => {
      if (player !== otherPlayer) {
        netPositions[player][otherPlayer] = 0;
      }
    });
  });
    
  payments.forEach(payment => {
    if (payment.from && payment.to && payment.from !== payment.to && 
        netPositions[payment.from] && netPositions[payment.from][payment.to] !== undefined) {
      netPositions[payment.from][payment.to] += payment.amount;
    }
  });

  // Simplify: if A owes B and B owes A, net them out
  const simplifiedPayments = [];
  allPlayers.forEach(player1 => {
    allPlayers.forEach(player2 => {
      if (player1 < player2) { // Only process each pair once
        const player1OwesPlayer2 = netPositions[player1]?.[player2] || 0;
        const player2OwesPlayer1 = netPositions[player2]?.[player1] || 0;
        const netAmount = player1OwesPlayer2 - player2OwesPlayer1;
        
        if (Math.abs(netAmount) > 0.01) { // Ignore tiny amounts due to rounding
          simplifiedPayments.push({
            from: netAmount > 0 ? player1 : player2,
            to: netAmount > 0 ? player2 : player1,
            amount: Math.abs(netAmount)
          });
        }
      }
    });
  });

return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">💰 Payment Tracker</h2>
      
      {/* Filters - Compact for Payments */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium mb-1 text-gray-300">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium mb-1 text-gray-300">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
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
          <Button
            onClick={() => setFilters({
              dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '', 
              placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: ''
            })}
            variant="secondary"
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            Clear
          </Button>
        </div>
      </div>
      
      {/* Visual Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="warning" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-yellow-400" size={24} />
            <h3 className="text-yellow-400 font-bold text-lg">Unsettled</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {lostParlays.length + wonParlays.length}
          </div>
          <div className="text-sm text-gray-400">
            {lostParlays.length} lost • {wonParlays.length} won
          </div>
        </Card>

        <Card variant="danger" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💸</span>
            <h3 className="text-red-400 font-bold text-lg">Total Owed</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${simplifiedPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">
            {simplifiedPayments.length} payment{simplifiedPayments.length !== 1 ? 's' : ''} pending
          </div>
        </Card>

        <Card variant="success" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✅</span>
            <h3 className="text-green-400 font-bold text-lg">Recently Settled</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {parlays.filter(p => p.settled).length}
          </div>
          <div className="text-sm text-gray-400">
            All-time settlements
          </div>
        </Card>
      </div>

      {/* Who Owes Who Summary Table */}
      {simplifiedPayments.length > 0 && (
        <Card title="💰 Who Owes Who (Net Summary)">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">From</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">To</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {simplifiedPayments.map((payment, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/30 transition">
                    <td className="py-3 px-4 font-semibold text-red-400">{payment.from}</td>
                    <td className="py-3 px-4 font-semibold text-green-400">{payment.to}</td>
                    <td className="py-3 px-4 text-right font-bold text-base md:text-lg text-white">
                      ${payment.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Won Brolays */}
        <Card title="✅ Won Brolays" className="text-green-400">
          <div className="space-y-3">
            {wonParlays.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No won brolays to settle</p>
            ) : (
              wonParlays.map(parlay => {
                const participants = Object.values(parlay.participants);
                const winners = participants.filter(p => p.result === 'win');
                const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
                const amountPerWinner = winners.length > 0 ? (netProfit / winners.length).toFixed(2) : 0;
                
                return (
                  <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-white">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-sm text-gray-400">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-green-400">
                        ${netProfit.toFixed(2)} profit
                      </div>
                      <div className="text-xs text-gray-500">
                        (${parlay.totalPayout || 0} payout)
                      </div>
                    </div>
                  </div>
                  <div className="text-sm mb-2 text-gray-300">
                    <span className="font-medium text-white">{parlay.placedBy || 'Unknown'} pays winners: </span>
                    {winners.map(winner => `${winner.player} ($${amountPerWinner.toFixed(2)})`).join(', ')}
                  </div>
                  <Button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    variant="success"
                    size="small"
                    className={`mt-2 ${isMobile ? 'min-h-[44px]' : ''}`}
                  >
                    Mark as Settled
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Card>
      
      {/* Lost Brolays */}
      <Card title="❌ Lost Brolays" className="text-red-400">
        <div className="space-y-3">
          {lostParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No lost brolays to settle</p>
          ) : (
            lostParlays.map(parlay => {
              const participants = Object.values(parlay.participants);
              const losers = participants.filter(p => p.result === 'loss');
              const winners = participants.filter(p => p.result === 'win');
              const and1 = losers.length === 1 && winners.length === participants.length - 1;
              const totalLost = parlay.betAmount * losers.length;
              const amountPerLoser = losers.length > 0 ? (totalLost / losers.length) : 0;
              
              return (
                <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-white">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-sm text-gray-400">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-red-400">
                        ${(parlay.betAmount * participants.length).toFixed(2)}
                      </div>
                      {and1 && <span className="text-xs text-red-400 font-semibold">And-1</span>}
                    </div>
                  </div>
                  <div className="text-sm mb-2 text-gray-300">
                    <span className="font-medium text-white">Losers pay {parlay.placedBy || 'Unknown'}: </span>
                    {losers.map(loser => `${loser.player} ($${Number(amountPerLoser).toFixed(2)})`).join(', ')}
                  </div>
                  <Button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    variant="success"
                    size="small"
                    className={`mt-2 ${isMobile ? 'min-h-[44px]' : ''}`}
                  >
                    Mark as Settled
                  </Button>
                  </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Recently Settled */}
      <Card title="✅ Recently Settled" className="text-gray-400">
        <div className="space-y-3">
          {settledParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recently settled brolays</p>
          ) : (
            settledParlays.slice(0, 10).map(parlay => {
              const participants = Object.values(parlay.participants);
              const winners = participants.filter(p => p.result === 'win');
              const losers = participants.filter(p => p.result === 'loss');
              const won = losers.length === 0 && winners.length > 0;
              
              return (
                <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-white">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-xs text-gray-400">
                        {won ? `Winners paid by ${parlay.placedBy || 'Unknown'}: ${winners.map(w => w.player).join(', ')}` 
                             : `Losers paid ${parlay.placedBy || 'Unknown'}: ${losers.map(l => l.player).join(', ')}`}
                      </div>
                    </div>
                    <Button
                      onClick={() => toggleSettlement(parlay.id)}
                      disabled={saving}
                      variant="danger"
                      size="small"
                      className={`ml-3 whitespace-nowrap ${isMobile ? 'min-h-[44px]' : ''}`}
                    >
                      Unsettle
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};

const renderImport = () => (
  <div className="space-y-4 md:space-y-6">
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-400">📥 Import Historical Data</h2>
      <p className="text-gray-600 mb-4">
        Paste your CSV data below. Make sure it follows the exact format with all required columns.
      </p>
      
      <textarea
        value={csvInput}
        onChange={(e) => setCsvInput(e.target.value)}
        className="w-full h-64 px-3 py-2 border rounded font-mono text-sm"
        style={{ fontSize: isMobile ? '16px' : '14px' }}
        placeholder="Paste CSV data here..."
      />
      
      <Button
        onClick={() => {
          if (window.confirm('Import this data? This will add all rows to your database.')) {
            importFromCSV(csvInput);
          }
        }}
        disabled={saving || !csvInput}
        variant="primary"
        className={`mt-4 ${isMobile ? 'min-h-[44px]' : ''}`}
      >
        {saving ? 'Importing...' : 'Import Data'}
      </Button>
      <Button
        onClick={extractTeamsFromExistingParlays}
        disabled={parlays.length === 0}
        variant="success"
        className={`mt-4 ml-4 ${isMobile ? 'min-h-[44px]' : ''}`}
      >
        Extract Teams from Existing Data
      </Button>
    </div>
    
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
      <h3 className="font-semibold text-blue-900 mb-2">CSV Format Requirements:</h3>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>• First row must be headers (column names)</li>
        <li>• Date format: YYYY-MM-DD (e.g., 2024-12-20)</li>
        <li>• Required: date, betAmount, totalPayout, settled</li>
        <li>• Optional: placedBy (leave blank if unknown)</li>
        <li>• For each pick (pick1 through pick5):</li>
        <li className="ml-4">- pick#_player, pick#_sport, pick#_team, pick#_betType, pick#_result</li>
        <li className="ml-4">- For Spread: pick#_favorite, pick#_spread</li>
        <li className="ml-4">- For Total: pick#_awayTeam, pick#_homeTeam, pick#_overUnder, pick#_total</li>
        <li className="ml-4">- For Prop: pick#_propType, pick#_overUnder, pick#_line</li>
        <li>• Results: win, loss, push, or pending</li>
        <li>• If a brolay won but had pushes, enter the actual adjusted payout received</li>
      </ul>
    </div>
    
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-6">
      <h3 className="font-semibold text-gray-900 mb-2">Example CSV:</h3>
      <pre className="text-xs overflow-x-auto">
{`date,betAmount,totalPayout,placedBy,settled,pick1_player,pick1_sport,pick1_team,pick1_betType,pick1_favorite,pick1_spread,pick1_result,pick2_player,pick2_sport,pick2_awayTeam,pick2_homeTeam,pick2_betType,pick2_overUnder,pick2_total,pick2_result,pick3_player,pick3_sport,pick3_team,pick3_betType,pick3_propType,pick3_overUnder,pick3_line,pick3_result
2024-12-20,10,675,Management,false,Management,NFL,Chiefs,Spread,Favorite,7.5,win,CD,NFL,Bills,Chiefs,Total,Over,45.5,win,914,NBA,Lakers,Prop Bet,Points,Over,25.5,loss`}
      </pre>
    </div>
  </div>
);
 
const renderGrid = () => {
  const filteredParlays = applyFilters([...parlays]).sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return b.sortOrder - a.sortOrder;
    }
    const aKey = a.firestoreId || a.id;
    const bKey = b.firestoreId || b.id;
    return String(bKey).localeCompare(String(aKey));
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">🎯 Brolay Grid</h2>
      
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-600">
              <th className="text-left py-2 px-2 sticky left-0 bg-gray-900 z-10 min-w-[100px] text-gray-300">Date</th>
              {players.map(player => (
                <th key={player} className="text-center py-2 px-2 min-w-[80px] md:min-w-[150px] text-gray-300">{player}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredParlays.map((parlay) => {
              const participants = parlay.participants || {};
              
              return (
                <tr key={parlay.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                  <td className="py-3 px-2 font-semibold sticky left-0 bg-gray-900 text-xs md:text-sm text-gray-300">
                    {formatDateForDisplay(parlay.date)}
                  </td>
                  {players.map((player) => {
                    const playerPick = Object.values(participants).find(p => p.player === player);
                    
                    if (!playerPick) {
                      return <td key={player} className="py-3 px-2 text-center" style={{ background: 'rgba(15, 23, 42, 0.3)' }}></td>;
                    }
                    
                    let bgColor = 'bg-gray-700';
                    if (playerPick.result === 'win') bgColor = 'bg-green-200';
                    else if (playerPick.result === 'loss') bgColor = 'bg-red-200';
                    else if (playerPick.result === 'push') bgColor = 'bg-gray-200';
                    
                    let teamDisplay = '';
                    if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(playerPick.betType)) {
                      teamDisplay = `${playerPick.awayTeam} @ ${playerPick.homeTeam}`;
                    } else {
                      teamDisplay = playerPick.team;
                    }
                    
                    const betDetails = formatBetDescription(playerPick);
                    
                    return (
                      <td key={player} className={`py-3 px-2 text-center ${bgColor} text-[10px] md:text-xs`}>
                        {/* Desktop view - show all details */}
                        <div className="hidden md:block">
                          <div className="font-semibold">{playerPick.sport}</div>
                          <div>{teamDisplay}</div>
                          <div>{betDetails}</div>
                          <div className="text-[10px] mt-1">{playerPick.betType}</div>
                        </div>
                        {/* Mobile view - compact */}
                        <div className="md:hidden">
                          <div className="font-semibold">{teamDisplay}</div>
                          <div>{betDetails}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};  

const renderRankings = () => {
  const filteredParlays = applyFilters([...parlays]);
  
  // Calculate Sole Survivors
  const soleSurvivors = {};
  players.forEach(player => { soleSurvivors[player] = 0; });
  
  filteredParlays.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const winners = participants.filter(p => p.result === 'win');
    const losers = participants.filter(p => p.result === 'loss');
    
    if (winners.length === 1 && losers.length > 0) {
      const survivor = winners[0].player;
      if (survivor) soleSurvivors[survivor]++;
    }
  });
  
  // Calculate Hot/Cold Streaks
  const getStreaks = () => {
    const playerPicks = {};
    players.forEach(player => { playerPicks[player] = []; });
    
    // Get all picks chronologically - sort by date first, then by sortOrder/firestoreId/id for same-day brolays
      const sortedParlays = [...filteredParlays].sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        // If dates are the same, use sortOrder if available, otherwise fall back to firestoreId/id
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        const aKey = a.firestoreId || a.id;
        const bKey = b.firestoreId || b.id;
        return String(aKey).localeCompare(String(bKey));
      });
    
    sortedParlays.forEach(parlay => {
      Object.values(parlay.participants).forEach(p => {
        if (p.player && p.result !== 'pending') {
          playerPicks[p.player].push({
            result: p.result,
            date: parlay.date,
            parlayId: parlay.id, // Track which brolay this came from
            sport: p.sport,
            team: p.team || `${p.awayTeam} @ ${p.homeTeam}`
          });
        }
      });
    });
    
    // Calculate current and all-time streaks
    const currentStreaks = { hot: [], cold: [] };
    const allTimeStreaks = { hot: [], cold: [] };
    
    players.forEach(player => {
      const picks = playerPicks[player];
      if (picks.length === 0) return;
      
      // Current streak
      let currentStreak = 0;
      let currentType = null;
      let lastOppositeDate = null;
      
      for (let i = picks.length - 1; i >= 0; i--) {
        const isWin = picks[i].result === 'win';
        const isPush = picks[i].result === 'push';
        
        if (isPush) continue; // Skip pushes
        
        if (currentType === null) {
          currentType = isWin ? 'hot' : 'cold';
          currentStreak = 1;
        } else if ((currentType === 'hot' && isWin) || (currentType === 'cold' && !isWin)) {
          currentStreak++;
        } else {
          // Found opposite result - this is our "last loss" or "last win"
          lastOppositeDate = picks[i].date;
          break;
        }
      }
      
      if (currentStreak > 0) {
        const streakData = {
          player,
          count: currentStreak,
          lastDate: picks[picks.length - 1].date
        };
        
        if (currentType === 'hot') {
          streakData.lastLossDate = lastOppositeDate;
        } else {
          streakData.lastWinDate = lastOppositeDate;
        }
        
        currentStreaks[currentType].push(streakData);
      }
      
      // All-time streaks
      let streak = 0;
      let streakType = null;
      let streakStart = null;
      let streakEnd = null;
      
      picks.forEach((pick, idx) => {
        const isWin = pick.result === 'win';
        const isPush = pick.result === 'push';
        
        if (isPush) return; // Skip pushes
        
        if (streakType === null || ((streakType === 'hot' && isWin) || (streakType === 'cold' && !isWin))) {
          if (streakType === null) {
            streakType = isWin ? 'hot' : 'cold';
            streakStart = pick.date;
          }
          streak++;
          streakEnd = pick.date;
        } else {
          if (streak >= 3) {
            allTimeStreaks[streakType].push({
              player,
              count: streak,
              startDate: streakStart,
              endDate: streakEnd
            });
          }
          streakType = isWin ? 'hot' : 'cold';
          streak = 1;
          streakStart = pick.date;
          streakEnd = pick.date;
        }
        
        // Handle last streak
        if (idx === picks.length - 1 && streak >= 3) {
          allTimeStreaks[streakType].push({
            player,
            count: streak,
            startDate: streakStart,
            endDate: streakEnd
          });
        }
      });
    });
    
    // Sort streaks
    currentStreaks.hot.sort((a, b) => b.count - a.count);
    currentStreaks.cold.sort((a, b) => b.count - a.count);
    allTimeStreaks.hot.sort((a, b) => b.count - a.count);
    allTimeStreaks.cold.sort((a, b) => b.count - a.count);
    
    return { currentStreaks, allTimeStreaks };
  };
  
  const { currentStreaks, allTimeStreaks } = getStreaks();
  
  // Calculate Player/Sport Combinations
  const playerSportCombos = {};
  filteredParlays.forEach(parlay => {
    Object.values(parlay.participants).forEach(p => {
      if (!p.player || !p.sport || p.result === 'pending') return;
      
      const key = `${p.player}-${p.sport}`;
      if (!playerSportCombos[key]) {
        playerSportCombos[key] = {
          player: p.player,
          sport: p.sport,
          wins: 0,
          losses: 0,
          total: 0
        };
      }
      
      playerSportCombos[key].total++;
      if (p.result === 'win') playerSportCombos[key].wins++;
      else if (p.result === 'loss') playerSportCombos[key].losses++;
    });
  });
  
  const combosWithMin10 = Object.values(playerSportCombos)
    .filter(combo => combo.total >= 10)
    .map(combo => ({
      ...combo,
      winPct: (combo.wins / combo.total) * 100
    }));
  
  const topCombos = [...combosWithMin10].sort((a, b) => b.winPct - a.winPct).slice(0, 5);
  const worstCombos = [...combosWithMin10].sort((a, b) => a.winPct - b.winPct).slice(0, 5);
  
// Most Picked Teams/Players
const teamCounts = {};
filteredParlays.forEach(parlay => {
  Object.values(parlay.participants).forEach(p => {
    if (p.team) {
      teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
    }
    if (p.awayTeam) {
      teamCounts[p.awayTeam] = (teamCounts[p.awayTeam] || 0) + 1;
    }
    if (p.homeTeam) {
      teamCounts[p.homeTeam] = (teamCounts[p.homeTeam] || 0) + 1;
    }
  });
});

const topTeams = Object.entries(teamCounts)
  .map(([team, count]) => ({ team, count }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 5);

// Player/Team Combinations
const playerTeamCombos = {};
filteredParlays.forEach(parlay => {
  Object.values(parlay.participants).forEach(p => {
    if (!p.player || p.result === 'pending') return;
    
    const teams = [];
    if (p.team) teams.push(p.team);
    if (p.awayTeam) teams.push(p.awayTeam);
    if (p.homeTeam) teams.push(p.homeTeam);
    
    teams.forEach(team => {
      const key = `${p.player}-${team}`;
      if (!playerTeamCombos[key]) {
        playerTeamCombos[key] = {
          player: p.player,
          team: team,
          wins: 0,
          losses: 0,
          pushes: 0,
          total: 0
        };
      }
      
      playerTeamCombos[key].total++;
      if (p.result === 'win') playerTeamCombos[key].wins++;
      else if (p.result === 'loss') playerTeamCombos[key].losses++;
      else if (p.result === 'push') playerTeamCombos[key].pushes++;
    });
  });
});
// Most picked player/team combos
const topPlayerTeamCombos = Object.values(playerTeamCombos)
  .sort((a, b) => b.total - a.total)
  .slice(0, 5);

// Best/worst player/team combos (min 5 picks)
const playerTeamCombosWithMin5 = Object.values(playerTeamCombos)
  .filter(combo => combo.total >= 5)
  .map(combo => ({
    ...combo,
    winPct: (combo.wins / combo.total) * 100
  }));

const topPlayerTeamWinPct = [...playerTeamCombosWithMin5]
  .sort((a, b) => b.winPct - a.winPct)
  .slice(0, 5);

const worstPlayerTeamWinPct = [...playerTeamCombosWithMin5]
  .sort((a, b) => a.winPct - b.winPct)
  .slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">🏆 Rankings & Records</h2>
      
      {/* Sole Survivors */}
      <Card title="💪 Sole Survivors" subtitle="Only winner when everyone else lost">
        <div className="space-y-2">
          {Object.entries(soleSurvivors)
            .sort(([, a], [, b]) => b - a)
            .map(([player, count], idx) => (
              <div key={player} className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                  <span className="font-semibold text-yellow-400">{player}</span>
                </div>
                <span className="text-xl font-bold text-yellow-400">{count}</span>
              </div>
            ))}
        </div>
      </Card>

      {/* Current Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="🔥 Current Hot Streak" className="text-green-400">
          {currentStreaks.hot.length > 0 ? (
            <div className="space-y-2">
              {currentStreaks.hot.slice(0, 3).map((streak, idx) => (
                <div key={idx} className="p-3 bg-green-900/20 rounded border border-green-500/30">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{streak.player}</span>
                    <span className="text-xl font-bold text-green-400">{streak.count} wins</span>
                  </div>
                  <div className="text-xs text-gray-400">Last loss: {formatDateForDisplay(streak.lastLossDate || 'Never')}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">No active hot streaks</p>
          )}
        </Card>
        
        <Card title="❄️ Current Cold Streak" className="text-red-400">
          {currentStreaks.cold.length > 0 ? (
            <div className="space-y-2">
              {currentStreaks.cold.slice(0, 3).map((streak, idx) => (
                <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{streak.player}</span>
                    <span className="text-xl font-bold text-red-400">{streak.count} losses</span>
                  </div>
                  <div className="text-xs text-gray-400">Last win: {formatDateForDisplay(streak.lastWinDate || 'Never')}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">No active cold streaks</p>
          )}
        </Card>
      </div>

      {/* All-Time Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="📈 Top 5 Hot Streaks (All-Time)" className="text-green-400">
          {allTimeStreaks.hot.slice(0, 5).length > 0 ? (
            <div className="space-y-2">
              {allTimeStreaks.hot.slice(0, 5).map((streak, idx) => (
                <div key={idx} className="p-3 bg-green-900/20 rounded border border-green-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{streak.player}</span>
                    <span className="text-lg font-bold text-green-400">{streak.count} wins</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDateForDisplay(streak.startDate)} - {formatDateForDisplay(streak.endDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">No streaks of 3+ yet</p>
          )}
        </Card>
        
        <Card title="📉 Top 5 Cold Streaks (All-Time)" className="text-red-400">
          {allTimeStreaks.cold.slice(0, 5).length > 0 ? (
            <div className="space-y-2">
              {allTimeStreaks.cold.slice(0, 5).map((streak, idx) => (
                <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{streak.player}</span>
                    <span className="text-lg font-bold text-red-400">{streak.count} losses</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDateForDisplay(streak.startDate)} - {formatDateForDisplay(streak.endDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">No streaks of 3+ yet</p>
          )}
        </Card>
      </div>

      {/* Player/Sport Combinations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="⭐ Top 5 Player/Sport Combos" subtitle="Minimum 10 picks" className="text-green-400">
          {topCombos.length > 0 ? (
            <div className="space-y-2">
              {topCombos.map((combo, idx) => (
                <div key={idx} className="p-3 bg-green-900/20 rounded border border-green-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{combo.player} - {combo.sport}</span>
                    <span className="text-lg font-bold text-green-400">{combo.winPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {combo.wins}-{combo.losses} ({combo.total} picks)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">Not enough data yet</p>
          )}
        </Card>
        
        <Card title="💩 Worst 5 Player/Sport Combos" subtitle="Minimum 10 picks" className="text-red-400">
          {worstCombos.length > 0 ? (
            <div className="space-y-2">
              {worstCombos.map((combo, idx) => (
                <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{combo.player} - {combo.sport}</span>
                    <span className="text-lg font-bold text-red-400">{combo.winPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {combo.wins}-{combo.losses} ({combo.total} picks)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">Not enough data yet</p>
          )}
        </Card>
      </div>

      {/* Most Picked Teams */}
      <Card title="🌟 Top 5 Player/Team Win %" subtitle="Minimum 5 picks" className="text-green-400">
        {topPlayerTeamWinPct.length > 0 ? (
          <div className="space-y-2">
            {topPlayerTeamWinPct.map((combo, idx) => (
              <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-white">{combo.player} + {combo.team}</span>
                  <span className="text-lg font-bold text-green-400">{combo.winPct.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-gray-400">
                  {combo.wins}-{combo.losses}{combo.pushes > 0 ? `-${combo.pushes}` : ''} ({combo.total} picks)
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-300 text-center py-4">Not enough data yet</p>
        )}
      </Card>
      
      {/* Most Picked Player/Team Combos */}
      <Card title="💀 Worst 5 Player/Team Win %" subtitle="Minimum 5 picks" className="text-red-400">
        {worstPlayerTeamWinPct.length > 0 ? (
          <div className="space-y-2">
            {worstPlayerTeamWinPct.map((combo, idx) => (
              <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-white">{combo.player} + {combo.team}</span>
                  <span className="text-lg font-bold text-red-400">{combo.winPct.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-gray-400">
                  {combo.wins}-{combo.losses}{combo.pushes > 0 ? `-${combo.pushes}` : ''} ({combo.total} picks)
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-300 text-center py-4">Not enough data yet</p>
        )}
      </Card>
      
      {/* Best/Worst Player/Team Win Percentages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-green-400">🌟 Top 5 Player/Team Win %</h3>
          <p className="text-sm text-gray-400 mb-4">Minimum 5 picks</p>
          {topPlayerTeamWinPct.length > 0 ? (
            <div className="space-y-2">
              {topPlayerTeamWinPct.map((combo, idx) => (
                <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{combo.player} + {combo.team}</span>
                    <span className="text-lg font-bold text-green-400">{combo.winPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {combo.wins}-{combo.losses}{combo.pushes > 0 ? `-${combo.pushes}` : ''} ({combo.total} picks)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">Not enough data yet</p>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-red-400">💀 Worst 5 Player/Team Win %</h3>
          <p className="text-sm text-gray-400 mb-4">Minimum 5 picks</p>
          {worstPlayerTeamWinPct.length > 0 ? (
            <div className="space-y-2">
              {worstPlayerTeamWinPct.map((combo, idx) => (
                <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{combo.player} + {combo.team}</span>
                    <span className="text-lg font-bold text-red-400">{combo.winPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {combo.wins}-{combo.losses}{combo.pushes > 0 ? `-${combo.pushes}` : ''} ({combo.total} picks)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">Not enough data yet</p>
          )}
        </div>
      </div>
    </div>
  );
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
        parlayPlacedBy: parlay.placedBy,
        firestoreId: parlay.firestoreId
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
  if (!editingPick) return;
  
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
      yesNoRuns: editingPick.yesNoRuns || 'Yes',
      quarter: editingPick.quarter || '1Q',
      result: editingPick.result,
      actualStats: editingPick.actualStats || null,
      autoUpdated: editingPick.autoUpdated || false,
      manuallyOverridden: true // Mark as manually edited
    };

    console.log('Updated participant data:', updatedParticipants[editingPick.participantId]);

    // Update in Firebase
    if (parlay.firestoreId) {
      console.log('🔄 Updating Firebase document:', parlay.firestoreId);
      console.log('📝 Parlay object:', parlay);
      console.log('📝 Updated participants:', updatedParticipants);
      
      try {
        const result = await updateBrolay(parlay.firestoreId, {
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

    // Update local state
    const updatedParlays = parlays.map(p => 
      p.id === editingPick.parlayId 
        ? { ...p, participants: updatedParticipants }
        : p
    );
    setParlays(updatedParlays);
    
    setEditingPick(null);
    alert('Pick updated successfully!');
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
                        if (parlay.firestoreId) {
                          await updateBrolay(parlay.firestoreId, { dayOfWeek });
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
