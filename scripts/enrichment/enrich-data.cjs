/**
 * Data Enrichment Script
 *
 * Enriches the existing Firestore data (new schema) with missing fields:
 * 1. Backfills entities[0].team for playerProp picks using PLAYER_TEAM_LOOKUP
 * 2. Backfills game.homeTeam for standard picks by parsing outcome.actualStats
 * 3. Fixes miscategorized game props (betCategory "playerProp" → "gameProp" or "standard")
 * 4. Transforms legacy brolays (14 with old schema) to new schema format
 * 5. Backfills entities[0].position for known players
 *
 * Usage:
 *   node scripts/enrichment/enrich-data.cjs           # Analyze and generate enriched JSON
 *   node scripts/enrichment/enrich-data.cjs --report   # Report only (no output file)
 */

const fs = require('fs');
const path = require('path');

const BACKUP_PATH = path.join(__dirname, '..', '..', 'backups', 'brolay-backup-latest.json');
const OUTPUT_PATH = path.join(__dirname, '..', '..', 'backups', 'enriched-data.json');

// ============================================================
// Game Prop StatTypes — these are NOT player props
// ============================================================
const GAME_PROP_STAT_TYPES = [
  'Submission', 'Knock-Out', 'Decision',
  'Both Teams to Score', 'Corners',
  'Both Teams TD in Each Half', 'First Field Goal Made',
  'Total Points Odd'
];

// Draw is a 3-Way Moneyline, not a game prop
const THREE_WAY_ML_STAT_TYPES = ['Draw'];

// ============================================================
// Player → Team Lookup (comprehensive, all sports 2023-2026)
// ============================================================
const PLAYER_TEAM_LOOKUP = {
  // === NFL - NFC West ===
  'George Kittle': 'San Francisco 49ers',
  'Christian McCaffrey': 'San Francisco 49ers',
  'Sam Darnold': 'San Francisco 49ers',
  'Brock Purdy': 'San Francisco 49ers',
  'Brandon Aiyuk': 'San Francisco 49ers',
  'Deebo Samuel': 'San Francisco 49ers',
  'Jauan Jennings': 'San Francisco 49ers',
  'Jordan Mason': 'San Francisco 49ers',
  'Elijah Mitchell': 'San Francisco 49ers',
  'Ricky Pearsall': 'San Francisco 49ers',
  'Kyle Juszczyk': 'San Francisco 49ers',
  'Cooper Kupp': 'Los Angeles Rams',
  'Kyren Williams': 'Los Angeles Rams',
  'Colston Loveland': 'Los Angeles Rams',
  'Matthew Stafford': 'Los Angeles Rams',
  'Puka Nacua': 'Los Angeles Rams',
  'Jaxon Smith-Njigba': 'Seattle Seahawks',
  'DK Metcalf': 'Seattle Seahawks',
  'Kenneth Walker': 'Seattle Seahawks',
  'Kenneth Walker III': 'Seattle Seahawks',
  'Geno Smith': 'Seattle Seahawks',
  'Zach Charbonnet': 'Seattle Seahawks',
  'Jake Bobo': 'Seattle Seahawks',
  'Tetairoa McMillan': 'Arizona Cardinals',
  'Kyler Murray': 'Arizona Cardinals',
  'Trey McBride': 'Arizona Cardinals',
  'James Conner': 'Arizona Cardinals',
  'Marvin Harrison Jr.': 'Arizona Cardinals',
  'Emari Demercado': 'Arizona Cardinals',
  'Greg Dortch': 'Arizona Cardinals',
  'Michael Wilson': 'Arizona Cardinals',

  // === NFL - NFC South ===
  'Baker Mayfield': 'Tampa Bay Buccaneers',
  'Cade Otton': 'Tampa Bay Buccaneers',
  'Mike Evans': 'Tampa Bay Buccaneers',
  'Chris Godwin': 'Tampa Bay Buccaneers',
  'Rachaad White': 'Tampa Bay Buccaneers',
  'Bucky Irving': 'Tampa Bay Buccaneers',
  'Bryce Young': 'Carolina Panthers',
  'Chuba Hubbard': 'Carolina Panthers',
  'Adam Thielen': 'Carolina Panthers',
  'Xavier Legette': 'Carolina Panthers',
  'Kirk Cousins': 'Atlanta Falcons',
  'Bijan Robinson': 'Atlanta Falcons',
  'Drake London': 'Atlanta Falcons',
  'Kyle Pitts': 'Atlanta Falcons',
  'Tyler Allgeier': 'Atlanta Falcons',
  'Darnell Mooney': 'Atlanta Falcons',
  'Derek Carr': 'New Orleans Saints',
  'Alvin Kamara': 'New Orleans Saints',
  'Chris Olave': 'New Orleans Saints',
  'Taysom Hill': 'New Orleans Saints',
  'Rashid Shaheed': 'New Orleans Saints',
  'Foster Moreau': 'New Orleans Saints',

  // === NFL - NFC North ===
  'Caleb Williams': 'Chicago Bears',
  'DJ Moore': 'Chicago Bears',
  'Cole Kmet': 'Chicago Bears',
  'Rome Odunze': 'Chicago Bears',
  'D\'Andre Swift': 'Chicago Bears',
  'Jordan Love': 'Green Bay Packers',
  'Josh Jacobs': 'Green Bay Packers',
  'Christian Watson': 'Green Bay Packers',
  'Romeo Doubs': 'Green Bay Packers',
  'Jayden Reed': 'Green Bay Packers',
  'Luke Musgrave': 'Green Bay Packers',
  'Emanuel Wilson': 'Green Bay Packers',
  'Tucker Kraft': 'Green Bay Packers',
  'Jared Goff': 'Detroit Lions',
  'Jahmyr Gibbs': 'Detroit Lions',
  'Amon-Ra St. Brown': 'Detroit Lions',
  'Sam LaPorta': 'Detroit Lions',
  'David Montgomery': 'Detroit Lions',
  'Jameson Williams': 'Detroit Lions',
  'Kalif Raymond': 'Detroit Lions',
  'Jahmyr Gibson': 'Detroit Lions',
  'Sam Darnold': 'Minnesota Vikings',
  'Justin Jefferson': 'Minnesota Vikings',
  'Jordan Addison': 'Minnesota Vikings',
  'TJ Hockenson': 'Minnesota Vikings',
  'Aaron Jones': 'Minnesota Vikings',
  'Jalen Nailor': 'Minnesota Vikings',
  'Ty Chandler': 'Minnesota Vikings',

  // === NFL - NFC East ===
  'Jalen Hurts': 'Philadelphia Eagles',
  'DeVonta Smith': 'Philadelphia Eagles',
  'Devonta Smith': 'Philadelphia Eagles',
  'Kenneth Gainwell': 'Philadelphia Eagles',
  'AJ Brown': 'Philadelphia Eagles',
  'Dallas Goedert': 'Philadelphia Eagles',
  'Saquon Barkley': 'Philadelphia Eagles',
  'Dak Prescott': 'Dallas Cowboys',
  'CeeDee Lamb': 'Dallas Cowboys',
  'Ceedee Lamb': 'Dallas Cowboys',
  'Rico Dowdle': 'Dallas Cowboys',
  'Jake Ferguson': 'Dallas Cowboys',
  'Jalen Tolbert': 'Dallas Cowboys',
  'Brandin Cooks': 'Dallas Cowboys',
  'Cooper Rush': 'Dallas Cowboys',
  'Jayden Daniels': 'Washington Commanders',
  'Terry McLaurin': 'Washington Commanders',
  'Brian Robinson': 'Washington Commanders',
  'Brian Robinson Jr.': 'Washington Commanders',
  'Dyami Brown': 'Washington Commanders',
  'Zack Moss': 'Washington Commanders',
  'Daniel Jones': 'New York Giants',
  'Kyle Monangai': 'New York Giants',
  'Malik Nabers': 'New York Giants',
  'Tyrone Tracy': 'New York Giants',
  'Theo Johnson': 'New York Giants',
  'Darius Slayton': 'New York Giants',

  // === NFL - AFC West ===
  'Patrick Mahomes': 'Kansas City Chiefs',
  'Travis Kelce': 'Kansas City Chiefs',
  'Isiah Pacheco': 'Kansas City Chiefs',
  'Xavier Worthy': 'Kansas City Chiefs',
  'Noah Gray': 'Kansas City Chiefs',
  'Kareem Hunt': 'Kansas City Chiefs',
  'Justin Herbert': 'Los Angeles Chargers',
  'Ladd McConkey': 'Los Angeles Chargers',
  'JK Dobbins': 'Los Angeles Chargers',
  'Quentin Johnston': 'Los Angeles Chargers',
  'Quentin Johnson': 'Los Angeles Chargers',
  'Tyler Higbee': 'Los Angeles Chargers',
  'Kimani Vidal': 'Los Angeles Chargers',
  'Bo Nix': 'Denver Broncos',
  'Courtland Sutton': 'Denver Broncos',
  'Javonte Williams': 'Denver Broncos',
  'Marvin Mims': 'Denver Broncos',
  'Troy Franklin': 'Denver Broncos',
  'Tory Horton': 'Denver Broncos',
  'Aidan O\'Connell': 'Las Vegas Raiders',
  'Brock Bowers': 'Las Vegas Raiders',
  'Jakobi Meyers': 'Las Vegas Raiders',
  'Alexander Mattison': 'Las Vegas Raiders',
  'Zamir White': 'Las Vegas Raiders',

  // === NFL - AFC East ===
  'Josh Allen': 'Buffalo Bills',
  'Dalton Kincaid': 'Buffalo Bills',
  'Khalil Shakir': 'Buffalo Bills',
  'James Cook': 'Buffalo Bills',
  'Dawson Knox': 'Buffalo Bills',
  'Keon Coleman': 'Buffalo Bills',
  'Amari Cooper': 'Buffalo Bills',
  'Tua Tagovailoa': 'Miami Dolphins',
  'Tyreek Hill': 'Miami Dolphins',
  'Jaylen Waddle': 'Miami Dolphins',
  'De\'Von Achane': 'Miami Dolphins',
  'Raheem Mostert': 'Miami Dolphins',
  'Aaron Rodgers': 'New York Jets',
  'Garrett Wilson': 'New York Jets',
  'Breece Hall': 'New York Jets',
  'Drake Maye': 'New England Patriots',
  'Hunter Henry': 'New England Patriots',
  'Rhamondre Stevenson': 'New England Patriots',
  'Kayshon Boutte': 'New England Patriots',
  'Demario Douglas': 'New England Patriots',
  'Kendrick Bourne': 'New England Patriots',
  'Jacoby Brissett': 'New England Patriots',
  'Bailey Zappe': 'New England Patriots',

  // === NFL - AFC South ===
  'Derrick Henry': 'Baltimore Ravens',
  'Lamar Jackson': 'Baltimore Ravens',
  'Zay Flowers': 'Baltimore Ravens',
  'Marquez Valdes-Scantling': 'Baltimore Ravens',
  'Mark Andrews': 'Baltimore Ravens',
  'Isaiah Likely': 'Baltimore Ravens',
  'Joe Burrow': 'Cincinnati Bengals',
  'Ja\'Marr Chase': 'Cincinnati Bengals',
  'Tee Higgins': 'Cincinnati Bengals',
  'Chase Brown': 'Cincinnati Bengals',
  'TreVeyon Henderson': 'Cincinnati Bengals',
  'Treyveon Henderson': 'Cincinnati Bengals',
  'CJ Stroud': 'Houston Texans',
  'Nico Collins': 'Houston Texans',
  'Stefon Diggs': 'Houston Texans',
  'Joe Mixon': 'Houston Texans',
  'Tank Dell': 'Houston Texans',
  'Jayden Higgins': 'Houston Texans',
  'Cade Stover': 'Houston Texans',
  'Dalton Schultz': 'Houston Texans',
  'Tony Pollard': 'Tennessee Titans',
  'DeAndre Hopkins': 'Tennessee Titans',
  'Chigoziem Okonkwo': 'Tennessee Titans',
  'Tyjae Spears': 'Tennessee Titans',
  'Trevor Lawrence': 'Jacksonville Jaguars',
  'Travis Etienne': 'Jacksonville Jaguars',
  'Evan Engram': 'Jacksonville Jaguars',
  'Christian Kirk': 'Jacksonville Jaguars',
  'Tank Bigsby': 'Jacksonville Jaguars',
  'Parker Washington': 'Jacksonville Jaguars',

  // === NFL - AFC North (continued) ===
  'Russell Wilson': 'Pittsburgh Steelers',
  'Najee Harris': 'Pittsburgh Steelers',
  'George Pickens': 'Pittsburgh Steelers',
  'Pat Freiermuth': 'Pittsburgh Steelers',
  'Jaylen Warren': 'Pittsburgh Steelers',
  'Calvin Austin': 'Pittsburgh Steelers',
  'Chris Boswell': 'Pittsburgh Steelers',
  'Deshaun Watson': 'Cleveland Browns',
  'David Njoku': 'Cleveland Browns',
  'Nick Chubb': 'Cleveland Browns',
  'Cedric Tillman': 'Cleveland Browns',
  'Jameis Winston': 'Cleveland Browns',

  // === NFL - Other/Special ===
  'Jonathan Taylor': 'Indianapolis Colts',
  'Michael Pittman Jr.': 'Indianapolis Colts',
  'Mo Alie-Cox': 'Indianapolis Colts',
  'Kylen Granson': 'Indianapolis Colts',
  'Anthony Richardson': 'Indianapolis Colts',
  'Joe Flacco': 'Indianapolis Colts',
  'Spencer Rattler': 'New Orleans Saints',
  'Tommy DeVito': 'New York Giants',
  'Gardner Minshew': 'Las Vegas Raiders',
  'Easton Stick': 'Los Angeles Chargers',
  'Desmond Ridder': 'Arizona Cardinals',
  'Tyler Huntley': 'Cleveland Browns',
  'Mason Rudolph': 'Tennessee Titans',
  'Mac Jones': 'Jacksonville Jaguars',
  'Cam Ward': 'Miami Dolphins',
  'Cam Skattebo': 'Arizona Cardinals',
  'Ashton Jeanty': 'Pittsburgh Steelers',
  'Travis Hunter': 'Jacksonville Jaguars',
  'Jaxson Dart': 'Tennessee Titans',
  'RJ Harvey': 'Arizona Cardinals',
  'Ollie Gordon': 'Washington Commanders',
  'Omarion Hampton': 'Carolina Panthers',
  'Tre Harris': 'Miami Dolphins',
  'Woody Marks': 'New York Giants',
  'Luke McCaffrey': 'Washington Commanders',
  'Jacory Croskey-Merritt': 'Denver Broncos',
  'Quinshon Judkins': 'Green Bay Packers',

  // === NFL - Kickers ===
  'Brandon Aubrey': 'Dallas Cowboys',
  'Tyler Bass': 'Buffalo Bills',
  'Chris Boswell': 'Pittsburgh Steelers',
  'Daniel Carlson': 'Las Vegas Raiders',
  'Cairo Santos': 'Chicago Bears',
  'Will Reichard': 'Minnesota Vikings',
  'Zane Gonzalez': 'Washington Commanders',
  'Justin Tucker': 'Baltimore Ravens',
  'Greg Zuerlein': 'New York Jets',
  'Cade York': 'Tennessee Titans',

  // === NFL - Defensive ===
  'Maxx Crosby': 'Las Vegas Raiders',
  'Nnamdi Madubuike': 'Baltimore Ravens',
  'Bobby Okereke': 'New York Giants',
  'Joey Porter Jr.': 'Pittsburgh Steelers',
  'Leonard Floyd': 'San Francisco 49ers',

  // === NFL team-name entities (game props) ===
  'Baltimore Ravens': 'Baltimore Ravens',
  'Chicago Bears': 'Chicago Bears',
  'Dallas Cowboys': 'Dallas Cowboys',
  'Detroit Lions': 'Detroit Lions',
  'Indianapolis Colts': 'Indianapolis Colts',
  'Kansas City Chiefs': 'Kansas City Chiefs',
  'New England Patriots': 'New England Patriots',
  'New Orleans Saints': 'New Orleans Saints',
  'Philadelphia Eagles': 'Philadelphia Eagles',

  // === MLB ===
  'Aaron Judge': 'New York Yankees',
  'Juan Soto': 'New York Mets',
  'Chris Sale': 'Atlanta Braves',
  'Paul Skenes': 'Pittsburgh Pirates',
  'Shota Imanaga': 'Chicago Cubs',
  'Corbin Burnes': 'Baltimore Orioles',
  'Gunnar Henderson': 'Baltimore Orioles',
  'Kyle Bradish': 'Baltimore Orioles',
  'Zack Wheeler': 'Philadelphia Phillies',
  'Ranger Suarez': 'Philadelphia Phillies',
  'Christopher Sanchez': 'Philadelphia Phillies',
  'Nick Castellanos': 'Philadelphia Phillies',
  'Alec Bohm': 'Philadelphia Phillies',
  'Tarik Skubal': 'Detroit Tigers',
  'George Kirby': 'Seattle Mariners',
  'Luis Castillo': 'Seattle Mariners',
  'Logan Webb': 'San Francisco Giants',
  'Nick Pivetta': 'Boston Red Sox',
  'Bryce Miller': 'Seattle Mariners',
  'Dylan Cease': 'San Diego Padres',
  'Garrett Crochet': 'Chicago White Sox',
  'Hunter Greene': 'Cincinnati Reds',
  'Nestor Cortes': 'New York Yankees',
  'Luis Gil': 'New York Yankees',
  'Giancarlo Stanton': 'New York Yankees',
  'Carlos Rodon': 'New York Yankees',
  'Jose Altuve': 'Houston Astros',
  'Hunter Brown': 'Houston Astros',
  'Jose Berrios': 'Toronto Blue Jays',
  'Jose Ramirez': 'Cleveland Guardians',
  'Josh Naylor': 'Cleveland Guardians',
  'Sonny Gray': 'St. Louis Cardinals',
  'Reynaldo Lopez': 'Atlanta Braves',
  'Marcell Ozuna': 'Atlanta Braves',
  'Michael Harris': 'Atlanta Braves',
  'Ronald Acuna Jr.': 'Atlanta Braves',
  'Hurston Waldrep': 'Atlanta Braves',
  'Spencer Schwellenbach': 'Atlanta Braves',
  'Bryce Elder': 'Atlanta Braves',
  'Freddy Peralta': 'Milwaukee Brewers',
  'Tobias Myers': 'Milwaukee Brewers',
  'Sandy Alcantara': 'Miami Marlins',
  'Elly De La Cruz': 'Cincinnati Reds',
  'Ketel Marte': 'Arizona Diamondbacks',
  'Brandon Pfaadt': 'Arizona Diamondbacks',
  'Ryne Nelson': 'Arizona Diamondbacks',
  'Slade Cecconi': 'Arizona Diamondbacks',
  'Matt Waldron': 'San Diego Padres',
  'Brady Singer': 'Kansas City Royals',
  'Cam Schlittler': 'Cincinnati Reds',
  'Jon Gray': 'Texas Rangers',
  'Matt Boyd': 'Cleveland Guardians',
  'Max Meyer': 'Miami Marlins',
  'Tyler Anderson': 'Los Angeles Angels',
  'Ryan Feltner': 'Colorado Rockies',
  'Mackenzie Gore': 'Washington Nationals',
  'Jameson Taillon': 'Chicago Cubs',
  'Landen Roupp': 'San Francisco Giants',
  'Will Warren': 'New York Yankees',
  'Emerson Hancock': 'Seattle Mariners',
  'Luis Ortiz': 'Pittsburgh Pirates',
  'Jack Leiter': 'Texas Rangers',
  'Jacob Misiorowski': 'Milwaukee Brewers',
  'Brandon Walter': 'Chicago White Sox',
  'Michael King': 'San Diego Padres',
  'Bowden Francis': 'Toronto Blue Jays',
  'Trevor Rogers': 'Baltimore Orioles',
  'Jared Jones': 'Pittsburgh Pirates',
  'Shea Langeliers': 'Oakland Athletics',
  'Junior Caminero': 'Tampa Bay Rays',

  // === NBA ===
  'LeBron James': 'Los Angeles Lakers',
  'Anthony Davis': 'Los Angeles Lakers',
  'Anthony Edwards': 'Minnesota Timberwolves',
  'Jaden McDaniels': 'Minnesota Timberwolves',
  'Naz Reid': 'Minnesota Timberwolves',
  'Nikola Jokic': 'Denver Nuggets',
  'Jamal Murray': 'Denver Nuggets',
  'Kevin Durant': 'Phoenix Suns',
  'Shai Gilgeous-Alexander': 'Oklahoma City Thunder',
  'Luguentz Dort': 'Oklahoma City Thunder',
  'Luka Doncic': 'Dallas Mavericks',
  'Donovan Mitchell': 'Cleveland Cavaliers',
  'Darius Garland': 'Cleveland Cavaliers',
  'Jalen Brunson': 'New York Knicks',
  'Karl-Anthony Towns': 'New York Knicks',
  'Josh Hart': 'New York Knicks',
  'Mikal Bridges': 'New York Knicks',
  'OG Anunoby': 'New York Knicks',
  'Mitchell Robinson': 'New York Knicks',
  'Jayson Tatum': 'Boston Celtics',
  'Jaylen Brown': 'Boston Celtics',
  'Derrick White': 'Boston Celtics',
  'Payton Pritchard': 'Boston Celtics',
  'Paul George': 'Philadelphia 76ers',
  'Tyrese Haliburton': 'Indiana Pacers',
  'Pascal Siakam': 'Indiana Pacers',
  'Andrew Nembhard': 'Indiana Pacers',
  'Jimmy Butler': 'Miami Heat',
  'Bam Adebayo': 'Miami Heat',
  'Victor Wembanyama': 'San Antonio Spurs',
  'Steph Curry': 'Golden State Warriors',
  'Brandin Podziemski': 'Golden State Warriors',
  'Fred VanVleet': 'Houston Rockets',
  'Chet Holmgren': 'Oklahoma City Thunder',
  'Jalen Williams': 'Oklahoma City Thunder',
  'Aaron Gordon': 'Denver Nuggets',
  'Aaron Nesmith': 'Indiana Pacers',
  'Alex Caruso': 'Oklahoma City Thunder',
  'Obi Toppin': 'Indiana Pacers',
  'Max Strus': 'Cleveland Cavaliers',
  'Daniel Gafford': 'Dallas Mavericks',
  'Donte DiVincenzo': 'Minnesota Timberwolves',
  'Josh Giddey': 'Chicago Bulls',
  'Julius Randle': 'Minnesota Timberwolves',
  'Isaiah Hartenstein': 'Oklahoma City Thunder',
  'Russell Westbrook': 'Denver Nuggets',
  'Norman Powell': 'Los Angeles Clippers',
  'Herbert Jones': 'New Orleans Pelicans',
  'Davion Mitchell': 'Sacramento Kings',
  'Derrick Jones': 'Los Angeles Clippers',
  'Ty Jerome': 'Cleveland Cavaliers',
  'Cooper Flagg': 'Duke',
  'Quinten Post': 'Boston Celtics',

  // === WNBA ===
  'A\'Ja Wilson': 'Las Vegas Aces',
  'Caitlin Clark': 'Indiana Fever',
  'Sabrina Ionescu': 'New York Liberty',
  'Angel Reese': 'Chicago Sky',
  'Napheesa Collier': 'Minnesota Lynx',
  'Paige Bueckers': 'Dallas Wings',
  'Alyssa Thomas': 'Connecticut Sun',
  'Sophie Cunningham': 'Phoenix Mercury',
  'Satou Sabally': 'Dallas Wings',
  'Alisha Gray': 'Atlanta Dream',
  'Skylar Diggins': 'Seattle Storm',

  // === College Football ===
  'Carson Beck': 'Georgia',
  'Fernando Mendoza': 'California',
  'Jeremiah McClellan': 'SMU',
  'Gary Bryant': 'Ohio State',
  'Michael Penix Jr.': 'Washington',
  'Cornelius Johnson': 'Michigan',

  // === College Basketball ===
  'Mark Sears': 'Alabama',
  'Tyrese Proctor': 'Duke',
  'Walter Clayton': 'Florida',

  // === NHL ===
  'Zach Hyman': 'Edmonton Oilers',

  // === Tennis ===
  'Taylor Fritz': 'USA',
  'Reilly Opelka': 'USA',
  'Aryna Sabalenka': 'Belarus',
  'Ons Jabeur': 'Tunisia',

  // === Soccer ===
  'Harry Kane': 'Bayern Munich',
  'Kylian Mbappe': 'Real Madrid',
  'Christiano Ronaldo': 'Al Nassr',
  'Romelu Lukaku': 'Napoli',
  'Georgia': 'Georgia',  // National team

  // === Remaining NFL players (covering 2023-2025 rosters) ===
  'AJ Dillon': 'Green Bay Packers',
  'AJ DIllon': 'Green Bay Packers',
  'Allen Robinson': 'Detroit Lions',
  'Antonio Gibson': 'New England Patriots',
  'Austin Ekeler': 'Washington Commanders',
  'Bam Knight': 'New York Jets',
  'Brian Thomas': 'Jacksonville Jaguars',
  'Brian Thomas Jr.': 'Jacksonville Jaguars',
  'Calvin Ridley': 'Tennessee Titans',
  'Colby Parkinson': 'Los Angeles Rams',
  'D\'Ernest Johnson': 'Cleveland Browns',
  'Dalvin Cook': 'New York Jets',
  'Darnell Washington': 'Pittsburgh Steelers',
  'David Sills V': 'New York Giants',
  'Demarcus Robinson': 'Los Angeles Rams',
  'Devin Singletary': 'New York Giants',
  'Elijah Higgins': 'Arizona Cardinals',
  'Exekiel Elliott': 'New England Patriots',
  'Gabe Davis': 'Jacksonville Jaguars',
  'Isaiah Hodgins': 'New York Giants',
  'JJ McCarthy': 'Minnesota Vikings',
  'Ja\'Tavion Sanders': 'Carolina Panthers',
  'Jahan Dotson': 'Philadelphia Eagles',
  'Ja\'Marr Chase': 'Cincinnati Bengals',
  'Jeremy McNichols': 'Washington Commanders',
  'John Metchie': 'Houston Texans',
  'Joshua Dobbs': 'San Francisco 49ers',
  'JuJu Smith-Schuster': 'New England Patriots',
  'Juju Smith-Schuster': 'New England Patriots',
  'Justin Fields': 'Pittsburgh Steelers',
  'Justin Watson': 'Kansas City Chiefs',
  'Kavontae Turpin': 'Dallas Cowboys',
  'Keenan Allen': 'Chicago Bears',
  'Luke Farrell': 'Jacksonville Jaguars',
  'Mack Hollins': 'Buffalo Bills',
  'Malik Washington': 'Miami Dolphins',
  'Marcus Mariota': 'Washington Commanders',
  'Marquise Brown': 'Kansas City Chiefs',
  'Michael Mayer': 'Las Vegas Raiders',
  'Mike Williams': 'New York Jets',
  'Miles Sanders': 'Carolina Panthers',
  'Nick Westbrook-Ikhine': 'Tennessee Titans',
  'Odell Beckham Jr.': 'Miami Dolphins',
  'Patrick Taylor': 'Chicago Bears',
  'Patrick Taylor Jr.': 'Chicago Bears',
  'Sterling Shepard': 'Tampa Bay Buccaneers',
  'Taylor Heinicke': 'Atlanta Falcons',
  'Tim Patrick': 'Denver Broncos',
  'Todd Gilliland': 'Houston Texans',
  'Trey Benson': 'Arizona Cardinals',
  'Tyler Boyd': 'Tennessee Titans',
  'Tyquan Thornton': 'New England Patriots',
  'Tyson Bagent': 'Chicago Bears',
  'Van Jefferson': 'Pittsburgh Steelers',
  'Xavier Hutchinson': 'Houston Texans',
  'Zach Ertz': 'Washington Commanders',
  'Jaylen Wright': 'Miami Dolphins',
  'Blake Corum': 'Los Angeles Rams',
  'Braelon Allen': 'New York Jets',
  'Bhayshul Tuten': 'Jacksonville Jaguars',
  'Brenton Strange': 'Jacksonville Jaguars',

  // === MLB additions ===
  'Andrew Heaney': 'Texas Rangers',

  // === NBA additions ===
  'Ivica Zubac': 'Los Angeles Clippers',
};

// ============================================================
// Player → Position Lookup
// ============================================================
const PLAYER_POSITION_LOOKUP = {
  // NFL QBs
  'Josh Allen': 'QB', 'Patrick Mahomes': 'QB', 'Lamar Jackson': 'QB', 'Jalen Hurts': 'QB',
  'Joe Burrow': 'QB', 'Justin Herbert': 'QB', 'Dak Prescott': 'QB', 'Jayden Daniels': 'QB',
  'Caleb Williams': 'QB', 'Jordan Love': 'QB', 'Bo Nix': 'QB', 'Baker Mayfield': 'QB',
  'Brock Purdy': 'QB', 'Sam Darnold': 'QB', 'CJ Stroud': 'QB', 'Jared Goff': 'QB',
  'Kirk Cousins': 'QB', 'Derek Carr': 'QB', 'Tua Tagovailoa': 'QB', 'Aaron Rodgers': 'QB',
  'Geno Smith': 'QB', 'Kyler Murray': 'QB', 'Matthew Stafford': 'QB', 'Trevor Lawrence': 'QB',
  'Russell Wilson': 'QB', 'Deshaun Watson': 'QB', 'Daniel Jones': 'QB', 'Drake Maye': 'QB',
  'Bryce Young': 'QB', 'Cam Ward': 'QB', 'Cooper Rush': 'QB', 'Spencer Rattler': 'QB',
  'Jameis Winston': 'QB', 'Tommy DeVito': 'QB', 'Joe Flacco': 'QB', 'Tyler Huntley': 'QB',
  'Jacoby Brissett': 'QB', 'Bailey Zappe': 'QB', 'Easton Stick': 'QB', 'Mason Rudolph': 'QB',
  'Gardner Minshew': 'QB', 'Mac Jones': 'QB', 'Desmond Ridder': 'QB', 'Justin Fields': 'QB',
  'Tyson Bagent': 'QB', 'Joshua Dobbs': 'QB', 'Taylor Heinicke': 'QB', 'JJ McCarthy': 'QB',

  // NFL RBs
  'Saquon Barkley': 'RB', 'Derrick Henry': 'RB', 'Bijan Robinson': 'RB', 'Josh Jacobs': 'RB',
  'Jahmyr Gibbs': 'RB', 'De\'Von Achane': 'RB', 'Jonathan Taylor': 'RB', 'Breece Hall': 'RB',
  'James Cook': 'RB', 'Tony Pollard': 'RB', 'D\'Andre Swift': 'RB', 'Kyren Williams': 'RB',
  'Isiah Pacheco': 'RB', 'Joe Mixon': 'RB', 'Aaron Jones': 'RB', 'Najee Harris': 'RB',
  'David Montgomery': 'RB', 'Kenneth Walker III': 'RB', 'Kenneth Walker': 'RB',
  'Chuba Hubbard': 'RB', 'Chase Brown': 'RB', 'Rachaad White': 'RB', 'Bucky Irving': 'RB',
  'Rico Dowdle': 'RB', 'Brian Robinson Jr.': 'RB', 'Brian Robinson': 'RB',
  'Rhamondre Stevenson': 'RB', 'Alvin Kamara': 'RB', 'Raheem Mostert': 'RB',
  'James Conner': 'RB', 'JK Dobbins': 'RB', 'TreVeyon Henderson': 'RB',
  'Treyveon Henderson': 'RB', 'Javonte Williams': 'RB', 'Kareem Hunt': 'RB',
  'Nick Chubb': 'RB', 'Zack Moss': 'RB', 'Kenneth Gainwell': 'RB', 'Tyler Allgeier': 'RB',
  'Jordan Mason': 'RB', 'Elijah Mitchell': 'RB', 'Kyle Monangai': 'RB',
  'Devin Singletary': 'RB', 'Tank Bigsby': 'RB', 'Ty Chandler': 'RB',
  'Tyjae Spears': 'RB', 'Ashton Jeanty': 'RB', 'Cam Skattebo': 'RB', 'RJ Harvey': 'RB',
  'Omarion Hampton': 'RB', 'Ollie Gordon': 'RB', 'Quinshon Judkins': 'RB',
  'Woody Marks': 'RB', 'Jacory Croskey-Merritt': 'RB', 'Jaylen Wright': 'RB',
  'Kimani Vidal': 'RB', 'Bhayshul Tuten': 'RB', 'Blake Corum': 'RB',
  'Braelon Allen': 'RB', 'Emari Demercado': 'RB', 'Miles Sanders': 'RB',
  'Zamir White': 'RB', 'Emanuel Wilson': 'RB', 'Dalvin Cook': 'RB',
  'Exekiel Elliott': 'RB', 'Patrick Taylor': 'RB', 'Patrick Taylor Jr.': 'RB',

  // NFL WRs
  'Justin Jefferson': 'WR', 'CeeDee Lamb': 'WR', 'Ceedee Lamb': 'WR',
  'Tyreek Hill': 'WR', 'Ja\'Marr Chase': 'WR', 'Amon-Ra St. Brown': 'WR',
  'Cooper Kupp': 'WR', 'DK Metcalf': 'WR', 'DeVonta Smith': 'WR', 'Devonta Smith': 'WR',
  'AJ Brown': 'WR', 'Deebo Samuel': 'WR', 'Davante Adams': 'WR', 'Puka Nacua': 'WR',
  'Garrett Wilson': 'WR', 'Chris Godwin': 'WR', 'Mike Evans': 'WR',
  'Nico Collins': 'WR', 'Terry McLaurin': 'WR', 'Brandon Aiyuk': 'WR',
  'George Pickens': 'WR', 'Jaylen Waddle': 'WR', 'Christian Watson': 'WR',
  'Stefon Diggs': 'WR', 'Chris Olave': 'WR', 'Tee Higgins': 'WR',
  'Zay Flowers': 'WR', 'Adam Thielen': 'WR', 'Calvin Ridley': 'WR',
  'Jaxon Smith-Njigba': 'WR', 'Courtland Sutton': 'WR', 'Rome Odunze': 'WR',
  'DJ Moore': 'WR', 'Jordan Addison': 'WR', 'Jayden Reed': 'WR',
  'Keenan Allen': 'WR', 'Romeo Doubs': 'WR', 'Khalil Shakir': 'WR',
  'Ladd McConkey': 'WR', 'Tetairoa McMillan': 'WR', 'Marvin Harrison Jr.': 'WR',
  'Xavier Worthy': 'WR', 'Tank Dell': 'WR', 'Rashid Shaheed': 'WR',
  'Jameson Williams': 'WR', 'Darnell Mooney': 'WR', 'Jakobi Meyers': 'WR',
  'Marvin Mims': 'WR', 'Xavier Legette': 'WR', 'Ricky Pearsall': 'WR',
  'Jauan Jennings': 'WR', 'Troy Franklin': 'WR', 'Tory Horton': 'WR',
  'Jalen Nailor': 'WR', 'Jayden Higgins': 'WR', 'Kalif Raymond': 'WR',
  'Marquez Valdes-Scantling': 'WR', 'Parker Washington': 'WR',
  'Kayshon Boutte': 'WR', 'Demario Douglas': 'WR', 'Kendrick Bourne': 'WR',
  'Keon Coleman': 'WR', 'Travis Hunter': 'WR', 'Tre Harris': 'WR',
  'Luke McCaffrey': 'WR', 'Quentin Johnston': 'WR', 'Quentin Johnson': 'WR',
  'Jaxson Dart': 'QB',
  'Malik Washington': 'WR', 'Jake Bobo': 'WR',

  // Remaining NFL positions
  'AJ Dillon': 'RB', 'AJ DIllon': 'RB', 'Allen Robinson': 'WR',
  'Antonio Gibson': 'RB', 'Austin Ekeler': 'RB', 'Bam Knight': 'RB',
  'Brian Thomas': 'WR', 'Brian Thomas Jr.': 'WR', 'Calvin Ridley': 'WR',
  'Colby Parkinson': 'TE', 'D\'Ernest Johnson': 'RB', 'Dalvin Cook': 'RB',
  'Darnell Washington': 'TE', 'David Sills V': 'WR', 'Demarcus Robinson': 'WR',
  'Devin Singletary': 'RB', 'Elijah Higgins': 'TE', 'Exekiel Elliott': 'RB',
  'Gabe Davis': 'WR', 'Isaiah Hodgins': 'WR', 'JJ McCarthy': 'QB',
  'Ja\'Tavion Sanders': 'TE', 'Jahan Dotson': 'WR',
  'Jeremy McNichols': 'RB', 'John Metchie': 'WR',
  'Joshua Dobbs': 'QB', 'JuJu Smith-Schuster': 'WR', 'Juju Smith-Schuster': 'WR',
  'Justin Fields': 'QB', 'Justin Watson': 'WR', 'Kavontae Turpin': 'WR',
  'Keenan Allen': 'WR', 'Luke Farrell': 'TE', 'Mack Hollins': 'WR',
  'Marcus Mariota': 'QB', 'Marquise Brown': 'WR', 'Michael Mayer': 'TE',
  'Mike Williams': 'WR', 'Miles Sanders': 'RB', 'Nick Westbrook-Ikhine': 'WR',
  'Odell Beckham Jr.': 'WR', 'Patrick Taylor': 'RB', 'Patrick Taylor Jr.': 'RB',
  'Sterling Shepard': 'WR', 'Taylor Heinicke': 'QB', 'Tim Patrick': 'WR',
  'Todd Gilliland': 'WR', 'Trey Benson': 'RB', 'Tyler Boyd': 'WR',
  'Tyquan Thornton': 'WR', 'Tyson Bagent': 'QB', 'Van Jefferson': 'WR',
  'Xavier Hutchinson': 'WR', 'Zach Ertz': 'TE', 'Jaylen Wright': 'RB',
  'Blake Corum': 'RB', 'Braelon Allen': 'RB', 'Bhayshul Tuten': 'RB',
  'Brenton Strange': 'TE',

  // NFL TEs
  'Travis Kelce': 'TE', 'George Kittle': 'TE', 'Sam LaPorta': 'TE',
  'Dalton Kincaid': 'TE', 'Mark Andrews': 'TE', 'Dallas Goedert': 'TE',
  'TJ Hockenson': 'TE', 'Kyle Pitts': 'TE', 'Pat Freiermuth': 'TE',
  'Evan Engram': 'TE', 'David Njoku': 'TE', 'Cole Kmet': 'TE',
  'Cade Otton': 'TE', 'Dawson Knox': 'TE', 'Isaiah Likely': 'TE',
  'Brock Bowers': 'TE', 'Trey McBride': 'TE', 'Noah Gray': 'TE',
  'Luke Musgrave': 'TE', 'Hunter Henry': 'TE', 'Dalton Schultz': 'TE',
  'Colston Loveland': 'TE', 'Theo Johnson': 'TE', 'Cade Stover': 'TE',
  'Chigoziem Okonkwo': 'TE', 'Kylen Granson': 'TE', 'Foster Moreau': 'TE',
  'Brenton Strange': 'TE', 'Tyler Higbee': 'TE', 'Mo Alie-Cox': 'TE',
  'Colby Parkinson': 'TE', 'Darnell Washington': 'TE', 'Michael Mayer': 'TE',
  'Luke Farrell': 'TE', 'Elijah Higgins': 'TE',

  // NFL Kickers
  'Brandon Aubrey': 'K', 'Tyler Bass': 'K', 'Chris Boswell': 'K',
  'Daniel Carlson': 'K', 'Cairo Santos': 'K', 'Will Reichard': 'K',
  'Justin Tucker': 'K', 'Greg Zuerlein': 'K', 'Cade York': 'K', 'Zane Gonzalez': 'K',

  // NFL FBs
  'Kyle Juszczyk': 'FB', 'Taysom Hill': 'TE',

  // College Football
  'Carson Beck': 'QB', 'Fernando Mendoza': 'QB', 'Michael Penix Jr.': 'QB',
  'Jeremiah McClellan': 'WR', 'Gary Bryant': 'WR', 'Cornelius Johnson': 'WR',
};

// ============================================================
// Legacy → New Schema Transformation
// (For the 14 brolays still in old format)
// ============================================================

function determineBetCategory(betType) {
  const categoryMap = {
    'Spread': 'standard',
    'Moneyline': 'standard',
    'Total': 'standard',
    'Player Prop': 'playerProp',
    'Prop Bet': 'playerProp', // Legacy name
    'Team Total': 'teamTotal',
    'First Half Spread': 'firstHalf',
    'First Half Moneyline': 'firstHalf',
    'First Half Total': 'firstHalf',
    'First Half Team Total': 'firstHalfTeamTotal',
    'Quarter Spread': 'quarter',
    'Quarter Moneyline': 'quarter',
    'Quarter Total': 'quarter',
    'Quarter Team Total': 'quarterTeamTotal',
    'First Inning Runs': 'firstInningRuns',
    'H2H Prop': 'h2hProp',
    'Combined Prop': 'combinedProp',
    'Either Prop': 'eitherProp',
    'Team Prop': 'teamProp',
    'Game Prop': 'gameProp',
    '3-Way Moneyline': 'standard',
  };
  return categoryMap[betType] || 'unknown';
}

function transformLegacyPick(oldPick, pickIndex) {
  const betCategory = determineBetCategory(oldPick.betType);

  // Build entities
  const entities = [];
  if (betCategory === 'playerProp' || oldPick.betType === 'Prop Bet' || oldPick.betType === 'Player Prop') {
    entities.push({
      entityType: 'player',
      name: oldPick.team || '',
      team: oldPick.playerTeam || PLAYER_TEAM_LOOKUP[oldPick.team] || '',
      position: oldPick.playerPosition || PLAYER_POSITION_LOOKUP[oldPick.team] || '',
      role: 'primary'
    });
  } else if (betCategory === 'h2hProp') {
    entities.push({
      entityType: 'player',
      name: oldPick.player1 || '',
      team: oldPick.player1Team || PLAYER_TEAM_LOOKUP[oldPick.player1] || '',
      position: oldPick.player1Position || PLAYER_POSITION_LOOKUP[oldPick.player1] || '',
      role: 'primary'
    });
    entities.push({
      entityType: 'player',
      name: oldPick.player2 || '',
      team: oldPick.player2Team || PLAYER_TEAM_LOOKUP[oldPick.player2] || '',
      position: oldPick.player2Position || PLAYER_POSITION_LOOKUP[oldPick.player2] || '',
      role: 'opponent'
    });
  } else {
    // Standard, Team Total, First Half, Quarter, etc.
    entities.push({
      entityType: 'team',
      name: oldPick.team || '',
      role: 'primary'
    });
  }

  // Build line
  const lineValue = parseFloat(oldPick.spread || oldPick.total || oldPick.line || oldPick.h2hLine || '0');
  let lineType = 'spread';
  if (['Total', 'First Half Total', 'Quarter Total'].includes(oldPick.betType)) lineType = 'total';
  else if (['Moneyline', 'First Half Moneyline', 'Quarter Moneyline', '3-Way Moneyline'].includes(oldPick.betType)) lineType = 'moneyline';
  else if (['Team Total', 'First Half Team Total', 'Quarter Team Total'].includes(oldPick.betType)) lineType = 'teamTotal';
  else if (['Player Prop', 'Prop Bet', 'H2H Prop', 'Combined Prop', 'Either Prop'].includes(oldPick.betType)) lineType = 'prop';

  let direction = '';
  if (oldPick.favorite) direction = oldPick.favorite.toLowerCase();
  if (oldPick.overUnder) direction = oldPick.overUnder.toLowerCase();

  const line = {
    type: lineType,
    value: Math.abs(lineValue) || 0,
    direction: direction,
    odds: oldPick.odds || '',
    source: oldPick.oddsSource || '',
  };
  if (oldPick.propType) line.statType = oldPick.propType;

  // Build outcome
  const outcome = {
    status: (oldPick.result || 'pending').toLowerCase(),
    actualStats: oldPick.actualStats || '',
    autoUpdated: oldPick.autoUpdated || false,
    settledAt: oldPick.autoUpdatedAt || '',
  };
  if (oldPick.margin !== undefined) outcome.margin = oldPick.margin;

  // Build game
  const game = {
    date: oldPick.gameDate || '',
    awayTeam: oldPick.awayTeam || '',
    homeTeam: oldPick.homeTeam || '',
    espnGameId: oldPick.espnGameId || null,
    league: oldPick.sport || '',
  };

  return {
    bigGuy: oldPick.bigGuy || oldPick.player || '',
    sport: oldPick.sport || '',
    betCategory,
    betType: oldPick.betType,
    entities,
    line,
    outcome,
    game,
    _originalIndex: pickIndex,
  };
}

function transformLegacyBrolay(oldBrolay) {
  const picks = {};
  const participants = oldBrolay.participants || {};
  const entries = Object.entries(participants);

  for (const [key, pick] of entries) {
    const pickId = `pick_${String(key).padStart(3, '0')}`;
    picks[pickId] = transformLegacyPick(pick, parseInt(key));
  }

  return {
    id: oldBrolay.id,
    date: oldBrolay.date || '',
    dayOfWeek: oldBrolay.dayOfWeek || '',
    submittedBy: oldBrolay.submittedBy || oldBrolay.placedBy || '',
    betAmount: oldBrolay.betAmount || 0,
    totalPayout: oldBrolay.totalPayout || 0,
    totalPicks: entries.length,
    settled: oldBrolay.settled || false,
    settledAt: oldBrolay.settledAt || '',
    picks,
  };
}

// ============================================================
// Enrichment Functions
// ============================================================

/**
 * Normalize name for lookup (handles curly quotes, etc.)
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")  // Curly single quotes → straight
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')  // Curly double quotes → straight
    .trim();
}

function lookupTeam(name) {
  if (!name) return null;
  if (PLAYER_TEAM_LOOKUP[name]) return PLAYER_TEAM_LOOKUP[name];
  const normalized = normalizeName(name);
  if (PLAYER_TEAM_LOOKUP[normalized]) return PLAYER_TEAM_LOOKUP[normalized];
  return null;
}

function lookupPosition(name) {
  if (!name) return null;
  if (PLAYER_POSITION_LOOKUP[name]) return PLAYER_POSITION_LOOKUP[name];
  const normalized = normalizeName(name);
  if (PLAYER_POSITION_LOOKUP[normalized]) return PLAYER_POSITION_LOOKUP[normalized];
  return null;
}

function enrichPlayerPropTeam(pick) {
  const changes = [];
  if (!pick.entities || !pick.entities[0]) return changes;

  const entity = pick.entities[0];
  if (entity.entityType === 'player' && !entity.team) {
    const team = lookupTeam(entity.name);
    if (team) {
      entity.team = team;
      changes.push(`Set entities[0].team = "${team}" (from lookup)`);
    }
  }

  // Also set position if missing
  if (entity.entityType === 'player' && !entity.position) {
    const position = lookupPosition(entity.name);
    if (position) {
      entity.position = position;
      changes.push(`Set entities[0].position = "${position}" (from lookup)`);
    }
  }

  return changes;
}

function enrichGameTeams(pick) {
  const changes = [];
  if (!pick.game || !pick.outcome) return changes;

  const stats = pick.outcome.actualStats;
  if (!stats) return changes;

  // Pattern: "TeamA Score @ TeamB Score" or "TeamA Score at TeamB Score"
  const matchPattern = /^(.+?)\s+(\d+)\s+[@at]+\s+(.+?)\s+(\d+)$/i;
  const match = stats.match(matchPattern);

  if (match) {
    const [, awayTeam, , homeTeam] = match;
    if (!pick.game.awayTeam && awayTeam.trim()) {
      pick.game.awayTeam = awayTeam.trim();
      changes.push(`Set game.awayTeam = "${awayTeam.trim()}" (from actualStats)`);
    }
    if (!pick.game.homeTeam && homeTeam.trim()) {
      pick.game.homeTeam = homeTeam.trim();
      changes.push(`Set game.homeTeam = "${homeTeam.trim()}" (from actualStats)`);
    }
  }

  return changes;
}

function fixGameProps(pick) {
  const changes = [];
  if (pick.betCategory !== 'playerProp' || !pick.line) return changes;

  const statType = pick.line.statType;
  if (!statType) return changes;

  // Check if it's a game prop
  if (GAME_PROP_STAT_TYPES.includes(statType)) {
    pick.betCategory = 'gameProp';
    pick.betType = 'Game Prop';

    // Update entity type — these are team/fighter entities, not players
    if (pick.entities && pick.entities[0]) {
      pick.entities[0].entityType = 'team';
      // Remove player-specific fields
      delete pick.entities[0].position;
    }

    changes.push(`Reclassified as gameProp (statType: ${statType})`);
    return changes;
  }

  // Check if it's a 3-Way Moneyline (Draw)
  if (THREE_WAY_ML_STAT_TYPES.includes(statType)) {
    pick.betCategory = 'standard';
    pick.betType = '3-Way Moneyline';
    pick.line.type = 'moneyline';
    delete pick.line.statType;

    if (pick.entities && pick.entities[0]) {
      pick.entities[0].entityType = 'team';
      delete pick.entities[0].position;
    }

    changes.push(`Reclassified as 3-Way Moneyline (was "Draw" prop)`);
    return changes;
  }

  return changes;
}

// ============================================================
// Main
// ============================================================

function main() {
  const reportOnly = process.argv.includes('--report');

  console.log('='.repeat(60));
  console.log('DATA ENRICHMENT SCRIPT');
  console.log('='.repeat(60));
  console.log('');

  // Load backup
  console.log(`Loading backup from: ${BACKUP_PATH}`);
  const raw = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  const brolays = raw.data;
  console.log(`Loaded ${brolays.length} brolays`);

  // Separate migrated vs legacy
  const migratedBrolays = brolays.filter(b => b.picks);
  const legacyBrolays = brolays.filter(b => b.participants && !b.picks);
  console.log(`  Migrated (new schema): ${migratedBrolays.length}`);
  console.log(`  Legacy (old schema): ${legacyBrolays.length}`);
  console.log('');

  // Stats tracking
  const stats = {
    totalBrolays: brolays.length,
    legacyTransformed: 0,
    playerTeamEnriched: 0,
    playerTeamMissing: 0,
    playerPositionEnriched: 0,
    gameTeamEnriched: 0,
    gameTeamMissing: 0,
    gamePropsFixed: 0,
    threeWayMLFixed: 0,
    flagged: [],
    totalPicksBefore: 0,
    totalPicksAfter: 0,
  };

  const enrichedBrolays = [];

  // 1. Transform legacy brolays
  console.log('--- Phase 1: Transform Legacy Brolays ---');
  for (const b of legacyBrolays) {
    const transformed = transformLegacyBrolay(b);
    enrichedBrolays.push(transformed);
    stats.legacyTransformed++;
    const pickCount = Object.keys(transformed.picks).length;
    stats.totalPicksBefore += pickCount;
    console.log(`  Transformed: ${b.date} (${b.placedBy || b.submittedBy}): ${pickCount} picks`);
  }

  // 2. Process migrated brolays
  console.log('');
  console.log('--- Phase 2: Enrich Migrated Brolays ---');
  for (const b of migratedBrolays) {
    const picks = Array.isArray(b.picks) ? {} : b.picks;

    // Convert array picks to object if needed
    let picksObj = picks;
    if (Array.isArray(b.picks)) {
      picksObj = {};
      b.picks.forEach((p, i) => {
        picksObj[`pick_${String(i).padStart(3, '0')}`] = p;
      });
    }

    const pickEntries = Object.entries(picksObj);
    stats.totalPicksBefore += pickEntries.length;

    for (const [pickId, pick] of pickEntries) {
      // Enrich player prop teams
      if (pick.betCategory === 'playerProp') {
        const teamChanges = enrichPlayerPropTeam(pick);
        if (teamChanges.length > 0) {
          if (teamChanges.some(c => c.includes('entities[0].team'))) stats.playerTeamEnriched++;
          if (teamChanges.some(c => c.includes('entities[0].position'))) stats.playerPositionEnriched++;
        } else if (pick.entities?.[0]?.entityType === 'player' && !pick.entities[0].team) {
          stats.playerTeamMissing++;
          // Only flag non-team-name entities (skip those that are already teams like "Detroit Lions")
          const name = pick.entities[0].name;
          if (!name.includes(' ') || !/^[A-Z][a-z]+ [A-Z][a-z]+s$/.test(name)) {
            // Not obviously a team name pattern
          }
        }
      }

      // Fix game props
      const gpChanges = fixGameProps(pick);
      if (gpChanges.length > 0) {
        if (gpChanges.some(c => c.includes('gameProp'))) stats.gamePropsFixed++;
        if (gpChanges.some(c => c.includes('3-Way Moneyline'))) stats.threeWayMLFixed++;
      }

      // Enrich game teams from actualStats
      if (pick.betCategory === 'standard' || pick.betCategory === 'firstHalf' || pick.betCategory === 'quarter') {
        const gtChanges = enrichGameTeams(pick);
        if (gtChanges.length > 0) stats.gameTeamEnriched++;
        else if (pick.game && !pick.game.homeTeam && pick.outcome?.status !== 'pending') {
          stats.gameTeamMissing++;
        }
      }
    }

    enrichedBrolays.push({
      ...b,
      picks: picksObj,
    });
  }

  // Count total picks after
  for (const b of enrichedBrolays) {
    const picks = b.picks || {};
    stats.totalPicksAfter += Object.keys(picks).length;
  }

  // Count remaining missing
  let missingTeamPlayers = [];
  for (const b of enrichedBrolays) {
    const picks = b.picks || {};
    for (const [, p] of Object.entries(picks)) {
      if (p.betCategory === 'playerProp' && p.entities?.[0]?.entityType === 'player' && !p.entities[0].team) {
        missingTeamPlayers.push(p.entities[0].name + ' (' + p.sport + ')');
      }
    }
  }
  const uniqueMissing = [...new Set(missingTeamPlayers)].sort();

  // Print report
  console.log('');
  console.log('='.repeat(60));
  console.log('ENRICHMENT REPORT');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Total Brolays: ${stats.totalBrolays}`);
  console.log(`  Picks before: ${stats.totalPicksBefore}`);
  console.log(`  Picks after: ${stats.totalPicksAfter}`);
  console.log('');
  console.log('Legacy Transformations:');
  console.log(`  Brolays transformed to new schema: ${stats.legacyTransformed}`);
  console.log('');
  console.log('Player Prop Team Enrichment:');
  console.log(`  Teams resolved from lookup: ${stats.playerTeamEnriched}`);
  console.log(`  Positions resolved from lookup: ${stats.playerPositionEnriched}`);
  console.log(`  Still missing team: ${uniqueMissing.length} unique players`);
  console.log('');
  console.log('Game Team Enrichment:');
  console.log(`  Teams parsed from actualStats: ${stats.gameTeamEnriched}`);
  console.log(`  Still missing homeTeam: ${stats.gameTeamMissing}`);
  console.log('');
  console.log('Game Prop Fixes:');
  console.log(`  Reclassified as gameProp: ${stats.gamePropsFixed}`);
  console.log(`  Reclassified as 3-Way Moneyline: ${stats.threeWayMLFixed}`);
  console.log('');

  if (uniqueMissing.length > 0) {
    console.log(`Players still missing team data (${uniqueMissing.length}):`);
    uniqueMissing.forEach(n => console.log(`  - ${n}`));
    console.log('');
  }

  // Write output
  if (!reportOnly) {
    const output = {
      metadata: {
        enrichedAt: new Date().toISOString(),
        sourceFile: BACKUP_PATH,
        totalBrolays: enrichedBrolays.length,
        totalPicks: stats.totalPicksAfter,
        enrichments: {
          legacyTransformed: stats.legacyTransformed,
          playerTeamEnriched: stats.playerTeamEnriched,
          playerPositionEnriched: stats.playerPositionEnriched,
          gameTeamEnriched: stats.gameTeamEnriched,
          gamePropsFixed: stats.gamePropsFixed,
          threeWayMLFixed: stats.threeWayMLFixed,
        }
      },
      data: enrichedBrolays,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
    console.log(`Enriched data saved to: ${OUTPUT_PATH}`);
  } else {
    console.log('Report only mode — no output file generated');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('ENRICHMENT COMPLETE');
  console.log('='.repeat(60));
}

main();
