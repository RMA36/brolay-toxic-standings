// Core data constants - maintains existing localStorage learning functionality

export const SPORTS = [
  'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'WNBA', 
  'Soccer', 'Tennis', 'Golf', 'Rugby', 'UFC'
];

export const PLAYERS = ['Management', 'CD', '914', 'Junior', 'Jacoby'];

export const PICK_TYPES = [
  'Spread',
  'Moneyline',
  'Total',
  'Prop Bet',
  'Team Total',
  'First Half Spread',
  'First Half Moneyline',
  'First Half Total',
  'First Half Team Total',
  'First Inning Runs',
  'Quarter Moneyline',
  'Quarter Total',
  'Quarter Team Total'
];

// Pre-loaded teams by sport (these are the base teams, app will learn more via localStorage)
export const PRELOADED_TEAMS = {
  NFL: [
    'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills', 'Carolina Panthers', 
    'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns', 'Dallas Cowboys', 'Denver Broncos',
    'Detroit Lions', 'Green Bay Packers', 'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars',
    'Kansas City Chiefs', 'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
    'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants', 'New York Jets',
    'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers', 'Seattle Seahawks', 'Tampa Bay Buccaneers',
    'Tennessee Titans', 'Washington Commanders'
  ],
  NBA: [
    'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets', 'Chicago Bulls',
    'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets', 'Detroit Pistons', 'Golden State Warriors',
    'Houston Rockets', 'Indiana Pacers', 'LA Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies',
    'Miami Heat', 'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks',
    'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns', 'Portland Trail Blazers',
    'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors', 'Utah Jazz', 'Washington Wizards'
  ],
  MLB: [
    'Arizona Diamondbacks', 'Atlanta Braves', 'Baltimore Orioles', 'Boston Red Sox', 'Chicago Cubs',
    'Chicago White Sox', 'Cincinnati Reds', 'Cleveland Guardians', 'Colorado Rockies', 'Detroit Tigers',
    'Houston Astros', 'Kansas City Royals', 'Los Angeles Angels', 'Los Angeles Dodgers', 'Miami Marlins',
    'Milwaukee Brewers', 'Minnesota Twins', 'New York Mets', 'New York Yankees', 'Oakland Athletics',
    'Philadelphia Phillies', 'Pittsburgh Pirates', 'San Diego Padres', 'San Francisco Giants', 'Seattle Mariners',
    'St. Louis Cardinals', 'Tampa Bay Rays', 'Texas Rangers', 'Toronto Blue Jays', 'Washington Nationals'
  ],
  NHL: [
    'Anaheim Ducks', 'Arizona Coyotes', 'Boston Bruins', 'Buffalo Sabres', 'Calgary Flames',
    'Carolina Hurricanes', 'Chicago Blackhawks', 'Colorado Avalanche', 'Columbus Blue Jackets', 'Dallas Stars',
    'Detroit Red Wings', 'Edmonton Oilers', 'Florida Panthers', 'Los Angeles Kings', 'Minnesota Wild',
    'Montreal Canadiens', 'Nashville Predators', 'New Jersey Devils', 'New York Islanders', 'New York Rangers',
    'Ottawa Senators', 'Philadelphia Flyers', 'Pittsburgh Penguins', 'San Jose Sharks', 'Seattle Kraken',
    'St. Louis Blues', 'Tampa Bay Lightning', 'Toronto Maple Leafs', 'Vancouver Canucks', 'Vegas Golden Knights',
    'Washington Capitals', 'Winnipeg Jets'
  ],
  'College Football': ['Vanderbilt'],
  'College Basketball': ['Vanderbilt'],
  Soccer: [
    'Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham',
    'Barcelona', 'Real Madrid', 'Bayern Munich', 'Paris Saint-Germain', 'Juventus', 'Inter Milan'
  ],
  Other: []
};

// Common prop types (app will learn more via localStorage)
export const COMMON_PROP_TYPES = [
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

// Prop type variations for normalization
export const PROP_TYPE_VARIATIONS = {
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

// The Odds API prop type mappings
export const ODDS_API_PROP_MAPPINGS = {
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

// ESPN API stat mappings for auto-updates
export const ESPN_STAT_MAPPINGS = {
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
    'pitcher strikeouts': ['K', 'SO', 'Strikeouts'],
    'hits': ['H', 'Hits'],
    'home runs': ['HR', 'Home Runs'],
    'rbis': ['RBI', 'RBIs'],
    'runs': ['R', 'Runs'],
    'stolen bases': ['SB', 'Stolen Bases']
  },
  'NHL': {
    'goals': ['G', 'Goals'],
    'shots on goal': ['SOG', 'Shots'],
    'saves': ['SV', 'Saves']
  }
};
