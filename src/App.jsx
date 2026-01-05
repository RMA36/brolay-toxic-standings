import React, { useState, useEffect } from 'react';
import { PlusCircle, TrendingUp, Users, Award, AlertCircle, Loader, Menu, X, RefreshCw } from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, deleteField } from 'firebase/firestore';

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

const App = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const PASSWORD = 'manipulation';

  const THE_ODDS_API_KEY = '42cd1e5f5a4033ada2a492c738f33014';
  
  const SHOW_IMPORT_TAB = false; // Set to true to show Import Data tab
  const SHOW_SETTINGS_TAB = false; // Set to true to show Settings tab
  
  const [activeTab, setActiveTab] = useState('entry');
  const [csvInput, setCsvInput] = useState('');
  const [players] = useState(['Management', 'CD', '914', 'Junior', 'Jacoby']);
  const [parlays, setParlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState({});
  const [learnedTeams, setLearnedTeams] = useState([]);
  const [learnedPropTypes, setLearnedPropTypes] = useState([]);
  const [editingParlay, setEditingParlay] = useState(null);
  const [autoUpdating, setAutoUpdating] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [editingPick, setEditingPick] = useState(null);
  const [picksToShow, setPicksToShow] = useState(20); 
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
const preloadedTeams = {
  NFL: ['Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills', 'Carolina Panthers', 
        'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns', 'Dallas Cowboys', 'Denver Broncos',
        'Detroit Lions', 'Green Bay Packers', 'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars',
        'Kansas City Chiefs', 'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
        'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants', 'New York Jets',
        'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers', 'Seattle Seahawks', 'Tampa Bay Buccaneers',
        'Tennessee Titans', 'Washington Commanders'],
  NBA: ['Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets', 'Chicago Bulls',
        'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets', 'Detroit Pistons', 'Golden State Warriors',
        'Houston Rockets', 'Indiana Pacers', 'LA Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies',
        'Miami Heat', 'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks',
        'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns', 'Portland Trail Blazers',
        'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors', 'Utah Jazz', 'Washington Wizards'],
  MLB: ['Arizona Diamondbacks', 'Atlanta Braves', 'Baltimore Orioles', 'Boston Red Sox', 'Chicago Cubs',
        'Chicago White Sox', 'Cincinnati Reds', 'Cleveland Guardians', 'Colorado Rockies', 'Detroit Tigers',
        'Houston Astros', 'Kansas City Royals', 'Los Angeles Angels', 'Los Angeles Dodgers', 'Miami Marlins',
        'Milwaukee Brewers', 'Minnesota Twins', 'New York Mets', 'New York Yankees', 'Oakland Athletics',
        'Philadelphia Phillies', 'Pittsburgh Pirates', 'San Diego Padres', 'San Francisco Giants', 'Seattle Mariners',
        'St. Louis Cardinals', 'Tampa Bay Rays', 'Texas Rangers', 'Toronto Blue Jays', 'Washington Nationals'],
  NHL: ['Anaheim Ducks', 'Arizona Coyotes', 'Boston Bruins', 'Buffalo Sabres', 'Calgary Flames',
        'Carolina Hurricanes', 'Chicago Blackhawks', 'Colorado Avalanche', 'Columbus Blue Jackets', 'Dallas Stars',
        'Detroit Red Wings', 'Edmonton Oilers', 'Florida Panthers', 'Los Angeles Kings', 'Minnesota Wild',
        'Montreal Canadiens', 'Nashville Predators', 'New Jersey Devils', 'New York Islanders', 'New York Rangers',
        'Ottawa Senators', 'Philadelphia Flyers', 'Pittsburgh Penguins', 'San Jose Sharks', 'Seattle Kraken',
        'St. Louis Blues', 'Tampa Bay Lightning', 'Toronto Maple Leafs', 'Vancouver Canucks', 'Vegas Golden Knights',
        'Washington Capitals', 'Winnipeg Jets'],
  'College Football': ['Vanderbilt'],
  'College Basketball': ['Vanderbilt'],
  Soccer: ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham',
           'Barcelona', 'Real Madrid', 'Bayern Munich', 'Paris Saint-Germain', 'Juventus', 'Inter Milan'],
  Other: []
};

const commonPropTypes = [
  'Passing Yards',
  'Passing Attempts',
  'Interceptions Thrown',
  'Rushing Yards',
  'Receiving Yards',
  'Rushing & Receiving Yards',
  'Passing Touchdowns',
  'Receptions',
  'Points',
  'Rebounds',
  'Assists',
  'Strikeouts',
  'Hits',
  'Home Runs',
  'RBIs',
  'Goals',
  'Saves',
  'Shots on Goal'
];

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
  
  const mappings = {
    'passing yards': ['pass yards', 'passing yds', 'pass yds'],
    'passing completions': ['completions', 'comp', 'pass comp'],
    'rushing yards': ['rush yards', 'rushing yds', 'rush yds'],
    'receiving yards': ['rec yards', 'receiving yds', 'rec yds'],
    'rushing & receiving yards': ['rush + rec yards', 'rush and rec yards', 'rush/rec yards'],
    'receptions': ['rec', 'catches'],
    'passing touchdowns': ['pass td', 'pass tds', 'passing td'],
    'rushing touchdowns': ['rush td', 'rushing td'],
    'receiving touchdowns': ['rec td', 'receiving td'],
    'total touchdowns': ['td', 'touchdowns', 'tds'],
    'anytime touchdown scorer': ['anytime td', 'anytime td scorer', 'to score a td'],
    'interceptions thrown': ['int', 'ints', 'interceptions'],
    'points': ['pts'],
    'rebounds': ['reb', 'rebs'],
    'assists': ['ast', 'asst'],
    'steals': ['stl'],
    'blocks': ['blk'],
    'three pointers made': ['3pm', '3pt', 'threes', 'three pointers'],
    'turnovers': ['to'],
    'strikeouts': ['k', 'ks', 'so'],
    'hits': ['h'],
    'home runs': ['hr', 'homers'],
    'rbis': ['rbi', 'runs batted in'],
    'runs': ['r'],
    'stolen bases': ['sb', 'steals'],
    'goals': ['g'],
    'saves': ['sv'],
    'shots on goal': ['sog', 'shots']
  };
  
  for (const [standard, variations] of Object.entries(mappings)) {
    if (normalized === standard || variations.includes(normalized)) {
      return standard;
    }
  }
  
  return normalized;
};

const getStatValue = (stats, propType, sport, labels) => {
  if (!stats || !labels) return null;
  
  const statMappings = {
    'NFL': {
      'passing yards': ['YDS', 'Passing Yards'],
      'passing attempts': ['ATT', 'Attempts'],
      'passing completions': ['C/ATT', 'COMP', 'Completions'],
      'interceptions thrown': ['INT', 'Interceptions'],
      'rushing yards': ['YDS', 'Rushing Yards'],
      'receiving yards': ['YDS', 'Receiving Yards'],
      'rushing & receiving yards': ['YDS'],
      'receptions': ['REC', 'Receptions'],
      'passing touchdowns': ['TD', 'Passing TDs'],
      'rushing touchdowns': ['TD', 'Rushing TDs'],
      'receiving touchdowns': ['TD', 'Receiving TDs'],
      'total touchdowns': ['TD']
    },
    'NBA': {
      'points': ['PTS', 'Points'],
      'rebounds': ['REB', 'Rebounds'],
      'assists': ['AST', 'Assists'],
      'steals': ['STL', 'Steals'],
      'blocks': ['BLK', 'Blocks'],
      'three pointers made': ['3PM', '3PT'],
      'turnovers': ['TO', 'Turnovers']
    },
    'MLB': {
      'strikeouts': ['K', 'SO', 'Strikeouts'],
      'hits': ['H', 'Hits'],
      'home runs': ['HR', 'Home Runs'],
      'rbis': ['RBI', 'RBIs'],
      'runs': ['R', 'Runs'],
      'stolen bases': ['SB', 'Stolen Bases']
    },
    'NHL': {
      'goals': ['G', 'Goals'],
      'assists': ['A', 'Assists'],
      'points': ['PTS', 'Points'],
      'saves': ['SV', 'Saves'],
      'shots on goal': ['SOG', 'Shots']
    }
  };
  
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

const extractPlayerStat = (boxscoreData, playerName, propType, sport) => {
  if (!boxscoreData || !boxscoreData.players) return null;
  
  const normalizedPropType = normalizePropType(propType);
  const propLower = propType.toLowerCase();
  
  const isTDScorerProp = propLower.includes('anytime') || 
                         propLower.includes('2+') || 
                         propLower.includes('multiple td');
  
  try {
    let totalTDs = 0;
    let playerFound = false;
    
    for (const team of boxscoreData.players) {
      if (!team.statistics) continue;
      
      for (const statCategory of team.statistics) {
        if (!statCategory.athletes) continue;
        
        for (const athlete of statCategory.athletes) {
          if (!matchPlayerName(playerName, athlete.athlete?.displayName)) continue;
          
          playerFound = true;
          
          if (isTDScorerProp && sport === 'NFL') {
            const rushingTDs = getStatValue(athlete.stats, 'rushing touchdowns', sport, statCategory.labels) || 0;
            const receivingTDs = getStatValue(athlete.stats, 'receiving touchdowns', sport, statCategory.labels) || 0;
            totalTDs += rushingTDs + receivingTDs;
            continue;
          }
          
          const stat = getStatValue(athlete.stats, normalizedPropType, sport, statCategory.labels);
          if (stat !== null) return stat;
        }
      }
    }
    
    if (isTDScorerProp && playerFound) {
      return totalTDs;
    }
    
  } catch (error) {
    console.error('Error extracting player stat:', error);
  }
  
  return null;
};

const checkTDScorerResult = (totalTDs, propType, overUnder, line) => {
  const propLower = propType.toLowerCase();
  
  if (propLower.includes('anytime') && (propLower.includes('td') || propLower.includes('touchdown'))) {
    const lineValue = parseFloat(line);
    
    if (overUnder === 'Over') {
      return totalTDs >= 1 ? 'win' : 'loss';
    } else {
      return totalTDs === 0 ? 'win' : 'loss';
    }
  }
  
  if (propLower.includes('2+') || 
      propLower.includes('multiple') || 
      propLower.includes('2 or more')) {
    
    if (overUnder === 'Over') {
      return totalTDs >= 2 ? 'win' : 'loss';
    } else {
      return totalTDs < 2 ? 'win' : 'loss';
    }
  }
  
  const lineValue = parseFloat(line);
  if (isNaN(lineValue)) return 'pending';
  
  if (overUnder === 'Over') {
    if (totalTDs > lineValue) return 'win';
    if (totalTDs < lineValue) return 'loss';
    return 'push';
  } else {
    if (totalTDs < lineValue) return 'win';
    if (totalTDs > lineValue) return 'loss';
    return 'push';
  }
};

const checkPropBetResult = async (participant, gameDate) => {
  const { sport, team: playerName, propType, overUnder, line } = participant;
  
  if (!playerName || !propType || !line) return 'pending';
  
  try {
    let espnSport = '';
    switch(sport) {
      case 'NFL': espnSport = 'football/nfl'; break;
      case 'NBA': espnSport = 'basketball/nba'; break;
      case 'MLB': espnSport = 'baseball/mlb'; break;
      case 'NHL': espnSport = 'hockey/nhl'; break;
      case 'College Football': espnSport = 'football/college-football'; break;
      case 'College Basketball': espnSport = 'basketball/mens-college-basketball'; break;
      case 'College Basketball (Women\'s)': espnSport = 'basketball/womens-college-basketball'; break;
      case 'Soccer': espnSport = 'soccer/usa.1'; break; // MLS
      case 'Soccer (Women\'s)': espnSport = 'soccer/usa.nwsl'; break; // NWSL
      case 'Tennis': espnSport = 'tennis/atp'; break;
      case 'Tennis (Women\'s)': espnSport = 'tennis/wta'; break;
      case 'WNBA': espnSport = 'basketball/wnba'; break;
      case 'College Baseball': espnSport = 'baseball/college-baseball'; break;
      // Golf, Rugby, and UFC don't have the same scoreboard structure on ESPN API
      case 'Golf': return 'pending';
      case 'Rugby': return 'pending';
      case 'UFC': return 'pending';
      default: return 'pending';
    }

    const formattedDate = gameDate.replace(/-/g, '');
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.events || data.events.length === 0) {
      return 'pending';
    }

    for (const event of data.events) {
      const competition = event.competitions[0];
      
      if (competition.status.type.completed !== true) {
        continue;
      }

      const gameId = event.id;
      const boxscoreUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
      try {
        const boxscoreResponse = await fetch(boxscoreUrl);
        const boxscoreData = await boxscoreResponse.json();
        
        // Double-check the boxscore itself shows the game is final
        if (boxscoreData.header?.competitions?.[0]?.status?.type?.completed !== true) {
          console.log(`Boxscore for game ${gameId} not showing as completed, skipping`);
          continue;
        }
        
        const boxscoreStatus = boxscoreData.header?.competitions?.[0]?.status?.type?.name?.toLowerCase();
        if (boxscoreStatus !== 'final' && boxscoreStatus !== 'status_final') {
          console.log(`Boxscore for game ${gameId} status is ${boxscoreStatus}, not final, skipping`);
          continue;
        }
        
        if (boxscoreData.boxscore) {
          const playerStat = extractPlayerStat(boxscoreData.boxscore, playerName, propType, sport);
          
          if (playerStat !== null) {
            const propLower = propType.toLowerCase();
            const isTDScorerProp = propLower.includes('anytime') || 
                                   propLower.includes('2+') || 
                                   propLower.includes('multiple td');
            
            if (isTDScorerProp) {
              const result = checkTDScorerResult(playerStat, propType, overUnder, line);
              return {
                result,
                stats: `${playerStat} TD${playerStat !== 1 ? 's' : ''}`
              };
            }
            
            const lineValue = parseFloat(line);
            if (isNaN(lineValue)) return { result: 'pending', stats: null };
            
            let result;
            if (overUnder === 'Over') {
              if (playerStat > lineValue) result = 'win';
              else if (playerStat < lineValue) result = 'loss';
              else result = 'push';
            } else {
              if (playerStat < lineValue) result = 'win';
              else if (playerStat > lineValue) result = 'loss';
              else result = 'push';
            }
            
            return {
              result,
              stats: `${playerStat} ${normalizePropType(propType)}`
            };
          }
        }
      } catch (boxscoreError) {
        console.error('Error fetching boxscore:', boxscoreError);
        continue;
      }
    }
    
  return { result: 'pending', stats: null };
    
  } catch (error) {
    console.error('Error checking prop bet:', error);
    return { result: 'pending', stats: null };
  }
};

const matchTeamName = (pickTeam, apiTeam) => {
  if (!pickTeam || !apiTeam) return false;
  
  const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedPick = normalize(pickTeam);
  const normalizedApi = normalize(apiTeam);
  
  return normalizedApi.includes(normalizedPick) || normalizedPick.includes(normalizedApi);
};

const determineSpreadResult = (pickedTeam, favoriteOrDog, spreadValue, homeComp, awayComp, homeScore, awayScore) => {
  const spread = parseFloat(spreadValue);
  if (isNaN(spread)) return 'pending';

  let pickedTeamScore, opponentScore;
  const pickedTeamIsHome = matchTeamName(pickedTeam, homeComp.team.displayName);
  
  if (pickedTeamIsHome) {
    pickedTeamScore = homeScore;
    opponentScore = awayScore;
  } else {
    pickedTeamScore = awayScore;
    opponentScore = homeScore;
  }

  let adjustedScore;
  if (favoriteOrDog === 'Favorite') {
    adjustedScore = pickedTeamScore - spread;
  } else {
    adjustedScore = pickedTeamScore + spread;
  }

  if (adjustedScore > opponentScore) return 'win';
  if (adjustedScore < opponentScore) return 'loss';
  return 'push';
};

const determineMoneylineResult = (pickedTeam, homeComp, awayComp) => {
  const pickedTeamIsHome = matchTeamName(pickedTeam, homeComp.team.displayName);
  const pickedTeamWon = pickedTeamIsHome ? homeComp.winner : awayComp.winner;
  
  return pickedTeamWon ? 'win' : 'loss';
};

const determineTotalResult = (overUnder, totalLine, finalTotal) => {
  const line = parseFloat(totalLine);
  if (isNaN(line)) return 'pending';

  if (overUnder === 'Over') {
    if (finalTotal > line) return 'win';
    if (finalTotal < line) return 'loss';
    return 'push';
  } else {
    if (finalTotal < line) return 'win';
    if (finalTotal > line) return 'loss';
    return 'push';
  }
};

// Function to check first half and first inning results
const checkFirstHalfResult = async (participant, gameDate) => {
  const { sport, betType, team, awayTeam, homeTeam, overUnder, total, yesNoRuns } = participant;
  
  try {
    let espnSport = '';
    switch(sport) {
      case 'NFL': espnSport = 'football/nfl'; break;
      case 'NBA': espnSport = 'basketball/nba'; break;
      case 'MLB': espnSport = 'baseball/mlb'; break;
      case 'NHL': espnSport = 'hockey/nhl'; break;
      case 'College Football': espnSport = 'football/college-football'; break;
      case 'College Basketball': espnSport = 'basketball/mens-college-basketball'; break;
      case 'College Basketball (Women\'s)': espnSport = 'basketball/womens-college-basketball'; break;
      case 'Soccer': espnSport = 'soccer/usa.1'; break; // MLS
      case 'Soccer (Women\'s)': espnSport = 'soccer/usa.nwsl'; break; // NWSL
      case 'Tennis': espnSport = 'tennis/atp'; break;
      case 'Tennis (Women\'s)': espnSport = 'tennis/wta'; break;
      case 'WNBA': espnSport = 'basketball/wnba'; break;
      case 'College Baseball': espnSport = 'baseball/college-baseball'; break;
      // Golf, Rugby, and UFC don't have the same scoreboard structure on ESPN API
      case 'Golf': return { result: 'pending', stats: null };
      case 'Rugby': return { result: 'pending', stats: null };
      case 'UFC': return { result: 'pending', stats: null };
      default: return { result: 'pending', stats: null };
    }

    const formattedDate = gameDate.replace(/-/g, '');
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.events || data.events.length === 0) {
      return { result: 'pending', stats: null };
    }

    let relevantGame = null;
    
    for (const event of data.events) {
      const competition = event.competitions[0];
      const competitors = competition.competitors;
      
      if (competition.status.type.completed !== true) {
        continue;
      }

      const homeTeamName = competitors.find(c => c.homeAway === 'home')?.team.displayName || '';
      const awayTeamName = competitors.find(c => c.homeAway === 'away')?.team.displayName || '';
      
      // Match game based on bet type
      if (betType === 'First Half Total' || betType === 'First Inning Runs') {
        if (matchTeamName(awayTeam, awayTeamName) && matchTeamName(homeTeam, homeTeamName)) {
          relevantGame = { competition, event };
          break;
        }
      } else if (betType === 'First Half Team Total') {
        if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
          relevantGame = { competition, event };
          break;
        }
      } else { // First Half Moneyline
        if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
          relevantGame = { competition, event };
          break;
        }
      }
    }

    if (!relevantGame) {
      return { result: 'pending', stats: null };
    }

    // Get detailed game data for period scores
    const gameId = relevantGame.event.id;
    const detailUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
    
    try {
      const detailResponse = await fetch(detailUrl);
      const detailData = await detailResponse.json();
      
      // Check for First Inning Runs (MLB specific)
      if (betType === 'First Inning Runs' && sport === 'MLB') {
        if (detailData.boxscore && detailData.boxscore.teams) {
          let firstInningRuns = 0;
          
          for (const teamData of detailData.boxscore.teams) {
            if (teamData.statistics) {
              const inningStats = teamData.statistics.find(stat => stat.type === 'linescores');
              if (inningStats && inningStats.labels && inningStats.stats) {
                const firstInningIndex = 0; // First inning is index 0
                if (inningStats.stats[firstInningIndex]) {
                  firstInningRuns += parseInt(inningStats.stats[firstInningIndex]) || 0;
                }
              }
            }
          }
          
          const result = yesNoRuns === 'Yes' 
            ? (firstInningRuns > 0 ? 'win' : 'loss')
            : (firstInningRuns === 0 ? 'win' : 'loss');
          return {
            result,
            stats: `1st Inning: ${firstInningRuns} runs`
          };
        }
      }
      
      // Check for First Half data
      let firstHalfHomeScore = 0;
      let firstHalfAwayScore = 0;
      
      if (detailData.boxscore && detailData.boxscore.teams) {
        const homeTeamData = detailData.boxscore.teams.find(t => t.homeAway === 'home');
        const awayTeamData = detailData.boxscore.teams.find(t => t.homeAway === 'away');
        
        if (homeTeamData && awayTeamData) {
          // For NFL/College Football - first 2 quarters
          if (sport === 'NFL' || sport === 'College Football') {
            const homeStats = homeTeamData.statistics?.find(stat => stat.type === 'linescores');
            const awayStats = awayTeamData.statistics?.find(stat => stat.type === 'linescores');
            
            if (homeStats && awayStats && homeStats.stats && awayStats.stats) {
              // Sum first 2 quarters (Q1 and Q2)
              firstHalfHomeScore = (parseInt(homeStats.stats[0]) || 0) + (parseInt(homeStats.stats[1]) || 0);
              firstHalfAwayScore = (parseInt(awayStats.stats[0]) || 0) + (parseInt(awayStats.stats[1]) || 0);
            }
          }
          
          // For NBA/College Basketball - first 2 quarters or first half
          if (sport === 'NBA' || sport === 'College Basketball') {
            const homeStats = homeTeamData.statistics?.find(stat => stat.type === 'linescores');
            const awayStats = awayTeamData.statistics?.find(stat => stat.type === 'linescores');
            
            if (homeStats && awayStats && homeStats.stats && awayStats.stats) {
              if (sport === 'College Basketball') {
                // College uses halves
                firstHalfHomeScore = parseInt(homeStats.stats[0]) || 0;
                firstHalfAwayScore = parseInt(awayStats.stats[0]) || 0;
              } else {
                // NBA uses quarters
                firstHalfHomeScore = (parseInt(homeStats.stats[0]) || 0) + (parseInt(homeStats.stats[1]) || 0);
                firstHalfAwayScore = (parseInt(awayStats.stats[0]) || 0) + (parseInt(awayStats.stats[1]) || 0);
              }
            }
          }
          
          // For NHL - first period
          if (sport === 'NHL') {
            const homeStats = homeTeamData.statistics?.find(stat => stat.type === 'linescores');
            const awayStats = awayTeamData.statistics?.find(stat => stat.type === 'linescores');
            
            if (homeStats && awayStats && homeStats.stats && awayStats.stats) {
              firstHalfHomeScore = parseInt(homeStats.stats[0]) || 0;
              firstHalfAwayScore = parseInt(awayStats.stats[0]) || 0;
            }
          }
          
          // Determine result based on bet type
          if (betType === 'First Half Moneyline') {
            const competitors = relevantGame.competition.competitors;
            const homeComp = competitors.find(c => c.homeAway === 'home');
            const awayComp = competitors.find(c => c.homeAway === 'away');
            const pickedTeamIsHome = matchTeamName(team, homeComp.team.displayName);
            
            let result;
            if (pickedTeamIsHome) {
              if (firstHalfHomeScore > firstHalfAwayScore) result = 'win';
              else if (firstHalfHomeScore < firstHalfAwayScore) result = 'loss';
              else result = 'push';
            } else {
              if (firstHalfAwayScore > firstHalfHomeScore) result = 'win';
              else if (firstHalfAwayScore < firstHalfHomeScore) result = 'loss';
              else result = 'push';
            }
            return {
              result,
              stats: `1H: ${awayComp.team.displayName} ${firstHalfAwayScore} @ ${homeComp.team.displayName} ${firstHalfHomeScore}`
            };
          }
          
          if (betType === 'First Half Total') {
            const firstHalfTotal = firstHalfHomeScore + firstHalfAwayScore;
            const result = determineTotalResult(overUnder, total, firstHalfTotal);
            return {
              result,
              stats: `1H Total: ${firstHalfTotal}`
            };
          }
          
          if (betType === 'First Half Team Total') {
            const competitors = relevantGame.competition.competitors;
            const homeComp = competitors.find(c => c.homeAway === 'home');
            const pickedTeamIsHome = matchTeamName(team, homeComp.team.displayName);
            const teamTotal = pickedTeamIsHome ? firstHalfHomeScore : firstHalfAwayScore;
            
            const result = determineTotalResult(overUnder, total, teamTotal);
            return {
              result,
              stats: `1H Team Total: ${teamTotal}`
            };
          }
        }
      }
      
    } catch (detailError) {
      console.error('Error fetching game details:', detailError);
    }
    
    return { result: 'pending', stats: null };
    
  } catch (error) {
    console.error('Error checking first half result:', error);
    return { result: 'pending', stats: null };
  }
};

// Function to check quarter results (football only)
const checkQuarterResult = async (participant, gameDate) => {
  const { sport, betType, team, awayTeam, homeTeam, overUnder, total, quarter } = participant;
  
  // Only works for football
  if (sport !== 'NFL' && sport !== 'College Football') {
    return { result: 'pending', stats: null };;
  }
  
  try {
    let espnSport = '';
    switch(sport) {
      case 'NFL': espnSport = 'football/nfl'; break;
      case 'College Football': espnSport = 'football/college-football'; break;
      default: return { result: 'pending', stats: null };; // Quarter bets only work for football
    }

    const formattedDate = gameDate.replace(/-/g, '');
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.events || data.events.length === 0) {
      return { result: 'pending', stats: null };;
    }

    let relevantGame = null;
    
    for (const event of data.events) {
      const competition = event.competitions[0];
      const competitors = competition.competitors;
      
      if (competition.status.type.completed !== true) {
        continue;
      }

      const homeTeamName = competitors.find(c => c.homeAway === 'home')?.team.displayName || '';
      const awayTeamName = competitors.find(c => c.homeAway === 'away')?.team.displayName || '';
      
      // Match game based on bet type
      if (betType === 'Quarter Total') {
        if (matchTeamName(awayTeam, awayTeamName) && matchTeamName(homeTeam, homeTeamName)) {
          relevantGame = { competition, event };
          break;
        }
      } else if (betType === 'Quarter Team Total') {
        if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
          relevantGame = { competition, event };
          break;
        }
      } else { // Quarter Moneyline
        if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
          relevantGame = { competition, event };
          break;
        }
      }
    }

    if (!relevantGame) {
      return { result: 'pending', stats: null };;
    }

    // Get detailed game data for period scores
    const gameId = relevantGame.event.id;
    const detailUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
    
    try {
      const detailResponse = await fetch(detailUrl);
      const detailData = await detailResponse.json();
      
      // Get quarter scores
      let quarterHomeScore = 0;
      let quarterAwayScore = 0;
      
      if (detailData.boxscore && detailData.boxscore.teams) {
        const homeTeamData = detailData.boxscore.teams.find(t => t.homeAway === 'home');
        const awayTeamData = detailData.boxscore.teams.find(t => t.homeAway === 'away');
        
        if (homeTeamData && awayTeamData) {
          const homeStats = homeTeamData.statistics?.find(stat => stat.type === 'linescores');
          const awayStats = awayTeamData.statistics?.find(stat => stat.type === 'linescores');
          
          if (homeStats && awayStats && homeStats.stats && awayStats.stats) {
            // Determine which quarter index (0=Q1, 1=Q2, 2=Q3, 3=Q4)
            const quarterIndex = {
              '1Q': 0,
              '2Q': 1,
              '3Q': 2,
              '4Q': 3
            }[quarter];
            
            if (quarterIndex !== undefined && homeStats.stats[quarterIndex] !== undefined && awayStats.stats[quarterIndex] !== undefined) {
              quarterHomeScore = parseInt(homeStats.stats[quarterIndex]) || 0;
              quarterAwayScore = parseInt(awayStats.stats[quarterIndex]) || 0;
            } else {
              return { result: 'pending', stats: null };; // Quarter data not available
            }
          }
        }
        
        // Determine result based on bet type
        if (betType === 'Quarter Moneyline') {
            const competitors = relevantGame.competition.competitors;
            const homeComp = competitors.find(c => c.homeAway === 'home');
            const awayComp = competitors.find(c => c.homeAway === 'away');
            const pickedTeamIsHome = matchTeamName(team, homeComp.team.displayName);
            
            let result;
          if (pickedTeamIsHome) {
            if (quarterHomeScore > quarterAwayScore) result = 'win';
            else if (quarterHomeScore < quarterAwayScore) result = 'loss';
            else result = 'push';
          } else {
            if (quarterAwayScore > quarterHomeScore) result = 'win';
            else if (quarterAwayScore < quarterHomeScore) result = 'loss';
            else result = 'push';
          }
          return {
            result,
            stats: `${quarter}: ${awayComp.team.displayName} ${quarterAwayScore} @ ${homeComp.team.displayName} ${quarterHomeScore}`
          };
          }
        
        if (betType === 'Quarter Total') {
            const quarterTotal = quarterHomeScore + quarterAwayScore;
            const result = determineTotalResult(overUnder, total, quarterTotal);
            return {
              result,
              stats: `${quarter} Total: ${quarterTotal}`
            };
          }
        
        if (betType === 'Quarter Team Total') {
            const competitors = relevantGame.competition.competitors;
            const homeComp = competitors.find(c => c.homeAway === 'home');
            const pickedTeamIsHome = matchTeamName(team, homeComp.team.displayName);
            const teamTotal = pickedTeamIsHome ? quarterHomeScore : quarterAwayScore;
            
            const result = determineTotalResult(overUnder, total, teamTotal);
            return {
              result,
              stats: `${quarter} Team Total: ${teamTotal}`
            };
          }
      }
      
    } catch (detailError) {
      console.error('Error fetching game details:', detailError);
    }
    
    return { result: 'pending', stats: null };;
    
  } catch (error) {
    console.error('Error checking quarter result:', error);
    return { result: 'pending', stats: null };;
  }
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
      const propTypeMap = {
        // NFL Props
        'passing yards': 'player_pass_yds',
        'passing attempts': 'player_pass_attempts',
        'passing completions': 'player_pass_completions',
        'passing touchdowns': 'player_pass_tds',
        'interceptions thrown': 'player_pass_interceptions',
        'rushing yards': 'player_rush_yds',
        'rushing attempts': 'player_rush_attempts',
        'rushing touchdowns': 'player_rush_tds',
        'receiving yards': 'player_reception_yds',
        'receptions': 'player_receptions',
        'receiving touchdowns': 'player_reception_tds',
        'rushing & receiving yards': 'player_rush_receive_yds',
        'anytime touchdown scorer': 'player_anytime_td',
        'first touchdown scorer': 'player_first_td',
        'last touchdown scorer': 'player_last_td',
        
        // NBA Props
        'points': 'player_points',
        'rebounds': 'player_rebounds',
        'assists': 'player_assists',
        'three pointers made': 'player_threes',
        'steals': 'player_steals',
        'blocks': 'player_blocks',
        'turnovers': 'player_turnovers',
        'points + rebounds': 'player_points_rebounds',
        'points + assists': 'player_points_assists',
        'rebounds + assists': 'player_rebounds_assists',
        'points + rebounds + assists': 'player_points_rebounds_assists',
        
        // MLB Props
        'strikeouts': 'player_strikeouts',
        'pitcher strikeouts': 'pitcher_strikeouts',
        'hits': 'player_hits',
        'total bases': 'player_total_bases',
        'home runs': 'player_home_runs',
        'rbis': 'player_rbis',
        'runs': 'player_runs_scored',
        'stolen bases': 'player_stolen_bases',
        'hits allowed': 'pitcher_hits_allowed',
        'walks allowed': 'pitcher_walks',
        'earned runs allowed': 'pitcher_earned_runs',
        
        // NHL Props
        'goals': 'player_goals',
        'shots on goal': 'player_shots_on_goal',
        'saves': 'goalie_saves',
        'goals against': 'goalie_goals_against'
      };
      
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
  
const checkGameResult = async (participant, gameDate) => {
  const { sport, betType, team, awayTeam, homeTeam, favorite, spread, overUnder, total } = participant;
  
  if (betType === 'Prop Bet') {
    return await checkPropBetResult(participant, gameDate);
  }

  if (['First Half Moneyline', 'First Half Total', 'First Inning Runs', 'First Half Team Total', 
       'Quarter Moneyline', 'Quarter Total', 'Quarter Team Total'].includes(betType)) {
    if (['Quarter Moneyline', 'Quarter Total', 'Quarter Team Total'].includes(betType)) {
      return await checkQuarterResult(participant, gameDate);
    }
    return await checkFirstHalfResult(participant, gameDate);
  }
  
  try {
    let espnSport = '';
    switch(sport) {
      case 'NFL': espnSport = 'football/nfl'; break;
      case 'NBA': espnSport = 'basketball/nba'; break;
      case 'MLB': espnSport = 'baseball/mlb'; break;
      case 'NHL': espnSport = 'hockey/nhl'; break;
      case 'College Football': espnSport = 'football/college-football'; break;
      case 'College Basketball': espnSport = 'basketball/mens-college-basketball'; break;
      case 'College Basketball (Women\'s)': espnSport = 'basketball/womens-college-basketball'; break;
      case 'Soccer': espnSport = 'soccer/usa.1'; break; // MLS
      case 'Soccer (Women\'s)': espnSport = 'soccer/usa.nwsl'; break; // NWSL
      case 'Tennis': espnSport = 'tennis/atp'; break;
      case 'Tennis (Women\'s)': espnSport = 'tennis/wta'; break;
      case 'WNBA': espnSport = 'basketball/wnba'; break;
      case 'College Baseball': espnSport = 'baseball/college-baseball'; break;
      // Golf, Rugby, and UFC don't have the same scoreboard structure on ESPN API
      case 'Golf': return 'pending';
      case 'Rugby': return 'pending';
      case 'UFC': return 'pending';
      default: return 'pending';
    }

    const formattedDate = gameDate.replace(/-/g, '');
    const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.events || data.events.length === 0) {
      return 'pending';
    }

    let relevantGame = null;
    
    for (const event of data.events) {
      const competition = event.competitions[0];
      const competitors = competition.competitors;
      
      if (competition.status.type.completed !== true) {
        continue;
      }

      const homeTeamName = competitors.find(c => c.homeAway === 'home')?.team.displayName || '';
      const awayTeamName = competitors.find(c => c.homeAway === 'away')?.team.displayName || '';
      
      if (betType === 'Total') {
        if (matchTeamName(awayTeam, awayTeamName) && matchTeamName(homeTeam, homeTeamName)) {
          relevantGame = competition;
          break;
        }
      } else {
        if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
          relevantGame = competition;
          break;
        }
      }
    }

    if (!relevantGame) {
      return 'pending';
    }

    const competitors = relevantGame.competitors;
    const homeComp = competitors.find(c => c.homeAway === 'home');
    const awayComp = competitors.find(c => c.homeAway === 'away');
    
    const homeScore = parseInt(homeComp.score);
    const awayScore = parseInt(awayComp.score);

    if (betType === 'Spread') {
      const result = determineSpreadResult(team, favorite, spread, homeComp, awayComp, homeScore, awayScore);
      return {
        result,
        stats: `${awayComp.team.displayName} ${awayScore} @ ${homeComp.team.displayName} ${homeScore}`
      };
    } else if (betType === 'Moneyline') {
      const result = determineMoneylineResult(team, homeComp, awayComp);
      return {
        result,
        stats: `${awayComp.team.displayName} ${awayScore} @ ${homeComp.team.displayName} ${homeScore}`
      };
    } else if (betType === 'Total') {
      const result = determineTotalResult(overUnder, total, homeScore + awayScore);
      return {
        result,
        stats: `Total: ${homeScore + awayScore}`
      };
    }
        
        return { result: 'pending', stats: null };
    
  } catch (error) {
    console.error('Error fetching game data:', error);
    return 'pending';
  }
};

const autoUpdatePendingPicks = async () => {
  try {
    setAutoUpdating(true);
    let updatedCount = 0;
    
    const parlaysToUpdate = parlays.filter(parlay => {
      const participants = Object.values(parlay.participants || {});
      return participants.some(p => p.result === 'pending');
    });

    for (const parlay of parlaysToUpdate) {
      let parlayUpdated = false;
      const updatedParticipants = { ...parlay.participants };
      
      for (const [participantId, participant] of Object.entries(parlay.participants)) {
        if (participant.result !== 'pending') continue;

      try {
          const resultData = await checkGameResult(participant, parlay.date);
          
          if (resultData && resultData.result && resultData.result !== 'pending') {
            // Create a clean participant object without old actualStats
            const { actualStats: oldStats, ...cleanParticipant } = participant;
            
            updatedParticipants[participantId] = {
              ...cleanParticipant,
              result: resultData.result,
              actualStats: resultData.stats,
              autoUpdated: true,
              autoUpdatedAt: new Date().toISOString()
            };
            parlayUpdated = true;
            updatedCount++;
          }
        } catch (error) {
          console.error(`Error checking result for pick ${participantId}:`, error);
        }
      }

      if (parlayUpdated && parlay.firestoreId) {
        try {
          const parlayDoc = doc(db, 'parlays', parlay.firestoreId);
          await updateDoc(parlayDoc, {
            participants: updatedParticipants
          });
        } catch (error) {
          console.error('Error updating parlay in Firebase:', error);
        }
      }
    }

    if (updatedCount > 0) {
      alert(`Successfully updated ${updatedCount} pending pick(s)!`);
      await loadParlays();
    } else {
      alert('No pending picks could be updated at this time.');
    }
  } catch (error) {
    console.error('Error in auto-update:', error);
    alert('Error updating picks. Please try again.');
  } finally {
    setAutoUpdating(false);
  }
};
  
  useEffect(() => {
  if (authenticated) {
    // Set up real-time listener
    const parlaysCollection = collection(db, 'parlays');
    const unsubscribe = onSnapshot(parlaysCollection, (snapshot) => {
      const parlayList = snapshot.docs.map(doc => ({
        ...doc.data(),
        firestoreId: doc.id
      }));
      setParlays(parlayList);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }
}, [authenticated]);

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
    loadParlays();
    // Reset pagination when switching tabs
    if (activeTab === 'allBrolays') {
      setBrolaysToShow(10);
    }
  }
}, [activeTab, authenticated]);
  
  const loadParlays = async () => {
  try {
    setLoading(true);
    const parlaysCollection = collection(db, 'parlays');
    const parlaySnapshot = await getDocs(parlaysCollection);
    const parlayList = parlaySnapshot.docs.map(doc => ({
      ...doc.data(),
      firestoreId: doc.id
    }));
    setParlays(parlayList);
  } catch (error) {
    console.error('Error loading parlays:', error);
    setParlays([]);
  } finally {
    setLoading(false);
  }
};

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
    await loadParlays();
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
    // Save to Firebase
    const parlaysCollection = collection(db, 'parlays');
    const docRef = await addDoc(parlaysCollection, parlayWithId);
    
    const updatedParlays = [...parlays, { ...parlayWithId, firestoreId: docRef.id }];
    setParlays(updatedParlays);
    
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
        const parlayDoc = doc(db, 'parlays', parlayToUpdate.firestoreId);
        await updateDoc(parlayDoc, {
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
      return { ...parlay, settled: !parlay.settled };
    }
    return parlay;
  });
  
  setParlays(updatedParlays);
  
  // Update in Firebase
  const parlayToUpdate = updatedParlays.find(p => p.id === parlayId);
  if (parlayToUpdate && parlayToUpdate.firestoreId) {
    try {
      const parlayDoc = doc(db, 'parlays', parlayToUpdate.firestoreId);
      await updateDoc(parlayDoc, {
        settled: parlayToUpdate.settled
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
        const parlayDoc = doc(db, 'parlays', parlayToDelete.firestoreId);
        await deleteDoc(parlayDoc);
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
      const parlayDoc = doc(db, 'parlays', cleanedParlay.firestoreId);
      
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
      
      await updateDoc(parlayDoc, updateObject);
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
            <label className="block text-xs font-medium mb-1">Favorite/Dog</label>
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
            <label className="block text-xs font-medium mb-1">Spread</label>
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
            <label className="block text-xs font-medium mb-1">Over/Under</label>
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
            <label className="block text-xs font-medium mb-1">Total</label>
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
            <label className="block text-xs font-medium mb-1">Over/Under</label>
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
            <label className="block text-xs font-medium mb-1">1H Total</label>
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
            <label className="block text-xs font-medium mb-1">Over/Under</label>
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
            <label className="block text-xs font-medium mb-1">Team Total</label>
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
          <label className="block text-xs font-medium mb-1">Yes/No Runs</label>
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
          <label className="block text-xs font-medium mb-1">Quarter</label>
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
            <label className="block text-xs font-medium mb-1">Quarter</label>
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
            <label className="block text-xs font-medium mb-1">Over/Under</label>
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
            <label className="block text-xs font-medium mb-1">Quarter Total</label>
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
            <label className="block text-xs font-medium mb-1">Quarter</label>
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
            <label className="block text-xs font-medium mb-1">Over/Under</label>
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
            <label className="block text-xs font-medium mb-1">Team Total</label>
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
            <label className="block text-xs font-medium mb-1">Prop Type</label>
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
            <label className="block text-xs font-medium mb-1">Over/Under</label>
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
            <label className="block text-xs font-medium mb-1">Line</label>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4 overflow-y-auto">
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
                    <label className="block text-xs font-medium mb-1">Big Guy</label>
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
                    <label className="block text-xs font-medium mb-1">Sport</label>
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
                    <label className="block text-xs font-medium mb-1">Bet Type</label>
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
                      <label className="block text-xs font-medium mb-1">Team/Player</label>
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
                      <label className="block text-xs font-medium mb-1">Away Team</label>
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
                      <label className="block text-xs font-medium mb-1">Home Team</label>
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
                    <label className="block text-xs font-medium mb-1">Odds (Optional)</label>
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
                      <div className="text-xs text-gray-500 mt-1">Source: {participant.oddsSource}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Result</label>
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
            <button
              onClick={() => setEditingParlay(null)}
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Cancel
            </button>
            <button
              onClick={() => saveEditedParlay(editingParlay)}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
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
    await loadParlays(); // Refresh the list
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
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading your parlays...</p>
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
    data: {}
  };

  // Detect what they're searching for
  const isPropType = commonPropTypes.some(prop => 
    lowerQuery.includes(prop.toLowerCase())
  ) || lowerQuery.includes('prop') || lowerQuery.includes('touchdown') || 
     lowerQuery.includes('yards') || lowerQuery.includes('points');

  const isSport = sports.some(sport => 
    lowerQuery.includes(sport.toLowerCase())
  );

  const isPlayer = players.some(player => 
    lowerQuery.includes(player.toLowerCase())
  );

  const isTeam = [...new Set([...Object.values(preloadedTeams).flat(), ...learnedTeams])].some(team =>
    lowerQuery.includes(team.toLowerCase())
  );

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
    const pickDayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Convert to our array indexing (Monday = 0)
    const adjustedDayIndex = pickDayIndex === 0 ? 6 : pickDayIndex - 1;
    
    if (adjustedDayIndex === dayIndex) {
      Object.entries(parlay.participants).forEach(([id, pick]) => {
        matchingPicks.push({
          ...pick,
          parlayDate: parlay.date,
          parlayId: parlay.id,
          participantId: id
        });
      });
    }
  });

  const wins = matchingPicks.filter(p => p.result === 'win').length;
  const losses = matchingPicks.filter(p => p.result === 'loss').length;
  const pushes = matchingPicks.filter(p => p.result === 'push').length;
  const pending = matchingPicks.filter(p => p.result === 'pending').length;
  const total = matchingPicks.length;

  // By player
  const byPlayer = {};
  matchingPicks.forEach(pick => {
    if (!byPlayer[pick.player]) {
      byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
    }
    byPlayer[pick.player].total++;
    if (pick.result === 'win') byPlayer[pick.player].wins++;
    else if (pick.result === 'loss') byPlayer[pick.player].losses++;
    else if (pick.result === 'push') byPlayer[pick.player].pushes++;
  });

  // By sport
  const bySport = {};
  matchingPicks.forEach(pick => {
    if (!bySport[pick.sport]) {
      bySport[pick.sport] = { wins: 0, losses: 0, pushes: 0, total: 0 };
    }
    bySport[pick.sport].total++;
    if (pick.result === 'win') bySport[pick.sport].wins++;
    else if (pick.result === 'loss') bySport[pick.sport].losses++;
    else if (pick.result === 'push') bySport[pick.sport].pushes++;
  });

  // By bet type
  const byBetType = {};
  matchingPicks.forEach(pick => {
    if (!byBetType[pick.betType]) {
      byBetType[pick.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
    }
    byBetType[pick.betType].total++;
    if (pick.result === 'win') byBetType[pick.betType].wins++;
    else if (pick.result === 'loss') byBetType[pick.betType].losses++;
    else if (pick.result === 'push') byBetType[pick.betType].pushes++;
  });

  results.data = {
    dayOfWeek: matchedDay.charAt(0).toUpperCase() + matchedDay.slice(1),
    total,
    wins,
    losses,
    pushes,
    pending,
    winPct: total > 0 ? ((wins / total) * 100).toFixed(1) : 0,
    byPlayer,
    bySport,
    byBetType,
    recentPicks: matchingPicks
      .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
      .slice(0, 10)
  };
  
  return results;
}
    
  // Determine primary search category
  if (isPropType) {
    results.matchedCategory = 'propType';
    
// Find the specific prop type
let matchedProp = commonPropTypes.find(prop => 
  lowerQuery.includes(prop.toLowerCase())
);

// Special handling for "anytime touchdown scorer" vs other touchdown props
if (!matchedProp && (lowerQuery.includes('anytime touchdown') || lowerQuery.includes('anytime td'))) {
  matchedProp = 'Anytime Touchdown Scorer';
}

if (matchedProp) {
  const normalizedProp = normalizePropType(matchedProp);
  
  // Collect all picks matching this prop type
  const matchingPicks = [];
  parlays.forEach(parlay => {
    Object.entries(parlay.participants).forEach(([id, pick]) => {
      if (pick.betType === 'Prop Bet' && pick.propType) {
        const pickPropNormalized = normalizePropType(pick.propType);
        
        // Exact match or very close match
        if (pickPropNormalized === normalizedProp) {
          matchingPicks.push({
            ...pick,
            parlayDate: parlay.date,
            parlayId: parlay.id,
            participantId: id
          });
        }
      }
    });
  });
  
      // Calculate stats
      const wins = matchingPicks.filter(p => p.result === 'win').length;
      const losses = matchingPicks.filter(p => p.result === 'loss').length;
      const pushes = matchingPicks.filter(p => p.result === 'push').length;
      const pending = matchingPicks.filter(p => p.result === 'pending').length;
      const total = matchingPicks.length;

      // By player
      const byPlayer = {};
      matchingPicks.forEach(pick => {
        if (!byPlayer[pick.player]) {
          byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        byPlayer[pick.player].total++;
        if (pick.result === 'win') byPlayer[pick.player].wins++;
        else if (pick.result === 'loss') byPlayer[pick.player].losses++;
        else if (pick.result === 'push') byPlayer[pick.player].pushes++;
      });

      // By day of week
      const byDayOfWeek = {};
      matchingPicks.forEach(pick => {
        const day = pick.parlayDayOfWeek || getDayOfWeek(pick.parlayDate);
        if (!byDayOfWeek[day]) {
          byDayOfWeek[day] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        byDayOfWeek[day].total++;
        if (pick.result === 'win') byDayOfWeek[day].wins++;
        else if (pick.result === 'loss') byDayOfWeek[day].losses++;
        else if (pick.result === 'push') byDayOfWeek[day].pushes++;
      });
  
      // Most common players picked
      const playerCounts = {};
      matchingPicks.forEach(pick => {
        const playerName = pick.team || 'Unknown';
        playerCounts[playerName] = (playerCounts[playerName] || 0) + 1;
      });
      const topPlayers = Object.entries(playerCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([player, count]) => ({ player, count }));

      results.data = {
        propType: matchedProp,
        total,
        wins,
        losses,
        pushes,
        pending,
        winPct: total > 0 ? ((wins / total) * 100).toFixed(1) : 0,
        byPlayer,
        topPlayers,
        recentPicks: matchingPicks
          .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
          .slice(0, 10)
      };
    }
  } else if (isBetType) {
    results.matchedCategory = 'betType';
    
    const matchedBetType = betTypes.find(type => 
      lowerQuery.includes(type.toLowerCase())
    );

    if (matchedBetType) {
      const matchingPicks = [];
      parlays.forEach(parlay => {
        Object.entries(parlay.participants).forEach(([id, pick]) => {
          if (pick.betType === matchedBetType) {
            matchingPicks.push({
              ...pick,
              parlayDate: parlay.date,
              parlayId: parlay.id
            });
          }
        });
      });

      const wins = matchingPicks.filter(p => p.result === 'win').length;
      const losses = matchingPicks.filter(p => p.result === 'loss').length;
      const pushes = matchingPicks.filter(p => p.result === 'push').length;
      const total = matchingPicks.length;

      const byPlayer = {};
      matchingPicks.forEach(pick => {
        if (!byPlayer[pick.player]) {
          byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        byPlayer[pick.player].total++;
        if (pick.result === 'win') byPlayer[pick.player].wins++;
        else if (pick.result === 'loss') byPlayer[pick.player].losses++;
        else if (pick.result === 'push') byPlayer[pick.player].pushes++;
      });

      results.data = {
        betType: matchedBetType,
        total,
        wins,
        losses,
        pushes,
        winPct: total > 0 ? ((wins / total) * 100).toFixed(1) : 0,
        byPlayer,
        recentPicks: matchingPicks
          .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
          .slice(0, 10)
      };
    }
  } else if (isSport) {
    results.matchedCategory = 'sport';
    
    const matchedSport = sports.find(sport => 
      lowerQuery.includes(sport.toLowerCase())
    );

    if (matchedSport) {
      const matchingPicks = [];
      parlays.forEach(parlay => {
        Object.entries(parlay.participants).forEach(([id, pick]) => {
          if (pick.sport === matchedSport) {
            matchingPicks.push({
              ...pick,
              parlayDate: parlay.date,
              parlayId: parlay.id
            });
          }
        });
      });

      const wins = matchingPicks.filter(p => p.result === 'win').length;
      const losses = matchingPicks.filter(p => p.result === 'loss').length;
      const pushes = matchingPicks.filter(p => p.result === 'push').length;
      const total = matchingPicks.length;

      const byPlayer = {};
      matchingPicks.forEach(pick => {
        if (!byPlayer[pick.player]) {
          byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        byPlayer[pick.player].total++;
        if (pick.result === 'win') byPlayer[pick.player].wins++;
        else if (pick.result === 'loss') byPlayer[pick.player].losses++;
        else if (pick.result === 'push') byPlayer[pick.player].pushes++;
      });

      results.data = {
        sport: matchedSport,
        total,
        wins,
        losses,
        pushes,
        winPct: total > 0 ? ((wins / total) * 100).toFixed(1) : 0,
        byPlayer,
        recentPicks: matchingPicks
          .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
          .slice(0, 10)
      };
    }
  } else if (isTeam) {
    results.matchedCategory = 'team';
    
    const allTeams = [...new Set([...Object.values(preloadedTeams).flat(), ...learnedTeams])];
    const matchedTeam = allTeams.find(team =>
      lowerQuery.includes(team.toLowerCase())
    );

    if (matchedTeam) {
      const matchingPicks = [];
      parlays.forEach(parlay => {
        Object.entries(parlay.participants).forEach(([id, pick]) => {
          if (pick.team === matchedTeam || pick.awayTeam === matchedTeam || 
              pick.homeTeam === matchedTeam) {
            matchingPicks.push({
              ...pick,
              parlayDate: parlay.date,
              parlayId: parlay.id
            });
          }
        });
      });

      const wins = matchingPicks.filter(p => p.result === 'win').length;
      const losses = matchingPicks.filter(p => p.result === 'loss').length;
      const pushes = matchingPicks.filter(p => p.result === 'push').length;
      const total = matchingPicks.length;

      const byPlayer = {};
      matchingPicks.forEach(pick => {
        if (!byPlayer[pick.player]) {
          byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        byPlayer[pick.player].total++;
        if (pick.result === 'win') byPlayer[pick.player].wins++;
        else if (pick.result === 'loss') byPlayer[pick.player].losses++;
        else if (pick.result === 'push') byPlayer[pick.player].pushes++;
      });

      results.data = {
        team: matchedTeam,
        total,
        wins,
        losses,
        pushes,
        winPct: total > 0 ? ((wins / total) * 100).toFixed(1) : 0,
        byPlayer,
        recentPicks: matchingPicks
          .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
          .slice(0, 10)
      };
    }
  } else if (isPlayer) {
    results.matchedCategory = 'player';
    
    const matchedPlayer = players.find(player => 
      lowerQuery.includes(player.toLowerCase())
    );

    if (matchedPlayer) {
      const matchingPicks = [];
      parlays.forEach(parlay => {
        Object.entries(parlay.participants).forEach(([id, pick]) => {
          if (pick.player === matchedPlayer) {
            matchingPicks.push({
              ...pick,
              parlayDate: parlay.date,
              parlayId: parlay.id
            });
          }
        });
      });

      const wins = matchingPicks.filter(p => p.result === 'win').length;
      const losses = matchingPicks.filter(p => p.result === 'loss').length;
      const pushes = matchingPicks.filter(p => p.result === 'push').length;
      const total = matchingPicks.length;

      const bySport = {};
      matchingPicks.forEach(pick => {
        if (!bySport[pick.sport]) {
          bySport[pick.sport] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        bySport[pick.sport].total++;
        if (pick.result === 'win') bySport[pick.sport].wins++;
        else if (pick.result === 'loss') bySport[pick.sport].losses++;
        else if (pick.result === 'push') bySport[pick.sport].pushes++;
      });

      results.data = {
        player: matchedPlayer,
        total,
        wins,
        losses,
        pushes,
        winPct: total > 0 ? ((wins / total) * 100).toFixed(1) : 0,
        bySport,
        recentPicks: matchingPicks
          .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
          .slice(0, 10)
      };
    }
  }

  return results.matchedCategory ? results : null;
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

      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4">New Brolay Entry</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
  <div>
    <label className="block text-sm font-medium mb-1">Bet Amount (per person)</label>
    <input
      type="number"
      value={newParlay.betAmount}
      onChange={(e) => setNewParlay({...newParlay, betAmount: Number(e.target.value)})}
      className="w-full px-3 py-2 border rounded text-base"
      style={{ fontSize: isMobile ? '16px' : '14px' }}
    />
  </div>
  <div>
    <label className="block text-sm font-medium mb-1">Total Payout</label>
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
    <label className="block text-sm font-medium mb-1">Net Profit</label>
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
  <div>
    <label className="block text-sm font-medium mb-1">Date</label>
    <input
      type="date"
      value={newParlay.date}
      onChange={(e) => setNewParlay({...newParlay, date: e.target.value})}
      className="w-full px-3 py-2 border rounded text-base"
      style={{ fontSize: isMobile ? '16px' : '14px' }}
    />
  </div>
  <div>
    <label className="block text-sm font-medium mb-1">Placed By</label>
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
            <h3 className="text-base md:text-lg font-semibold">Picks</h3>
          </div>
          {Object.entries(newParlay.participants).map(([id, participant]) => (
            <div key={id} className="border rounded p-4 md:p-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Big Guy</label>
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
                  <label className="block text-xs font-medium mb-1">Sport</label>
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
                  <label className="block text-xs font-medium mb-1">Bet Type</label>
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
                    <label className="block text-xs font-medium mb-1">Team/Player</label>
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
                    <label className="block text-xs font-medium mb-1">Away Team</label>
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
                    <label className="block text-xs font-medium mb-1">Home Team</label>
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
                  <label className="block text-xs font-medium mb-1">Odds (Optional)</label>
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
                  <label className="block text-xs font-medium mb-1">Result</label>
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
              <button
                onClick={() => removeParticipant(id)}
                className="text-red-600 text-sm hover:text-red-800 text-base"
                style={{ minHeight: isMobile ? '44px' : 'auto' }}
              >
                Remove Pick
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={addParticipant}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-base"
            style={{ minHeight: isMobile ? '44px' : 'auto' }}
          >
            <PlusCircle size={isMobile ? 24 : 20} />
            Add Pick
          </button>
        </div>
        
        <button
          onClick={submitParlay}
          disabled={saving}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 text-base"
          style={{ minHeight: isMobile ? '44px' : 'auto' }}
        >
          {saving ? 'Saving...' : 'Submit Parlay'}
        </button>
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
    
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold">Individual Statistics</h2>
        {pendingPicksCount > 0 && (
          <button
            onClick={autoUpdatePendingPicks}
            disabled={autoUpdating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 text-base"
            style={{ minHeight: isMobile ? '44px' : 'auto' }}
          >
            <RefreshCw size={isMobile ? 20 : 16} className={autoUpdating ? 'animate-spin' : ''} />
            {autoUpdating ? 'Updating...' : `Auto-Update ${pendingPicksCount} Pending`}
          </button>
        )}
      </div>
      
      {/* Filters - Collapsible */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full flex justify-between items-center text-base md:text-lg font-semibold mb-2"
        >
          <span>Filters</span>
          <span className="text-2xl">{filtersExpanded ? '−' : '+'}</span>
        </button>
        
        {filtersExpanded && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Big Guy</label>
                <select
                  value={filters.player}
                  onChange={(e) => setFilters({...filters, player: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sport</label>
                <select
                  value={filters.sport}
                  onChange={(e) => setFilters({...filters, sport: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {sports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Placed By</label>
                <select
                  value={filters.placedBy}
                  onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Payout</label>
                <input
                  type="number"
                  value={filters.minPayout}
                  onChange={(e) => setFilters({...filters, minPayout: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="$0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Payout</label>
                <input
                  type="number"
                  value={filters.maxPayout}
                  onChange={(e) => setFilters({...filters, maxPayout: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="Any"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Result</label>
                <select
                  value={filters.result}
                  onChange={(e) => setFilters({...filters, result: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
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
                <label className="block text-sm font-medium mb-1">Auto-Updated</label>
                <select
                  value={filters.autoUpdated}
                  onChange={(e) => setFilters({...filters, autoUpdated: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  <option value="true">Auto-Updated Only</option>
                  <option value="false">Manual Only</option>
                </select>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Team/Player</label>
                <input
                  type="text"
                  value={filters.teamPlayer}
                  onChange={(e) => setFilters({...filters, teamPlayer: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
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
            <button
              onClick={() => setFilters({
                dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '', 
                placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: ''
              })}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Clear Filters
            </button>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {players.map(player => {
          const playerStats = calculateStatsForPlayer(player, filteredParlays);
          const adjustedWins = playerStats.wins + (playerStats.pushes * 0.5);
          const winPct = playerStats.totalPicks > 0 
            ? ((adjustedWins / playerStats.totalPicks) * 100).toFixed(1)
            : '0.0';
          const netMoney = playerStats.moneyWon - playerStats.moneyLost;

          return (
            <div key={player} className="bg-white rounded-lg shadow p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold mb-4">{player}</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Record:</span>
                  <span className="font-semibold">{playerStats.wins}-{playerStats.losses}-{playerStats.pushes}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Win %:</span>
                  <span className="font-semibold">{winPct}%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Net Money:</span>
                  <span className={`font-semibold ${netMoney >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${netMoney.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">And-1s:</span>
                  <span className="font-semibold text-red-600">{playerStats.and1s}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">And-1 Cost:</span>
                  <span className="font-semibold text-red-600">
                    ${playerStats.and1Cost.toFixed(2)}
                  </span>
                </div>
              </div>

              {Object.keys(playerStats.bySport).length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="font-semibold text-sm mb-2">By Sport:</h4>
                  <div className="space-y-1 text-xs">
                    {Object.entries(playerStats.bySport).map(([sport, data]) => (
                      <div key={sport} className="flex justify-between">
                        <span>{sport}:</span>
                        <span>{data.wins}-{data.losses}-{data.pushes} ({data.total > 0 ? (((data.wins + data.pushes * 0.5)/data.total)*100).toFixed(0) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(playerStats.byBetType).length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <h4 className="font-semibold text-sm mb-2">By Bet Type:</h4>
                  <div className="space-y-1 text-xs">
                    {Object.entries(playerStats.byBetType).map(([type, data]) => (
                      <div key={type} className="flex justify-between">
                        <span>{type}:</span>
                        <span>{data.wins}-{data.losses}-{data.pushes} ({data.total > 0 ? (((data.wins + data.pushes * 0.5)/data.total)*100).toFixed(0) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const renderGroupDashboard = () => {
  const filteredParlays = applyFilters([...parlays]);
  
  // MOVE THIS TO THE TOP - Calculate pending picks count
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
  const groupWinPct = totalParlays > 0 ? ((wonParlays / totalParlays) * 100).toFixed(1) : '0.0';

  const bySport = {};
  filteredParlays.forEach(p => {
    const participants = Object.values(p.participants);
    
    participants.forEach(part => {
      if (part.sport) {
        if (!bySport[part.sport]) {
          bySport[part.sport] = { total: 0, won: 0 };
        }
        bySport[part.sport].total++;
        if (part.result === 'win') {
          bySport[part.sport].won++;
        }
      }
    });
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold">Group Statistics</h2>
        {pendingPicksCount > 0 && (
          <button
            onClick={autoUpdatePendingPicks}
            disabled={autoUpdating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 text-base"
            style={{ minHeight: isMobile ? '44px' : 'auto' }}
          >
            <RefreshCw size={isMobile ? 20 : 16} className={autoUpdating ? 'animate-spin' : ''} />
            {autoUpdating ? 'Updating...' : `Auto-Update ${pendingPicksCount} Pending`}
          </button>
        )}
      </div>
      
      {/* Filters - Collapsible */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full flex justify-between items-center text-base md:text-lg font-semibold mb-2"
        >
          <span>Filters</span>
          <span className="text-2xl">{filtersExpanded ? '−' : '+'}</span>
        </button>
        
        {filtersExpanded && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Big Guy</label>
                <select
                  value={filters.player}
                  onChange={(e) => setFilters({...filters, player: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sport</label>
                <select
                  value={filters.sport}
                  onChange={(e) => setFilters({...filters, sport: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {sports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Placed By</label>
                <select
                  value={filters.placedBy}
                  onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Payout</label>
                <input
                  type="number"
                  value={filters.minPayout}
                  onChange={(e) => setFilters({...filters, minPayout: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="$0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Payout</label>
                <input
                  type="number"
                  value={filters.maxPayout}
                  onChange={(e) => setFilters({...filters, maxPayout: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="Any"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Result</label>
                <select
                  value={filters.result}
                  onChange={(e) => setFilters({...filters, result: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
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
                <label className="block text-sm font-medium mb-1">Auto-Updated</label>
                <select
                  value={filters.autoUpdated}
                  onChange={(e) => setFilters({...filters, autoUpdated: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  <option value="true">Auto-Updated Only</option>
                  <option value="false">Manual Only</option>
                </select>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Team/Player</label>
                <input
                  type="text"
                  value={filters.teamPlayer}
                  onChange={(e) => setFilters({...filters, teamPlayer: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
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
            <button
              onClick={() => setFilters({
                dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '', 
                placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: ''
              })}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Clear Filters
            </button>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-600" size={24} />
            <h3 className="text-base md:text-lg font-semibold">Total Brolays</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold">{totalParlays}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-600" size={24} />
            <h3 className="text-base md:text-lg font-semibold">Brolays Won</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold">{wonParlays}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="text-purple-600" size={24} />
            <h3 className="text-base md:text-lg font-semibold">Win Percentage</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold">{groupWinPct}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">Performance by Sport</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {Object.entries(bySport).map(([sport, data]) => (
            <div key={sport} className="border rounded p-3">
              <div className="font-semibold">{sport}</div>
              <div className="text-sm text-gray-600">
                {data.won}-{data.total - data.won} ({data.total > 0 ? ((data.won/data.total)*100).toFixed(0) : 0}%)
              </div>
            </div>
          ))}
        </div>
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
      return b.sortOrder - a.sortOrder; // Note: reversed for descending order
    }
    const aKey = a.firestoreId || a.id;
    const bKey = b.firestoreId || b.id;
    return String(bKey).localeCompare(String(aKey)); // Note: reversed for descending order
  });

  const pendingPicksCount = filteredParlays.reduce((count, parlay) => {
    const participants = Object.values(parlay.participants || {});
    return count + participants.filter(p => p.result === 'pending').length;
  }, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold">All Brolays</h2>
        {pendingPicksCount > 0 && (
          <button
            onClick={autoUpdatePendingPicks}
            disabled={autoUpdating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 text-base"
            style={{ minHeight: isMobile ? '44px' : 'auto' }}
          >
            <RefreshCw size={isMobile ? 20 : 16} className={autoUpdating ? 'animate-spin' : ''} />
            {autoUpdating ? 'Updating...' : `Auto-Update ${pendingPicksCount} Pending`}
          </button>
        )}
      </div>
      
      {/* Filters - Collapsible */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full flex justify-between items-center text-base md:text-lg font-semibold mb-2"
        >
          <span>Filters</span>
          <span className="text-2xl">{filtersExpanded ? '−' : '+'}</span>
        </button>
        
        {filtersExpanded && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Big Guy</label>
                <select
                  value={filters.player}
                  onChange={(e) => setFilters({...filters, player: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sport</label>
                <select
                  value={filters.sport}
                  onChange={(e) => setFilters({...filters, sport: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {sports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Placed By</label>
                <select
                  value={filters.placedBy}
                  onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Payout</label>
                <input
                  type="number"
                  value={filters.minPayout}
                  onChange={(e) => setFilters({...filters, minPayout: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="$0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Payout</label>
                <input
                  type="number"
                  value={filters.maxPayout}
                  onChange={(e) => setFilters({...filters, maxPayout: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="Any"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Result</label>
                <select
                  value={filters.result}
                  onChange={(e) => setFilters({...filters, result: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="push">Push</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              {/* ADD THIS: Auto-Updated Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Auto-Updated</label>
                <select
                  value={filters.autoUpdated}
                  onChange={(e) => setFilters({...filters, autoUpdated: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  <option value="true">Auto-Updated Only</option>
                  <option value="false">Manual Only</option>
                </select>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Team/Player</label>
                <input
                  type="text"
                  value={filters.teamPlayer}
                  onChange={(e) => setFilters({...filters, teamPlayer: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
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
            <button
              onClick={() => setFilters({
                dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '',
                placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: ''
              })}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Clear Filters
            </button>
          </>
        )}
      </div>

      {/* Brolays List */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg md:text-xl font-bold">
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
                <div key={parlay.id} className="border rounded p-4 md:p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{formatDateForDisplay(parlay.date)} - {parlayType}</div>
                      <div className="text-sm text-gray-600">
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
                      <button
                        onClick={() => setEditingParlay(parlay)}
                        className="text-blue-600 text-sm hover:text-blue-800 text-base"
                        style={{ minHeight: isMobile ? '44px' : 'auto' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteParlay(parlay.id)}
                        className="text-red-600 text-sm hover:text-red-800 text-base"
                        style={{ minHeight: isMobile ? '44px' : 'auto' }}
                      >
                        Delete
                      </button>
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
                    
                      // Format bet details
                      const betDetails = formatBetDescription(participant);
                    
                      return (
                        <div key={pid} className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm bg-gray-50 p-2 rounded gap-1">
                          <span className="flex-1">
                            <strong>{participant.player}</strong> - {participant.sport} - {teamDisplay} {betDetails}
                            {participant.odds && (
                              <span className="ml-2 text-purple-600 font-semibold">
                                {participant.odds}
                                {participant.oddsSource && <span className="text-xs text-gray-500"> ({participant.oddsSource})</span>}
                              </span>
                            )}
                            {participant.actualStats && (
                              <span className="ml-2 text-blue-600 font-semibold">
                                [{participant.actualStats}]
                              </span>
                            )}
                          </span>
                            
                          <div className="flex items-center gap-2">
                            {participant.autoUpdated && (
                              <span 
                                className="text-blue-600 cursor-help text-base" 
                                title={`Auto-updated on ${new Date(participant.autoUpdatedAt).toLocaleString()}`}
                              >
                                🤖
                              </span>
                            )}
                            
                            <span className={`font-semibold ${
                              participant.result === 'win' ? 'text-green-600' :
                              participant.result === 'loss' ? 'text-red-600' :
                              participant.result === 'push' ? 'text-yellow-600' :
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
            <button
              onClick={() => setBrolaysToShow(prev => prev + 10)}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Show More (10)
            </button>
            <button
              onClick={() => setBrolaysToShow(filteredParlays.length)}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Show All ({filteredParlays.length})
            </button>
          </div>
        )}
      </div>
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
      <h2 className="text-xl md:text-2xl font-bold">Payment Tracker</h2>
      
      {/* Filters - Collapsible */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full flex justify-between items-center text-base md:text-lg font-semibold mb-2"
        >
          <span>Filters</span>
          <span className="text-2xl">{filtersExpanded ? '−' : '+'}</span>
        </button>
        
        {filtersExpanded && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Placed By</label>
                <select
                  value={filters.placedBy}
                  onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={() => setFilters({
                dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '', 
                placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: ''
              })}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Clear Filters
            </button>
          </>
        )}
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-yellow-600 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-yellow-800">Outstanding Payments</h3>
            <p className="text-sm text-yellow-700">
              {lostParlays.length} lost brolay(s) • {wonParlays.length} won brolay(s) need settlement
            </p>
          </div>
        </div>
      </div>

      {/* Who Owes Who Summary Table */}
      {simplifiedPayments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4">💰 Who Owes Who (Net Summary)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-4">From</th>
                  <th className="text-left py-2 px-4">To</th>
                  <th className="text-right py-2 px-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {simplifiedPayments.map((payment, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-red-600">{payment.from}</td>
                    <td className="py-3 px-4 font-semibold text-green-600">{payment.to}</td>
                    <td className="py-3 px-4 text-right font-bold text-base md:text-lg">
                      ${payment.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Won Brolays */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold mb-3 text-green-600">✅ Won Brolays</h3>
        <div className="space-y-3">
          {wonParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No won brolays to settle</p>
          ) : (
            wonParlays.map(parlay => {
              const participants = Object.values(parlay.participants);
              const winners = participants.filter(p => p.result === 'win');
              const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
              const amountPerWinner = winners.length > 0 ? netProfit / winners.length : 0;

              return (
                <div key={parlay.id} className="border rounded p-4 md:p-6 bg-green-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-sm text-gray-600">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-green-600">
                        ${netProfit.toFixed(2)} profit
                      </div>
                      <div className="text-xs text-gray-600">
                        (${parlay.totalPayout || 0} payout)
                      </div>
                    </div>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="font-medium">{parlay.placedBy || 'Unknown'} pays winners: </span>
                    {winners.map(winner => `${winner.player} ($${amountPerWinner.toFixed(2)})`).join(', ')}
                  </div>
                  <button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 text-base"
                    style={{ minHeight: isMobile ? '44px' : 'auto' }}
                  >
                    Mark as Settled
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Lost Brolays */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold mb-3 text-red-600">❌ Lost Brolays</h3>
        <div className="space-y-3">
          {lostParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No lost brolays to settle</p>
          ) : (
            lostParlays.map(parlay => {
              const participants = Object.values(parlay.participants);
              const losers = participants.filter(p => p.result === 'loss');
              const winners = participants.filter(p => p.result === 'win');
              const and1 = losers.length === 1 && winners.length === participants.length - 1;
              const amountPerLoser = and1 
                ? parlay.betAmount * participants.length 
                : (parlay.betAmount * participants.length) / losers.length;

              return (
                <div key={parlay.id} className="border rounded p-4 md:p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-sm text-gray-600">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-red-600">
                        ${(parlay.betAmount * participants.length).toFixed(2)}
                      </div>
                      {and1 && <span className="text-xs text-red-600 font-semibold">And-1</span>}
                    </div>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="font-medium">Losers pay {parlay.placedBy || 'Unknown'}: </span>
                    {losers.map(loser => `${loser.player} ($${amountPerLoser.toFixed(2)})`).join(', ')}
                  </div>
                  <button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 text-base"
                    style={{ minHeight: isMobile ? '44px' : 'auto' }}
                  >
                    Mark as Settled
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

{/* Recently Settled */}
<div className="bg-white rounded-lg shadow p-4 md:p-6">
  <h3 className="text-base md:text-lg font-bold mb-3">Recently Settled</h3>
  <div className="space-y-2">
    {parlays.filter(p => p.settled).slice(-5).reverse().map(parlay => {
      const participants = Object.values(parlay.participants);
      const losers = participants.filter(p => p.result === 'loss');
      const winners = participants.filter(p => p.result === 'win');
      const won = losers.length === 0 && winners.length > 0;
      
      return (
        <div key={parlay.id} className="border rounded p-3 bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-semibold text-sm">{formatDateForDisplay(parlay.date)}</div>
              <div className="text-xs text-gray-600">
                {won ? `Winners paid by ${parlay.placedBy || 'Unknown'}: ${winners.map(w => w.player).join(', ')}` 
                     : `Losers paid ${parlay.placedBy || 'Unknown'}: ${losers.map(l => l.player).join(', ')}`}
              </div>
            </div>
            <button
              onClick={() => toggleSettlement(parlay.id)}
              disabled={saving}
              className="ml-3 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:bg-gray-400 whitespace-nowrap text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Mark as Not Settled
            </button>
          </div>
        </div>
      );
    })}
  </div>
</div>
    </div>
  );
};

const renderImport = () => (
  <div className="space-y-4 md:space-y-6">
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Import Historical Data</h2>
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
      
      <button
        onClick={() => {
          if (window.confirm('Import this data? This will add all rows to your database.')) {
            importFromCSV(csvInput);
          }
        }}
        disabled={saving || !csvInput}
        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 text-base"
        style={{ minHeight: isMobile ? '44px' : 'auto' }}
      >
        {saving ? 'Importing...' : 'Import Data'}
      </button>
      <button
        onClick={extractTeamsFromExistingParlays}
        disabled={parlays.length === 0}
        className="mt-4 ml-4 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 text-base"
        style={{ minHeight: isMobile ? '44px' : 'auto' }}
      >
        Extract Teams from Existing Data
      </button>
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
      <h2 className="text-xl md:text-2xl font-bold">Brolay Grid</h2>
      
      <div className="bg-white rounded-lg shadow p-4 md:p-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 px-2 sticky left-0 bg-white z-10 min-w-[100px]">Date</th>
              {players.map(player => (
                <th key={player} className="text-center py-2 px-2 min-w-[80px] md:min-w-[150px]">{player}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredParlays.map((parlay) => {
              const participants = parlay.participants || {};
              
              return (
                <tr key={parlay.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-2 font-semibold sticky left-0 bg-white text-xs md:text-sm">
                    {formatDateForDisplay(parlay.date)}
                  </td>
                  {players.map((player) => {
                    const playerPick = Object.values(participants).find(p => p.player === player);
                    
                    if (!playerPick) {
                      return <td key={player} className="py-3 px-2 text-center bg-gray-100"></td>;
                    }
                    
                    let bgColor = 'bg-gray-300';
                    if (playerPick.result === 'win') bgColor = 'bg-green-200';
                    else if (playerPick.result === 'loss') bgColor = 'bg-red-200';
                    else if (playerPick.result === 'push') bgColor = 'bg-gray-400';
                    
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
          break;
        }
      }
      
      if (currentStreak > 0) {
        currentStreaks[currentType].push({
          player,
          count: currentStreak,
          lastDate: picks[picks.length - 1].date
        });
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
      <h2 className="text-xl md:text-2xl font-bold">🏆 Rankings & Records</h2>
      
      {/* Sole Survivors */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">💪 Sole Survivors</h3>
        <p className="text-sm text-gray-600 mb-4">Only winner when everyone else lost</p>
        <div className="space-y-2">
          {Object.entries(soleSurvivors)
            .sort(([, a], [, b]) => b - a)
            .map(([player, count], idx) => (
              <div key={player} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                  <span className="font-semibold">{player}</span>
                </div>
                <span className="text-xl font-bold text-blue-600">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Current Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-green-600">🔥 Current Hot Streak</h3>
          {currentStreaks.hot.length > 0 ? (
            <div className="space-y-2">
              {currentStreaks.hot.slice(0, 3).map((streak, idx) => (
                <div key={idx} className="p-3 bg-green-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{streak.player}</span>
                    <span className="text-xl font-bold text-green-600">{streak.count} wins</span>
                  </div>
                  <div className="text-xs text-gray-600">Last pick: {formatDateForDisplay(streak.lastDate)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No active hot streaks</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-red-600">❄️ Current Cold Streak</h3>
          {currentStreaks.cold.length > 0 ? (
            <div className="space-y-2">
              {currentStreaks.cold.slice(0, 3).map((streak, idx) => (
                <div key={idx} className="p-3 bg-red-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{streak.player}</span>
                    <span className="text-xl font-bold text-red-600">{streak.count} losses</span>
                  </div>
                  <div className="text-xs text-gray-600">Last pick: {formatDateForDisplay(streak.lastDate)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No active cold streaks</p>
          )}
        </div>
      </div>

      {/* All-Time Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-green-600">📈 Top 5 Hot Streaks (All-Time)</h3>
          {allTimeStreaks.hot.slice(0, 5).length > 0 ? (
            <div className="space-y-2">
              {allTimeStreaks.hot.slice(0, 5).map((streak, idx) => (
                <div key={idx} className="p-3 bg-green-50 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{streak.player}</span>
                    <span className="text-lg font-bold text-green-600">{streak.count} wins</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatDateForDisplay(streak.startDate)} - {formatDateForDisplay(streak.endDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No streaks of 3+ yet</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-red-600">📉 Top 5 Cold Streaks (All-Time)</h3>
          {allTimeStreaks.cold.slice(0, 5).length > 0 ? (
            <div className="space-y-2">
              {allTimeStreaks.cold.slice(0, 5).map((streak, idx) => (
                <div key={idx} className="p-3 bg-red-50 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{streak.player}</span>
                    <span className="text-lg font-bold text-red-600">{streak.count} losses</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatDateForDisplay(streak.startDate)} - {formatDateForDisplay(streak.endDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No streaks of 3+ yet</p>
          )}
        </div>
      </div>

      {/* Player/Sport Combinations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-green-600">⭐ Top 5 Player/Sport Combos</h3>
          <p className="text-sm text-gray-600 mb-4">Minimum 10 picks</p>
          {topCombos.length > 0 ? (
            <div className="space-y-2">
              {topCombos.map((combo, idx) => (
                <div key={idx} className="p-3 bg-green-50 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{combo.player} - {combo.sport}</span>
                    <span className="text-lg font-bold text-green-600">{combo.winPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {combo.wins}-{combo.losses} ({combo.total} picks)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Not enough data yet</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-red-600">💩 Worst 5 Player/Sport Combos</h3>
          <p className="text-sm text-gray-600 mb-4">Minimum 10 picks</p>
          {worstCombos.length > 0 ? (
            <div className="space-y-2">
              {worstCombos.map((combo, idx) => (
                <div key={idx} className="p-3 bg-red-50 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{combo.player} - {combo.sport}</span>
                    <span className="text-lg font-bold text-red-600">{combo.winPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {combo.wins}-{combo.losses} ({combo.total} picks)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Not enough data yet</p>
          )}
        </div>
      </div>

      {/* Most Picked Teams */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">🎯 Top 5 Most Picked Teams/Players</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topTeams.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-gray-400">#{idx + 1}</span>
                <span className="font-semibold">{item.team}</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{item.count} picks</span>
            </div>
          ))}
        </div>
      </div>
      {/* Most Picked Player/Team Combos */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4">🤝 Top 5 Most Picked Player/Team Combos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topPlayerTeamCombos.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-gray-400">#{idx + 1}</span>
                    <span className="font-semibold">{item.player} + {item.team}</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{item.total}</span>
                </div>
                <div className="text-xs text-gray-600 ml-8">
                  {item.wins}-{item.losses}{item.pushes > 0 ? `-${item.pushes}` : ''} ({item.total > 0 ? ((item.wins / item.total) * 100).toFixed(1) : 0}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      
      {/* Best/Worst Player/Team Win Percentages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-green-600">🌟 Top 5 Player/Team Win %</h3>
          <p className="text-sm text-gray-600 mb-4">Minimum 5 picks</p>
          {topPlayerTeamWinPct.length > 0 ? (
            <div className="space-y-2">
              {topPlayerTeamWinPct.map((combo, idx) => (
                <div key={idx} className="p-3 bg-green-50 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{combo.player} + {combo.team}</span>
                    <span className="text-lg font-bold text-green-600">{combo.winPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {combo.wins}-{combo.losses}{combo.pushes > 0 ? `-${combo.pushes}` : ''} ({combo.total} picks)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Not enough data yet</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4 text-red-600">💀 Worst 5 Player/Team Win %</h3>
          <p className="text-sm text-gray-600 mb-4">Minimum 5 picks</p>
          {worstPlayerTeamWinPct.length > 0 ? (
            <div className="space-y-2">
              {worstPlayerTeamWinPct.map((combo, idx) => (
                <div key={idx} className="p-3 bg-red-50 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{combo.player} + {combo.team}</span>
                    <span className="text-lg font-bold text-red-600">{combo.winPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {combo.wins}-{combo.losses}{combo.pushes > 0 ? `-${combo.pushes}` : ''} ({combo.total} picks)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Not enough data yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

const renderSearch = () => {
  const handleSearch = () => {
    const results = analyzeSearchQuery(searchQuery);
    setSearchResults(results);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">🔍 Intelligent Search</h2>
      
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder='Try: "Anytime Touchdown Scorer record" or "Chiefs record" or "Management NBA stats"'
            className="flex-1 px-4 py-3 border rounded-lg text-base"
            style={{ fontSize: isMobile ? '16px' : '14px' }}
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-base"
            style={{ minHeight: isMobile ? '44px' : 'auto' }}
          >
            Search
          </button>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          <p className="font-semibold mb-2">Examples:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'Anytime Touchdown Scorer record',
              'Spread bets stats',
              'Thursday picks',
              'Management NFL stats',
              'Vanderbilt picks'
            ].map(example => (
              <button
                key={example}
                onClick={() => {
                  setSearchQuery(example);
                  setSearchResults(analyzeSearchQuery(example));
                }}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {searchResults && (
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4">
            Results for: "{searchResults.query}"
          </h3>

          {searchResults.matchedCategory === 'propType' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-600">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Wins</div>
                  <div className="text-2xl font-bold text-green-600">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Losses</div>
                  <div className="text-2xl font-bold text-red-600">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Win %</div>
                  <div className="text-2xl font-bold text-purple-600">{searchResults.data.winPct}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3">📊 By Big Guy</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => (
                    <div key={player} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-semibold">{player}</span>
                      <span className="text-sm">
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
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-600">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Wins</div>
                  <div className="text-2xl font-bold text-green-600">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Losses</div>
                  <div className="text-2xl font-bold text-red-600">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Win %</div>
                  <div className="text-2xl font-bold text-purple-600">{searchResults.data.winPct}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3">📊 By Big Guy</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => (
                    <div key={player} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-semibold">{player}</span>
                      <span className="text-sm">
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
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-600">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Wins</div>
                  <div className="text-2xl font-bold text-green-600">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Losses</div>
                  <div className="text-2xl font-bold text-red-600">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Win %</div>
                  <div className="text-2xl font-bold text-purple-600">{searchResults.data.winPct}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3">📊 Who Picks {searchResults.data.team}?</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => (
                    <div key={player} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-semibold">{player}</span>
                      <span className="text-sm">
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
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-600">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Wins</div>
                  <div className="text-2xl font-bold text-green-600">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Losses</div>
                  <div className="text-2xl font-bold text-red-600">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Win %</div>
                  <div className="text-2xl font-bold text-purple-600">{searchResults.data.winPct}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3">📊 By Big Guy</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => (
                    <div key={player} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-semibold">{player}</span>
                      <span className="text-sm">
                        {stats.wins}-{stats.losses}-{stats.pushes} ({stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3">🏈 By Sport</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.bySport).map(([sport, stats]) => (
                    <div key={sport} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-semibold">{sport}</span>
                      <span className="text-sm">
                        {stats.wins}-{stats.losses}-{stats.pushes} ({stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3">🎲 By Bet Type</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byBetType).map(([betType, stats]) => (
                    <div key={betType} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-semibold">{betType}</span>
                      <span className="text-sm">
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
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-600">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Wins</div>
                  <div className="text-2xl font-bold text-green-600">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Losses</div>
                  <div className="text-2xl font-bold text-red-600">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Win %</div>
                  <div className="text-2xl font-bold text-purple-600">{searchResults.data.winPct}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3">📊 By Sport</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.bySport).map(([sport, stats]) => (
                    <div key={sport} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-semibold">{sport}</span>
                      <span className="text-sm">
                        {stats.wins}-{stats.losses}-{stats.pushes} ({stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {searchResults.data.recentPicks && searchResults.data.recentPicks.length > 0 && (
            <div>
              <h4 className="font-semibold text-lg mb-3">📅 Recent Picks</h4>
              <div className="space-y-2">
                {searchResults.data.recentPicks.map((pick, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold">{formatDateForDisplay(pick.parlayDate)}</span>
                      <span className={`font-semibold ${
                        pick.result === 'win' ? 'text-green-600' :
                        pick.result === 'loss' ? 'text-red-600' :
                        pick.result === 'push' ? 'text-yellow-600' :
                        'text-gray-500'
                      }`}>
                        {pick.result.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-gray-700">
                      {pick.player} - {pick.sport} - {pick.team || `${pick.awayTeam} @ ${pick.homeTeam}`}
                      {pick.betType === 'Prop Bet' && ` - ${pick.propType} ${pick.overUnder} ${pick.line}`}
                    </div>
                    {pick.actualStats && (
                      <div className="text-blue-600 mt-1">[{pick.actualStats}]</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {searchResults === null && searchQuery.trim().length >= 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6">
          <p className="text-yellow-800">
            No results found for "{searchQuery}". Try searching for a specific prop type, team, player, sport, or bet type.
          </p>
        </div>
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
      console.log('Updating Firebase document:', parlay.firestoreId);
      const parlayDoc = doc(db, 'parlays', parlay.firestoreId);
      
      try {
        await updateDoc(parlayDoc, {
          participants: updatedParticipants
        });
        console.log('Firebase update successful');
      } catch (fbError) {
        console.error('Firebase update error:', fbError);
        console.error('Error code:', fbError.code);
        console.error('Error message:', fbError.message);
        throw fbError;
      }
    } else {
      console.error('No Firestore ID found for parlay');
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
      <h2 className="text-xl md:text-2xl font-bold">All Individual Picks</h2>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full flex justify-between items-center text-base md:text-lg font-semibold mb-2"
        >
          <span>Filters</span>
          <span className="text-2xl">{filtersExpanded ? '−' : '+'}</span>
        </button>
        
        {filtersExpanded && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Big Guy</label>
                <select
                  value={filters.player}
                  onChange={(e) => setFilters({...filters, player: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sport</label>
                <select
                  value={filters.sport}
                  onChange={(e) => setFilters({...filters, sport: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {sports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Placed By</label>
                <select
                  value={filters.placedBy}
                  onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Result</label>
                <select
                  value={filters.result}
                  onChange={(e) => setFilters({...filters, result: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
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
                <label className="block text-sm font-medium mb-1">Auto-Updated</label>
                <select
                  value={filters.autoUpdated}
                  onChange={(e) => setFilters({...filters, autoUpdated: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  <option value="true">Auto-Updated Only</option>
                  <option value="false">Manual Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Team/Player</label>
                <input
                  type="text"
                  value={filters.teamPlayer}
                  onChange={(e) => setFilters({...filters, teamPlayer: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="Search teams/players..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bet Type</label>
                <select
                  value={filters.betType || ''}
                  onChange={(e) => setFilters({...filters, betType: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {betTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prop Type</label>
                <input
                  type="text"
                  value={filters.propType || ''}
                  onChange={(e) => setFilters({...filters, propType: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-base"
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
            <button
              onClick={() => setFilters({
                dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '',
                placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: '',
                betType: '', propType: ''
              })}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Clear Filters
            </button>
          </>
        )}
      </div>

      {/* Picks List */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg md:text-xl font-bold">
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
                <div key={`${pick.parlayId}-${pick.participantId}-${idx}`} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">
                        {formatDateForDisplay(pick.parlayDate)} • Placed by {pick.parlayPlacedBy || 'Unknown'}
                      </div>
                      <div className="font-semibold">
                        <strong>{pick.player}</strong> - {pick.sport} - {teamDisplay} {betDetails}
                      </div>
                      <div className="text-sm text-gray-600">
                        {pick.betType}
                        {pick.odds && ` • ${pick.odds}`}
                      </div>
                      {pick.actualStats && (
                        <div className="text-sm text-blue-600 font-semibold mt-1">
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
                        pick.result === 'win' ? 'text-green-600' :
                        pick.result === 'loss' ? 'text-red-600' :
                        pick.result === 'push' ? 'text-yellow-600' :
                        'text-gray-500'
                      }`}>
                        {pick.result.toUpperCase()}
                      </span>
                      <button
                        onClick={() => setEditingPick(pick)}
                        className="text-blue-600 text-sm hover:text-blue-800"
                      >
                        Edit
                      </button>
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
            <button
              onClick={() => setPicksToShow(prev => prev + 20)}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Show More (20)
            </button>
            <button
              onClick={() => setPicksToShow(sortedPicks.length)}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Show All ({sortedPicks.length})
            </button>
          </div>
        )}
      </div>

      {/* Edit Pick Modal */}
      {editingPick && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto" style={{ maxWidth: isMobile ? '100%' : '800px' }}>
            <div className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4">Edit Pick</h2>
              
              <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                <div className="font-semibold">From Brolay:</div>
                <div className="text-gray-600">
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
                  <label className="block text-sm font-medium mb-1">Big Guy</label>
                  <select
                    value={editingPick.player}
                    onChange={(e) => setEditingPick({...editingPick, player: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    <option value="">Select</option>
                    {players.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sport</label>
                  <select
                    value={editingPick.sport}
                    onChange={(e) => setEditingPick({...editingPick, sport: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    {sports.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bet Type</label>
                  <select
                    value={editingPick.betType}
                    onChange={(e) => setEditingPick({...editingPick, betType: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    {betTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
              </div>

              {!['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(editingPick.betType) && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Team/Player</label>
                  <input
                    type="text"
                    value={editingPick.team || ''}
                    onChange={(e) => setEditingPick({...editingPick, team: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
              )}

              {['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(editingPick.betType) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Away Team</label>
                    <input
                      type="text"
                      value={editingPick.awayTeam || ''}
                      onChange={(e) => setEditingPick({...editingPick, awayTeam: e.target.value})}
                      className="w-full px-3 py-2 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Home Team</label>
                    <input
                      type="text"
                      value={editingPick.homeTeam || ''}
                      onChange={(e) => setEditingPick({...editingPick, homeTeam: e.target.value})}
                      className="w-full px-3 py-2 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {editingPick.betType === 'Prop Bet' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Prop Type</label>
                      <input
                        type="text"
                        value={editingPick.propType || ''}
                        onChange={(e) => setEditingPick({...editingPick, propType: e.target.value})}
                        className="w-full px-3 py-2 border rounded text-base"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Over/Under</label>
                      <select
                        value={editingPick.overUnder || 'Over'}
                        onChange={(e) => setEditingPick({...editingPick, overUnder: e.target.value})}
                        className="w-full px-3 py-2 border rounded text-base"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      >
                        <option value="Over">Over</option>
                        <option value="Under">Under</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Line</label>
                      <input
                        type="text"
                        value={editingPick.line || ''}
                        onChange={(e) => setEditingPick({...editingPick, line: e.target.value})}
                        className="w-full px-3 py-2 border rounded text-base"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Odds (Optional)</label>
                  <input
                    type="text"
                    value={editingPick.odds || ''}
                    onChange={(e) => setEditingPick({...editingPick, odds: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Result</label>
                  <select
                    value={editingPick.result}
                    onChange={(e) => setEditingPick({...editingPick, result: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="push">Push</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Actual Stats (Optional)</label>
                  <input
                    type="text"
                    value={editingPick.actualStats || ''}
                    onChange={(e) => setEditingPick({...editingPick, actualStats: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-base"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setEditingPick(null)}
                  className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
                  style={{ minHeight: isMobile ? '44px' : 'auto' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePickEdit}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-base"
                  style={{ minHeight: isMobile ? '44px' : 'auto' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
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
      <h2 className="text-xl md:text-2xl font-bold">⚙️ Settings</h2>
      
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
                <button
                  onClick={() => handleRemovePropType(propType)}
                  className="ml-3 text-red-600 hover:text-red-800 text-sm font-semibold"
                >
                  Remove
                </button>
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
                <button
                  onClick={() => handleRemoveTeam(team)}
                  className="ml-3 text-red-600 hover:text-red-800 text-sm font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6">
          <h3 className="text-lg font-bold text-red-900 mb-4">⚠️ Danger Zone</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={handleClearAllLearnedData}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Clear All Learned Data
            </button>
            <button
              onClick={extractTeamsFromExistingParlays}
              disabled={parlays.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Re-extract From Existing Brolays
            </button>
            <button
              onClick={async () => {
                if (window.confirm('Add day of week to all existing brolays? This will update all records in the database.')) {
                  setSaving(true);
                  try {
                    let updatedCount = 0;
                    for (const parlay of parlays) {
                      if (!parlay.dayOfWeek && parlay.date) {
                        const dayOfWeek = getDayOfWeek(parlay.date);
                        if (parlay.firestoreId) {
                          const parlayDoc = doc(db, 'parlays', parlay.firestoreId);
                          await updateDoc(parlayDoc, { dayOfWeek });
                          updatedCount++;
                        }
                      }
                    }
                    await loadParlays();
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
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Backfill Day of Week
            </button>
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
    className="min-h-screen bg-gray-100"
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
    <div className="bg-blue-600 text-white p-4 md:p-6 shadow-lg">
  <div className="flex items-center justify-between">
    {isMobile && (
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 text-base"
        style={{ minHeight: isMobile ? '44px' : 'auto' }}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    )}
    <div className="flex-1">
      <h1 className="text-2xl md:text-3xl font-bold">Brolay Toxic Standings</h1>
      <p className="text-blue-100 text-sm md:text-base">5 Big Guys, Inc.</p>
    </div>
    {saving && (
      <div className="text-sm">
        <Loader className="inline animate-spin" size={16} />
      </div>
    )}
  </div>
</div>{/* Mobile Sidebar Overlay */}
{isMobile && sidebarOpen && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 z-40"
    onClick={() => setSidebarOpen(false)}
  />
)}

{/* Navigation - Collapsible sidebar for mobile, horizontal tabs for desktop */}
<div className={`${
  isMobile 
    ? `fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : 'container mx-auto p-4 md:p-6'
}`}>
  <div className={isMobile ? 'pt-20 px-4' : 'mb-6 flex gap-2 overflow-x-auto'}>
{[
  { id: 'entry', label: 'New Brolay' },
  { id: 'search', label: 'Search' },
  { id: 'allBrolays', label: 'All Brolays' },
  { id: 'allPicks', label: 'All Picks' },
  { id: 'individual', label: 'Individual Stats' },
  { id: 'group', label: 'Group Stats' },
  { id: 'payments', label: 'Payments' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'grid', label: 'Grid' },
  ...(SHOW_SETTINGS_TAB ? [{ id: 'settings', label: 'Settings' }] : []),
  ...(SHOW_IMPORT_TAB ? [{ id: 'import', label: 'Import Data' }] : [])
].map(tab => (
      <button
        key={tab.id}
        onClick={() => {
          setActiveTab(tab.id);
          if (isMobile) setSidebarOpen(false);
        }}
        className={`${
          isMobile ? 'w-full text-left' : 'whitespace-nowrap'
        } px-4 py-3 rounded-lg font-semibold ${
          activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} text-base`}
        style={{ minHeight: isMobile ? '44px' : 'auto' }}
      >
        {tab.label}
      </button>
    ))}
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
};

export default App;
