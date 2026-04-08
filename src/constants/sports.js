// Core data constants - maintains existing localStorage learning functionality

export const SPORTS = [
  'NFL', 'NBA', 'MLB', 'NHL', 'College Football', 'College Basketball', 'College Basketball (W)', 'WNBA',
  'Soccer', 'Tennis', 'Golf', 'Rugby', 'UFC', "Women's Hockey"
];

export const PLAYERS = ['Management', 'CD', '914', 'Junior', 'Jacoby'];

export const INDIVIDUAL_SPORTS = ['Tennis', "Tennis (Women's)", 'Golf', 'UFC'];

export const PICK_TYPES = [
  'Spread',
  'Moneyline',
  '3-Way Moneyline',
  'Total',
  'Player Prop',
  'Team Prop',
  'Game Prop',
  'H2H Prop',
  'Either Prop',
  'Combined Prop',
  'First Half Bet',
  'Quarter/Period Bet',
  'Prop Bet'  // Legacy - kept for backwards compatibility with existing data
];

// Sub-types for consolidated bet type categories
export const FIRST_HALF_BET_TYPES = [
  'First Half Spread',
  'First Half Moneyline',
  'First Half Total',
  'First Half Team Total'
];

export const QUARTER_PERIOD_BET_TYPES = [
  'Quarter Spread',
  'Quarter Moneyline',
  'Quarter Total',
  'Quarter Team Total'
];

export const TEAM_PROP_TYPES = [
  'Team Prop',
  'Team Total'
];

export const GAME_PROP_TYPES = [
  'Game Prop',
  'First Inning Runs'
];

// All valid bet types (includes sub-types for backward compatibility and storage)
export const ALL_BET_TYPES = [
  'Spread',
  'Moneyline',
  '3-Way Moneyline',
  'Total',
  'Player Prop',
  'Team Prop',
  'Game Prop',
  'H2H Prop',
  'Either Prop',
  'Combined Prop',
  'Team Total',
  'First Half Spread',
  'First Half Moneyline',
  'First Half Total',
  'First Half Team Total',
  'First Inning Runs',
  'Quarter Moneyline',
  'Quarter Total',
  'Quarter Team Total',
  'Quarter Spread',
  'First Half Bet',
  'Quarter/Period Bet',
  'Prop Bet'  // Legacy
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
  'College Football': [
    'Alabama', 'Arizona State', 'Arkansas', 'Auburn', 'Baylor', 'Boise State', 'Boston College', 'BYU',
    'California', 'Cincinnati', 'Clemson', 'Colorado', 'Delaware', 'Duke', 'Florida', 'Florida State',
    'Georgia', 'Georgia Tech', 'Houston', 'Illinois', 'Indiana', 'Iowa', 'Iowa State',
    'Kansas', 'Kansas State', 'Kentucky', 'Liberty', 'Louisville', 'LSU',
    'Maryland', 'Memphis', 'Miami', 'Michigan', 'Michigan State', 'Minnesota', 'Mississippi State',
    'Missouri', 'NC State', 'Nebraska', 'North Carolina', 'Northwestern', 'Notre Dame',
    'Ohio State', 'Oklahoma', 'Oklahoma State', 'Ole Miss', 'Oregon', 'Oregon State',
    'Penn State', 'Pitt', 'Purdue', 'Rutgers', 'SMU', 'South Carolina', 'Stanford', 'Syracuse',
    'TCU', 'Tennessee', 'Texas', 'Texas A&M', 'Texas Tech', 'UCF', 'UCLA', 'USC', 'Utah',
    'Vanderbilt', 'Virginia', 'Virginia Tech', 'Wake Forest', 'Washington', 'Washington State',
    'West Virginia', 'Wisconsin'
  ],
  'College Basketball': [
    'Alabama', 'Arizona', 'Arizona State', 'Arkansas', 'Auburn', 'Baylor', 'Boston College', 'BYU',
    'California', 'Cincinnati', 'Clemson', 'Colorado', 'Connecticut', 'Creighton', 'Delaware',
    'DePaul', 'Duke', 'Florida', 'Florida State', 'Georgetown', 'Georgia', 'Georgia Tech',
    'Gonzaga', 'Houston', 'Illinois', 'Indiana', 'Iowa', 'Iowa State',
    'Kansas', 'Kansas State', 'Kentucky', 'Liberty', 'Louisville', 'LSU',
    'Marquette', 'Maryland', 'Memphis', 'Miami', 'Michigan', 'Michigan State', 'Minnesota',
    'Mississippi State', 'Missouri', 'NC State', 'Nebraska', 'North Carolina', 'Northwestern',
    'Notre Dame', 'Ohio State', 'Oklahoma', 'Oklahoma State', 'Ole Miss', 'Oregon', 'Oregon State',
    'Penn State', 'Pitt', 'Providence', 'Purdue', 'Rutgers', 'Seton Hall', 'SMU',
    'South Carolina', 'St. Johns', 'Stanford', 'Syracuse',
    'TCU', 'Tennessee', 'Texas', 'Texas A&M', 'Texas Tech', 'UCF', 'UCLA', 'UConn', 'USC', 'Utah',
    'Vanderbilt', 'Villanova', 'Virginia', 'Virginia Tech', 'Wake Forest', 'Washington',
    'Washington State', 'West Virginia', 'Wisconsin', 'Xavier'
  ],
  'College Basketball (W)': [
    'Alabama', 'Arizona', 'Arizona State', 'Arkansas', 'Auburn', 'Baylor', 'Boston College', 'BYU',
    'California', 'Cincinnati', 'Clemson', 'Colorado', 'Connecticut', 'Creighton',
    'Duke', 'Florida', 'Florida State', 'Georgetown', 'Georgia', 'Georgia Tech',
    'Gonzaga', 'Houston', 'Illinois', 'Indiana', 'Iowa', 'Iowa State',
    'Kansas', 'Kansas State', 'Kentucky', 'Louisville', 'LSU',
    'Marquette', 'Maryland', 'Miami', 'Michigan', 'Michigan State', 'Minnesota',
    'Mississippi State', 'Missouri', 'NC State', 'Nebraska', 'North Carolina', 'Northwestern',
    'Notre Dame', 'Ohio State', 'Oklahoma', 'Oklahoma State', 'Ole Miss', 'Oregon', 'Oregon State',
    'Penn State', 'Pitt', 'Purdue', 'Rutgers', 'SMU',
    'South Carolina', 'Stanford', 'Syracuse',
    'TCU', 'Tennessee', 'Texas', 'Texas A&M', 'Texas Tech', 'UCF', 'UCLA', 'UConn', 'USC', 'Utah',
    'Vanderbilt', 'Villanova', 'Virginia', 'Virginia Tech', 'Wake Forest', 'Washington',
    'West Virginia', 'Wisconsin'
  ],
  Soccer: [
    'Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham',
    'Barcelona', 'Real Madrid', 'Bayern Munich', 'Paris Saint-Germain', 'Juventus', 'Inter Milan'
  ],
  "Women's Hockey": [
    'Boston Fleet', 'Minnesota Frost', 'Montreal Victoire', 'New York Sirens',
    'Ottawa Charge', 'Toronto Sceptres'
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

// Preloaded popular players by sport (app will learn more via localStorage)
export const PRELOADED_PLAYERS = {
  NFL: [
    'Patrick Mahomes', 'Josh Allen', 'Lamar Jackson', 'Jalen Hurts', 'Joe Burrow',
    'Dak Prescott', 'Justin Herbert', 'Tua Tagovailoa', 'Brock Purdy', 'C.J. Stroud',
    'Christian McCaffrey', 'Saquon Barkley', 'Derrick Henry', 'Austin Ekeler', 'Nick Chubb',
    'Tyreek Hill', 'Justin Jefferson', 'Ja\'Marr Chase', 'CeeDee Lamb', 'Stefon Diggs',
    'Travis Kelce', 'George Kittle', 'Mark Andrews', 'T.J. Hockenson', 'Dallas Goedert'
  ],
  NBA: [
    'LeBron James', 'Stephen Curry', 'Kevin Durant', 'Giannis Antetokounmpo', 'Luka Doncic',
    'Nikola Jokic', 'Joel Embiid', 'Jayson Tatum', 'Damian Lillard', 'Devin Booker',
    'Anthony Davis', 'Ja Morant', 'Trae Young', 'Donovan Mitchell', 'Jimmy Butler',
    'Kawhi Leonard', 'Paul George', 'Anthony Edwards', 'Tyrese Haliburton', 'Shai Gilgeous-Alexander'
  ],
  MLB: [
    'Shohei Ohtani', 'Aaron Judge', 'Mookie Betts', 'Ronald Acuna Jr.', 'Mike Trout',
    'Freddie Freeman', 'Juan Soto', 'Bryce Harper', 'Manny Machado', 'Pete Alonso',
    'Gerrit Cole', 'Spencer Strider', 'Corbin Burnes', 'Blake Snell', 'Sandy Alcantara',
    'Jacob deGrom', 'Shane Bieber', 'Kevin Gausman', 'Dylan Cease', 'Zack Wheeler'
  ],
  NHL: [
    'Connor McDavid', 'Auston Matthews', 'Nathan MacKinnon', 'Leon Draisaitl', 'Cale Makar',
    'David Pastrnak', 'Nikita Kucherov', 'Erik Karlsson', 'Matthew Tkachuk', 'Kirill Kaprizov',
    'Igor Shesterkin', 'Andrei Vasilevskiy', 'Connor Hellebuyck', 'Ilya Sorokin', 'Linus Ullmark'
  ],
  Soccer: [
    'Lionel Messi', 'Cristiano Ronaldo', 'Kylian Mbappe', 'Erling Haaland', 'Neymar',
    'Mohamed Salah', 'Kevin De Bruyne', 'Vinicius Jr', 'Harry Kane', 'Robert Lewandowski'
  ],
  "Women's Hockey": [
    'Marie-Philip Poulin', 'Hilary Knight', 'Sarah Nurse', 'Brianna Decker', 'Kendall Coyne Schofield',
    'Alex Carpenter', 'Hayley Wickenheiser', 'Natalie Spooner', 'Lara Stalder', 'Noora Raty'
  ],
  Other: []
};

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
// Keys use underscores to match normalizePropType output (spaces → underscores)
export const ODDS_API_PROP_MAPPINGS = {
  // NFL Props
  'passing_yards': 'player_pass_yds',
  'passing_attempts': 'player_pass_attempts',
  'passing_completions': 'player_pass_completions',
  'passing_touchdowns': 'player_pass_tds',
  'interceptions_thrown': 'player_pass_interceptions',
  'rushing_yards': 'player_rush_yds',
  'rushing_attempts': 'player_rush_attempts',
  'rushing_touchdowns': 'player_rush_tds',
  'receiving_yards': 'player_reception_yds',
  'receptions': 'player_receptions',
  'receiving_touchdowns': 'player_reception_tds',
  'rushing_&_receiving_yards': 'player_rush_reception_yds',
  'anytime_touchdown_scorer': 'player_anytime_td',
  'first_touchdown_scorer': 'player_1st_td',
  'last_touchdown_scorer': 'player_last_td',
  'sacks': 'player_sacks',
  'tackles': 'player_solo_tackles',
  'field_goals': 'player_field_goals',
  'kicking_points': 'player_kicking_points',

  // NBA Props
  'points': 'player_points',
  'rebounds': 'player_rebounds',
  'assists': 'player_assists',
  'three_pointers_made': 'player_threes',
  'steals': 'player_steals',
  'blocks': 'player_blocks',
  'turnovers': 'player_turnovers',
  'points_+_rebounds': 'player_points_rebounds',
  'points_+_assists': 'player_points_assists',
  'rebounds_+_assists': 'player_rebounds_assists',
  'points_+_rebounds_+_assists': 'player_points_rebounds_assists',
  'blocks_+_steals': 'player_blocks_steals',
  'double_double': 'player_double_double',
  'triple_double': 'player_triple_double',

  // MLB Props
  'strikeouts': 'batter_strikeouts',
  'pitcher_strikeouts': 'pitcher_strikeouts',
  'hits': 'batter_hits',
  'total_bases': 'batter_total_bases',
  'home_runs': 'batter_home_runs',
  'rbis': 'batter_rbis',
  'runs': 'batter_runs_scored',
  'stolen_bases': 'batter_stolen_bases',
  'hits_allowed': 'pitcher_hits_allowed',
  'walks_allowed': 'pitcher_walks',
  'earned_runs_allowed': 'pitcher_earned_runs',
  'singles': 'batter_singles',
  'doubles': 'batter_doubles',
  'triples': 'batter_triples',
  'walks': 'batter_walks',
  'hits_runs_rbis': 'batter_hits_runs_rbis',

  // NHL Props
  'goals': 'player_goals',
  'shots_on_goal': 'player_shots_on_goal',
  'saves': 'player_total_saves',
  'assists': 'player_assists',
  'points': 'player_points',
  'power_play_points': 'player_power_play_points',
  'blocked_shots': 'player_blocked_shots',
  'anytime_goal_scorer': 'player_goal_scorer_anytime',
  'first_goal_scorer': 'player_goal_scorer_first',
  'last_goal_scorer': 'player_goal_scorer_last'
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
  },
  "Women's Hockey": {
    'goals': ['G', 'Goals'],
    'shots on goal': ['SOG', 'Shots'],
    'saves': ['SV', 'Saves'],
    'assists': ['A', 'Assists'],
    'points': ['PTS', 'Points']
  }
};
