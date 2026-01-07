// searchUtils.js - Advanced search utilities with fuzzy matching

/**
 * Team aliases and nicknames mapping
 */
export const teamAliases = {
  // NFL
  'braves': 'Atlanta Braves',
  'falcons': 'Atlanta Falcons',
  'patriots': 'New England Patriots',
  'pats': 'New England Patriots',
  'chiefs': 'Kansas City Chiefs',
  'bills': 'Buffalo Bills',
  'cowboys': 'Dallas Cowboys',
  '49ers': 'San Francisco 49ers',
  'niners': 'San Francisco 49ers',
  'eagles': 'Philadelphia Eagles',
  'packers': 'Green Bay Packers',
  'steelers': 'Pittsburgh Steelers',
  'ravens': 'Baltimore Ravens',
  'browns': 'Cleveland Browns',
  'bengals': 'Cincinnati Bengals',
  'titans': 'Tennessee Titans',
  'colts': 'Indianapolis Colts',
  'texans': 'Houston Texans',
  'jaguars': 'Jacksonville Jaguars',
  'jags': 'Jacksonville Jaguars',
  'dolphins': 'Miami Dolphins',
  'jets': 'New York Jets',
  'chargers': 'Los Angeles Chargers',
  'raiders': 'Las Vegas Raiders',
  'broncos': 'Denver Broncos',
  'seahawks': 'Seattle Seahawks',
  'rams': 'Los Angeles Rams',
  'cardinals': 'Arizona Cardinals',
  'panthers': 'Carolina Panthers',
  'saints': 'New Orleans Saints',
  'buccaneers': 'Tampa Bay Buccaneers',
  'bucs': 'Tampa Bay Buccaneers',
  'bears': 'Chicago Bears',
  'lions': 'Detroit Lions',
  'vikings': 'Minnesota Vikings',
  'commanders': 'Washington Commanders',
  'giants': 'New York Giants',
  
  // NBA
  'lakers': 'Los Angeles Lakers',
  'celtics': 'Boston Celtics',
  'warriors': 'Golden State Warriors',
  'dubs': 'Golden State Warriors',
  'heat': 'Miami Heat',
  'bucks': 'Milwaukee Bucks',
  'suns': 'Phoenix Suns',
  'nuggets': 'Denver Nuggets',
  'mavericks': 'Dallas Mavericks',
  'mavs': 'Dallas Mavericks',
  'clippers': 'Los Angeles Clippers',
  'sixers': 'Philadelphia 76ers',
  '76ers': 'Philadelphia 76ers',
  'nets': 'Brooklyn Nets',
  'knicks': 'New York Knicks',
  'raptors': 'Toronto Raptors',
  'jazz': 'Utah Jazz',
  'blazers': 'Portland Trail Blazers',
  'grizzlies': 'Memphis Grizzlies',
  'pelicans': 'New Orleans Pelicans',
  'spurs': 'San Antonio Spurs',
  'rockets': 'Houston Rockets',
  'thunder': 'Oklahoma City Thunder',
  'okc': 'Oklahoma City Thunder',
  'timberwolves': 'Minnesota Timberwolves',
  'wolves': 'Minnesota Timberwolves',
  'kings': 'Sacramento Kings',
  'hornets': 'Charlotte Hornets',
  'magic': 'Orlando Magic',
  'pistons': 'Detroit Pistons',
  'cavaliers': 'Cleveland Cavaliers',
  'cavs': 'Cleveland Cavaliers',
  'pacers': 'Indiana Pacers',
  'bulls': 'Chicago Bulls',
  'hawks': 'Atlanta Hawks',
  'wizards': 'Washington Wizards',
  
  // MLB
  'yankees': 'New York Yankees',
  'yanks': 'New York Yankees',
  'red sox': 'Boston Red Sox',
  'redsox': 'Boston Red Sox',
  'sox': 'Boston Red Sox',
  'dodgers': 'Los Angeles Dodgers',
  'astros': 'Houston Astros',
  'mets': 'New York Mets',
  'phillies': 'Philadelphia Phillies',
  'cubs': 'Chicago Cubs',
  'white sox': 'Chicago White Sox',
  'whitesox': 'Chicago White Sox',
  'padres': 'San Diego Padres',
  'mariners': 'Seattle Mariners',
  'rangers': 'Texas Rangers',
  'angels': 'Los Angeles Angels',
  'athletics': 'Oakland Athletics',
  'a\'s': 'Oakland Athletics',
  'as': 'Oakland Athletics',
  'orioles': 'Baltimore Orioles',
  'blue jays': 'Toronto Blue Jays',
  'bluejays': 'Toronto Blue Jays',
  'rays': 'Tampa Bay Rays',
  'marlins': 'Miami Marlins',
  'nationals': 'Washington Nationals',
  'nats': 'Washington Nationals',
  'pirates': 'Pittsburgh Pirates',
  'reds': 'Cincinnati Reds',
  'brewers': 'Milwaukee Brewers',
  'cardinals': 'St. Louis Cardinals',
  'rockies': 'Colorado Rockies',
  'diamondbacks': 'Arizona Diamondbacks',
  'dbacks': 'Arizona Diamondbacks',
  'twins': 'Minnesota Twins',
  'royals': 'Kansas City Royals',
  'guardians': 'Cleveland Guardians',
  'tigers': 'Detroit Tigers',
  
  // NHL
  'bruins': 'Boston Bruins',
  'blackhawks': 'Chicago Blackhawks',
  'avalanche': 'Colorado Avalanche',
  'avs': 'Colorado Avalanche',
  'blue jackets': 'Columbus Blue Jackets',
  'bluejackets': 'Columbus Blue Jackets',
  'stars': 'Dallas Stars',
  'red wings': 'Detroit Red Wings',
  'redwings': 'Detroit Red Wings',
  'oilers': 'Edmonton Oilers',
  'panthers': 'Florida Panthers',
  'ducks': 'Anaheim Ducks',
  'coyotes': 'Arizona Coyotes',
  'flames': 'Calgary Flames',
  'hurricanes': 'Carolina Hurricanes',
  'canes': 'Carolina Hurricanes',
  'predators': 'Nashville Predators',
  'preds': 'Nashville Predators',
  'maple leafs': 'Toronto Maple Leafs',
  'mapleleafs': 'Toronto Maple Leafs',
  'leafs': 'Toronto Maple Leafs',
  'canucks': 'Vancouver Canucks',
  'golden knights': 'Vegas Golden Knights',
  'goldenknights': 'Vegas Golden Knights',
  'vgk': 'Vegas Golden Knights',
  'capitals': 'Washington Capitals',
  'caps': 'Washington Capitals',
  'penguins': 'Pittsburgh Penguins',
  'pens': 'Pittsburgh Penguins',
  'sharks': 'San Jose Sharks',
  'blues': 'St. Louis Blues',
  'lightning': 'Tampa Bay Lightning',
  'bolts': 'Tampa Bay Lightning',
  'kraken': 'Seattle Kraken',
  'islanders': 'New York Islanders',
  'isles': 'New York Islanders',
  'rangers': 'New York Rangers',
  'devils': 'New Jersey Devils',
  'flyers': 'Philadelphia Flyers',
  'sabres': 'Buffalo Sabres',
  'canadiens': 'Montreal Canadiens',
  'habs': 'Montreal Canadiens',
  'senators': 'Ottawa Senators',
  'sens': 'Ottawa Senators',
  'wild': 'Minnesota Wild',
  'jets': 'Winnipeg Jets'
};

/**
 * Levenshtein distance for fuzzy string matching
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Find best matching team using fuzzy matching
 */
export function findBestTeamMatch(query, allTeams) {
  const queryLower = query.toLowerCase().trim();
  
  // First check aliases
  if (teamAliases[queryLower]) {
    return teamAliases[queryLower];
  }
  
  // Then check exact matches (case-insensitive)
  const exactMatch = allTeams.find(team => 
    team.toLowerCase() === queryLower
  );
  if (exactMatch) return exactMatch;
  
  // Check if query is contained in team name
  const containsMatch = allTeams.find(team => 
    team.toLowerCase().includes(queryLower) || queryLower.includes(team.toLowerCase())
  );
  if (containsMatch) return containsMatch;
  
  // Fuzzy matching - find closest match within threshold
  let bestMatch = null;
  let bestDistance = Infinity;
  const threshold = 3; // Allow up to 3 character differences
  
  for (const team of allTeams) {
    const distance = levenshteinDistance(queryLower, team.toLowerCase());
    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance;
      bestMatch = team;
    }
  }
  
  return bestMatch;
}

/**
 * Check if search query contains specific tokens
 */
export function tokenizeQuery(query) {
  const lowerQuery = query.toLowerCase().trim();
  const tokens = lowerQuery.split(/\s+/);
  
  return {
    tokens,
    hasCollege: tokens.some(t => ['college', 'ncaa', 'ncaaf', 'ncaab'].includes(t)),
    hasNFL: tokens.some(t => ['nfl', 'football'].includes(t) && !tokens.includes('college')),
    hasNBA: tokens.some(t => ['nba', 'basketball'].includes(t) && !tokens.includes('college')),
    hasMLB: tokens.some(t => ['mlb', 'baseball'].includes(t)),
    hasNHL: tokens.some(t => ['nhl', 'hockey'].includes(t)),
    hasMoneyline: tokens.includes('moneyline') || tokens.includes('ml'),
    hasSpread: tokens.includes('spread'),
    hasTotal: tokens.includes('total') || tokens.includes('over') || tokens.includes('under'),
    hasProp: tokens.includes('prop'),
    players: [] // Will be filled by caller
  };
}

/**
 * Calculate search relevance score
 */
export function calculateRelevanceScore(pick, searchContext) {
  let score = 0;
  
  // Exact sport match (highest priority)
  if (searchContext.hasNFL && pick.sport === 'NFL') score += 10;
  else if (searchContext.hasNBA && pick.sport === 'NBA') score += 10;
  else if (searchContext.hasMLB && pick.sport === 'MLB') score += 10;
  else if (searchContext.hasNHL && pick.sport === 'NHL') score += 10;
  else if (searchContext.hasCollege && 
           (pick.sport === 'College Football' || pick.sport === 'College Basketball')) {
    score += 10;
  }
  
  // Bet type match
  if (searchContext.hasMoneyline && pick.betType === 'Moneyline') score += 5;
  if (searchContext.hasSpread && pick.betType === 'Spread') score += 5;
  if (searchContext.hasTotal && pick.betType === 'Total') score += 5;
  if (searchContext.hasProp && pick.betType === 'Prop Bet') score += 5;
  
  // Player match
  if (searchContext.players.length > 0 && 
      searchContext.players.includes(pick.player)) {
    score += 8;
  }
  
  // Team match
  if (searchContext.matchedTeam) {
    const pickTeam = pick.team || '';
    const pickOpp = pick.opponent || '';
    const pickAwayTeam = pick.awayTeam || '';
    const pickHomeTeam = pick.homeTeam || '';
    const pickFavorite = pick.favorite || '';
    
    if (pickTeam.includes(searchContext.matchedTeam) || 
        pickOpp.includes(searchContext.matchedTeam) ||
        pickAwayTeam.includes(searchContext.matchedTeam) ||
        pickHomeTeam.includes(searchContext.matchedTeam) ||
        pickFavorite.includes(searchContext.matchedTeam)) {
      score += 7;
    }
  }
  
  return score;
}

/**
 * Filter picks by relevance threshold
 */
export function filterByRelevance(picks, searchContext, minScore = 5) {
  return picks
    .map(pick => ({
      ...pick,
      relevanceScore: calculateRelevanceScore(pick, searchContext)
    }))
    .filter(pick => pick.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
