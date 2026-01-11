import { useState } from 'react';
import { deleteField } from 'firebase/firestore';

/**
 * Custom hook for ESPN API integration and auto-updating picks
 * Handles fetching game results and updating pending picks
 */
export const useESPN = () => {
  const [autoUpdating, setAutoUpdating] = useState(false);

  // Helper function to match team names with fuzzy matching
  const matchTeamName = (betTeam, apiTeam) => {
    if (!betTeam || !apiTeam) return false;
    
    const normalize = (name) => name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/state$/, '')
      .replace(/university$/, '')
      .replace(/college$/, '');
    
    const normalizedBet = normalize(betTeam);
    const normalizedApi = normalize(apiTeam);
    
    return normalizedApi.includes(normalizedBet) || normalizedBet.includes(normalizedApi);
  };

  // Map sport to ESPN API endpoint
  const getESPNSport = (sport) => {
    const sportMap = {
      'NFL': 'football/nfl',
      'NBA': 'basketball/nba',
      'MLB': 'baseball/mlb',
      'NHL': 'hockey/nhl',
      'College Football': 'football/college-football',
      'College Basketball': 'basketball/mens-college-basketball',
      'College Basketball (Women\'s)': 'basketball/womens-college-basketball',
      'Soccer': 'soccer/usa.1',
      'Soccer (Women\'s)': 'soccer/usa.nwsl',
      'Tennis': 'tennis/atp',
      'Tennis (Women\'s)': 'tennis/wta',
      'WNBA': 'basketball/wnba',
      'College Baseball': 'baseball/college-baseball',
    };
    
    return sportMap[sport] || null;
  };

  // Determine spread result
  const determineSpreadResult = (team, favorite, spread, homeComp, awayComp, homeScore, awayScore) => {
    const spreadValue = parseFloat(spread);
    if (isNaN(spreadValue)) return 'pending';
    
    const teamIsHome = matchTeamName(team, homeComp.team.displayName);
    const teamIsFavorite = favorite === 'Favorite';
    
    let margin;
    if (teamIsHome) {
      margin = homeScore - awayScore;
    } else {
      margin = awayScore - homeScore;
    }
    
    const adjustedMargin = teamIsFavorite ? margin + spreadValue : margin - spreadValue;
    
    if (adjustedMargin > 0) return 'win';
    if (adjustedMargin < 0) return 'loss';
    return 'push';
  };

  // Determine moneyline result
  const determineMoneylineResult = (team, homeComp, awayComp) => {
    const teamIsHome = matchTeamName(team, homeComp.team.displayName);
    const homeWon = homeComp.winner === true;
    
    if (teamIsHome) {
      return homeWon ? 'win' : 'loss';
    } else {
      return homeWon ? 'loss' : 'win';
    }
  };

  // Determine total result
  const determineTotalResult = (overUnder, total, actualTotal) => {
    const totalValue = parseFloat(total);
    if (isNaN(totalValue)) return 'pending';
    
    if (actualTotal > totalValue) {
      return overUnder === 'Over' ? 'win' : 'loss';
    } else if (actualTotal < totalValue) {
      return overUnder === 'Under' ? 'win' : 'loss';
    }
    return 'push';
  };

// Extract player stat from boxscore using labels
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

  const matchPlayerName = (pickPlayer, apiPlayer) => {
    if (!pickPlayer || !apiPlayer) return false;
    
    const normalizePlayerName = (name) => {
      if (!name) return '';
      return name
        .toLowerCase()
        .replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '')
        .replace(/[^a-z\s]/g, '')
        .trim();
    };
    
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
            
            console.log('✅ Found player in category:', statCategory.name, 'Labels:', statCategory.labels);
            
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

  // Check TD scorer result
  const checkTDScorerResult = (playerStat, propType, overUnder, line) => {
    const totalTDs = playerStat || 0;
    const propLower = propType.toLowerCase();
    
    if (propLower.includes('anytime') || propLower.includes('score')) {
      if (overUnder === 'Over') {
        return totalTDs > 0 ? 'win' : 'loss';
      } else {
        return totalTDs === 0 ? 'win' : 'loss';
      }
    }
    
    if (propLower.includes('2+') || propLower.includes('multiple') || propLower.includes('2 or more')) {
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

  // Check prop bet result
  const checkPropBetResult = async (participant, gameDate) => {
    const { sport, team: playerName, propType, overUnder, line } = participant;
    
    console.log('🏈 checkPropBetResult called with:', {
      sport,
      playerName,
      propType,
      overUnder,
      line,
      gameDate
    });
    
    if (!playerName || !propType || !line) {
      console.log('❌ Missing required fields for prop bet');
      return { result: 'pending', stats: null };
    }
    
    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }
    
    // Unsupported sports for prop tracking
    if (['Golf', 'Rugby', 'UFC'].includes(sport)) {
      return { result: 'pending', stats: null };
    }
    
    try {
      const formattedDate = gameDate.replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📡 ESPN API returned', data.events?.length || 0, 'events for date', gameDate);
      
      if (!data.events || data.events.length === 0) {
        console.log('❌ No events found');
        return { result: 'pending', stats: null };
      }
      
      // Try to find the game with this player
      for (const event of data.events) {
        const competition = event.competitions?.[0];
        
        console.log('🎮 Checking event:', {
          eventId: event.id,
          teams: competition?.competitors?.map(c => c.team.displayName).join(' vs '),
          status: competition?.status?.type?.name,
          completed: competition?.status?.type?.completed
        });
        
        if (!competition || competition.status?.type?.completed !== true) {
          console.log('⏭️ Skipping - game not completed');
          continue;
        }
        
        const gameId = event.id;
        const boxscoreUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
        
        try {
          const boxscoreResponse = await fetch(boxscoreUrl);
          const boxscoreData = await boxscoreResponse.json();
          
          console.log('📦 Fetched boxscore for game', gameId);
          
          // Double-check completion status
          const boxscoreStatus = boxscoreData.header?.competitions?.[0]?.status?.type?.name?.toLowerCase();
          console.log('📊 Boxscore status:', boxscoreStatus);
          if (boxscoreStatus !== 'final' && boxscoreStatus !== 'status_final') {
            console.log(`Boxscore for game ${gameId} status is ${boxscoreStatus}, not final, skipping`);
            continue;
          }
          
          if (boxscoreData.boxscore) {
            console.log('🔍 Searching for player:', playerName, 'in boxscore');
            const playerStat = extractPlayerStat(boxscoreData.boxscore, playerName, propType, sport);
            console.log('📈 Player stat found:', playerStat);
            
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
              if (isNaN(lineValue)) {
                return { result: 'pending', stats: `${propType}: ${playerStat}` };
              }
              
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
                stats: `${propType}: ${playerStat}`
              };
            }
          }
        } catch (boxscoreError) {
          console.error(`Error fetching boxscore for game ${gameId}:`, boxscoreError);
          continue;
        }
      }
      
      return { result: 'pending', stats: null };
      
    } catch (error) {
      console.error('Error checking prop bet result:', error);
      return { result: 'pending', stats: null };
    }
  };

  // Check first half/quarter results
  const checkFirstHalfResult = async (participant, gameDate) => {
    const { sport, betType, team, awayTeam, homeTeam, overUnder, total } = participant;
    
    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }
    
    try {
      const formattedDate = gameDate.replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.events || data.events.length === 0) {
        return { result: 'pending', stats: null };
      }
      
      let relevantGame = null;
      
      // IMPROVED: More strict game matching to avoid wrong games
      for (const event of data.events) {
        const competition = event.competitions[0];
        const competitors = competition.competitors;
        
        if (competition.status.type.completed !== true) {
          continue;
        }
        
        const homeTeamName = competitors.find(c => c.homeAway === 'home')?.team.displayName || '';
        const awayTeamName = competitors.find(c => c.homeAway === 'away')?.team.displayName || '';
        
        // For first half bets, match BOTH teams to ensure correct game
        if (betType === 'First Half Total' || betType === 'First Inning Runs') {
          if (matchTeamName(awayTeam, awayTeamName) && matchTeamName(homeTeam, homeTeamName)) {
            relevantGame = { competition, event };
            break;
          }
        } else if (betType === 'First Half Team Total') {
          if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
            // Additional check: verify this is the right matchup
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
      
      const detailResponse = await fetch(detailUrl);
      const detailData = await detailResponse.json();
      
      const linescores = detailData.boxscore?.teams;
      if (!linescores || linescores.length < 2) {
        return { result: 'pending', stats: null };
      }
      
      // Calculate first half score
      const homeLineScore = linescores.find(t => t.homeAway === 'home');
      const awayLineScore = linescores.find(t => t.homeAway === 'away');
      
      if (!homeLineScore || !awayLineScore) {
        return { result: 'pending', stats: null };
      }
      
      // Get first half periods (quarters 1-2 for football/basketball, innings 1-5 for baseball)
      const periods = homeLineScore.statistics?.find(s => s.name === 'linescores')?.displayValue?.split(',') || [];
      const awayPeriods = awayLineScore.statistics?.find(s => s.name === 'linescores')?.displayValue?.split(',') || [];
      
      let firstHalfHomeScore = 0;
      let firstHalfAwayScore = 0;
      
      if (betType === 'First Inning Runs') {
        // First inning only
        firstHalfHomeScore = parseInt(periods[0]) || 0;
        firstHalfAwayScore = parseInt(awayPeriods[0]) || 0;
      } else {
        // First half (quarters 1-2 or periods 1-N)
        const halfPoint = Math.floor(periods.length / 2);
        for (let i = 0; i < halfPoint; i++) {
          firstHalfHomeScore += parseInt(periods[i]) || 0;
          firstHalfAwayScore += parseInt(awayPeriods[i]) || 0;
        }
      }
      
      if (betType === 'First Half Total' || betType === 'First Inning Runs') {
        const totalScore = firstHalfHomeScore + firstHalfAwayScore;
        const result = determineTotalResult(overUnder, total, totalScore);
        return {
          result,
          stats: `1H Total: ${totalScore}`
        };
      } else if (betType === 'First Half Team Total') {
        const teamIsHome = matchTeamName(team, homeLineScore.team.displayName);
        const teamTotal = teamIsHome ? firstHalfHomeScore : firstHalfAwayScore;
        const result = determineTotalResult(overUnder, total, teamTotal);
        return {
          result,
          stats: `1H Team Total: ${teamTotal}`
        };
      }
      
      return { result: 'pending', stats: null };
      
    } catch (error) {
      console.error('Error checking first half result:', error);
      return { result: 'pending', stats: null };
    }
  };

  // Check quarter results
  const checkQuarterResult = async (participant, gameDate) => {
    const { sport, betType, team, awayTeam, homeTeam, overUnder, total, quarter } = participant;
    
    // Only works for football
    if (sport !== 'NFL' && sport !== 'College Football') {
      return { result: 'pending', stats: null };
    }
    
    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }
    
    try {
      const formattedDate = gameDate.replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📡 ESPN API returned', data.events?.length || 0, 'events for date', gameDate);
      
      if (!data.events || data.events.length === 0) {
        console.log('❌ No events found');
        return { result: 'pending', stats: null };
      }
      
      let relevantGame = null;
      
      // IMPROVED: Match both teams for quarter bets
      for (const event of data.events) {
        const competition = event.competitions[0];
        const competitors = competition.competitors;
        
        if (competition.status.type.completed !== true) {
          continue;
        }
        
        const homeTeamName = competitors.find(c => c.homeAway === 'home')?.team.displayName || '';
        const awayTeamName = competitors.find(c => c.homeAway === 'away')?.team.displayName || '';
        
        // Match game based on bet type - ensure both teams match for totals
        if (betType === 'Quarter Total') {
          if (matchTeamName(awayTeam, awayTeamName) && matchTeamName(homeTeam, homeTeamName)) {
            relevantGame = { competition, event };
            break;
          }
        } else if (betType === 'Quarter Team Total' || betType === 'Quarter Moneyline') {
          if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
            relevantGame = { competition, event };
            break;
          }
        }
      }
      
      if (!relevantGame) {
        return { result: 'pending', stats: null };
      }
      
      // Get detailed game data for quarter scores
      const gameId = relevantGame.event.id;
      const detailUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
      
      const detailResponse = await fetch(detailUrl);
      const detailData = await detailResponse.json();
      
      const linescores = detailData.boxscore?.teams;
      if (!linescores || linescores.length < 2) {
        return { result: 'pending', stats: null };
      }
      
      const homeLineScore = linescores.find(t => t.homeAway === 'home');
      const awayLineScore = linescores.find(t => t.homeAway === 'away');
      
      if (!homeLineScore || !awayLineScore) {
        return { result: 'pending', stats: null };
      }
      
      const periods = homeLineScore.statistics?.find(s => s.name === 'linescores')?.displayValue?.split(',') || [];
      const awayPeriods = awayLineScore.statistics?.find(s => s.name === 'linescores')?.displayValue?.split(',') || [];
      
      const quarterMap = { '1st Quarter': 0, '2nd Quarter': 1, '3rd Quarter': 2, '4th Quarter': 3 };
      const quarterIndex = quarterMap[quarter];
      
      if (quarterIndex === undefined || quarterIndex >= periods.length) {
        return { result: 'pending', stats: null };
      }
      
      const quarterHomeScore = parseInt(periods[quarterIndex]) || 0;
      const quarterAwayScore = parseInt(awayPeriods[quarterIndex]) || 0;
      
      if (betType === 'Quarter Total') {
        const totalScore = quarterHomeScore + quarterAwayScore;
        const result = determineTotalResult(overUnder, total, totalScore);
        return {
          result,
          stats: `${quarter} Total: ${totalScore}`
        };
      } else if (betType === 'Quarter Team Total') {
        const teamIsHome = matchTeamName(team, homeLineScore.team.displayName);
        const teamTotal = teamIsHome ? quarterHomeScore : quarterAwayScore;
        const result = determineTotalResult(overUnder, total, teamTotal);
        return {
          result,
          stats: `${quarter} Team Total: ${teamTotal}`
        };
      } else if (betType === 'Quarter Moneyline') {
        const teamIsHome = matchTeamName(team, homeLineScore.team.displayName);
        const result = teamIsHome ? 
          (quarterHomeScore > quarterAwayScore ? 'win' : 'loss') :
          (quarterAwayScore > quarterHomeScore ? 'win' : 'loss');
        return {
          result,
          stats: `${quarter}: ${awayLineScore.team.displayName} ${quarterAwayScore} @ ${homeLineScore.team.displayName} ${quarterHomeScore}`
        };
      }
      
      return { result: 'pending', stats: null };
      
    } catch (error) {
      console.error('Error checking quarter result:', error);
      return { result: 'pending', stats: null };
    }
  };

  // Main check game result function
  const checkGameResult = async (participant, gameDate) => {
    const { sport, betType, team, awayTeam, homeTeam, favorite, spread, overUnder, total } = participant;
    
    // Handle special bet types
    if (betType === 'Prop Bet') {
      return await checkPropBetResult(participant, gameDate);
    }
    
    if (['Quarter Moneyline', 'Quarter Total', 'Quarter Team Total'].includes(betType)) {
      return await checkQuarterResult(participant, gameDate);
    }
    
    if (['First Half Moneyline', 'First Half Total', 'First Half Team Total', 'First Inning Runs'].includes(betType)) {
      return await checkFirstHalfResult(participant, gameDate);
    }
    
    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }
    
    // Unsupported sports
    if (['Golf', 'Rugby', 'UFC'].includes(sport)) {
      return { result: 'pending', stats: null };
    }
    
    try {
      const formattedDate = gameDate.replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📡 ESPN API returned', data.events?.length || 0, 'events for date', gameDate);
      
      if (!data.events || data.events.length === 0) {
        console.log('❌ No events found');
        return { result: 'pending', stats: null };
      }
      
      let relevantGame = null;
      
      // CRITICAL FIX: Improved game matching logic
      for (const event of data.events) {
        const competition = event.competitions[0];
        const competitors = competition.competitors;
        
        if (competition.status.type.completed !== true) {
          continue;
        }
        
        const homeTeamName = competitors.find(c => c.homeAway === 'home')?.team.displayName || '';
        const awayTeamName = competitors.find(c => c.homeAway === 'away')?.team.displayName || '';
        
        // For totals, match BOTH teams to ensure correct game
        if (betType === 'Total') {
          if (matchTeamName(awayTeam, awayTeamName) && matchTeamName(homeTeam, homeTeamName)) {
            relevantGame = competition;
            break;
          }
        } else {
          // For spreads and moneylines, match the team
          if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
            // ADDITIONAL CHECK: If we have away/home team info, verify it's the right matchup
            if (awayTeam && homeTeam) {
              if (matchTeamName(awayTeam, awayTeamName) && matchTeamName(homeTeam, homeTeamName)) {
                relevantGame = competition;
                break;
              }
            } else {
              relevantGame = competition;
              break;
            }
          }
        }
      }
      
      if (!relevantGame) {
        return { result: 'pending', stats: null };
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
      return { result: 'pending', stats: null };
    }
  };

  // Auto-update pending picks
  const autoUpdatePendingPicks = async (parlays, updateBrolay) => {
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
        
        if (parlayUpdated && parlay.id) {
          try {
            console.log('🔄 Attempting to update parlay:', parlay.id);
            console.log('📝 Update data:', { participants: updatedParticipants });
            
            const result = await updateBrolay(parlay.id, {
              participants: updatedParticipants
            });
            
            console.log('✅ Update result:', result);
            
            if (!result.success) {
              console.error('❌ Update failed:', result.error);
            }
          } catch (error) {
            console.error('💥 Error updating parlay in Firebase:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
          }
        } else {
          console.warn('⚠️ Parlay not updated - parlayUpdated:', parlayUpdated, 'id:', parlay.id);
        }
      }
      
      setAutoUpdating(false);
      
      return {
        success: true,
        updatedCount
      };
      
    } catch (error) {
      console.error('Error in auto-update:', error);
      setAutoUpdating(false);
      return {
        success: false,
        error: error.message
      };
    }
  };

  return {
    autoUpdating,
    checkGameResult,
    autoUpdatePendingPicks,
    matchTeamName,
  };
};
